/**
 * Pont ACP - la conversation du Hub avec Hermes.
 *
 * `hermes acp` est le meme protocole que celui des editeurs (VS Code, Zed) :
 * du JSON-RPC 2.0, une trame par ligne, sur stdin/stdout. On le prefere a
 * `hermes -z` parce que `-z` ne rend que le texte final : ni les outils, ni la
 * reflexion, ni les demandes d'autorisation. Or c'est justement ce travail-la
 * que le Hub veut montrer.
 *
 * Un seul process et une seule session pour l'instant : un interlocuteur,
 * Hermes. Les agents multiples viendront s'y brancher sans changer ce pont.
 */
import { spawn } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { estPanneModele, lireBascule, prochainGratuit } from './modeles.js'

/**
 * Le venv d'abord : `spawn` sans shell ne consulte pas PATHEXT, un simple
 * 'hermes' echouerait la ou le terminal, lui, trouve l'executable.
 */
function trouverHermes() {
  const local = path.join(
    process.env.LOCALAPPDATA || os.homedir(),
    'hermes',
    'hermes-agent',
    'venv',
    'Scripts',
    'hermes.exe',
  )
  if (fs.existsSync(local)) return local
  return process.platform === 'win32' ? 'hermes.exe' : 'hermes'
}

/** Demarrage a froid : chargement des MCP, du modele, des skills. */
const DELAI_DEMARRAGE = 90000

export class PontAcp extends EventEmitter {
  /** `profil` vaut null pour Hermes lui-meme : le profil par defaut n'a pas de
      nom sur la ligne de commande, et le nommer changerait de home. */
  constructor({ cwd, profil = null, agent = 'hermes' }) {
    super()
    this.cwd = cwd
    this.profil = profil
    this.agent = agent
    this.child = null
    this.tampon = ''
    this.prochainId = 1
    this.enAttente = new Map()
    /** Autorisations en cours : id -> resolve(optionId). */
    this.autorisations = new Map()
    this.session = null
    this.demarrage = null
    this.enCours = false
    /** Texte du tour en cours, garde pour y lire une eventuelle panne de
        modele : l'echec d'appel arrive dans la reponse, pas dans une erreur. */
    this.texteTour = ''
  }

  // ---------------------------------------------------------------------------
  // Process
  // ---------------------------------------------------------------------------
  demarrer() {
    if (this.child) return

    // `--profile` precede la sous-commande : c'est un drapeau global, il
    // choisit le home d'Hermes avant que `acp` ne soit resolu.
    const args = this.profil ? ['--profile', this.profil, 'acp', '--accept-hooks'] : ['acp', '--accept-hooks']

    this.child = spawn(trouverHermes(), args, {
      cwd: this.cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.child.stdout.setEncoding('utf8')
    this.child.stdout.on('data', (bloc) => this.#recevoir(bloc))

    // stderr d'Hermes = journal technique, pas une erreur : il y ecrit son
    // demarrage normal. On ne le remonte pas a l'interface, on le trace.
    this.child.stderr.setEncoding('utf8')
    this.child.stderr.on('data', (bloc) => {
      const texte = bloc.trim()
      if (texte) console.log('[acp]', texte.split('\n').slice(-2).join(' | '))
    })

    this.child.on('error', (err) => {
      this.emettre({ type: 'panne', message: "Hermes n'a pas pu demarrer : " + err.message })
      this.#arreter()
    })

    this.child.on('exit', (code) => {
      console.log('[acp] process termine, code', code)
      this.emettre({
        type: 'panne',
        message: 'La session Hermes s-est fermee. Recharge la page pour en ouvrir une nouvelle.',
      })
      this.#arreter()
    })
  }

  /** Tout evenement porte le nom de son agent : dans une piece a plusieurs, un
      message sans emetteur n'est pas attribuable. */
  emettre(evenement) {
    this.emit('evenement', { ...evenement, agent: this.agent })
  }

  #arreter() {
    for (const { reject } of this.enAttente.values()) {
      reject(new Error('Session Hermes interrompue'))
    }
    this.enAttente.clear()
    // Une autorisation sans reponse bloquerait Hermes : on annule proprement.
    for (const { resoudre } of this.autorisations.values()) resoudre(null)
    this.autorisations.clear()
    this.child = null
    this.session = null
    this.demarrage = null
    this.enCours = false
  }

  fermer() {
    if (this.child) this.child.kill()
    this.#arreter()
  }

  // ---------------------------------------------------------------------------
  // Trames
  // ---------------------------------------------------------------------------
  #recevoir(bloc) {
    this.tampon += bloc
    let coupure
    while ((coupure = this.tampon.indexOf('\n')) !== -1) {
      const ligne = this.tampon.slice(0, coupure).trim()
      this.tampon = this.tampon.slice(coupure + 1)
      if (!ligne) continue
      let msg
      try {
        msg = JSON.parse(ligne)
      } catch {
        continue // trame partielle ou bruit : rien a en tirer
      }
      this.#traiter(msg)
    }
  }

  #traiter(msg) {
    // Reponse a l'un de nos appels
    if (msg.id !== undefined && !msg.method) {
      const attente = this.enAttente.get(msg.id)
      if (!attente) return
      this.enAttente.delete(msg.id)
      if (msg.error) attente.reject(new Error(msg.error.message || 'Erreur Hermes'))
      else attente.resolve(msg.result)
      return
    }

    // Requete d'Hermes vers nous
    if (msg.id !== undefined && msg.method) {
      if (msg.method === 'session/request_permission') return this.#demanderAutorisation(msg)
      // Tout le reste est hors capacites annoncees : on repond pour ne pas figer.
      return this.#repondre(msg.id, {})
    }

    // Notification
    if (msg.method === 'session/update') this.#notifier(msg.params?.update || {})
  }

  #envoyer(objet) {
    if (!this.child) throw new Error('Session Hermes fermee')
    this.child.stdin.write(JSON.stringify(objet) + '\n')
  }

  #repondre(id, result) {
    try {
      this.#envoyer({ jsonrpc: '2.0', id, result })
    } catch {
      /* process deja parti */
    }
  }

  appeler(method, params, delai = 600000) {
    const id = this.prochainId++
    return new Promise((resolve, reject) => {
      const minuteur = setTimeout(() => {
        this.enAttente.delete(id)
        reject(new Error(`Hermes n'a pas repondu (${method})`))
      }, delai)

      this.enAttente.set(id, {
        resolve: (v) => {
          clearTimeout(minuteur)
          resolve(v)
        },
        reject: (e) => {
          clearTimeout(minuteur)
          reject(e)
        },
      })

      try {
        this.#envoyer({ jsonrpc: '2.0', id, method, params })
      } catch (err) {
        clearTimeout(minuteur)
        this.enAttente.delete(id)
        reject(err)
      }
    })
  }

  // ---------------------------------------------------------------------------
  // Traduction des evenements ACP vers le vocabulaire du Hub
  // ---------------------------------------------------------------------------
  #notifier(u) {
    const emettre = (e) => this.emettre(e)

    switch (u.sessionUpdate) {
      case 'agent_message_chunk': {
        const texte = u.content?.text || ''
        this.texteTour += texte
        return emettre({ type: 'texte', texte })
      }
      case 'agent_thought_chunk':
        return emettre({ type: 'reflexion', texte: u.content?.text || '' })
      case 'tool_call':
        return emettre({
          type: 'outil',
          id: u.toolCallId,
          titre: u.title || u.toolCallId,
          genre: u.kind || 'other',
          etat: u.status || 'pending',
          detail: extraireContenu(u.content),
        })
      case 'tool_call_update':
        return emettre({
          type: 'outil-maj',
          id: u.toolCallId,
          etat: u.status,
          titre: u.title,
          detail: extraireContenu(u.content),
        })
      case 'plan':
        return emettre({
          type: 'plan',
          etapes: (u.entries || []).map((e) => ({
            libelle: e.content || '',
            etat: e.status || 'pending',
            priorite: e.priority || 'medium',
          })),
        })
      case 'usage_update':
        return emettre({ type: 'usage', utilise: u.used || 0, total: u.size || 0 })
      case 'current_mode_update':
        return emettre({ type: 'mode', mode: u.currentModeId })
      default:
        return undefined // commandes disponibles, etc. : sans usage ici
    }
  }

  #demanderAutorisation(msg) {
    const p = msg.params || {}
    const options = (p.options || []).map((o) => ({
      id: o.optionId,
      libelle: o.name || o.optionId,
      genre: o.kind || 'allow_once',
    }))

    // Sans option proposee, rien a arbitrer : on laisse Hermes decider seul.
    if (!options.length) return this.#repondre(msg.id, { outcome: { outcome: 'cancelled' } })

    const cle = String(msg.id)
    const evenement = {
      type: 'autorisation',
      demande: cle,
      titre: p.toolCall?.title || 'Hermes demande une autorisation',
      detail: extraireContenu(p.toolCall?.content),
      options,
    }

    // L'evenement est conserve, pas seulement emis : Hermes attend la reponse
    // pour continuer, et un navigateur ferme ou recharge a cet instant precis
    // laisserait le tour bloque pour toujours. Il sera rejoue a la reconnexion.
    this.autorisations.set(cle, {
      evenement,
      resoudre: (optionId) => {
        this.#repondre(
          msg.id,
          optionId
            ? { outcome: { outcome: 'selected', optionId } }
            : { outcome: { outcome: 'cancelled' } },
        )
      },
    })

    this.emettre(evenement)
  }

  /** Ce qu'un flux qui arrive en cours de route doit savoir pour se remettre au
      niveau : un tour peut etre en train de tourner, une autorisation d'attendre. */
  etat() {
    return {
      type: 'reprise',
      enCours: this.enCours,
      autorisations: [...this.autorisations.values()].map((a) => a.evenement),
    }
  }

  /** Reponse de l'utilisateur a une demande d'autorisation. */
  autoriser(demande, optionId) {
    const attente = this.autorisations.get(demande)
    if (!attente) return false
    this.autorisations.delete(demande)
    attente.resoudre(optionId)
    return true
  }

  // ---------------------------------------------------------------------------
  // Session
  // ---------------------------------------------------------------------------
  /**
   * Idempotent et partage : plusieurs onglets qui ouvrent la discussion en meme
   * temps attendent le meme demarrage au lieu d'en lancer deux.
   */
  ouvrirSession() {
    if (this.session) return Promise.resolve(this.session)
    if (this.demarrage) return this.demarrage

    this.demarrage = (async () => {
      this.demarrer()

      await this.appeler(
        'initialize',
        {
          protocolVersion: 1,
          clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } },
        },
        DELAI_DEMARRAGE,
      )

      const res = await this.appeler('session/new', { cwd: this.cwd, mcpServers: [] }, DELAI_DEMARRAGE)

      this.session = {
        sessionId: res.sessionId,
        modeles: (res.models?.availableModels || []).map((m) => ({ id: m.modelId, nom: m.name })),
        modeleActuel: res.models?.currentModelId || null,
        modes: (res.modes?.availableModes || []).map((m) => ({
          id: m.id,
          nom: m.name,
          aide: m.description || '',
        })),
        modeActuel: res.modes?.currentModeId || null,
        cwd: this.cwd,
      }
      return this.session
    })()

    // Un demarrage rate ne doit pas rester en cache : le prochain essai repart
    // de zero plutot que de rejouer la meme erreur indefiniment.
    this.demarrage.catch(() => {
      this.demarrage = null
      this.fermer()
    })

    return this.demarrage
  }

  async envoyer(texte) {
    const session = await this.ouvrirSession()
    if (this.enCours) {
      const err = new Error('Hermes travaille encore sur le message precedent')
      err.status = 409
      throw err
    }

    this.enCours = true
    this.emettre({ type: 'tour-debut' })

    // Les modeles deja pris en defaut sur ce message : on ne repropose pas
    // celui qui vient de couper, et on s'arrete quand la liste est epuisee
    // plutot que de tourner en rond.
    const epuises = []

    try {
      for (;;) {
        this.texteTour = ''

        const res = await this.appeler('session/prompt', {
          sessionId: session.sessionId,
          prompt: [{ type: 'text', text: texte }],
        })

        const suite = await this.#basculerSiPanne(epuises)
        if (suite === 'relancer') continue

        this.emettre({
          type: 'tour-fin',
          raison: res?.stopReason || 'end_turn',
          usage: res?.usage || null,
        })
        return res
      }
    } catch (err) {
      this.emettre({ type: 'tour-fin', raison: 'erreur', message: err.message })
      throw err
    } finally {
      this.enCours = false
    }
  }

  /**
   * Lit la reponse qui vient d'arriver. Si le fournisseur a coupe et que la
   * bascule est active, passe au modele gratuit suivant.
   *
   * @returns 'relancer' pour rejouer le meme message, 'garder' sinon.
   */
  async #basculerSiPanne(epuises) {
    const raison = estPanneModele(this.texteTour)
    if (!raison) return 'garder'

    if (!lireBascule()) {
      this.emettre({ type: 'bascule-inactive', raison })
      return 'garder'
    }

    const actuel = this.session?.modeleActuel || null
    if (actuel && !epuises.includes(actuel)) epuises.push(actuel)

    const suivant = prochainGratuit(this.session?.modeles || [], epuises)
    if (!suivant) {
      // Tout a ete essaye : insister ne ferait que rejouer les memes echecs.
      this.emettre({ type: 'bascule-epuisee', raison, essayes: epuises })
      return 'garder'
    }

    try {
      await this.choisirModele(suivant)
    } catch (err) {
      this.emettre({ type: 'bascule-echec', raison, vers: suivant, message: err.message })
      return 'garder'
    }

    // Emis apres le changement : l'interface efface la reponse en echec et
    // annonce sur quel modele elle repart.
    this.emettre({ type: 'bascule', de: actuel, vers: suivant, raison })
    return 'relancer'
  }

  async interrompre() {
    if (!this.session || !this.enCours) return { interrompu: false }
    // Notification pure : `session/cancel` n'attend pas de reponse, c'est
    // `session/prompt` qui se termine avec stopReason "cancelled".
    this.#envoyer({
      jsonrpc: '2.0',
      method: 'session/cancel',
      params: { sessionId: this.session.sessionId },
    })
    return { interrompu: true }
  }

  async choisirModele(modelId) {
    const session = await this.ouvrirSession()
    await this.appeler('session/set_model', { sessionId: session.sessionId, modelId })
    session.modeleActuel = modelId
    this.emettre({ type: 'modele', modele: modelId })
    return { modele: modelId }
  }

  async choisirMode(modeId) {
    const session = await this.ouvrirSession()
    await this.appeler('session/set_mode', { sessionId: session.sessionId, modeId })
    session.modeActuel = modeId
    this.emettre({ type: 'mode', mode: modeId })
    return { mode: modeId }
  }
}

/**
 * Le contenu ACP est une liste de blocs typés. On n'en garde que le texte
 * lisible : l'interface montre ce qu'a fait l'outil, pas la structure du
 * protocole.
 */
function extraireContenu(contenu) {
  if (!contenu) return ''
  const blocs = Array.isArray(contenu) ? contenu : [contenu]
  const morceaux = []
  for (const bloc of blocs) {
    if (!bloc) continue
    if (typeof bloc === 'string') {
      morceaux.push(bloc)
    } else if (bloc.type === 'content' && bloc.content) {
      morceaux.push(bloc.content.text || '')
    } else if (bloc.type === 'diff') {
      morceaux.push(bloc.path ? `Modification de ${bloc.path}` : 'Modification de fichier')
    } else if (bloc.text) {
      morceaux.push(bloc.text)
    }
  }
  const texte = morceaux.filter(Boolean).join('\n').trim()
  // Une sortie de commande peut peser des dizaines de milliers de caracteres :
  // au-dela, on coupe cote serveur plutot que d'inonder le navigateur.
  return texte.length > 4000 ? texte.slice(0, 4000) + '\n[...]' : texte
}
