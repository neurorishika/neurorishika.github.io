"""Generate public/img/fly-sprite.png: a top-down Drosophila sprite sheet.

Layout (each cell is CELL x CELL CSS px, drawn at SCALE x for crisp hi-dpi rendering;
the fly faces UP, i.e. head toward the top of the cell, centred in the cell):

  row 0  female body   stand | walk1 | walk2 | walk3 | walk4 | groom-front | groom-hind
  row 1  male body     (same columns; smaller abdomen with dark tip)
  row 2  wings         folded | flick-small | flick-wide | left-out | right-out

Body and wings are separate layers: flies.js stacks a wing cell on top of a body cell,
so any leg pose can be combined with any wing pose.

Requires Pillow (not a site dependency):  python3 -m pip install pillow
Run from the repo root:                   python3 design/make_fly_sprite.py
"""
import math
from pathlib import Path
from PIL import Image, ImageDraw

CELL = 24          # CSS px per cell
SCALE = 3          # output pixels per CSS px (hi-dpi)
SS = 4             # supersampling factor for anti-aliasing
K = SCALE * SS     # drawing units per CSS px
BODY_COLS = 7
WING_COLS = 5

# Muted field-notebook palette (flies.js applies overall opacity on top).
INK = (92, 78, 64, 255)          # legs / outlines
THORAX = (128, 108, 84, 255)
HEAD = (138, 116, 90, 255)
EYE = (150, 82, 62, 255)          # faded red-brown
ABD = (150, 128, 100, 255)
BAND = (96, 80, 62, 255)          # abdominal stripes / male tip
WING_FILL = (205, 198, 186, 120)  # translucent
WING_EDGE = (120, 106, 90, 170)

OUT = Path(__file__).resolve().parent.parent / "public" / "img" / "fly-sprite.png"


def P(x, y, ox, oy):
    """CSS-px coords inside a cell -> supersampled canvas coords."""
    return ((ox + x) * K, (oy + y) * K)


def ellipse(d, cx, cy, rx, ry, ox, oy, fill, outline=None, width=0):
    x0, y0 = P(cx - rx, cy - ry, ox, oy)
    x1, y1 = P(cx + rx, cy + ry, ox, oy)
    d.ellipse([x0, y0, x1, y1], fill=fill, outline=outline, width=int(width * K))


def polyline(d, pts, ox, oy, fill, width):
    d.line([P(x, y, ox, oy) for x, y in pts], fill=fill, width=max(1, int(width * K)), joint="curve")


# ---- legs -----------------------------------------------------------------
# Each leg: attachment on the thorax, then (dx, dy) offsets for femur->tibia->tarsus.
# Coordinates are for the fly's LEFT side; right side mirrors x.
CX = CELL / 2
THORAX_Y = 9.0

BASE_LEGS = {
    "front": ((CX - 1.6, THORAX_Y - 1.2), [(-2.0, -0.9), (-1.0, -1.6), (-0.3, -0.9)]),
    "mid":   ((CX - 2.0, THORAX_Y + 0.4), [(-2.8, -0.2), (-1.8, 1.2), (-1.0, 1.0)]),
    "hind":  ((CX - 1.7, THORAX_Y + 1.8), [(-2.2, 1.8), (-1.2, 2.6), (-0.6, 1.8)]),
}


SWING_DEG = 13   # how far a leg rotates forward/back about its hip during the walk cycle


def leg_points(name, side, swing=0.0, override=None):
    """swing in [-1, 1] rotates the whole leg about its hip: forward (+) or back (-)."""
    (ax, ay), segs = BASE_LEGS[name]
    if override is not None:
        segs = override
    pts = [(ax, ay)]
    x, y = ax, ay
    for dx, dy in segs:
        x += dx
        y += dy
        pts.append((x, y))
    th = math.radians(SWING_DEG * swing)
    pts = [(ax + (px - ax) * math.cos(th) - (py - ay) * math.sin(th),
            ay + (px - ax) * math.sin(th) + (py - ay) * math.cos(th)) for px, py in pts]
    if side == "R":
        pts = [(2 * CX - px, py) for px, py in pts]
    return pts


# Tripod gait: L-front, R-mid, L-hind move together (set A), the others are set B.
TRIPOD_A = {("front", "L"), ("mid", "R"), ("hind", "L")}
WALK_PHASES = [1.0, 0.0, -1.0, 0.0]   # set A swing; set B is the opposite


def draw_legs(d, ox, oy, pose):
    for name in ("front", "mid", "hind"):
        for side in ("L", "R"):
            swing, override = 0.0, None
            if pose.startswith("walk"):
                ph = WALK_PHASES[int(pose[-1]) - 1]
                swing = ph if (name, side) in TRIPOD_A else -ph
            elif pose == "groom-front" and name == "front":
                # front legs raised together in front of the head, rubbing
                override = [(-0.9, -2.0), (0.6, -2.0), (0.7, -0.6)]
            elif pose == "groom-hind" and name == "hind":
                # hind legs swept back over the abdomen / wings
                override = [(-1.6, 2.2), (0.4, 3.4), (0.8, 1.6)]
            polyline(d, leg_points(name, side, swing, override), ox, oy, INK, 0.38)


def draw_body(d, ox, oy, sex, pose):
    draw_legs(d, ox, oy, pose)
    # abdomen
    if sex == "female":
        acy, arx, ary = 14.6, 2.75, 4.1
        ellipse(d, CX, acy, arx, ary, ox, oy, ABD, INK, 0.25)
        for i, by in enumerate((12.4, 14.2, 16.0)):
            w = arx * math.sqrt(max(0.0, 1 - ((by - acy) / ary) ** 2)) - 0.25
            polyline(d, [(CX - w, by), (CX + w, by)], ox, oy, BAND, 0.75)
    else:
        acy, arx, ary = 13.6, 2.25, 3.2
        ellipse(d, CX, acy, arx, ary, ox, oy, ABD, INK, 0.25)
        # dark, rounded tip (the male's fused tergites)
        ellipse(d, CX, acy + 1.6, arx * 0.82, ary * 0.5, ox, oy, BAND)
        polyline(d, [(CX - 1.9, 12.3), (CX + 1.9, 12.3)], ox, oy, BAND, 0.6)
    # thorax + head + eyes
    ellipse(d, CX, THORAX_Y, 2.35, 2.55, ox, oy, THORAX, INK, 0.25)
    ellipse(d, CX, 5.6, 2.05, 1.55, ox, oy, HEAD, INK, 0.2)
    ellipse(d, CX - 1.45, 5.5, 0.95, 1.25, ox, oy, EYE)
    ellipse(d, CX + 1.45, 5.5, 0.95, 1.25, ox, oy, EYE)


def wing_polygon(angle_deg, side):
    """Wing outline. angle is measured from 'pointing straight back' toward the side."""
    hinge = (CX - 0.9, THORAX_Y + 0.8)
    length, width = 9.0, 3.0
    # local outline: elongated rounded blade from the hinge (0,0) to the tip (0,length);
    # the leading/outer edge bulges outward (-x, toward the fly's side), the trailing edge less.
    n = 18
    outer, inner = [], []
    for i in range(n + 1):
        t = math.pi * i / n
        y = length * (1 - math.cos(t)) / 2
        bulge = math.sin(t) ** 0.8
        outer.append((-width * 0.62 * bulge, y))
        inner.append((width * 0.38 * bulge, y))
    local = outer + inner[::-1]
    a = math.radians(angle_deg)
    pts = []
    for lx, ly in local:
        # rotate (lx, ly): +y = back; rotate toward the fly's left (screen -x)
        rx = lx * math.cos(a) - ly * math.sin(a)
        ry = lx * math.sin(a) + ly * math.cos(a)
        pts.append((hinge[0] + rx, hinge[1] + ry))
    if side == "R":
        pts = [(2 * CX - x, y) for x, y in pts]
    return pts


def draw_wing(d, ox, oy, angle, side):
    outline = wing_polygon(angle, side)
    d.polygon([P(x, y, ox, oy) for x, y in outline], fill=WING_FILL, outline=WING_EDGE,
              width=max(1, int(0.22 * K)))
    # a single longitudinal vein from hinge to tip
    hx, hy = outline[0]
    tx, ty = outline[len(outline) // 2]
    polyline(d, [(hx, hy), (tx, ty)], ox, oy, WING_EDGE, 0.18)


WING_POSES = {
    "folded":      (-3, -3),   # (left angle, right angle) from the body axis; <0 = crossed over
    "flick-small": (16, 16),
    "flick-wide":  (30, 30),
    "left-out":    (85, -3),
    "right-out":   (-3, 85),
}


def main():
    W = CELL * BODY_COLS * K
    H = CELL * 3 * K
    big = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    body_poses = ["stand", "walk1", "walk2", "walk3", "walk4", "groom-front", "groom-hind"]
    for row, sex in enumerate(("female", "male")):
        for col, pose in enumerate(body_poses):
            layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw_body(ImageDraw.Draw(layer), col * CELL, row * CELL, sex, pose)
            big = Image.alpha_composite(big, layer)
    for col, name in enumerate(WING_POSES):
        la, ra = WING_POSES[name]
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        # draw the less-extended wing first so the extended one sits on top
        order = [("L", la), ("R", ra)] if la <= ra else [("R", ra), ("L", la)]
        for side, ang in order:
            draw_wing(d, col * CELL, 2 * CELL, ang, side)
        big = Image.alpha_composite(big, layer)
    out = big.resize((W // SS, H // SS), Image.LANCZOS)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    out.save(OUT, optimize=True)
    print(f"wrote {OUT} ({out.width}x{out.height})")


if __name__ == "__main__":
    main()
