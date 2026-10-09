"""The studio grade, for the projects marked "grade": true in data/projects.json.

One treatment so a project's images read as one photographer's and lose the generated sheen:
  1. less colour, most on the orange and teal of golden hour
  2. shadows a little deeper, highlights a little cooler
  3. edges a little softer
  4. a fine luminance grain, strongest in the midtones

Applied by scripts/images.py after resizing, so the grain is drawn at the size it is shown. Pillow only;
the grain is seeded from the image's name, so the same source always gives the same file.
"""
import math, random, zlib
from PIL import Image, ImageChops, ImageFilter, ImageMath


def _lut(f):
    return [max(0, min(255, round(f(v / 255) * 255))) for v in range(256)]


# 1. saturation factor by hue (PIL hue 0-255 = 0-360 degrees)
def _sat_factor(h):
    deg = h / 255 * 360
    orange = math.exp(-((deg - 30) / 22) ** 2)
    teal = math.exp(-((deg - 190) / 25) ** 2)
    return 1 - (0.12 + 0.12 * orange + 0.10 * teal)


SAT = [max(0, min(255, round(_sat_factor(h) * 255))) for h in range(256)]


# 2. tone: a gentle S in the mids, shadows down; per channel, highlights cooled (red down, blue up)
def _tone(t):
    t2 = t + 0.10 * (t - 0.5) * (1 - abs(2 * t - 1))
    sh = max(0.0, (0.35 - t) / 0.35)
    return t2 - 0.035 * sh * (1 - sh * 0.3)


def _hi(t):
    return max(0.0, (t - 0.55) / 0.45)


TONE = {
    'R': _lut(lambda t: _tone(t) * (1 - 0.03 * _hi(t))),
    'G': _lut(lambda t: _tone(t) * (1 - 0.005 * _hi(t))),
    'B': _lut(lambda t: _tone(t) * (1 + 0.02 * _hi(t))),
}
# 4. grain amplitude by luminance: most in the midtones
MID = _lut(lambda t: 0.25 + 0.75 * (1 - abs(2 * t - 1)))


def grade(img, key=''):
    img = img.convert('RGB')
    # 1. colour
    h, s, v = img.convert('HSV').split()
    s = ImageChops.multiply(s, h.point(SAT))
    img = Image.merge('HSV', (h, s, v)).convert('RGB')
    # 2. tone
    r, g, b = img.split()
    img = Image.merge('RGB', (r.point(TONE['R']), g.point(TONE['G']), b.point(TONE['B'])))
    # 3. softer edges
    img = Image.blend(img, img.filter(ImageFilter.GaussianBlur(0.9)), 0.22)
    # 4. grain: uniform noise, slightly clumped, seeded by the image's name
    w, hgt = img.size
    rnd = random.Random(zlib.crc32(f'{key}/{w}'.encode()))
    noise = Image.frombytes('L', (w, hgt), rnd.randbytes(w * hgt)).filter(ImageFilter.GaussianBlur(0.45))
    mid = img.convert('L').point(MID)
    # the blurred uniform noise spreads about 50 levels around 128; scaled to a spread of about 1.1% of full range
    grain = ImageMath.lambda_eval(lambda a: (a['n'] - 128) * a['m'] / 255 * 0.055, n=noise.convert('F'), m=mid.convert('F'))
    bands = [ImageMath.lambda_eval(lambda a: a['c'] + a['g'] + 0.5, c=c.convert('F'), g=grain).convert('L') for c in img.split()]
    return Image.merge('RGB', bands)
