#!/usr/bin/env python3
"""
nourrir-vault.py — Pont Projets -> Vault (mémoire long terme Hermès)
Distille les META-FICHIERS d'un projet (REPRISE.md, ADM.md, DECISION.md,
MEMOIRE.md) en notes Vault (Obsidian), idempotent et portable.

Mapping :
  REPRISE.md / MEMOIRE.md -> Vault/Projets/<nom>.md            (type: project)
  ADM.md (section Decisions) -> Vault/Decisions/<nom>-decision.md (type: decision)
  ADM.md (jalons "Jx — date") -> Vault/Changelog/YYYY-MM.md    (type: changelog)
  LESSONS extraites         -> Vault/Lessons/<leçon>.md        (type: lesson)  [balise ## LESSONS]
  SKILLS                    -> Vault/Skills/<skill>.md          (type: skill)   [balise ## SKILLS]
  BUGS                      -> Vault/Bugs/<bug>.md              (type: bug)     [balise ## BUGS]

Usage :
  python scripts/nourrir-vault.py --projet "facturation client"
  python scripts/nourrir-vault.py --tout          (tous les projets sauf exclusions)
  python scripts/nourrir-vault.py --projet X --force   (réécrit même si présent)

Idempotence : si la note existe déjà (même nom, insensible casse), on skip
sauf --force. Aucune synchro totale : on ne duplique PAS la vérité de travail.

Chemins : racine = dossier parent de scripts/ (résolu par __file__), jamais
machine-dépendant en dur. Vault = var OBSIDIAN_VAULT_PATH sinon <racine>/Vault.
"""
import os
import sys
import re
import json
import argparse
from datetime import datetime, timezone

KIT = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(KIT)  # <racine de l'espace de travail>


def resoudre_vault():
    env = os.environ.get("OBSIDIAN_VAULT_PATH")
    if env and os.path.isdir(env):
        return env
    return os.path.join(RACINE, "Vault")


def today():
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def log(m):
    print(f"[vault] {m}")


def lire(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


def nom_fichier_securise(nom):
    # insensible casse gérée à l'écriture ; ici on normalise pour le disque
    return re.sub(r'[\\/:*?"<>|]', "-", nom).strip()


def existe_insensible_casse(dossier, base):
    """Vrai si un fichier base.* (peu importe l'extension/casse) existe dans dossier."""
    if not os.path.isdir(dossier):
        return False
    base_l = base.lower()
    for f in os.listdir(dossier):
        fn, ext = os.path.splitext(f)
        if fn.lower() == base_l:
            return True
    return False


def ecrire_note(dossier, nom, contenu, force):
    os.makedirs(dossier, exist_ok=True)
    base = nom_fichier_securise(nom)
    # cherche existence insensible casse (sans extension)
    if not force and existe_insensible_casse(dossier, base):
        log(f"  ! skip (déjà présent) : {dossier}/{base}.md")
        return False
    path = os.path.join(dossier, base + ".md")
    with open(path, "w", encoding="utf-8") as f:
        f.write(contenu)
    log(f"  + {path}")
    return True


def frontmatter(typ, date=None, **extra):
    date = date or today()
    lines = ["---", f"type: {typ}", f"date: {date}"]
    for k, v in extra.items():
        lines.append(f"{k}: {v}")
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def distille_projet(projet, vault, force):
    projet_dir = os.path.join(RACINE, "Projets", projet)
    if not os.path.isdir(projet_dir):
        log(f"ERREUR: projet introuvable: {projet_dir}")
        return 0
    nom = nom_fichier_securise(projet)
    reprise = lire(os.path.join(projet_dir, "REPRISE.md"))
    memoire = lire(os.path.join(projet_dir, "MEMOIRE.md"))
    adm = lire(os.path.join(projet_dir, "ADM.md"))
    decision = lire(os.path.join(projet_dir, "DECISION.md"))

    resume_src = memoire or reprise or f"# {projet}\n\n(ancien jalon non documenté)"
    ecrits = 0
    date = today()

    # 1. Note projet
    body = frontmatter("project", date, tags="[]", status="active", obsolescence="none")
    body += f"# {projet}\n\n"
    body += "## Résumé (REPRISE / MEMOIRE)\n\n"
    body += resume_src.strip() + "\n\n"
    body += f"## Liens\n- [[{nom}]]\n"
    body += f"\n> Source : {projet_dir}\n"
    if ecrire_note(os.path.join(vault, "Projets"), nom, body, force):
        ecrits += 1

    # 2. Décisions (ADM section "Decisions" ou DECISION.md)
    dec_src = decision or ""
    if not dec_src and "##" in adm:
        # extrait bloc Decisions de ADM
        m = re.search(r"##\s*Decisions.*?(?=\n##\s|\Z)", adm, re.S | re.I)
        if m:
            dec_src = m.group(0)
    if dec_src.strip():
        body = frontmatter("decision", date, project=nom, tags="[]",
                           status="active", obsolescence="none",
                           verified_date=date, replaced_by="")
        body += f"# Décision — {projet}\n\n"
        body += dec_src.strip() + "\n\n"
        body += f"## Liens\n- [[{nom}]]\n"
        if ecrire_note(os.path.join(vault, "Decisions"), f"{nom}-decision", body, force):
            ecrits += 1

    # 3. Changelog mensuel (jalons ADM "Jx — date" ou lignes de phase)
    mois = date[:7]
    jalons = []
    for line in adm.splitlines():
        if re.match(r"^\s*[-*]?\s*J\d+\s*[-—:]", line) or re.match(r"^\s*[-*]\s*Phase", line, re.I):
            jalons.append(line.strip())
    if jalons:
        body = frontmatter("changelog", date)
        body += f"# {mois} - Changements IA\n\n"
        body += "## Nouveau\n" + "\n".join(f"- {j}" for j in jalons) + "\n\n"
        body += "## Obsolete\n-\n\n## A verifier\n-\n"
        if ecrire_note(os.path.join(vault, "Changelog"), mois, body, force):
            ecrits += 1

    # 4. Sections balisées LESSONS / SKILLS / BUGS dans ADM ou DECISION
    for typ, dossier, balise in [("lesson", "Lessons", "LESSONS"),
                                 ("skill", "Skills", "SKILLS"),
                                 ("bug", "Bugs", "BUGS")]:
        for src in (adm, decision):
            m = re.search(rf"##\s*{balise}.*?(?=\n##\s|\Z)", src, re.S | re.I)
            if m:
                bloc = m.group(0).strip()
                titre = re.sub(r"[^a-z0-9]+", "-", balise.lower()).strip("-")
                body = frontmatter(typ, date, project=nom, tags="[]",
                                   status="active", obsolescence="none",
                                   verified_date=date, replaced_by="")
                body += f"# {balise.title()} — {projet}\n\n{bloc}\n\n## Liens\n- [[{nom}]]\n"
                if ecrire_note(os.path.join(vault, dossier), f"{nom}-{titre}", body, force):
                    ecrits += 1
                break

    log(f"Projet '{projet}' : {ecrits} note(s) Vault écrite(s).")
    return ecrits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--projet", default=None)
    ap.add_argument("--tout", action="store_true")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()

    vault = resoudre_vault()
    log(f"Vault cible : {vault}")
    if not os.path.isdir(vault):
        log("ERREUR: Vault introuvable")
        sys.exit(1)

    projets = []
    if a.projet:
        projets = [a.projet]
    elif a.tout:
        # Pas de projet exclu par defaut : la liste d'exclusion portait le nom
        # du projet de developpement du poste d'origine, qui ne veut rien dire
        # ailleurs. Un poste qui veut ecarter un dossier le nomme lui-meme.
        pd = os.path.join(RACINE, "Projets")
        if not os.path.isdir(pd):
            # Un dossier absent n'est pas une panne : c'est un poste ou aucun
            # projet n'existe encore. Une trace Python le ferait croire casse.
            log(f"Aucun dossier Projets sous {RACINE} : rien a nourrir.")
            sys.exit(0)
        projets = [d for d in os.listdir(pd) if os.path.isdir(os.path.join(pd, d))]
    else:
        log("Usage: --projet <nom> OU --tout")
        sys.exit(1)

    total = 0
    for p in projets:
        total += distille_projet(p, vault, a.force)
    log(f"Terminé. {total} note(s) Vault écrite(s) au total.")
    sys.exit(0)


if __name__ == "__main__":
    main()
