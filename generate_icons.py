#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Hermes Hub icon generator - unified circular badge family.

The 4 icons share the exact same badge: navy radial field + bevelled gold rim.
Only the central glyph changes, so they read as one family in the taskbar:

    hermes-hub      caduceus  (gold)
    hermes-master   play      (gold)
    hermes-clean    sparkle   (silver)
    nouveau-projet  folder +  (gold)

Every size is rendered independently from a 1024px master, and sizes <= 32px
use a simplified, thicker variant so the glyph survives at 16px. The .ico is
written by hand (BMP frames below 256px, PNG frame at 256px) instead of letting
Pillow downsample a single bitmap.

Outputs to Hermes-Installer/icons/ and Hermes-Hub/public/.
"""

import io
import math
import os
import shutil
import struct

from PIL import Image, ImageChops, ImageDraw, ImageFilter

# -----------------------------------------------------------------------------
# Paths / sizes
# -----------------------------------------------------------------------------
HERE        = os.path.dirname(os.path.abspath(__file__))
ICONS_DIR   = os.path.join(HERE, "icons")

# Le Hub vit dans le depot (Hermes-Installer/Hermes-Hub). On accepte aussi
# l'ancienne disposition en dossier frere.
HUB_PUBLIC  = os.path.join(HERE, "Hermes-Hub", "public")
if not os.path.isdir(HUB_PUBLIC):
    HUB_PUBLIC = os.path.abspath(os.path.join(HERE, "..", "Hermes-Hub", "public"))

R           = 1024                                  # master render resolution
ICO_SIZES   = [16, 20, 24, 32, 48, 64, 128, 256]

# Three detail tiers. Below ~24px a caduceus is unreadable and a thin sparkle
# collapses into a "+", so small sizes get their own bolder, simpler drawing.
MICRO_MAX   = 24
SIMPLE_MAX  = 40


def tier_for(px):
    if px <= MICRO_MAX:
        return "micro"
    if px <= SIMPLE_MAX:
        return "simple"
    return "full"

# -----------------------------------------------------------------------------
# Palette
# -----------------------------------------------------------------------------
NAVY_CORE   = (36, 42, 78)
NAVY_EDGE   = (11, 13, 30)

GOLD_EDGE   = (58, 36, 6)
GOLD_DEEP   = (124, 84, 20)
GOLD_MID    = (201, 156, 52)
GOLD_LIGHT  = (247, 214, 122)
GOLD_HILITE = (255, 246, 208)

SILV_EDGE   = (44, 50, 62)
SILV_DEEP   = (106, 116, 132)
SILV_MID    = (176, 186, 202)
SILV_LIGHT  = (233, 240, 250)
SILV_HILITE = (255, 255, 255)

GOLD = (GOLD_EDGE, GOLD_DEEP, GOLD_MID, GOLD_LIGHT, GOLD_HILITE)
SILV = (SILV_EDGE, SILV_DEEP, SILV_MID, SILV_LIGHT, SILV_HILITE)


# -----------------------------------------------------------------------------
# Geometry helpers - unit space is -1..1 with 0,0 at the centre of the canvas
# -----------------------------------------------------------------------------
def U(x, y):
    """Unit coords -> pixel coords on the R x R master canvas."""
    return ((x + 1.0) * 0.5 * R, (y + 1.0) * 0.5 * R)


def upath(points):
    return [U(x, y) for x, y in points]


def ulen(v):
    return v * 0.5 * R


# -----------------------------------------------------------------------------
# Badge base (navy field + bevelled gold rim)
# -----------------------------------------------------------------------------
def lerp(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(c1[i] + (c2[i] - c1[i]) * t)) for i in range(3))


def ramp(t, stops):
    """Piecewise colour ramp. stops = [(pos, colour), ...] sorted by pos."""
    if t <= stops[0][0]:
        return stops[0][1]
    for (p0, c0), (p1, c1) in zip(stops, stops[1:]):
        if t <= p1:
            return lerp(c0, c1, (t - p0) / max(p1 - p0, 1e-9))
    return stops[-1][1]


# gold tube cross-section, pre-brightened because the directional light below
# only darkens (multiply blend)
RIM_STOPS = [
    (0.00, GOLD_EDGE),
    (0.16, GOLD_DEEP),
    (0.40, GOLD_MID),
    (0.58, GOLD_HILITE),
    (0.78, GOLD_LIGHT),
    (1.00, GOLD_EDGE),
]


def linear_ramp_image(size, angle_deg):
    """Full-canvas linear gradient (0..255) running along `angle_deg`."""
    big = int(size * 1.55)
    strip = Image.new("L", (1, big))
    sd = ImageDraw.Draw(strip)
    for y in range(big):
        sd.point((0, y), fill=int(255 * y / (big - 1)))
    grad = strip.resize((big, big), Image.BILINEAR)
    grad = grad.rotate(angle_deg, resample=Image.BICUBIC)
    off = (big - size) // 2
    return grad.crop((off, off, off + size, off + size))


def badge_base(tier):
    """Return the RGBA master badge with an empty centre, ready for a glyph."""
    simple = tier != "full"
    r_out_n = 0.985
    # a thinner rim at small sizes leaves more room for the glyph
    rim_w_n = {"micro": 0.125, "simple": 0.155}.get(tier, 0.145)
    r_in_n = r_out_n - rim_w_n

    c = (R - 1) / 2.0
    r_out = r_out_n * R / 2.0
    r_in = r_in_n * R / 2.0

    badge = Image.new("RGB", (R, R), NAVY_EDGE)
    d = ImageDraw.Draw(badge)

    # concentric fills from the outer edge inward: one pass paints rim + field
    steps = int(r_out) + 1
    for i in range(steps, -1, -1):
        rr = r_out * i / steps
        t_abs = rr / r_out
        if t_abs >= r_in_n / r_out_n:
            t = (t_abs - r_in_n / r_out_n) / max(1.0 - r_in_n / r_out_n, 1e-9)
            col = ramp(t, RIM_STOPS)
        else:
            f = t_abs / max(r_in_n / r_out_n, 1e-9)
            col = lerp(NAVY_CORE, NAVY_EDGE, f ** 1.35)
        d.ellipse([c - rr, c - rr, c + rr, c + rr], fill=col)

    # directional light from the top-left, applied to the rim only.
    # On a thin annulus, cos(theta - phi) is a linear ramp along phi, so a
    # rotated linear gradient reproduces the angular shading exactly.
    light = linear_ramp_image(R, -45.0)
    light = light.point(lambda v: int(96 + 159 * (v / 255.0)))       # 0.38..1.00
    rim_mask = Image.new("L", (R, R), 0)
    rd = ImageDraw.Draw(rim_mask)
    rd.ellipse([c - r_out, c - r_out, c + r_out, c + r_out], fill=255)
    rd.ellipse([c - r_in, c - r_in, c + r_in, c + r_in], fill=0)
    badge.paste(ImageChops.multiply(badge, Image.merge("RGB", (light, light, light))),
                (0, 0), rim_mask)

    # soft sheen on the navy field, top-left
    sheen = Image.new("L", (R, R), 0)
    sd = ImageDraw.Draw(sheen)
    sr = r_in * 0.78
    sd.ellipse([c - r_in * 0.95 - sr, c - r_in * 0.95 - sr,
                c - r_in * 0.95 + sr, c - r_in * 0.95 + sr], fill=44)
    sheen = sheen.filter(ImageFilter.GaussianBlur(R * 0.10))
    field_mask = Image.new("L", (R, R), 0)
    ImageDraw.Draw(field_mask).ellipse([c - r_in, c - r_in, c + r_in, c + r_in], fill=255)
    sheen = ImageChops.multiply(sheen, field_mask.point(lambda v: 255 if v else 0))
    badge = ImageChops.add(badge, Image.merge("RGB", (sheen, sheen, sheen)))

    # thin dark separation so the glyph field never bleeds into the rim
    sep_w = max(2, int(R * (0.012 if simple else 0.009) / 2))
    ImageDraw.Draw(badge).ellipse(
        [c - r_in, c - r_in, c + r_in, c + r_in],
        outline=tuple(int(v * 0.85) for v in GOLD_EDGE), width=sep_w,
    )

    alpha = Image.new("L", (R, R), 0)
    ImageDraw.Draw(alpha).ellipse([c - r_out, c - r_out, c + r_out, c + r_out], fill=255)

    out = badge.convert("RGBA")
    out.putalpha(alpha)
    return out, r_in_n


# -----------------------------------------------------------------------------
# Metallic gradient fill for glyphs
# -----------------------------------------------------------------------------
def metal_sheet(palette, y0, y1):
    """Vertical metallic gradient spanning the glyph's bounding box."""
    edge, deep, mid, light, hilite = palette
    stops = [
        (0.00, deep),
        (0.18, mid),
        (0.42, light),
        (0.56, hilite),
        (0.78, light),
        (1.00, deep),
    ]
    top = max(0, min(R - 1, int((y0 + 1.0) * 0.5 * R)))
    bot = max(top + 1, min(R, int((y1 + 1.0) * 0.5 * R)))

    strip = Image.new("RGB", (1, R))
    sd = ImageDraw.Draw(strip)
    for y in range(R):
        t = (y - top) / float(bot - top)
        sd.point((0, y), fill=ramp(max(0.0, min(1.0, t)), stops))
    return strip.resize((R, R), Image.NEAREST)


def compose_glyph(base, shape_fn, palette, bbox, tier):
    """Draw a glyph: dark contour ring + metallic fill, pasted onto the badge."""
    edge = palette[0]
    grow = ulen({"micro": 0.060, "simple": 0.052}.get(tier, 0.040))

    outer = Image.new("L", (R, R), 0)
    shape_fn(ImageDraw.Draw(outer), grow)

    inner = Image.new("L", (R, R), 0)
    shape_fn(ImageDraw.Draw(inner), 0.0)

    base.paste(Image.new("RGB", (R, R), edge), (0, 0), outer)
    base.paste(metal_sheet(palette, bbox[0], bbox[1]), (0, 0), inner)
    return base


def stroke(d, pts, grow, closed=True):
    """Fill a polygon and optionally expand it by `grow` px with a round joint."""
    d.polygon(pts, fill=255)
    if grow > 0:
        path = pts + [pts[0]] if closed else pts
        d.line(path, fill=255, width=int(round(grow)), joint="curve")


# -----------------------------------------------------------------------------
# Glyphs
# -----------------------------------------------------------------------------
def glyph_play(tier):
    """Solid play triangle, optically centred."""
    s = 1.10 if tier == "micro" else 1.0
    pts = [(-0.30 * s, -0.46 * s), (0.48 * s, 0.0), (-0.30 * s, 0.46 * s)]

    def fn(d, grow):
        stroke(d, upath(pts), grow)

    return fn, (-0.46 * s, 0.46 * s)


def glyph_folder(tier):
    """Folder with a plus punched out of its lower-right corner."""
    s = 1.06 if tier == "micro" else 1.0
    x0, y0, x1, y1 = -0.58 * s, -0.20 * s, 0.58 * s, 0.44 * s
    body = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    tab = [(x0, y0), (x0, -0.44 * s), (-0.10 * s, -0.44 * s), (0.04 * s, y0)]

    def fn(d, grow):
        d.rounded_rectangle([*U(x0, y0), *U(x1, y1)], radius=ulen(0.07 * s), fill=255)
        stroke(d, upath(tab), 0.0)
        if grow > 0:
            d.line(upath(body + [body[0]]), fill=255, width=int(round(grow)), joint="curve")
            d.line(upath(tab + [tab[0]]), fill=255, width=int(round(grow)), joint="curve")

    return fn, (-0.44 * s, 0.44 * s)


def plus_cutout(tier):
    """Navy plus punched into the folder. Kept small and off-centre so the icon
    does not read as a medical cross at 16px."""
    if tier == "micro":
        cx, cy, arm, th = 0.29, 0.15, 0.19, 0.078
    elif tier == "simple":
        cx, cy, arm, th = 0.29, 0.16, 0.15, 0.058
    else:
        cx, cy, arm, th = 0.28, 0.15, 0.155, 0.055

    def fn(d):
        r = ulen(th * 0.4)
        d.rounded_rectangle([*U(cx - arm, cy - th), *U(cx + arm, cy + th)], radius=r, fill=255)
        d.rounded_rectangle([*U(cx - th, cy - arm), *U(cx + th, cy + arm)], radius=r, fill=255)

    return fn


def glyph_sparkle(tier):
    """Four-point sparkle: r(theta) = scale / (1 + k|sin 2theta|).
    Small k = fat star points; large k = thin elegant sparkle."""
    # Below 32px the star is turned 45 degrees: on the diagonals it reads as a
    # sparkle, while an upright one collapses into a "+" and gets confused with
    # the Nouveau Projet folder.
    if tier == "micro":
        big, k, extras, rot = 0.72, 1.25, False, math.pi / 4
    elif tier == "simple":
        big, k, extras, rot = 0.68, 2.30, False, math.pi / 4
    else:
        big, k, extras, rot = 0.60, 13.0, True, 0.0

    def points(scale, cx, cy, kk):
        pts = []
        for i in range(240):
            th = 2.0 * math.pi * i / 240.0
            rr = scale / (1.0 + kk * abs(math.sin(2.0 * (th - rot))))
            pts.append((cx + rr * math.cos(th), cy + rr * math.sin(th)))
        return pts

    def fn(d, grow):
        stroke(d, upath(points(big, 0.0, 0.06, k)), grow)
        if extras:
            stroke(d, upath(points(0.20, 0.50, -0.46, k)), grow * 0.6)
            stroke(d, upath(points(0.14, -0.48, -0.34, k)), grow * 0.6)

    return fn, (-0.56, 0.66)


def glyph_caduceus(tier):
    """Caduceus: winged staff with an orb. The twin serpents are dropped below
    24px, where they only add noise."""
    micro = tier == "micro"
    staff_w = 0.085 if tier == "simple" else 0.072

    def fn(d, grow):
        g = int(round(grow))

        # At 16-24px the staff + wings silhouette turns into a plain cross, so
        # the micro variant is a compact winged orb instead.
        if micro:
            for s in (-1, 1):
                wing = [(s * 0.32, -0.30), (s * 0.88, -0.46),
                        (s * 0.76, 0.10), (s * 0.34, 0.14)]
                stroke(d, upath(wing), grow)
            d.ellipse([*U(-0.27, -0.27), *U(0.27, 0.27)], fill=255)
            return

        d.rounded_rectangle([*U(-staff_w, -0.42), *U(staff_w, 0.68)],
                            radius=ulen(staff_w), fill=255)
        d.ellipse([*U(-0.145, -0.74), *U(0.145, -0.45)], fill=255)

        if tier == "full":
            for s in (-1, 1):
                for tipx, tipy, basey in [(0.66, -0.62, -0.44), (0.60, -0.46, -0.34),
                                          (0.46, -0.30, -0.24)]:
                    wing = [(s * 0.09, basey), (s * tipx, tipy),
                            (s * (tipx - 0.10), tipy + 0.13), (s * 0.11, basey + 0.09)]
                    stroke(d, upath(wing), grow * 0.8)
        else:
            for s in (-1, 1):
                wing = [(s * 0.09, -0.40), (s * 0.66, -0.58),
                        (s * 0.52, -0.22), (s * 0.12, -0.20)]
                stroke(d, upath(wing), grow)

        amp = 0.27 if tier == "simple" else 0.235
        turns = 1.0 if tier == "simple" else 1.75
        w = ulen(0.075 if tier == "simple" else 0.062)
        for s in (-1, 1):
            pts = []
            for i in range(80):
                t = i / 79.0
                pts.append(U(s * amp * math.sin(t * turns * 2.0 * math.pi), -0.20 + t * 0.78))
            d.line(pts, fill=255, width=int(w + g), joint="curve")
            hx, hy = pts[0]
            rr = w * 0.9 + g / 2
            d.ellipse([hx - rr, hy - rr, hx + rr, hy + rr], fill=255)

    return fn, (-0.74, 0.68)


# -----------------------------------------------------------------------------
# Icon assembly
# -----------------------------------------------------------------------------
def render_master(kind, tier):
    base, r_in = badge_base(tier)

    if kind == "hermes-master":
        fn, bbox = glyph_play(tier)
        compose_glyph(base, fn, GOLD, bbox, tier)
    elif kind == "hermes-clean":
        fn, bbox = glyph_sparkle(tier)
        compose_glyph(base, fn, SILV, bbox, tier)
    elif kind == "nouveau-projet":
        fn, bbox = glyph_folder(tier)
        compose_glyph(base, fn, GOLD, bbox, tier)
        cut = Image.new("L", (R, R), 0)
        plus_cutout(tier)(ImageDraw.Draw(cut))
        base.paste(Image.new("RGB", (R, R), NAVY_EDGE), (0, 0), cut)
    elif kind == "hermes-hub":
        fn, bbox = glyph_caduceus(tier)
        compose_glyph(base, fn, GOLD, bbox, tier)
    else:
        raise ValueError(kind)

    return base


def render_size(kind, px):
    master = render_master(kind, tier_for(px))
    return master.resize((px, px), Image.LANCZOS)


# -----------------------------------------------------------------------------
# Hand-rolled .ico writer
# -----------------------------------------------------------------------------
def bmp_frame(im):
    """32bpp BMP frame with AND mask, as required inside an .ico below 256px."""
    w, h = im.size
    px = im.load()

    xor = bytearray()
    for y in range(h - 1, -1, -1):                    # BMP rows are bottom-up
        for x in range(w):
            r, g, b, a = px[x, y]
            xor += bytes((b, g, r, a))                # BGRA

    row_bytes = ((w + 31) // 32) * 4
    mask = bytearray()
    for y in range(h - 1, -1, -1):
        row = bytearray(row_bytes)
        for x in range(w):
            if px[x, y][3] == 0:
                row[x // 8] |= 0x80 >> (x % 8)
        mask += row

    header = struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0, len(xor), 0, 0, 0, 0)
    return header + bytes(xor) + bytes(mask)


def write_ico(path, frames):
    """frames: dict {size: RGBA Image}."""
    blobs, entries = [], []
    offset = 6 + 16 * len(frames)
    for size in sorted(frames):
        im = frames[size]
        if size >= 256:
            buf = io.BytesIO()
            im.save(buf, "PNG")
            blob = buf.getvalue()
        else:
            blob = bmp_frame(im)
        entries.append((size, len(blob), offset))
        blobs.append(blob)
        offset += len(blob)

    with open(path, "wb") as f:
        f.write(struct.pack("<HHH", 0, 1, len(frames)))
        for size, length, off in entries:
            dim = 0 if size >= 256 else size
            f.write(struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, length, off))
        for blob in blobs:
            f.write(blob)


# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
KINDS = ["hermes-hub", "hermes-master", "hermes-clean", "nouveau-projet"]


def main():
    os.makedirs(ICONS_DIR, exist_ok=True)

    sheet_rows = []
    for kind in KINDS:
        frames = {px: render_size(kind, px) for px in ICO_SIZES}

        write_ico(os.path.join(ICONS_DIR, kind + ".ico"), frames)
        frames[256].save(os.path.join(ICONS_DIR, kind + "-preview.png"))
        print("  " + kind + ".ico  (" + ", ".join(str(s) for s in ICO_SIZES) + " px)")

        sheet_rows.append((kind, frames))

    # contact sheet: every icon at every real size, on a light and a dark strip
    pad, label_w = 14, 150
    cols = ICO_SIZES
    row_h = 300
    width = label_w + sum(min(s, 256) + pad for s in cols) + pad
    sheet = Image.new("RGB", (width, row_h * len(sheet_rows) + 40), (245, 246, 250))
    d = ImageDraw.Draw(sheet)
    for ri, (kind, frames) in enumerate(sheet_rows):
        y = 40 + ri * row_h
        d.rectangle([0, y - 10, width, y + row_h - 24], fill=(28, 30, 44) if ri % 2 else (245, 246, 250))
        d.text((12, y + 120), kind, fill=(150, 155, 170))
        x = label_w
        for s in cols:
            im = frames[s]
            sheet.paste(im, (x, y + 130 - s // 2), im)
            d.text((x, y + 210), str(s) + "px", fill=(150, 155, 170))
            x += min(s, 256) + pad
    sheet.save(os.path.join(ICONS_DIR, "_contact-sheet.png"))
    print("  _contact-sheet.png")

    # mirror into the Hub's public/ folder
    if os.path.isdir(HUB_PUBLIC):
        for kind in KINDS:
            shutil.copy2(os.path.join(ICONS_DIR, kind + ".ico"), os.path.join(HUB_PUBLIC, kind + ".ico"))
            shutil.copy2(os.path.join(ICONS_DIR, kind + "-preview.png"), os.path.join(HUB_PUBLIC, kind + ".png"))
        print("  -> copies vers " + HUB_PUBLIC)
    else:
        print("  (Hermes-Hub/public introuvable, copie ignoree)")


if __name__ == "__main__":
    print("Generation des icones Hermes (badge circulaire unifie)")
    main()
    print("Termine.")
