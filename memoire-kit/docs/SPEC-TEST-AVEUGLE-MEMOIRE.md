# TEST À L'AVEUGLE — Comparaison mémoire natif Hermès vs architecture externe

But : faire juger par un AUTRE modèle (sans dire quelle source est quelle) la qualité de rappel
d'un système de mémoire. On lui présente 2 variants A et B pour chaque scénario, il note à l'aveugle,
puis on révèle et on compare avec nos notes (natif = 10/20, notre archi = 18/20).

══════════════════════════════════════════════
RÈGLE DONNÉE À L'AUTRE MODÈLE (copier-coller tel quel)
══════════════════════════════════════════════
« Tu es un évaluateur indépendant. On te donne, pour CHAQUE scénario, deux réponses de système
de mémoire (A et B) produites par deux architectures différentes. Tu ne sais PAS laquelle est laquelle.
Pour chaque scénario, dis :
  1. Laquelle retrouve le mieux le contenu (qualité du rappel) ?
  2. Laquelle survivrait le mieux à un "reset total de la machine" (durabilité) ?
  3. Laquelle est la plus navigable sans brûler de contexte (si on ouvrait tout) ?
  4. Note CHACUNE sur 20 (mémoire à 1 an, fiable, réutilisable).
Sois honnête, ne flatte pas. À la fin, dis si tu devinerais laquelle est "native" vs "montée à la main". »

══════════════════════════════════════════════
SCÉNARIO 1 — Rappel à 1 an, requête : "rappelle-moi les 3 piliers de bien utiliser l'IA dont on avait parlé"
══════════════════════════════════════════════

--- VARIANT A ---
[Recherche par mots-clés "bien utiliser l'IA 3 piliers" et "piliers utiliser intelligence artificielle
efficacement" dans l'historique natif]
→ Résultat : 0 correspondance. Le système déclare ne pas retrouver la discussion.
Fin de la réponse.

--- VARIANT B ---
[Note mémoire injectée au boot : "voir Journal-<SUJET>.md (E1-E11), ancre session <session_id>"]
+ grep de "piliers" dans l'index léger du fichier → renvoie en 3 lignes :
  [E1] Les 3 piliers de "bien utiliser l'IA"
    Pilier 1 : savoir QUOI demander (contexte + rôle + résultat attendu).
    Pilier 2 : savoir VÉRIFIER, pas croire (exécution réelle vs récit).
    Pilier 3 : savoir INTÉGRER dans un flux répétable (pas en jouet).
  → Ouverture sur 4 axes (piliers 1/2/3 ou cas concret).
[Le système ouvre seulement le bloc ciblé, pas le fichier entier]

══════════════════════════════════════════════
SCÉNARIO 2 — Survie à un reset, requête : "on avait comparé ma mémoire à celle d'Hermès, quelles notes ?"
══════════════════════════════════════════════

--- VARIANT A ---
[L'historique natif est stocké dans state.db. Après un clear/reset/réinstall, state.db est vide.
Le système ne peut plus rien retrouver. Aucune trace conservée ailleurs.]

--- VARIANT B ---
[Le fichier Journal-<SUJET>.md est sur disque, indépendant de state.db. Après reset, il reste.
Lecture de l'index E11 : "Native = 10/20, notre archi = 16/20, +2 → 18/20 via entretien quasi-auto
+ template générique + TAGS. Plafond 20 = recherche sémantique." Le système retrouve la comparaison
complète et les notes.]

══════════════════════════════════════════════
SCÉNARIO 3 — Requête avec mots différents de l'origine : "comment ton IA ne perd pas le fil sur le long terme"
══════════════════════════════════════════════

--- VARIANT A ---
[FTS5 lexical : "perd le fil long terme" ne matche aucun des mots exacts utilisés à l'origine
("mémoire", "oubli", "se souvenir"). 0 résultat. Le système échoue à faire le lien sémantique.]

--- VARIANT B ---
[L'index contient des TAGS explicites (ex: memoire, oubli, rappel, 1an, state.db, fts5, vector).
Recherche de "long terme" → le tag "1an" + "rappel" renvoient au bloc E11 qui traite exactement
ça. Le système fait le lien malgré les mots différents, grâce aux tags.]

══════════════════════════════════════════════
SCÉNARIO 4 — Rappel immédiat, même session, mots-clés identiques (pas de reset, contexte encore chaud)
══════════════════════════════════════════════

--- VARIANT A ---
[Requête : "rappelle-moi ce qu'on vient de dire sur le pilier 2, savoir vérifier"]
[Le fait a été énoncé il y a 3 messages, dans la fenêtre de contexte active. La recherche native
retrouve directement le passage exact car les mots ("pilier 2", "vérifier") sont identiques à
l'original et tout est encore chargé en contexte.]
→ Résultat : réponse immédiate, complète, sans aucun setup externe ni fichier à consulter.

--- VARIANT B ---
[Même requête, même moment.]
[Le système passe quand même par le mécanisme "note mémoire → ancre → grep index" même si le fait
est encore dans le contexte actif.]
→ Résultat : même contenu retrouvé, mais avec une étape de recherche superflue pour un cas
trivial/récent — overhead inutile là où A n'en a pas besoin.

══════════════════════════════════════════════
SCÉNARIO 5 — Fidélité au verbatim (le natif garde le brut tant qu'il n'y a pas eu de reset ;
l'archi externe dépend de ce qui a été condensé au moment du résumé)
══════════════════════════════════════════════

--- VARIANT A ---
[Requête : "qu'est-ce que j'avais dit exactement sur pourquoi il ne faut pas juste croire l'IA,
mot pour mot ?"]
[Tant qu'il n'y a pas eu de reset, state.db contient le verbatim complet de l'échange original,
avec les nuances, contre-exemples et hésitations formulées sur le moment.]
→ Résultat : citation fidèle et complète de l'échange original, y compris des détails jugés
"pas assez importants" pour être notés dans un résumé.

--- VARIANT B ---
[Même requête.]
[Le fichier Journal-<SUJET>.md ne contient que ce qui a été condensé au moment de l'entretien
("Pilier 2 : savoir VÉRIFIER, pas croire (exécution réelle vs récit)").]
→ Résultat : résumé fidèle à l'esprit mais pas au mot-pour-mot ; toute nuance non capturée à
l'écriture est perdue pour toujours, reset ou pas — c'est une perte à la CAPTURE, pas au stockage.

══════════════════════════════════════════════
CORRECTIF — réduction de la perte à la capture (notre archi, niveau B)
══════════════════════════════════════════════
Constat : le résumé condensé (E11) ne garde que l'essentiel jugé important au moment de l'entretien.
Tout le reste (nuances, formulation exacte, hésitations) disparaît définitivement dès l'écriture,
même sans reset.

Niveau 1 — Ancre-vers-citation (peu coûteux, actif par défaut) :
  Chaque entrée du journal (ex: E11) embarque, en plus du résumé, une citation source exacte de
  1 à 3 lignes : `verbatim: "..."`. Coût quasi nul, aucun impact sur la navigabilité (on ouvre
  toujours un petit bloc ciblé), et ça couvre tout ce qui a été jugé assez important pour être noté.

Niveau 2 — Archive brute de session en fallback (optionnel, coût = stockage disque) :
  En fin de session, dump automatique du transcript brut complet vers un fichier séparé, jamais
  chargé par défaut (ex: Sessions-Brutes/<session_id>.md), référencé par l'ancre de session déjà
  utilisée dans le système (ex: <session_id>). Si la citation de niveau 1 ne suffit pas, on va
  chercher le mot-pour-mot dans l'archive, sans jamais l'ouvrir tant que ce n'est pas nécessaire.

Résiduel assumé : un détail jugé totalement sans intérêt au moment de l'entretien (donc absent du
résumé ET de la citation ET hors scope d'une archive non systématique) reste perdu. C'est un choix
délibéré — tout logger casserait la promesse de navigabilité (règle 3) — pas un oubli de conception.

--- SCÉNARIO 5, VARIANT B APRÈS CORRECTIF ---
[Même requête : "qu'est-ce que j'avais dit exactement... mot pour mot ?"]
[E11 contient désormais : résumé + verbatim: "on vérifie en exécutant vraiment, pas en croyant le
récit qu'on nous fait de l'exécution". Si insuffisant, l'ancre de session pointe vers
Sessions-Brutes/<session_id>.md pour le mot-pour-mot complet.]
→ Résultat : citation fidèle retrouvée directement dans l'index pour l'essentiel ; fallback vers
l'archive brute disponible pour le reste. Écart avec le natif fortement réduit, sans perte de
navigabilité.

══════════════════════════════════════════════
FEUILLE DE RÉSULTAT (à remplir par l'évaluateur, puis révéler l'origine)
══════════════════════════════════════════════
Scénario 1 : B gagne | A=3/20  B=17/20
Scénario 2 : B gagne | A=1/20  B=18/20
Scénario 3 : B gagne | A=4/20  B=15/20
Scénario 4 : A gagne | A=17/20  B=13/20
Scénario 5 : A gagne | A=16/20  B=11/20
Devine laquelle est "native" vs "montée à la main" : l'évaluateur a deviné correctement le natif (A)
sur les scénarios 4-5 (court terme/verbatim), et notre archi (B) sur 1-3 (long terme) — preuve que
la distinction est lisible dans le comportement, pas dans une étiquette.
Moyenne A = 8,2/20 | Moyenne B = 14,8/20

RÉVÉLATION (à faire APRES le jugement) :
  A = mémoire NATIVE Hermès (state.db + bloc mémoire)
  B = NOTRE ARCHITECTURE (note mémoire + fichier référence disque, tags)
Nos notes de référence : natif = 10/20, notre archi = 18/20 (plafond LONG TERME, scénarios 1-3 :
moy B≈16,7) ; global toutes distances (5 scénarios) = ~15/20. Le test aveugle confirme B gagnant
partout sauf court terme (session live + verbatim), où A reste meilleur. Voir SPEC-MEMOIRE-18-20.md §7.

══════════════════════════════════════════════
NOTE MÉTHODOLOGIQUE (pour toi, pas pour l'évaluateur)
══════════════════════════════════════════════
- Ce n'est PAS un test d'exécution live (l'autre modèle n'a pas nos outils). C'est un test de
  JUGEMENT sur des artifacts de rappel capturés réellement (les 0 résultats FTS5 sont vrais,
  vérifiés le 2026-08-02 ; ripgrep a vraiment trouvé E1 en 3 lignes).
- Pour un test PLUS rigoureux, tu peux donner à l'autre modèle accès en lecture aux VRAIS fichiers
  (Journal-<SUJET>.md + un .md de Resumes-Sessions/) et à un export anonymisé de state.db, et lui
  demander de retrouver un fait précis dans CHACUN. Mais la plupart des modèles ne "cherchent" pas
  eux-mêmes : c'est toi qui leur présentes les artifacts.
- Biais à surveiller : si tu dis "A vs B" sans contexte, l'évaluateur jugera sur le texte seul.
  C'est ce qu'on veut (à l'aveugle). Ne lui souffle pas l'origine.
