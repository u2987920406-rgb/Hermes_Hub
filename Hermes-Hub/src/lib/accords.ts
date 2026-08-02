/**
 * Identifier une demande d'autorisation.
 *
 * `demande` seul ne suffit pas, et c'est un piege qui ne se voit qu'a plusieurs
 * agents : l'identifiant vient du protocole ACP, et **chaque pont numerote ses
 * demandes depuis 1**. Sofia et Karim, chacun dans son processus, ont donc tous
 * les deux une demande « 3 ».
 *
 * Ce que ca donnait a l'ecran, mesure le 03/08/2026 sur un pole a six agents :
 * on cliquait « Allow edit », le serveur recevait bien la reponse, l'agent
 * repartait, le fichier s'ecrivait - et la carte restait affichee comme si rien
 * n'avait ete fait. Le filtre `d.demande !== demande` retirait la demande d'un
 * autre agent, et l'evenement suivant reposait celle qu'on venait d'accorder.
 * Pire qu'un silence : l'ecran affirmait qu'on attendait encore un accord deja
 * donne, et invitait a recliquer sur une action deja faite.
 *
 * Le serveur, lui, n'a jamais eu le probleme : il route par `(agent, demande)`
 * - c'est l'interface qui avait perdu la moitie de la cle en chemin.
 */
export function cleAccord(d: { agent?: string; demande: string }) {
  return `${d.agent || 'default'}:${d.demande}`
}

/** Retire la demande repondue - celle-ci, pas son homonyme chez un collegue. */
export function sansAccord<T extends { agent?: string; demande: string }>(
  liste: T[],
  agent: string,
  demande: string,
) {
  const cle = cleAccord({ agent, demande })
  return liste.filter((d) => cleAccord(d) !== cle)
}
