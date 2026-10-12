"""Crop the photos of Costa Rica in data/places.json to a 2:1 band and write the WebP sizes the site serves.

    python3 scripts/places.py <folder-with-the-downloaded-photos>

Writes site/assets/img/places/<id>-1600.webp and -800.webp, and the 4:3 card crops <id>-card-800.webp and
-card-480.webp (around 'focus_x', 0 left, 1 right). The originals stay out of the repo; a photo whose
original is not in the folder keeps its band and gets its card cut from the 1600 band.
"""
import json, os, sys
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
data = json.load(open(os.path.join(ROOT, 'data', 'places.json')))
out = os.path.join(ROOT, 'site', 'assets', 'img', 'places')
os.makedirs(out, exist_ok=True)
def card(img, p):
    w, h = img.size
    cw = min(w, round(h * 4 / 3)); ch = round(cw * 3 / 4)
    left = round((w - cw) * p.get('focus_x', 0.5)); top = round((h - ch) * p.get('focus', 0.5))
    c = img.crop((left, top, left + cw, top + ch))
    for size in (800, 480):
        c.resize((size, size * 3 // 4), Image.LANCZOS).save(os.path.join(out, f'{pid}-card-{size}.webp'), 'WEBP', quality=80, method=6)

for pid, p in data['photos'].items():
    path = os.path.join(src, p['src'])
    if not os.path.exists(path):
        card(Image.open(os.path.join(out, f'{pid}-1600.webp')).convert('RGB'), {**p, 'focus': 0.5})
        continue
    img = Image.open(path).convert('RGB')
    if p.get('saturation'):
        img = ImageEnhance.Color(img).enhance(p['saturation'])
    w, h = img.size
    ch = min(h, w // 2)  # a 2:1 band, full width
    top = round((h - ch) * p.get('focus', 0.5))
    band = img.crop((0, top, w, top + ch))
    for size in (1600, 800):
        r = band.resize((size, size // 2), Image.LANCZOS)
        r.save(os.path.join(out, f'{pid}-{size}.webp'), 'WEBP', quality=80 if size == 1600 else 78, method=6)
    card(img, p)
print(len(data['photos']), 'photos written')
