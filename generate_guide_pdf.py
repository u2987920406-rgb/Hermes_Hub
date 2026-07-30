#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Rend les guides Markdown du depot en PDF (ReportLab).

Le PDF distribue aux clients doit toujours correspondre au .md : ce script
existe pour qu'une modification du guide se reporte en une commande, au lieu
d'etre refaite a la main.

    python generate_guide_pdf.py

Le sous-ensemble Markdown reconnu est celui reellement utilise par les guides :
titres # et ##, paragraphes, listes a puces (avec un niveau d'imbrication),
listes numerotees, **gras**, `code`, et lignes de continuation indentees.
La sortie est deterministe (rl_config.invariant), pour qu'un PDF inchange ne
cree pas de diff dans git.
"""

import html
import os
import re

from reportlab import rl_config

rl_config.invariant = 1  # date figee dans le PDF -> sortie reproductible

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer

HERE = os.path.dirname(os.path.abspath(__file__))

# Palette reprise des icones (voir generate_icons.py)
NAVY = HexColor("#242A4E")
GOLD = HexColor("#C99C34")
INK = HexColor("#1A1A2E")
MUTED = HexColor("#6B7280")
CODE_BG = HexColor("#7C5414")

DOCS = [
    ("GUIDE-INSTALLATION.md", "GUIDE-INSTALLATION.pdf"),
]


# -----------------------------------------------------------------------------
# Styles
# -----------------------------------------------------------------------------
def styles():
    base = ParagraphStyle(
        "body",
        fontName="Helvetica",
        fontSize=10,
        leading=14.5,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=6,
    )
    return {
        "body": base,
        "h1": ParagraphStyle(
            "h1", parent=base, fontName="Helvetica-Bold", fontSize=19, leading=23,
            textColor=NAVY, spaceBefore=0, spaceAfter=4,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base, fontName="Helvetica-Bold", fontSize=13, leading=17,
            textColor=NAVY, spaceBefore=14, spaceAfter=5,
        ),
        # Listes : la puce est portee par le Paragraph lui-meme (bulletText),
        # ce qui evite qu'une puce imbriquee sous une etape numerotee reprenne
        # la numerotation de cette etape.
        "ol": ParagraphStyle(
            "ol", parent=base, leftIndent=16, bulletIndent=0, spaceAfter=3,
            bulletFontName="Helvetica-Bold", bulletFontSize=9.5, bulletColor=NAVY,
        ),
        "ul": ParagraphStyle(
            "ul", parent=base, leftIndent=14, bulletIndent=3, spaceAfter=3,
            bulletFontName="Helvetica", bulletFontSize=9, bulletColor=GOLD,
        ),
        "sub": ParagraphStyle(
            "sub", parent=base, fontSize=9.5, leading=13, leftIndent=30,
            bulletIndent=18, spaceAfter=2,
            bulletFontName="Helvetica", bulletFontSize=9, bulletColor=GOLD,
        ),
        "foot": ParagraphStyle(
            "foot", parent=base, fontSize=8, leading=10, textColor=MUTED,
        ),
    }


# -----------------------------------------------------------------------------
# Markdown en ligne -> balises ReportLab
# -----------------------------------------------------------------------------
def inline(text):
    """**gras** et `code`. Le texte est echappe avant d'injecter des balises."""
    out = html.escape(text, quote=False)
    out = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", out)
    out = re.sub(
        r"`(.+?)`",
        '<font face="Courier" size="9" color="#%s">\\1</font>' % CODE_BG.hexval()[2:],
        out,
    )
    return out


# -----------------------------------------------------------------------------
# Parsing
# -----------------------------------------------------------------------------
HEADING = re.compile(r"^(#{1,2})\s+(.*)$")
ORDERED = re.compile(r"^(\d+)\.\s+(.*)$")
BULLET = re.compile(r"^(\s*)-\s+(.*)$")


def parse(md, st):
    """Markdown -> liste de flowables. Les listes consecutives sont regroupees."""
    flow = []
    para = []          # lignes du paragraphe courant
    items = []         # (niveau, puce, texte) de la liste courante
    kind = None        # "ol" ou "ul" pour la liste en cours

    def flush_para():
        if para:
            flow.append(Paragraph(inline(" ".join(para)), st["body"]))
            del para[:]

    def flush_list():
        for level, number, text in items:
            if level:
                style, mark = st["sub"], u"–"      # tiret demi-cadratin
            elif number is not None:
                style, mark = st["ol"], "%d." % number
            else:
                style, mark = st["ul"], u"•"
            flow.append(Paragraph(inline(text), style, bulletText=mark))
        del items[:]

    for raw in md.splitlines():
        line = raw.rstrip()

        if not line.strip():
            flush_para()
            flush_list()
            continue

        m = HEADING.match(line)
        if m:
            flush_para()
            flush_list()
            level, text = len(m.group(1)), m.group(2)
            if level == 1:
                flow.append(Paragraph(inline(text), st["h1"]))
                flow.append(Spacer(1, 3))
                flow.append(HRFlowable(width="100%", thickness=1.2, color=GOLD))
                flow.append(Spacer(1, 8))
            else:
                flow.append(Paragraph(inline(text), st["h2"]))
            continue

        m = ORDERED.match(line)
        if m:
            flush_para()
            if kind != "ol":
                flush_list()
                kind = "ol"
            items.append((0, int(m.group(1)), m.group(2)))
            continue

        m = BULLET.match(line)
        if m:
            flush_para()
            level = 1 if len(m.group(1)) >= 2 else 0
            # une puce indentee sous une liste numerotee reste dans cette liste
            if not level and kind != "ul":
                flush_list()
                kind = "ul"
            elif not items:
                kind = "ul"
            items.append((level, None, m.group(2)))
            continue

        # ligne indentee apres un item : continuation de cet item
        if items and raw.startswith("  "):
            level, bullet, text = items[-1]
            items[-1] = (level, bullet, text + " " + line.strip())
            continue

        flush_list()
        para.append(line.strip())

    flush_para()
    flush_list()
    return flow


# -----------------------------------------------------------------------------
# Rendu
# -----------------------------------------------------------------------------
def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 12 * mm, "Hermes Agent + Obsidian")
    canvas.drawRightString(A4[0] - 20 * mm, 12 * mm, "page %d" % doc.page)
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(0.6)
    canvas.line(20 * mm, 15 * mm, A4[0] - 20 * mm, 15 * mm)
    canvas.restoreState()


def render(src, dst):
    with open(src, encoding="utf-8") as f:
        md = f.read()

    st = styles()
    doc = SimpleDocTemplate(
        dst,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
        title=os.path.splitext(os.path.basename(dst))[0],
        author="Hermes",
    )
    doc.build(parse(md, st), onFirstPage=footer, onLaterPages=footer)


def main():
    for src, dst in DOCS:
        src_path = os.path.join(HERE, src)
        dst_path = os.path.join(HERE, dst)
        if not os.path.isfile(src_path):
            print("  %s introuvable, ignore" % src)
            continue
        render(src_path, dst_path)
        print("  %s -> %s (%d octets)" % (src, dst, os.path.getsize(dst_path)))


if __name__ == "__main__":
    print("Generation des PDF a partir des guides Markdown")
    main()
    print("Termine.")
