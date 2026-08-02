/**
 * L'ATELIER - les molettes de design, dans la page.
 *
 * Ce fichier vit HORS de `src/`. Vite ne le voit donc jamais et il ne peut pas
 * entrer dans `dist/` : ce qui part chez un client ne contient pas une ligne de
 * ce qui suit. Le serveur ne le sert - et n'ajoute sa balise dans la page - que
 * si `HUB_ATELIER=1`, ce que seul `dev-v2.ps1` fait.
 *
 * Deux garde-fous plutot qu'un, parce qu'un seul finit toujours par sauter.
 *
 * Ce qu'il fait :
 *   - une pastille ouvre et ferme le panneau. Elle se deplace au glisser :
 *     clouee dans un coin, elle finissait toujours par recouvrir ce qu'on
 *     voulait regarder ;
 *   - les molettes ne sont PAS ecrites ici, elles sont decouvertes dans les
 *     feuilles de style : une variable ajoutee dans `index.css` apparait toute
 *     seule au prochain chargement. Celles qui n'agissent pas sur la page
 *     affichee se rangent dans un repli ;
 *   - « Copier mes reglages » ne copie que ce qui a change, pret a coller ;
 *   - le viseur nomme la zone survolee, pour dire « ca » sans la decrire ;
 *   - Alt + clic reference un element : ses regles, leur fichier et leur ligne
 *     dans la feuille SOURCE, et la variable posee sur lui seul. De quoi
 *     designer au lieu de decrire.
 *
 * Aucun reglage n'est enregistre : recharger la page les annule tous. Seule
 * exception, la position de la pastille, gardee en `localStorage` - sinon il
 * faudrait la ranger a chaque chargement, ce qui est exactement la corvee
 * qu'elle est censee supprimer.
 */
;(function () {
  var ID = 'atelier-hub'

  /**
   * Les familles de molettes reconnues.
   *
   * Cette liste est le seul endroit du fichier qui connaisse le projet, et elle
   * a deja coute une deconvenue : les molettes du graphe ont ete ajoutees a
   * `index.css` sans etre ajoutees ici, donc elles n'apparaissaient nulle part
   * dans l'atelier - on pouvait les ecrire, pas les tourner. Une famille
   * nouvelle dans la console doit avoir son prefixe ici, ou elle reste
   * invisible.
   */
  var PREFIXES = [
    '--texte-',
    '--agent-',
    '--bulle-',
    '--densite',
    '--noeud-',
    '--liaison-',
    '--graphe-',
  ]

  var LIBELLES = {
    '--texte-echelle': 'Echelle generale du texte',
    '--texte-nom': 'Taille des prenoms',
    '--texte-metier': 'Taille des metiers',
    '--texte-corps': 'Taille des descriptions',
    '--texte-detail': 'Taille des mentions',
    '--agent-point': "Taille du point d'identite",
    '--agent-point-compact': 'Taille du point compact',
    '--agent-lisere': 'Force du lisere (fiche)',
    '--agent-lisere-noeud': 'Force du lisere (organigramme)',
    '--agent-lisere-vignette': 'Force du lisere (vignette)',
    '--agent-halo': 'Halo autour du point',
    '--agent-halo-taille': 'Epaisseur du halo',
    '--bulle-rayon': 'Rondeur des bulles',
    '--bulle-largeur': 'Largeur des bulles',
    '--bulle-retrait': 'Retrait sous le nom',
    '--densite': 'Densite des listes',
    '--noeud-titre': 'Taille du titre (graphe)',
    '--noeud-zoom': 'Soulevement du noeud au travail',
    '--noeud-aura': "Portee de l'aura",
    '--noeud-respire': 'Vitesse de la respiration',
    '--noeud-eclair': 'Duree des accents brefs',
    '--noeud-succes': 'Fondu vers termine',
    '--noeud-fini': 'Force du lisere termine',
    '--liaison-scintille': 'Vitesse des tirets',
    '--liaison-repos': 'Opacite des liaisons au repos',
    '--liaison-estompee': 'Opacite hors du chemin actif',
    '--graphe-mouvement': 'Vitesse generale (0 = fige)',
  }

  /**
   * Ou chaque molette est ecrite dans la feuille source, et quelles regles la
   * consomment. Rempli une fois au premier clic, puis garde.
   *
   * On lit la feuille SOURCE et non celle du navigateur : la premiere a des
   * numeros de ligne auxquels on peut renvoyer, la seconde est minifiee.
   */
  var source = { texte: null, lignes: null }

  function chargerSource(apres) {
    if (source.lignes) return apres()
    fetch('/atelier-source.css')
      .then(function (r) {
        return r.ok ? r.text() : ''
      })
      .catch(function () {
        return ''
      })
      .then(function (t) {
        source.texte = t
        source.lignes = t ? t.split('\n') : []
        apres()
      })
  }

  /** La premiere ligne de la feuille source ou ce texte apparait. */
  function ligneDe(aiguille) {
    if (!source.lignes || !aiguille) return null
    for (var i = 0; i < source.lignes.length; i++) {
      if (source.lignes[i].indexOf(aiguille) > -1) return i + 1
    }
    return null
  }

  /**
   * La ligne ou un SELECTEUR est declare - et rien d'autre.
   *
   * La recherche de sous-chaine ne suffit pas, et ca s'est vu : `*` apparait
   * dans chaque commentaire CSS (`/* ... *​/`), donc le selecteur universel
   * trouvait toujours une ligne, passait le crible, et polluait chaque releve
   * avec les remises a zero de Tailwind. On exige donc que le selecteur soit en
   * DEBUT de ligne et suivi d'une accolade ou d'une virgule - c'est-a-dire
   * qu'il soit vraiment declare la, pas mentionne en passant.
   */
  function ligneDuSelecteur(sel) {
    if (!source.lignes || !sel) return null
    // Un selecteur trop general ne designe rien d'utile a changer.
    if (/^(\*|html|body|:root|::?[a-z-]+)$/i.test(sel)) return null
    var echappe = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    var motif = new RegExp('^\\s*' + echappe + '\\s*[,{]')
    for (var i = 0; i < source.lignes.length; i++) {
      if (motif.test(source.lignes[i])) return i + 1
    }
    return null
  }

  /**
   * Les regles CSS qui s'appliquent VRAIMENT a un element, et les molettes
   * qu'elles consomment.
   *
   * C'est le coeur du referencement : on ne devine pas, on demande au
   * navigateur quelles regles matchent, puis on lit leur texte. Une regle
   * portee par une classe partagee - `.lisere-agent` - gouverne toutes les
   * occurrences de l'application : cliquer une seule suffit donc a designer
   * l'ensemble, sans avoir a les cliquer une par une.
   */
  function reglesDe(el) {
    var trouvees = []
    for (var i = 0; i < document.styleSheets.length; i++) {
      var regles
      try {
        regles = document.styleSheets[i].cssRules
      } catch (e) {
        continue
      }
      for (var j = 0; j < regles.length; j++) {
        var r = regles[j]
        if (!r.selectorText || !r.style) continue
        var match = false
        try {
          match = el.matches(r.selectorText)
        } catch (e) {
          continue // sélecteur exotique : on passe plutot que de tout arreter
        }
        if (!match) continue

        // Le crible, et c'est lui qui fait la difference entre un releve utile
        // et du bruit : on ne garde que ce qui est ECRIT DANS LA FEUILLE
        // SOURCE. Tout le reste - les remises a zero de Tailwind (`*`,
        // `::before`, `img, svg, video`) et ses milliers d'utilitaires
        // (`.h-3\.5`) - est genere, ne se modifie pas a la main, et n'a donc
        // rien a faire dans un releve destine a dire ou aller changer quelque
        // chose. Sans ce crible, un clic rendait quinze lignes dont aucune
        // n'etait exploitable.
        var premier = r.selectorText.split(',')[0].trim()
        if (!ligneDuSelecteur(premier)) continue

        var vars = (r.cssText.match(/var\((--[a-z0-9-]+)/g) || []).map(function (v) {
          return v.slice(4)
        })
        trouvees.push({ selecteur: r.selectorText, vars: vars })
      }
    }
    return trouvees
  }

  /**
   * Le nom d'un element, pour un humain.
   *
   * Le viseur affichait `el.textContent`, qui ramasse le texte de toute la
   * descendance : cliquer un noeud rendait « Une phrase sur la
   * pluieGabrielTermineeUne phrase sur le sole ». Illisible, et surtout ca ne
   * disait pas QUOI on designe. On rend desormais son identite : la zone, la
   * balise, et les classes qui viennent de la feuille source.
   */
  function nomDe(el) {
    var bouts = []
    var zone = el.closest('[data-zone]')
    if (zone) bouts.push(zone.dataset.zone)

    var balise = el.tagName.toLowerCase()
    if (balise === 'svg' || balise === 'path' || balise === 'img') bouts.push('icone')
    else bouts.push(balise)

    // Seules les classes ecrites a la main : les utilitaires generes ne
    // nomment rien.
    var propres = []
    var cl = (el.getAttribute('class') || '').split(/\s+/)
    for (var i = 0; i < cl.length && propres.length < 3; i++) {
      if (cl[i] && ligneDuSelecteur('.' + cl[i])) propres.push('.' + cl[i])
    }
    if (propres.length) bouts.push(propres.join(''))

    var texte = ''
    // Le texte propre a l'element, sans celui de ses enfants.
    for (var n = 0; n < el.childNodes.length; n++) {
      if (el.childNodes[n].nodeType === 3) texte += el.childNodes[n].nodeValue
    }
    texte = texte.trim().slice(0, 30)
    if (texte) bouts.push('« ' + texte + ' »')

    return bouts.join(' · ')
  }

  /**
   * Les molettes vivantes sur la page affichee.
   *
   * Une molette compte si une regle qui la consomme correspond a un element
   * present a l'ecran maintenant. Aucune liste de pages n'est tenue a la main :
   * une telle liste se perimerait au premier composant ajoute, et personne ne
   * penserait a la mettre a jour.
   */
  function molettesDeLaPage(noms) {
    var vivantes = {}
    for (var i = 0; i < document.styleSheets.length; i++) {
      var regles
      try {
        regles = document.styleSheets[i].cssRules
      } catch (e) {
        continue
      }
      for (var j = 0; j < regles.length; j++) {
        var r = regles[j]
        if (!r.selectorText || !r.cssText) continue
        var utilisees = r.cssText.match(/var\((--[a-z0-9-]+)/g)
        if (!utilisees) continue
        var present = false
        try {
          present = !!document.querySelector(r.selectorText)
        } catch (e) {
          continue
        }
        if (!present) continue
        for (var k = 0; k < utilisees.length; k++) vivantes[utilisees[k].slice(4)] = true
      }
    }
    var ici = []
    var ailleurs = []
    for (var n = 0; n < noms.length; n++) {
      ;(vivantes[noms[n]] ? ici : ailleurs).push(noms[n])
    }
    return { ici: ici, ailleurs: ailleurs }
  }

  /** Les molettes se decouvrent : ce fichier n'a pas a connaitre le projet. */
  function trouverMolettes() {
    var noms = []
    for (var i = 0; i < document.styleSheets.length; i++) {
      var regles
      try {
        regles = document.styleSheets[i].cssRules
      } catch (e) {
        continue // feuille d'une autre origine : illisible, on passe
      }
      for (var j = 0; j < regles.length; j++) {
        var st = regles[j].style
        if (!st) continue
        for (var k = 0; k < st.length; k++) {
          var p = st[k]
          if (p.indexOf('--') !== 0) continue
          for (var x = 0; x < PREFIXES.length; x++) {
            if (p.indexOf(PREFIXES[x]) === 0 && noms.indexOf(p) < 0) noms.push(p)
          }
        }
      }
    }
    return noms.sort()
  }

  function lire(v) {
    var brut = getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    var m = brut.match(/-?[\d.]+/)
    return {
      n: m ? parseFloat(m[0]) : 0,
      calc: brut.indexOf('calc(') === 0,
      unite: brut.indexOf('%') > -1 ? '%' : brut.indexOf('px') > -1 ? 'px' : '',
    }
  }

  /** Des bornes deduites de la valeur : un reglage a 10px n'a pas la meme
      amplitude utile qu'un pourcentage. */
  function bornes(n, u) {
    if (u === '%') return [0, 100, 5]
    if (u === 'px') return [0, Math.max(30, Math.ceil(n * 2.5)), n < 6 ? 0.5 : 1]
    return [0.7, 1.5, 0.05]
  }

  var ouvert = null
  var arreterViseur = null

  function fermer() {
    if (ouvert) ouvert.remove()
    ouvert = null
    if (arreterViseur) arreterViseur()
    arreterViseur = null
  }

  function ouvrir() {
    // Chargee des l'ouverture, et non au premier clic : le viseur en a besoin
    // pour nommer ce qu'il survole.
    chargerSource(function () {})
    var tousLesNoms = trouverMolettes()
    // Ce qui agit sur la page affichee vient en premier ; le reste existe
    // toujours, replie. Regler le graphe depuis le Studio ne doit pas obliger a
    // traverser les molettes des bulles de conversation.
    var tri = molettesDeLaPage(tousLesNoms)
    var noms = tri.ici.concat(tri.ailleurs)
    var depart = {}
    var courant = {}

    var p = document.createElement('div')
    p.id = ID
    p.style.cssText =
      'position:fixed;bottom:64px;right:16px;z-index:2147483646;width:340px;max-height:82vh;' +
      'overflow:auto;padding:14px;border-radius:12px;background:#0c1524;color:#e2e8f0;' +
      'font:12px system-ui;box-shadow:0 12px 40px -8px rgba(0,0,0,.6)'

    var titre = document.createElement('div')
    titre.style.cssText = 'display:flex;align-items:flex-start;gap:8px'
    var titreTexte = document.createElement('div')
    titreTexte.style.cssText = 'flex:1;min-width:0'
    titreTexte.innerHTML =
      '<div style="font-weight:700">Atelier</div>' +
      '<div style="opacity:.6;margin-bottom:10px">' +
      tri.ici.length +
      ' molettes agissent ici' +
      (tri.ailleurs.length ? ' - ' + tri.ailleurs.length + ' ailleurs' : '') +
      '<br>rien n est enregistre</div>'
    titre.appendChild(titreTexte)

    // Le bord d'accueil : gauche ou droite.
    //
    // Deplacer la pastille ne suffisait pas - c'est le panneau qui masque, et
    // il est bien plus large qu'elle. Tant qu'il reste du meme cote, une partie
    // de l'ecran demeure hors de portee du viseur : on ne peut ni la regarder,
    // ni cliquer dedans. Un bouton qui envoie tout l'atelier sur l'autre bord
    // garantit qu'aucun pixel n'est definitivement couvert.
    var bascule = document.createElement('button')
    bascule.title = 'Envoyer l atelier de l autre cote'
    bascule.style.cssText =
      'flex:none;width:26px;height:26px;border:0;border-radius:7px;background:#1e293b;' +
      'color:#38bdf8;cursor:pointer;font:14px/1 system-ui'
    function dessinerBascule() {
      bascule.textContent = cote() === 'droite' ? '◀' : '▶'
    }
    dessinerBascule()
    bascule.onclick = function () {
      poserCote(cote() === 'droite' ? 'gauche' : 'droite')
      dessinerBascule()
      var bt = document.getElementById(ID + '-bouton')
      if (bt) {
        rangerPastille(bt)
        placerPanneau(p, bt)
      }
    }
    titre.appendChild(bascule)
    p.appendChild(titre)

    var zoneIci = document.createElement('div')
    p.appendChild(zoneIci)

    // Le repli : present, mais ferme. Les molettes qui n'agissent pas sur cette
    // page ne sont pas supprimees - on peut vouloir en tourner une en sachant
    // ce qu'on fait - mais elles ne barrent plus la route a celles qui servent.
    var repli = document.createElement('details')
    repli.style.cssText = 'margin:6px 0 10px'
    var resume = document.createElement('summary')
    resume.style.cssText = 'cursor:pointer;color:#94a3b8;font:11px system-ui;padding:4px 0'
    resume.textContent = tri.ailleurs.length + ' molettes qui n agissent pas ici'
    repli.appendChild(resume)
    var zoneAilleurs = document.createElement('div')
    repli.appendChild(zoneAilleurs)
    if (tri.ailleurs.length) p.appendChild(repli)

    noms.forEach(function (v) {
      var d = lire(v)
      depart[v] = d.n
      courant[v] = d.n
      var b = bornes(d.n, d.unite)
      var suffixe = d.calc ? 'px' : d.unite

      var l = document.createElement('label')
      l.style.cssText = 'display:block;margin-bottom:11px'
      l.innerHTML =
        '<span style="display:flex;justify-content:space-between;gap:8px">' +
        '<span style="opacity:.9">' +
        (LIBELLES[v] || v) +
        '</span><b data-o="' +
        v +
        '">' +
        d.n +
        suffixe +
        '</b></span>'

      var i = document.createElement('input')
      i.type = 'range'
      i.min = b[0]
      i.max = b[1]
      i.step = b[2]
      i.value = d.n
      i.style.cssText = 'width:100%;margin-top:4px;accent-color:#38bdf8'
      i.oninput = function () {
        // Une taille declaree en `calc(Npx * var(--texte-echelle))` se regle par
        // son N : ecrire le resultat casserait l'echelle generale au premier
        // geste.
        var brut = d.calc ? 'calc(' + i.value + 'px * var(--texte-echelle))' : i.value + d.unite
        document.documentElement.style.setProperty(v, brut)
        courant[v] = parseFloat(i.value)
        p.querySelector('[data-o="' + v + '"]').textContent = i.value + suffixe
      }
      l.appendChild(i)
      ;(tri.ici.indexOf(v) > -1 ? zoneIci : zoneAilleurs).appendChild(l)
    })

    var barre = document.createElement('div')
    barre.style.cssText = 'display:flex;gap:6px;margin-top:4px'
    function bouton(texte, fn) {
      var b = document.createElement('button')
      b.textContent = texte
      b.style.cssText =
        'flex:1;padding:7px;border:0;border-radius:8px;background:#1e293b;color:#e2e8f0;' +
        'font:600 11px system-ui;cursor:pointer'
      b.onclick = fn
      barre.appendChild(b)
      return b
    }

    var copier = bouton('Copier mes reglages', function () {
      var lignes = []
      Object.keys(courant).forEach(function (v) {
        if (courant[v] === depart[v]) return
        var d = lire(v)
        lignes.push(
          '  ' +
            v +
            ': ' +
            (d.calc ? 'calc(' + courant[v] + 'px * var(--texte-echelle))' : courant[v] + d.unite) +
            ';',
        )
      })
      var txt = lignes.length ? lignes.join('\n') : '(rien de change)'
      navigator.clipboard.writeText(txt).then(function () {
        copier.textContent = lignes.length ? 'Copie - colle-le a Claude' : 'Rien de change'
        setTimeout(function () {
          copier.textContent = 'Copier mes reglages'
        }, 2500)
      })
    })

    bouton('Tout remettre', function () {
      Object.keys(depart).forEach(function (v) {
        document.documentElement.style.removeProperty(v)
      })
      fermer()
    })
    p.appendChild(barre)

    // --- Le viseur : nommer ce qu'on montre du doigt -------------------------
    var badge = document.createElement('div')
    badge.style.cssText =
      'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:2147483646;' +
      'padding:8px 14px;border-radius:10px;background:#0c1524;color:#e2e8f0;font:12px system-ui;' +
      'box-shadow:0 8px 30px -6px rgba(0,0,0,.6);pointer-events:none;max-width:60vw'
    badge.textContent = 'Vise : promene ta souris sur la page'
    document.body.appendChild(badge)

    var dernier = null
    function surSouris(e) {
      var el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el === dernier || el.closest('#' + ID) || el.closest('#' + ID + '-bouton')) return
      if (dernier) dernier.style.outline = ''
      dernier = el
      el.style.outline = '2px solid #38bdf8'
      var zone = el.closest('[data-zone]')
      var st = getComputedStyle(el)
      window.__vise = {
        zone: zone ? zone.dataset.zone : '(hors zone)',
        nom: nomDe(el),
        taille: st.fontSize,
      }
      badge.textContent = window.__vise.nom + '  -  ' + st.fontSize + '   (Alt+clic)'
    }
    document.addEventListener('mousemove', surSouris, { passive: true })

    // --- Le clic : designer au lieu de decrire --------------------------------
    //
    // Le viseur savait deja nommer ce qu'on survole. Ce qui manquait, c'est de
    // pouvoir le SAISIR : on cliquait un element, et il fallait encore aller
    // chercher a la main quelle molette le concerne et dans quel fichier sa
    // regle est ecrite. Le clic rend maintenant ce dossier complet.
    var releves = []
    function surClic(e) {
      if (!e.altKey) return // sans Alt, la page reste utilisable normalement
      var el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el || el.closest('#' + ID) || el.closest('#' + ID + '-bouton')) return
      e.preventDefault()
      e.stopPropagation()

      chargerSource(function () {
        // On remonte jusqu'a un element qui a une identite.
        //
        // Un clic tombe presque toujours sur un `div` de mise en page, sans
        // classe a nous ni zone : le releve rendait alors « div » et rien
        // d'exploitable. On grimpe donc de quelques crans jusqu'a trouver un
        // element que la feuille source connait - c'est celui-la qu'on voulait
        // designer, et c'est ce que l'oeil croyait cliquer.
        var cible = el
        for (var pas = 0; pas < 5; pas++) {
          if (reglesDe(cible).length || cible.hasAttribute('data-zone')) break
          if (!cible.parentElement) break
          cible = cible.parentElement
        }
        el = cible

        var zone = el.closest('[data-zone]')
        var regles = reglesDe(el)

        // Le levier PAR INSTANCE.
        //
        // Les regles ci-dessus sont partagees : les changer repeindrait toutes
        // les occurrences. Ce qui distingue un noeud d'un autre, c'est la
        // variable posee en ligne sur lui - `--agent` porte la couleur de son
        // agent. Vouloir « celui-la en jaune » ne se joue donc pas dans la
        // feuille de style mais sur cette variable, et il faut le dire, sinon
        // la demande est impossible a satisfaire telle qu'elle est ecrite.
        var propres = []
        var porteur = el
        for (var h = 0; h < 6 && porteur; h++) {
          var st2 = porteur.getAttribute('style') || ''
          var trouves = st2.match(/--[a-z0-9-]+\s*:[^;]+/gi)
          if (trouves) {
            trouves.forEach(function (d) {
              var nom = d.split(':')[0].trim()
              propres.push(
                nom +
                  ' = ' +
                  getComputedStyle(porteur).getPropertyValue(nom).trim() +
                  ' (pose sur cet element seul)',
              )
            })
            break
          }
          porteur = porteur.parentElement
        }
        var vus = {}
        var molettes = []
        regles.forEach(function (r) {
          r.vars.forEach(function (v) {
            if (!vus[v]) {
              vus[v] = true
              molettes.push(v)
            }
          })
        })

        var releve = {
          page: (location.hash || '#/home').replace(/^#\/?/, '') || 'home',
          zone: zone ? zone.dataset.zone : '(hors zone)',
          nom: nomDe(el),
          regles: regles
            .map(function (r) {
              var l = ligneDuSelecteur(r.selecteur.split(',')[0].trim())
              return r.selecteur + (l ? '  -> src/index.css:' + l : '')
            })
            .slice(0, 6),
          instance: propres,
          molettes: molettes
            .map(function (v) {
              // La valeur lue a la racine. Vide veut dire que la variable n'est
              // pas une molette globale mais un porteur d'identite pose sur
              // chaque element - `--agent` en est le cas type. La ligne
              // « pose sur cet element seul » juste en dessous le dit deja et
              // le dit mieux : on ne la repete pas ici avec un blanc.
              var val = getComputedStyle(document.documentElement)
                .getPropertyValue(v)
                .trim()
              if (!val) return null
              var l = ligneDuSelecteur(v) || ligneDe('  ' + v + ':')
              return v + ' = ' + val + (l ? '  (src/index.css:' + l + ')' : '')
            })
            .filter(function (x) {
              return x
            }),
        }
        releves.push(releve)
        rendreReleves()
      })
    }

    var panneau = document.createElement('div')
    panneau.style.cssText =
      'margin-top:14px;padding:10px;border-radius:10px;border:1px solid #38bdf8;' +
      'background:#0a1020;font:11px ui-monospace,monospace'
    var enTete = document.createElement('div')
    enTete.style.cssText =
      'font:700 12px system-ui;color:#38bdf8;margin-bottom:2px;display:flex;' +
      'align-items:center;gap:6px'
    enTete.textContent = 'Designer un element'
    panneau.appendChild(enTete)
    var aide = document.createElement('p')
    aide.style.cssText = 'margin:0 0 8px;color:#94a3b8;font:11px system-ui;line-height:1.4'
    aide.textContent =
      'Maintiens Alt et clique ce dont tu veux parler. Sa regle et son fichier apparaissent ici.'
    panneau.appendChild(aide)
    var liste = document.createElement('div')
    panneau.appendChild(liste)

    // La portee : ici seulement, ou partout.
    //
    // Une regle portee par une classe partagee gouverne toute l'application.
    // C'est ce qui rend le clic si rentable - une occurrence suffit a designer
    // l'ensemble - mais c'est aussi un piege : « les liseres en jaune » dit
    // depuis le Studio ne veut pas forcement dire « en jaune sur l'accueil
    // aussi ». La demande doit donc porter sa portee, sinon elle sera comprise
    // au plus large et il faudra revenir en arriere.
    var portee = document.createElement('label')
    portee.style.cssText =
      'display:flex;align-items:center;gap:6px;margin-top:8px;font:11px system-ui;color:#94a3b8'
    var casePortee = document.createElement('input')
    casePortee.type = 'checkbox'
    portee.appendChild(casePortee)
    portee.appendChild(document.createTextNode('Seulement sur cette page'))
    panneau.appendChild(portee)

    var mot = document.createElement('textarea')
    mot.placeholder = 'Ce que tu veux pour ces elements - « tous les liseres en bleu »...'
    mot.style.cssText =
      'width:100%;margin-top:8px;min-height:70px;border-radius:8px;border:1px solid #334155;' +
      'background:#111c30;color:#e2e8f0;padding:8px;font:12px system-ui;resize:vertical;' +
      'box-sizing:border-box'
    panneau.appendChild(mot)

    function rendreReleves() {
      liste.innerHTML = ''
      releves.forEach(function (r, i) {
        var bloc = document.createElement('div')
        bloc.style.cssText =
          'margin-bottom:6px;padding:6px 8px;border-radius:8px;background:#0b1220;color:#cbd5e1'
        bloc.textContent =
          '[' +
          r.page +
          ' > ' +
          r.zone +
          '] ' +
          r.nom +
          '\n' +
          r.regles.join('\n') +
          (r.molettes.length ? '\n' + r.molettes.join('\n') : '') +
          (r.instance.length ? '\n' + r.instance.join('\n') : '')
        bloc.style.whiteSpace = 'pre-wrap'
        var x = document.createElement('button')
        x.textContent = '×'
        x.title = 'Retirer cet element'
        x.style.cssText =
          'float:right;margin-left:6px;width:20px;height:20px;border:0;border-radius:50%;' +
          'background:#dc2626;color:#fff;cursor:pointer;font:700 14px/1 system-ui;' +
          'display:grid;place-items:center'
        x.onclick = function () {
          releves.splice(i, 1)
          rendreReleves()
        }
        bloc.insertBefore(x, bloc.firstChild)
        liste.appendChild(bloc)
      })
    }

    var copierDemande = bouton('Copier la demande', function () {
      if (!releves.length && !mot.value.trim()) return
      var texte =
        'Elements designes dans l-atelier :\n\n' +
        releves
          .map(function (r) {
            return (
              '[' + r.page + '] ' + r.nom + '\n' +
              r.regles.join('\n') +
              (r.molettes.length ? '\n' + r.molettes.join('\n') : '') +
              (r.instance.length ? '\n' + r.instance.join('\n') : '')
            )
          })
          .join('\n\n') +
        (mot.value.trim() ? '\n\nCe que je veux :\n' + mot.value.trim() : '') +
        '\n\nPortee : ' +
        (casePortee.checked
          ? 'UNIQUEMENT sur la page ' +
            ((location.hash || '#/home').replace(/^#\/?/, '') || 'home') +
            ' - les regles ci-dessus sont partagees par toute l-application, il faut donc' +
            ' les restreindre a cette page plutot que les modifier.'
          : 'partout - ces regles sont communes a toute l-application.')
      navigator.clipboard.writeText(texte).then(function () {
        copierDemande.textContent = 'Copie !'
        setTimeout(function () {
          copierDemande.textContent = 'Copier la demande'
        }, 1200)
      })
    })
    panneau.appendChild(copierDemande)
    p.appendChild(panneau)

    document.addEventListener('click', surClic, true)

    // Alt enfonce : le panneau se retire du chemin.
    //
    // Le deplacer ou le basculer d'un bord a l'autre reduit la gene, mais ne la
    // supprime pas : il couvrira toujours quelque chose. Or le geste du viseur
    // est justement Alt + clic. Tant que la touche est tenue, le panneau
    // devient translucide ET transparent a la souris - on vise donc a travers
    // lui, y compris ce qu'il masquait une seconde plus tot. C'est ce qui rend
    // l'ecran entier atteignable, quel que soit l'endroit ou l'atelier se
    // trouve.
    function surAlt(e) {
      var tenu = e.type === 'keydown' && e.altKey
      p.style.opacity = tenu ? '.22' : '1'
      p.style.pointerEvents = tenu ? 'none' : 'auto'
      var bt = document.getElementById(ID + '-bouton')
      if (bt) {
        bt.style.opacity = tenu ? '.15' : ouvert ? '1' : '.55'
        bt.style.pointerEvents = tenu ? 'none' : 'auto'
      }
    }
    document.addEventListener('keydown', surAlt)
    document.addEventListener('keyup', surAlt)
    // Un Alt relache hors de la fenetre laisserait le panneau fantome.
    window.addEventListener('blur', surAlt)

    arreterViseur = function () {
      document.removeEventListener('keydown', surAlt)
      document.removeEventListener('keyup', surAlt)
      window.removeEventListener('blur', surAlt)
      document.removeEventListener('mousemove', surSouris)
      document.removeEventListener('click', surClic, true)
      if (dernier) dernier.style.outline = ''
      badge.remove()
    }

    document.body.appendChild(p)
    ouvert = p
    var bouton = document.getElementById(ID + '-bouton')
    if (bouton) placerPanneau(p, bouton)
  }

  // --- La pastille : le seul point d'entree -----------------------------------
  //
  // Elle etait clouee en bas a droite, et un bouton cloue finit toujours par
  // recouvrir quelque chose : ici les commandes de zoom et la minimap du
  // canevas, ailleurs un menu. Un outil de design qui cache ce qu'on veut
  // regarder se retourne contre lui-meme. On la deplace donc, et sa position
  // survit au rechargement - sans quoi il faudrait la ranger a chaque fois.
  var CLE_POSITION = 'atelier-hub:pastille'
  var CLE_COTE = 'atelier-hub:cote'

  function cote() {
    try {
      return localStorage.getItem(CLE_COTE) === 'gauche' ? 'gauche' : 'droite'
    } catch (e) {
      return 'droite'
    }
  }

  function poserCote(c) {
    try {
      localStorage.setItem(CLE_COTE, c)
      // Une position posee a la main appartenait a l'ancien bord : la garder
      // renverrait la pastille exactement la ou on vient de la chasser.
      localStorage.removeItem(CLE_POSITION)
    } catch (e) {
      /* stockage refuse : le choix vaut pour cette session */
    }
  }

  /** Remet la pastille dans le coin du bord courant. */
  function rangerPastille(b) {
    b.style.left = 'auto'
    b.style.right = 'auto'
    b.style.top = 'auto'
    b.style.bottom = '16px'
    if (cote() === 'gauche') b.style.left = '16px'
    else b.style.right = '16px'
  }

  function positionGardee() {
    try {
      var brut = localStorage.getItem(CLE_POSITION)
      if (!brut) return null
      var p = JSON.parse(brut)
      // Une fenetre retrecie depuis peut avoir laisse la pastille dehors.
      if (p.x < 0 || p.y < 0 || p.x > innerWidth - 20 || p.y > innerHeight - 20) return null
      return p
    } catch (e) {
      return null
    }
  }

  function poser() {
    if (document.getElementById(ID + '-bouton')) return
    var b = document.createElement('button')
    b.id = ID + '-bouton'
    b.title = 'Atelier de design - glisse-moi pour me deplacer'
    b.innerHTML = '&#9881;'
    var garde = positionGardee()
    b.style.cssText =
      'position:fixed;z-index:2147483647;width:38px;height:38px;' +
      'border:0;border-radius:50%;background:#0c1524;color:#38bdf8;font-size:17px;' +
      'cursor:grab;box-shadow:0 6px 20px -6px rgba(0,0,0,.7);opacity:.55;' +
      'transition:opacity .15s;touch-action:none;' +
      (garde
        ? 'left:' + garde.x + 'px;top:' + garde.y + 'px;'
        : cote() === 'gauche'
          ? 'left:16px;bottom:16px;'
          : 'right:16px;bottom:16px;')
    b.onmouseenter = function () {
      b.style.opacity = '1'
    }
    b.onmouseleave = function () {
      b.style.opacity = ouvert ? '1' : '.55'
    }

    // Glisser ou cliquer : c'est la DISTANCE parcourue qui tranche, pas le
    // temps. Un seuil de quelques pixels evite qu'une main qui tremble
    // transforme un clic en deplacement, et qu'un deplacement ouvre le panneau
    // par surprise en arrivant.
    var glisse = false
    var depart = null

    b.addEventListener('pointerdown', function (e) {
      var r = b.getBoundingClientRect()
      depart = { sx: e.clientX, sy: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top }
      glisse = false
      b.setPointerCapture(e.pointerId)
    })

    b.addEventListener('pointermove', function (e) {
      if (!depart) return
      if (!glisse && Math.abs(e.clientX - depart.sx) + Math.abs(e.clientY - depart.sy) < 5) return
      glisse = true
      b.style.cursor = 'grabbing'
      var x = Math.min(Math.max(0, e.clientX - depart.dx), innerWidth - b.offsetWidth)
      var y = Math.min(Math.max(0, e.clientY - depart.dy), innerHeight - b.offsetHeight)
      b.style.left = x + 'px'
      b.style.top = y + 'px'
      b.style.right = 'auto'
      b.style.bottom = 'auto'
      if (ouvert) placerPanneau(ouvert, b)
    })

    b.addEventListener('pointerup', function (e) {
      b.releasePointerCapture(e.pointerId)
      b.style.cursor = 'grab'
      if (glisse) {
        var r = b.getBoundingClientRect()
        try {
          localStorage.setItem(CLE_POSITION, JSON.stringify({ x: r.left, y: r.top }))
        } catch (err) {
          /* stockage refuse : la position vaut pour cette session, tant pis */
        }
      } else {
        if (ouvert) fermer()
        else ouvrir()
        b.style.opacity = ouvert ? '1' : '.55'
      }
      depart = null
      glisse = false
    })

    document.body.appendChild(b)
  }

  /** Le panneau se range du cote ou il reste de la place, pres du bouton. */
  function placerPanneau(p, b) {
    var r = b.getBoundingClientRect()
    var largeur = 340
    var aDroite = cote() === 'droite'
    p.style.right = 'auto'
    p.style.bottom = 'auto'
    p.style.left = (aDroite ? Math.max(8, r.left - largeur - 10) : r.right + 10) + 'px'
    p.style.top = Math.max(8, Math.min(r.top - 40, innerHeight - 200)) + 'px'
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', poser)
  } else {
    poser()
  }
})()
