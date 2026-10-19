"""The Military Museum's "From sail to roof" diagram (2026-10-19): four line drawings, written as SVG.
  1 the sail: a gaff mainsail is a ruled, twisted surface between mast, boom and gaff
  2 one module: the same double curve as a roof, two corners high and two low (a hyperbolic paraboloid)
  3 the rig: raking masts and stays hold the high corners, the low ones are tied down
  4 the fleet: modules along the old stone walls, high and low in turn, as in the competition image
Every surface is drawn with straight lines only (both families of rulings), the way the cloth's seams read.
No words in the drawings: the captions live in data/projects.json, in both languages.
Writes site/assets/img/projects/military-museum/sail-1.svg ... sail-4.svg. Run: python3 scripts/sail-diagram.py"""
import math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'site', 'assets', 'img', 'projects', 'military-museum')
INK, GREY = '#080807', '#8b8b88'
SIZE = 480

VIEW = [30, 30]                                      # yaw, pitch in degrees: each drawing sets its own

def proj(p):
    """an orthographic view, turned by yaw about the vertical and looking down by pitch; y up"""
    x, y, z = p
    a, b = math.radians(VIEW[0]), math.radians(VIEW[1])
    xr, zr = x * math.cos(a) + z * math.sin(a), -x * math.sin(a) + z * math.cos(a)
    return (xr, -y * math.cos(b) - zr * math.sin(b))

def lerp(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))

class Drawing:
    def __init__(self): self.items = []          # (kind, points, width, colour, opacity)
    def line(self, a, b, w=1.0, c=INK, o=1.0): self.items.append(('l', [a, b], w, c, o))
    def poly(self, pts, w=1.0, c=INK, o=1.0, closed=True): self.items.append(('p' if closed else 'o', pts, w, c, o))
    def dot(self, a, r=3.2, filled=True): self.items.append(('d', [a], r, INK, 1.0 if filled else 0.0))
    def ruled(self, a, b, c, d, n=12, w=0.7, o=0.55):
        """a twisted quad a-b-c-d (a and c opposite) drawn with both families of straight rulings"""
        for i in range(1, n):
            t = i / n
            self.line(lerp(a, b, t), lerp(d, c, t), w, INK, o)
            self.line(lerp(a, d, t), lerp(b, c, t), w, INK, o)
        self.poly([a, b, c, d], 2.2)
    def svg(self, path, pad=34):
        pts = [proj(p) for _, ps, *_ in self.items for p in ps]
        x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts)
        y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
        k = (SIZE - 2 * pad) / max(x1 - x0, y1 - y0)
        ox, oy = (SIZE - (x1 - x0) * k) / 2 - x0 * k, (SIZE - (y1 - y0) * k) / 2 - y0 * k
        P = lambda p: (round(proj(p)[0] * k + ox, 1), round(proj(p)[1] * k + oy, 1))
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}" fill="none" stroke-linecap="round" stroke-linejoin="round">']
        for kind, ps, w, c, o in self.items:
            q = [P(p) for p in ps]
            if kind == 'l':
                out.append(f'<line x1="{q[0][0]}" y1="{q[0][1]}" x2="{q[1][0]}" y2="{q[1][1]}" stroke="{c}" stroke-width="{w}"' + (f' stroke-opacity="{o}"' if o < 1 else '') + '/>')
            elif kind in 'po':
                tag = 'polygon' if kind == 'p' else 'polyline'
                out.append(f'<{tag} points="{" ".join(f"{a},{b}" for a, b in q)}" stroke="{c}" stroke-width="{w}"' + (f' stroke-opacity="{o}"' if o < 1 else '') + '/>')
            else:
                out.append(f'<circle cx="{q[0][0]}" cy="{q[0][1]}" r="{w}" fill="{INK if o else "#fcfcfc"}" stroke="{INK}" stroke-width="1.6"/>')
        out.append('</svg>')
        open(path, 'w').write('\n'.join(out) + '\n')

# ---------- 1 the sail: luff on the mast, foot on the boom, head on the gaff; the leech twists off ----------
VIEW[:] = [-28, 10]
d = Drawing()
mast_foot, tack, throat, peak, clew = (0, 0, 0), (0, 0.8, 0), (0, 6.2, 0), (3.9, 9.4, 2.2), (6.6, 1.3, -1.9)
d.line(mast_foot, (0, 9.8, 0), 2.6)                     # the mast
d.line(tack, lerp(tack, clew, 1.06), 2.4)               # the boom
d.line(throat, lerp(throat, peak, 1.05), 2.4)           # the gaff
d.ruled(tack, clew, peak, throat, n=14)
d.line((-1.6, 0, 0.0), (8.0, 0, 0.0), 1.0, GREY)        # the water line
d.svg(os.path.join(OUT, 'sail-1.svg'))

# ---------- 2 one module: a hyperbolic paraboloid, two corners high, two low ----------
VIEW[:] = [22, 24]
d = Drawing()
lo, hi = 1.0, 4.6
A, B, C, D = (0, lo, 0), (6, hi, 0), (6, lo, 6), (0, hi, 6)
d.ruled(A, B, C, D, n=14)
for g in (A, B, C, D): d.line(g, (g[0], 0, g[2]), 0.8, GREY, 0.9)   # plumb lines to the ground
d.poly([(0, 0, 0), (6, 0, 0), (6, 0, 6), (0, 0, 6)], 1.0, GREY)
for g in (B, D): d.dot(g, 3.6, filled=False)
for g in (A, C): d.dot(g, 3.2, filled=True)
d.svg(os.path.join(OUT, 'sail-2.svg'))

# ---------- 3 the rig: raking masts to the high corners, stays to the ground, the low corners tied down ----------
VIEW[:] = [-45, 30]                                  # looking along the low diagonal: one mast each side
d = Drawing()
d.ruled(A, B, C, D, n=14)
for top, foot, anchor in (((6, hi, 0), (6.8, 0, -0.8), (7.9, 0, -1.9)), ((0, hi, 6), (-0.8, 0, 6.8), (-1.9, 0, 7.9))):
    over = lerp(foot, top, 1.16)                         # the mast runs on past the corner, like a topmast
    d.line(foot, over, 2.8)
    d.line(over, anchor, 0.9)                            # the stay
    d.dot(anchor, 2.4)
for low, tie in (((0, lo, 0), (-0.6, 0, -0.6)), ((6, lo, 6), (6.6, 0, 6.6))):
    d.line(low, tie, 0.9); d.dot(tie, 2.4)
for g in ((6.8, 0, -0.8), (-0.8, 0, 6.8)): d.line(lerp(g, (g[0] + 1, 0, g[2] + 1), -0.6), lerp(g, (g[0] + 1, 0, g[2] + 1), 0.6), 1.0, GREY)   # where each mast stands
d.svg(os.path.join(OUT, 'sail-3.svg'))

# ---------- 4 the fleet: modules along the old stone walls, high and low in turn ----------
VIEW[:] = [-42, 36]
d = Drawing()
n, step, half = 5, 5.2, 3.0
path = [(i * step, 0.9 * math.sin(i / n * math.pi * 1.2)) for i in range(n + 1)]   # a gently bending line
L = [(x, hi if i % 2 == 0 else lo, z - half) for i, (x, z) in enumerate(path)]
R = [(x, lo if i % 2 == 0 else hi, z + half) for i, (x, z) in enumerate(path)]
# the old walls: an elongated ring around the canopy, at ground level
wall = []
for j in range(41):
    a = j / 40 * 2 * math.pi
    x = (n * step) / 2 + math.cos(a) * ((n * step) / 2 + 2.2)
    wall.append((x, 0, 0.9 * math.sin(max(0, min(1, x / (n * step))) * math.pi * 1.2) + math.sin(a) * (half + 2.4)))
d.poly(wall, 1.2, GREY)
for i in range(n):
    d.ruled(L[i], L[i + 1], R[i + 1], R[i], n=8, w=0.6, o=0.5)
for i, p in enumerate(L + R):                              # a raking mast under every high corner
    if abs(p[1] - hi) < 1e-6:
        side = -1 if p in L else 1
        foot = (p[0], 0, p[2] + side * 0.6)              # a slight outward rake, foot on the ground
        d.line(foot, lerp(foot, p, 1.1), 2.2); d.dot(foot, 2.2)
d.svg(os.path.join(OUT, 'sail-4.svg'))
print('wrote sail-1..4.svg in', OUT)
