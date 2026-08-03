#!/usr/bin/env python3
"""
resume-sessions.py — Hermes Hub
Resume les sessions de conversation CLI qui ne sont Pas rattachees a un projet git
(session "sans projet"), en lisant la vraie base de stockage state.db.

Pour chaque session cli SANS git_repo_root et non deja resumee :
  - ecrit un fichier Resumes-Sessions/<session_id>.md lisible
  - met a jour Resumes-Sessions/INDEX.md (liste de tous les resumes)

Lancement manuel :
  python "<racine>/scripts/resume-sessions.py"

Variables d'environnement (portabilite, jamais machine-dependant en dur) :
  HERMES_STATE_DB  : chemin de state.db (defaut : AppData Local/hermes/state.db)
  HERMES_RESUME_DIR: dossier de sortie (defaut : <racine>/Resumes-Sessions)

Le script ne touche JAMAIS state.db en ecriture : il en fait une copie temporaire
avant lecture (mode WAL => lecture sure sans verrouiller Hermes).
"""

import os
import sys
import csv
import json
import shutil
import sqlite3
import tempfile
from datetime import datetime, timezone

# --- chemins (portables) ---
HOME = os.path.expanduser("~")
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # <racine de l'espace de travail>

DEFAULT_STATE = os.path.join(HOME, "AppData", "Local", "hermes", "state.db")
STATE_DB = os.environ.get("HERMES_STATE_DB", DEFAULT_STATE)
RESUME_DIR = os.environ.get("HERMES_RESUME_DIR", os.path.join(RACINE, "Resumes-Sessions"))
DONE_FILE = os.path.join(RESUME_DIR, "done.json")


def log(msg):
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def human_ts(epoch):
    if not epoch:
        return "en cours"
    return datetime.fromtimestamp(epoch, tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def copy_state():
    """Copie state.db (+ wal) dans un fichier temporaire pour lecture sure."""
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db")
    tmp.close()
    shutil.copyfile(STATE_DB, tmp.name)
    wal = STATE_DB + "-wal"
    if os.path.exists(wal):
        try:
            shutil.copyfile(wal, tmp.name + "-wal")
        except Exception:
            pass
    return tmp.name


def load_done():
    if os.path.exists(DONE_FILE):
        try:
            with open(DONE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def load_exclusions():
    """Session_id a ignorer (deja couverte par un journal thematique manuel)."""
    path = os.path.join(RESUME_DIR, "exclusions.json")
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, dict):
                return set(data.get("excluded_session_ids", []))
            if isinstance(data, list):
                return set(data)
        except Exception:
            pass
    return set()


def save_done(done):
    os.makedirs(RESUME_DIR, exist_ok=True)
    with open(DONE_FILE, "w", encoding="utf-8") as f:
        json.dump(done, f, ensure_ascii=False, indent=2)


def get_sessions(copied_db):
    con = sqlite3.connect(f"file:{copied_db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    # "sans projet" = source cli ET pas de depot git rattache
    cur.execute(
        """
        SELECT id, title, started_at, ended_at, message_count, input_tokens,
               output_tokens, cwd, git_repo_root, model
        FROM sessions
        WHERE source = 'cli' AND git_repo_root IS NULL
        ORDER BY started_at DESC
        """
    )
    rows = [dict(r) for r in cur.fetchall()]
    con.close()
    return rows


def get_messages(copied_db, session_id):
    con = sqlite3.connect(f"file:{copied_db}?mode=ro", uri=True)
    con.row_factory = sqlite3.Row
    cur = con.cursor()
    cur.execute(
        "SELECT role, content FROM messages WHERE session_id = ? ORDER BY rowid",
        (session_id,),
    )
    msgs = []
    for r in cur.fetchall():
        c = r["content"]
        if isinstance(c, str):
            msgs.append((r["role"], c))
        elif isinstance(c, dict):
            # parfois le content est un dict (role/data) ; on prend le texte
            msgs.append((r["role"], c.get("text") or c.get("content") or str(c)))
        else:
            msgs.append((r["role"], str(c)))
    con.close()
    return msgs


def summarize(msgs):
    """Resume extractif lisible : sujet + points abordes (messages user) + conclusion."""
    user_msgs = [t for (role, t) in msgs if role == "user" and t.strip()]
    first_user = user_msgs[0] if user_msgs else "(aucun message utilisateur)"
    # conclusion = dernier message assistant non vide
    last_asst = ""
    for role, t in reversed(msgs):
        if role == "assistant" and t.strip():
            last_asst = t
            break
    return first_user, user_msgs, last_asst


def write_resume(session, msgs, done):
    sid = session["id"]
    first_user, user_msgs, last_asst = summarize(msgs)

    # points : on decoupe les messages user en lignes, on tronque a 600 car pour la lisibilite
    points = []
    for t in user_msgs:
        t = t.strip().replace("\r", "").replace("\n", " ")
        if len(t) > 600:
            t = t[:600] + "…"
        points.append("- " + t)

    duration = ""
    if session["started_at"] and session["ended_at"]:
        secs = int(session["ended_at"] - session["started_at"])
        duration = f"{secs // 60} min {secs % 60} s"

    lines = []
    lines.append(f"# Resume — {session['title'] or sid}")
    lines.append("")
    lines.append(f"- **Session ID** : `{sid}`")
    lines.append(f"- **Debut** : {human_ts(session['started_at'])}")
    lines.append(f"- **Fin** : {human_ts(session['ended_at'])}")
    if duration:
        lines.append(f"- **Duree** : {duration}")
    lines.append(f"- **Messages** : {session['message_count']}")
    lines.append(f"- **Modele** : {session['model']}")
    lines.append(f"- **Dossier** : {session['cwd'] or '(non defini)'}")
    lines.append(f"- **Projet git** : aucun (session hors-projet)")
    lines.append("")
    lines.append("## Sujet de depart")
    lines.append("")
    lines.append(first_user.strip())
    lines.append("")
    lines.append("## Points abordes (messages de l'utilisateur)")
    lines.append("")
    lines.append("\n".join(points) if points else "- (vide)")
    lines.append("")
    lines.append("## Conclusion (dernier message de l'assistant)")
    lines.append("")
    concl = last_asst.strip().replace("\n", "\n")
    if len(concl) > 1200:
        concl = concl[:1200] + "…"
    lines.append(concl or "(non disponible)")
    lines.append("")
    lines.append("---")
    lines.append(f"_Genere le {human_ts(datetime.now().timestamp())} par resume-sessions.py_")

    path = os.path.join(RESUME_DIR, f"{sid}.md")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    done[sid] = {
        "title": session["title"] or sid,
        "generated_at": datetime.now().isoformat(),
        "messages": session["message_count"],
    }
    return path


def write_index(done):
    path = os.path.join(RESUME_DIR, "INDEX.md")
    items = sorted(done.items(), key=lambda kv: kv[1].get("generated_at", ""), reverse=True)
    lines = ["# INDEX — Resumes des sessions hors-projet", ""]
    lines.append(f"_Total : {len(items)} session(s) resumee(s)._", )
    lines.append("")
    for sid, meta in items:
        lines.append(f"- [{meta.get('title', sid)}]({sid}.md) — `{sid}` ({meta.get('messages','?')} msg)")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


def main():
    if not os.path.exists(STATE_DB):
        log(f"ERREUR : state.db introuvable : {STATE_DB}")
        sys.exit(1)

    os.makedirs(RESUME_DIR, exist_ok=True)
    log(f"Lecture de : {STATE_DB}")
    copied = copy_state()
    try:
        sessions = get_sessions(copied)
    finally:
        try:
            os.remove(copied)
        except Exception:
            pass

    log(f"{len(sessions)} session(s) cli hors-projet trouvee(s).")
    done = load_done()
    exclusions = load_exclusions()
    nouvelles = 0
    for s in sessions:
        if s["id"] in done:
            continue
        if s["id"] in exclusions:
            log(f"  - exclue (journal thematique) : {s['id']}")
            continue
        msgs = get_messages(copied if os.path.exists(copied) else STATE_DB, s["id"])
        # recopie si on a deja supprime
        if not os.path.exists(copied):
            copied = copy_state()
        p = write_resume(s, msgs, done)
        save_done(done)
        nouvelles += 1
        log(f"  + resume : {s['title'] or s['id']}  ->  {p}")

    write_index(done)
    log(f"Termina. {nouvelles} nouveau(x) resume(s). Index : {os.path.join(RESUME_DIR, 'INDEX.md')}")


if __name__ == "__main__":
    main()
