# PARAMETRES DU PONT VAULT — modes A et B

Le pont `scripts/nourrir-vault.py` distille les META-FICHIERS d'un projet
(REPRISE.md, MEMOIRE.md, ADM.md, DECISION.md) en notes Vault (Obsidian).
Il est idempotent : relancer ne cree pas de doublon.

Deux modes de declenchement, AU CHOIX (tous les deux livres dans le pack) :

══════════════════════════════════════════════
MODE A — MANUEL (l'utilisateur demande)
══════════════════════════════════════════════
Commande a lancer (par Hermes ou par toi) :
  python scripts/nourrir-vault.py --projet "<nom du projet>"
Ou pour tous les projets :
  python scripts/nourrir-vault.py --tout
Ou forcer la reecriture :
  python scripts/nourrir-vault.py --projet "<nom>" --force

Quand l'utiliser : a la fin d'une session, il dit "mémorise le jalon"
(ou equivalent). Hermes lance alors la commande ci-dessus.

══════════════════════════════════════════════
MODE B — AUTOMATIQUE (Hermès declenche seul)
══════════════════════════════════════════════
Hermes est instruit (memoire persistante) de lancer le pont automatiquement
des que IL (re)ecrit un fichier REPRISE.md (fin de jalon / pause / cloture).

Regle inseree dans la memoire persistante Hermes :
  "Apres avoir ecrit/met a jour REPRISE.md pour un projet, lancer
   python scripts/nourrir-vault.py --projet '<nom>' pour nourrir le Vault."

Avantages : le Vault ne reste jamais vide apres un jalon, sans action
utilisateur. Inconvenient : necessite que la regle soit dans la memoire
(elle l'est deja dans ce pack via BLOC-DECLENCHEURS + ce fichier).

══════════════════════════════════════════════
CHOIX RECOMMANDE
══════════════════════════════════════════════
- Mode B par defaut (automatique, aucun oubli).
- Mode A en complement si tu veux forcer une regeneration (--force) ou
  nourrir tous les projets d'un coup (--tout).

Les deux sont actifs : B est automatique, A est disponible a la demande.
Aucun des deux ne touche state.db ni les projets (lecture seule des META-FICHIERS).
