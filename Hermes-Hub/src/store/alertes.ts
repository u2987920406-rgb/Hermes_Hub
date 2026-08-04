/**
 * La matiere des alertes : les traces de scenarios finis, et leur conservation.
 *
 * DANS SON PROPRE FICHIER, et le cliquet des tailles y est pour quelque chose :
 * `useHubStore.ts` est un carrefour que chaque fonctionnalite edite, et
 * `ARCHITECTURE.md` a deja note ou ca menait. Ce qui a un etat propre et une
 * regle de conservation propre merite son fichier - c'est le premier critere
 * du §3.
 */

/**
 * La trace d'un scenario qui a fini.
 *
 * C5 : **un scenario fini laisse une trace persistante.** L'evenement
 * `chantier-fin` ne passe qu'une fois, dans le flux ; qui n'avait pas le Hub
 * sous les yeux a cet instant-la ne saura jamais que le travail est arrive au
 * bout. Une notification volante ne repare rien - elle disparait toute seule au
 * bout de trois secondes, c'est-a-dire exactement le comportement qu'on
 * reproche a l'evenement.
 *
 * D'ou une trace qui reste jusqu'a ce qu'on l'ait vue et ecartee, et qui
 * survit au rechargement de la page : `localStorage` plutot que le serveur,
 * parce que « j'ai vu » est une affaire de poste et de personne, pas du
 * workspace partage avec Hermes.
 */
export interface ScenarioFini {
  /** L'identifiant de la trace, pas celui du scenario : on peut en avoir deux. */
  cle: string
  titre: string
  faites: number
  echouees: number
  /** Au-dessus de zero, il reste des taches que le tableau ne debloquera pas
      tout seul - une bloquee, ou un parent en echec. Ce n'est pas un succes. */
  restantes: number
  arrete: boolean
  quand: number
}

const CLE_TRACES = 'hub.alertes.scenarios'

/** Au-dela, les plus anciennes tombent : une trace qu'on n'a pas ecartee en
    vingt scenarios ne sera jamais lue, et une liste sans fin devient un
    journal - or le journal n'a plus de colonne, c'est ecrit. */
export const TRACES_GARDEES = 20

export function lireTraces(): ScenarioFini[] {
  try {
    const brut = localStorage.getItem(CLE_TRACES)
    return brut ? (JSON.parse(brut) as ScenarioFini[]) : []
  } catch {
    return []
  }
}

export function ecrireTraces(traces: ScenarioFini[]) {
  try {
    localStorage.setItem(CLE_TRACES, JSON.stringify(traces.slice(-TRACES_GARDEES)))
  } catch {
    /* navigation privee : la trace vaut pour la session, elle ne survit pas */
  }
}
