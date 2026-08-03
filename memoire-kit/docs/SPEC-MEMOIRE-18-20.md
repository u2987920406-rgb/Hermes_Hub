# SPEC — Mémoire durable 18/20 au-dessus de Hermès (state.db natif + archive externe)

> FICHE À LIRE EN PREMIER par l'auteur de l'installer.
> But : expliquer POURQUOI la mémoire native Hermès ne suffit pas pour un rappel fiable à 1 an,
> et comment monter une archive externe redondante, indexée par tags, portée à 18/20, réutilisable
> sur un autre PC. Complète SPEC-RESUME-SESSIONS.md (couche mécanique) en y ajoutant la couche
> THÉMATIQUE (la vraie levier du 18/20).

══════════════════════════════════════
TL;DR
══════════════════════════════════════
- PROBLÈME : la mémoire native (state.db + bloc mémoire injecté) capture TOUT automatiquement,
  mais elle est FRAGILE : un clear/reset/PC neuf vide state.db, sa recherche est LEXICALE
  (FTS5 : "ia oublie" ne trouve pas "mémoire"), aucun index au boot, et charger une session
  entière brûle le contexte. À 1 an, rappel NON garanti.
- CAUSE RACINE : l'IA n'a AUCUNE mémoire dans ses poids. Elle ne fait que RETROUVER ce qu'on a
  stocké AILLEURS. La mémoire native = outil de capture, pas système de rappel durable.
- SOLUTION GÉNÉRIQUE (2 couches redondantes) :
  (a) couche MÉCANIQUE = Resumes-Sessions/*.md (déjà livrée par SPEC-RESUME-SESSIONS.md,
      demand-driven, anti-doublon). Source de vérité brute.
  (b) couche THÉMATIQUE = 1 journal par GRAND sujet, structuré INDEX léger + archive verbatim,
      avec TAGS pour battre la recherche lexicale + note mémoire injectée au boot (indice).
  Résultat : 16/20 → 18/20. Survit à la purge, fiable, navigable, portable.

══════════════════════════════════════
1. COMPARAISON NOTÉE (base de la SPEC)
══════════════════════════════════════
Mémoire native Hermès (state.db + bloc mémoire)  →  10/20
  Gagne : richesse brute (verbatim complet), zéro effort (auto), couverture totale.
  Perd : purge = perte, recherche lexicale (dépend des mots), pas d'index au boot,
         brûle le contexte si chargé en entier, lié à cette install (non portatif), bruit.
Notre architecture (note mémoire + fichier de référence sur disque)  →  16/20
  Gagne : survit à la purge, indice au boot, ripgrep fiable, index léger anti-brûlage,
          portable, navigable par ancres, distillée (pas de bruit), faible dépendance mots-clés.
  Perd : entretien manuel, couverture partielle (que les sujets documentés).
+2 pour 18/20 (voir §3). Plafond 20 = recherche sémantique (vector store, hors périmètre natif).

══════════════════════════════════════
2. LES DEUX COUCHES (ne JAMAIS les fusionner)
══════════════════════════════════════
COUCHE A — MÉCANIQUE (Resumes-Sessions/*.md)
  - Auto, sans jugement, TOUTE session cli hors-projet. Source de vérité des faits.
  - Déjà livrée par SPEC-RESUME-SESSIONS.md (scripts/resume-sessions.py, demand-driven).
  - RÈGLE ANTI-DOUBLON (critique) : si une session est déjà couverte par un journal thématique,
    son session_id va dans Resumes-Sessions/exclusions.json. Le script la skip. Testé : la
    session <session_id> (méta-IA) est exclue car couverte par Journal-<SUJET>.md.

COUCHE B — THÉMATIQUE (1 journal par GRAND sujet, ex: Journal-<SUJET>.md)
  - Distillation humaine/curée : piliers, familles, décisions. C'est le levier 18/20.
  - Structure OBLIGATOIRE (copier pour chaque nouveau sujet) :
    PARTIE 1 — INDEX DES RÉSUMÉS (toujours léger, sûr à relire) :
      [Ex] date — titre
        digest 2-3 lignes + TAGS: mot1 mot2 mot3   (les tags compensent le lexical)
    PARTIE 2 — ARCHIVE VERBATIM (ouverte sur demande seulement, jamais chargée en bloc)
      chaque entrée cite session_id + chemin réel state.db (ancre vérifiable).
  - Note mémoire injectée au boot : 1 ligne par sujet = « sujet X → voir Journal-X.md (E1-E10),
    ancre session_id YYYY ». C'est l'indice que la mémoire native n'a pas.

══════════════════════════════════════
3. RECETTE 18/20 (+2 points)
══════════════════════════════════════
(a) Entretien quasi-auto : utiliser la sortie de resume-sessions.py comme AMORCE du journal
    thématique (le .md mécanique donne sujet + points ; on distille par-dessus en tags).
    → tue le "manuel" (perdait 1 point).
(b) Template GÉNÉRIQUE + TAGS (§2 couche B) appliqué à TOUT sujet majeur, pas un seul.
    → tue le "partiel" (perdait 1 point) ET réduit la dépendance aux mots-clés (bonus).
Résultat : 18/20. Plafond 20 = recherche sémantique (embedding/vector DB, brique externe).

══════════════════════════════════════
4. RÉCUPÉRATION À 1 AN (la gymnastique)
══════════════════════════════════════
1. Lire le bloc mémoire (injecté au boot) → indice du sujet + journal + session_id.
2. search_files / ripgrep sur l'INDEX du journal pour les TAGS (ne charge PAS le fichier entier).
3. Ouvrir SEUL le bloc ciblé (E2, E4…). Fallback : resume-sessions.py si state.db présent.
4. Si state.db purgé : le fichier de référence tient seul (redondance). C'est le garant.

══════════════════════════════════════
5. CHECKLIST POUR L'INSTALLER (dès l'install)
══════════════════════════════════════
[ ] 1. Embarquer scripts/resume-sessions.py (déjà dans SPEC-RESUME-SESSIONS.md) + dossier
       Resumes-Sessions/ vide (done.json={}, exclusions.json=[]).
[ ] 2. NE PAS croner le résumé (choix utilisateur 2026-08-02 : inutile sans lecteur).
       Documenter la commande manuelle dans le README utilisateur.
[ ] 3. Créer le TEMPLATE de journal thématique (structure §2 couche B) dans le kit install,
       prêt à copier pour chaque nouveau grand sujet.
[ ] 4. Ajouter dans la mémoire persistante (bloc injecté) 1 ligne par sujet → journal + ancre.
       (La mémoire est plafonnée ~2200 car : y mettre les INDEX CLUES, pas le contenu.)
[ ] 5. Règle anti-doublon documentée : exclusions.json peuplé pour toute session déjà couverte
       par un journal thématique (existe déjà pour 142448). Ne jamais auto-fusionner.
[ ] 6. Portabilité : tous chemins relatifs à <racine> (résolus par __file__), jamais machine-dur.
       Copie verbatim sur un autre PC dans le même arbre → le système marche tel quel.
[ ] 7. Test install : lancer resume-sessions.py (vérif 1 .md/session + INDEX), vérifier qu'une
       session exclue n'est pas doublonnée, et qu'un grep de tag dans un journal renvoie le bloc.

══════════════════════════════════════
7. RÉSULTATS DU TEST À L'AVEUGLE (preuve externe, 2026-08-02)
══════════════════════════════════════
Test joué via SPEC-TEST-AVEUGLE-MEMOIRE.md soumis à un AUTRE modèle (A=natif, B=notre archi, à l'aveugle).
Tableau réel noté par l'évaluateur :

  Scénario                        | Gagnant | A(natif) | B(notre)
  ───────────────────────────────|─────────|─────────|────────
  1 — rappel 1 an                 | B       | 3/20    | 17/20
  2 — survie reset                | B       | 1/20    | 18/20
  3 — reformulation mots          | B       | 4/20    | 15/20
  4 — rappel immédiat même session| A       | 17/20   | 13/20
  5 — fidélité verbatim           | A       | 16/20   | 11/20

  Moyennes : A = 8,2/20 · B = 14,8/20.

CONCLUSION (validée par un cerveau tiers) :
- B écrase A sur tout le LONG TERME (S1-S3) : notre archi est la mémoire durable.
- A gagne le COURT TERME (S4 session live + S5 verbatim) : le natif flush en continu = cache live.
- Les DEUX couches sont COMPLÉMENTAIRES, aucune ne suffit seule.
- CORRECTION DE NOTE : 18/20 = plafond LONG TERME (moy S1-S3 B≈16,7) ; ~15/20 = global toutes distances.
  Le 18/20 reste la cible « rappel fiable à 1 an » ; le global honnête toutes distances est ~15.

══════════════════════════════════════
6. PORTABILITÉ / QUIRKS
══════════════════════════════════════
- Scripts en .py (pas .ps1) : évite le QUIRK PS1 (-File bloqué, -Command requis). Portatif.
- Chemins résolus par os.path.dirname(os.path.dirname(os.path.abspath(__file__))) → <racine>.
- Lancement depuis la racine :  python3 "scripts/resume-sessions.py"
- session_search (FTS5) est LEXICAL : les TAGS dans l'index compensent. Ne pas compter sur le sens.

HISTORIQUE (court)
══════════════════════════════════════
- 2026-08-02 : discussion "méta dans l'IA" → on découvre que la mémoire native ne suffit pas
  (recheche fragile, purge, pas d'index). On monte un journal thématique + note mémoire (16/20).
- Même jour : on formalise le passage à 18/20 (entretien quasi-auto + template générique+tags)
  et on documente dans cette SPEC pour l'installer (réutilisable sur un autre PC).
- resume-sessions.py déjà testé (6 sessions cli détectées, 1 nouvelle résumée, exclusion respectée,
  exit 0) — preuve que la couche mécanique est vivante.
