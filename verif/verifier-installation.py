#!/usr/bin/env python3
"""
Verifie une installation Hermes Hub, du disque jusqu'au serveur qui repond.

    python verif/verifier-installation.py
    python verif/verifier-installation.py --racine "C:/Users/<toi>/Documents/Hermes-xxx"
    python verif/verifier-installation.py --avec-modele    (ajoute 1 appel modele)

Sort 0 si tout va bien, 1 s'il reste une panne. Aucun controle n'ecrit dans
l'installation : les seules ecritures vont dans un dossier temporaire, efface
a la fin.

POURQUOI CE FICHIER. Un installateur qui se termine par « OK » n'a prouve
qu'une chose : qu'il est alle au bout. Il n'a pas prouve que node demarre, que
le port s'ouvre, que l'equipe a des credentials, ni qu'aucune donnee d'un autre
poste n'a voyage avec lui. Chaque controle d'ici correspond a quelque chose qui
a reellement casse pendant la mise au point - le nom du controle dit quoi.
"""

import argparse
import glob
import io
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time

# --- Sortie -------------------------------------------------------------------
# Pas de couleur ni d'accent : la console Windows par defaut est en cp1252 et
# une sortie qui plante a l'affichage ferait croire a une panne d'installation.
OK, KO, INFO = "  OK  ", "ECHEC ", " -    "
resultats = []


def note(etat, titre, detail=""):
    resultats.append((etat, titre, detail))
    ligne = "[%s] %s" % (etat, titre)
    if detail:
        ligne += "\n         " + detail.replace("\n", "\n         ")
    print(ligne)


def section(titre):
    print("\n" + "=" * 72)
    print("  " + titre)
    print("=" * 72)


# --- Trouver l'installation ---------------------------------------------------
def trouver_racine(demandee):
    if demandee:
        return os.path.abspath(demandee)
    docs = os.path.join(os.path.expanduser("~"), "Documents")
    if not os.path.isdir(docs):
        docs = os.path.join(os.path.expanduser("~"), "OneDrive", "Documents")
    candidats = sorted(glob.glob(os.path.join(docs, "Hermes-*")), key=os.path.getmtime)
    candidats = [c for c in candidats if os.path.isdir(c)]
    return candidats[-1] if candidats else None


def outil(nom, arg="--version"):
    try:
        r = subprocess.run([nom, arg], capture_output=True, text=True, timeout=60)
        sortie = (r.stdout + r.stderr).strip().splitlines()
        return sortie[0][:60] if sortie else "(sans version)"
    except Exception:
        return None


# --- Les controles ------------------------------------------------------------
def controler_prerequis():
    section("1. Les outils que le Hub appelle")
    for nom, requis in (("node", True), ("python", True), ("git", False), ("hermes", True)):
        v = outil(nom)
        if v:
            note(OK, "%s present" % nom, v)
        elif requis:
            note(KO, "%s INTROUVABLE" % nom,
                 "Le Hub ne peut pas fonctionner sans. Relance installer.bat,\n"
                 "puis OUVRE UNE NOUVELLE SESSION Windows (le PATH ne suit pas).")
        else:
            note(INFO, "%s absent (facultatif)" % nom)


def controler_arborescence(racine):
    section("2. L'espace de travail")
    if not racine or not os.path.isdir(racine):
        note(KO, "Espace de travail introuvable",
             "Aucun dossier Documents/Hermes-* . Passe --racine.")
        return False
    note(OK, "Espace de travail", racine)

    attendus = [
        ("Vault", "dir"), ("Vault/Templates", "dir"), ("Projets", "dir"),
        ("icons", "dir"), ("Hermes-Hub", "dir"),
        ("Hermes-Hub/server/index.js", "file"),
        ("Hermes-Hub/dist/index.html", "file"),
        ("Hermes-Hub/Hermes-Hub.vbs", "file"),
        ("Hermes-Hub/Lancer-Hermes-Hub.ps1", "file"),
        ("icons/hermes-hub.ico", "file"),
    ]
    for rel, genre in attendus:
        p = os.path.join(racine, rel.replace("/", os.sep))
        existe = os.path.isdir(p) if genre == "dir" else os.path.isfile(p)
        note(OK if existe else KO, rel + ("" if existe else " MANQUANT"))
    return True


def controler_memoire(racine):
    section("3. La memoire durable")
    for rel in ("scripts/resume-sessions.py", "scripts/nourrir-vault.py",
                "memoire/TEMPLATE-JOURNAL-THEMATIQUE.md",
                "docs/SPEC-MEMOIRE-18-20.md", "PARAMETRES-DECLENCHEUR.md"):
        p = os.path.join(racine, rel.replace("/", os.sep))
        note(OK if os.path.isfile(p) else KO, rel + ("" if os.path.isfile(p) else " MANQUANT"))

    # Les scripts resolvent leur racine comme le dossier PARENT du leur : mal
    # places, ils chercheraient Vault/ et Projets/ au mauvais endroit.
    s = os.path.join(racine, "scripts", "nourrir-vault.py")
    if os.path.isfile(s):
        attendu = os.path.normcase(racine)
        obtenu = os.path.normcase(os.path.dirname(os.path.dirname(os.path.abspath(s))))
        note(OK if attendu == obtenu else KO, "les scripts resolvent la bonne racine",
             "" if attendu == obtenu else "ils calculent %s au lieu de %s" % (obtenu, attendu))

    for rel, vide in (("Resumes-Sessions/done.json", {}),
                      ("Resumes-Sessions/exclusions.json", None)):
        p = os.path.join(racine, rel.replace("/", os.sep))
        if not os.path.isfile(p):
            note(KO, rel + " MANQUANT")
            continue
        try:
            d = json.load(io.open(p, encoding="utf-8"))
        except Exception as e:
            note(KO, rel + " illisible", str(e))
            continue
        if rel.endswith("done.json"):
            note(OK if d == {} else KO, "done.json vierge",
                 "" if d == {} else "il contient %d session(s) d'un autre poste" % len(d))
        else:
            ids = d.get("excluded_session_ids", []) if isinstance(d, dict) else d
            note(OK if not ids else KO, "exclusions.json vierge",
                 "" if not ids else "il contient %d identifiant(s) etranger(s)" % len(ids))

    home = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes")
    md = os.path.join(home, "memories", "MEMORY.md")
    if os.path.isfile(md):
        txt = io.open(md, encoding="utf-8", errors="replace").read()
        note(OK if "MEMOIRE DURABLE" in txt else KO, "MEMORY.md porte la memoire durable")
        note(OK if "^" not in txt else KO, "MEMORY.md sans caractere d'echappement parasite")
    else:
        note(KO, "MEMORY.md absent", md)


def controler_equipe():
    section("4. L'equipe de depart")
    home = os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes")
    pdir = os.path.join(home, "profiles")
    if not os.path.isdir(pdir):
        note(KO, "Aucun dossier de profils", pdir)
        return
    for pid in ("analyste", "redacteur", "metteur"):
        d = os.path.join(pdir, pid)
        if not os.path.isdir(d):
            note(KO, "profil %s absent" % pid,
                 "Le decomposeur n'aura personne a qui confier ce genre de tache.")
            continue
        y = os.path.join(d, "profile.yaml")
        desc = ""
        if os.path.isfile(y):
            m = re.search(r"^description:\s*(.*)$",
                          io.open(y, encoding="utf-8", errors="replace").read(), re.M)
            desc = (m.group(1).strip() if m else "")
        pret = False
        env = os.path.join(d, ".env")
        if os.path.isfile(env):
            pret = bool(re.search(r"^[A-Z0-9_]+\s*=\s*\S",
                                  io.open(env, encoding="utf-8", errors="replace").read(), re.M))
        if desc and pret:
            note(OK, "profil %s" % pid, desc[:64])
        elif not desc:
            note(KO, "profil %s sans description" % pid,
                 "C'est le seul texte que le decomposeur lit pour router une tache.")
        else:
            note(KO, "profil %s sans credential" % pid, "il ne repondra jamais")


def port_libre(port):
    s = socket.socket()
    s.settimeout(1)
    try:
        s.connect(("127.0.0.1", port))
        return False
    except Exception:
        return True
    finally:
        s.close()


def controler_serveur(racine):
    section("5. Le Hub demarre et repond")
    index = os.path.join(racine, "Hermes-Hub", "server", "index.js")
    if not os.path.isfile(index):
        note(KO, "server/index.js absent : rien a demarrer")
        return None

    port = 4331
    while not port_libre(port) and port < 4360:
        port += 1

    bac = tempfile.mkdtemp(prefix="verif-hub-")
    env = dict(os.environ)
    env["HERMES_WORKSPACE"] = os.path.join(bac, "workspace")
    env["HERMES_KANBAN_DB"] = os.path.join(bac, "kanban.db")
    os.makedirs(env["HERMES_WORKSPACE"], exist_ok=True)

    proc = subprocess.Popen(["node", index, "--port", str(port)],
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    try:
        for _ in range(60):
            if proc.poll() is not None:
                break
            if not port_libre(port):
                break
            time.sleep(0.25)

        if proc.poll() is not None:
            err = proc.stderr.read().decode("utf-8", "replace")[-400:]
            note(KO, "le serveur s'arrete tout seul", err)
            return None

        import urllib.request

        def lire(chemin):
            with urllib.request.urlopen("http://127.0.0.1:%d%s" % (port, chemin), timeout=15) as r:
                return json.loads(r.read().decode("utf-8"))

        sante = lire("/api/health")
        note(OK if sante.get("ok") else KO, "GET /api/health",
             "version %s" % sante.get("version", "?"))

        orch = lire("/api/orchestration")
        ids = [a["id"] for a in orch.get("agents", [])]
        note(OK if "default" in ids else KO, "l'orchestrateur est la")
        trouves = [p for p in ("analyste", "redacteur", "metteur") if p in ids]
        note(OK if len(trouves) == 3 else KO,
             "les trois roles sont vus par le Hub", ", ".join(ids))
        pas_prets = [a["id"] for a in orch.get("agents", []) if not a.get("pretAServir")]
        note(OK if not pas_prets else KO, "tous les agents peuvent repondre",
             "" if not pas_prets else "sans credential : " + ", ".join(pas_prets))

        for a in orch.get("agents", []):
            if a["id"] in ("analyste", "redacteur", "metteur") and not a.get("metier"):
                note(KO, "le metier de %s ne se lit pas" % a["id"],
                     "sa description doit commencer par le metier suivi d'un point.")

        # Un poste neuf ne doit rien contenir de personne.
        note(OK if not orch.get("poles") else KO, "aucun pole preexistant",
             "" if not orch.get("poles") else "%d pole(s) trouve(s)" % len(orch["poles"]))
        note(OK if not orch.get("equipes") else KO, "aucune equipe preexistante")
        return port
    finally:
        try:
            proc.kill()
        except Exception:
            pass
        shutil.rmtree(bac, ignore_errors=True)


def controler_scripts(racine):
    section("6. Les scripts tournent vraiment")
    s = os.path.join(racine, "scripts", "nourrir-vault.py")
    if not os.path.isfile(s):
        note(KO, "nourrir-vault.py absent")
        return
    try:
        r = subprocess.run([sys.executable, s, "--tout"],
                           capture_output=True, text=True, timeout=180, cwd=racine)
        note(OK if r.returncode == 0 else KO, "nourrir-vault.py --tout",
             (r.stdout + r.stderr).strip().splitlines()[-1][:100] if (r.stdout + r.stderr).strip() else "")
    except Exception as e:
        note(KO, "nourrir-vault.py plante", str(e))

    s = os.path.join(racine, "scripts", "resume-sessions.py")
    if os.path.isfile(s):
        try:
            r = subprocess.run([sys.executable, s, "--help"],
                               capture_output=True, text=True, timeout=120, cwd=racine)
            note(OK if r.returncode == 0 else KO, "resume-sessions.py repond")
        except Exception as e:
            note(KO, "resume-sessions.py plante", str(e))


ETRANGERS = re.compile(
    r"kuchu|hermes-raf|dev herm[eè]s? hub|ferrand|vallonne|journal-meta|"
    r"20260\d{3}_\d{6}_[a-z0-9]{6}",
    re.I,
)


def controler_proprete(racine):
    """
    Ce controle suppose un POSTE NEUF, juste installe.

    Sur une machine deja utilisee il signalera les fichiers de son proprietaire,
    et ce n'est pas une panne - c'est sa memoire. Il ne veut dire quelque chose
    que la ou rien n'a encore ete produit : la, toute trouvaille est une donnee
    qui a voyage avec l'installateur.
    """
    section("7. Aucune donnee heritee (controle valable sur un poste neuf)")
    suspects = []
    for base, dossiers, fichiers in os.walk(racine):
        dossiers[:] = [d for d in dossiers
                       if d not in ("node_modules", ".git", "dist", "audio_cache", "cache")]
        for f in fichiers:
            if not f.lower().endswith((".md", ".json", ".py", ".txt", ".yaml", ".yml")):
                continue
            p = os.path.join(base, f)
            try:
                txt = io.open(p, encoding="utf-8", errors="replace").read()
            except Exception:
                continue
            for m in ETRANGERS.finditer(txt):
                suspects.append("%s : %s" % (os.path.relpath(p, racine), m.group(0)))
                break
    if suspects:
        note(KO, "%d fichier(s) portent des traces d'un autre poste" % len(suspects),
             "\n".join(suspects[:12]))
    else:
        note(OK, "aucune trace d'un autre poste")


def controler_decomposition(racine):
    section("8. Le routage (1 appel modele)")
    bac = tempfile.mkdtemp(prefix="verif-decomp-")
    env = dict(os.environ)
    env["HERMES_KANBAN_DB"] = os.path.join(bac, "kanban.db")
    try:
        r = subprocess.run(
            ["hermes", "kanban", "add",
             "A partir du fichier ventes.csv, produis une note de synthese chiffree, "
             "puis un document PDF presentable pour la direction.", "--json"],
            capture_output=True, text=True, timeout=180, env=env)
        m = re.search(r'"(?:id|task_id)"\s*:\s*"(t_[a-f0-9]+)"', r.stdout + r.stderr)
        if not m:
            note(KO, "impossible de poser la tache d'essai",
                 (r.stdout + r.stderr).strip()[-200:])
            return
        tid = m.group(1)
        r = subprocess.run(["hermes", "kanban", "decompose", tid, "--json"],
                           capture_output=True, text=True, timeout=300, env=env)
        sortie = r.stdout + r.stderr
        if '"ok": true' not in sortie and '"ok":true' not in sortie:
            note(KO, "la decomposition a echoue", sortie.strip()[-200:])
            return
        r = subprocess.run(["hermes", "kanban", "list"],
                           capture_output=True, text=True, timeout=120, env=env)
        lignes = [l for l in r.stdout.splitlines() if l.strip()]
        confies = re.findall(r"\b(analyste|redacteur|metteur|default)\b", r.stdout)
        specialistes = [c for c in confies if c != "default"]
        note(OK if specialistes else KO,
             "les taches vont aux specialistes",
             "confiees a : " + (", ".join(confies) if confies else "personne"))
        for l in lignes[:6]:
            print("         " + l[:100])
    except Exception as e:
        note(KO, "controle de routage impossible", str(e))
    finally:
        shutil.rmtree(bac, ignore_errors=True)


def main():
    ap = argparse.ArgumentParser(description="Verifie une installation Hermes Hub.")
    ap.add_argument("--racine", help="dossier Documents/Hermes-xxx")
    ap.add_argument("--avec-modele", action="store_true",
                    help="ajoute un controle de routage, qui fait UN appel modele")
    a = ap.parse_args()

    print("\nVERIFICATION D'UNE INSTALLATION HERMES HUB")
    racine = trouver_racine(a.racine)

    controler_prerequis()
    if controler_arborescence(racine):
        controler_memoire(racine)
        controler_equipe()
        controler_serveur(racine)
        controler_scripts(racine)
        controler_proprete(racine)
        if a.avec_modele:
            controler_decomposition(racine)
        else:
            section("8. Le routage")
            note(INFO, "non teste",
                 "Relance avec --avec-modele pour l'eprouver (1 appel modele).")

    section("BILAN")
    echecs = [r for r in resultats if r[0] == KO]
    print("  %d controles, %d echec(s)." % (len(resultats), len(echecs)))
    if echecs:
        print("\n  Ce qui ne va pas :")
        for _, titre, detail in echecs:
            print("    - " + titre)
        print("\n  L'installation N'EST PAS bonne.\n")
        return 1
    print("\n  Tout est en place.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
