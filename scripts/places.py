"""Crop the photos of Costa Rica in data/places.json to a 2:1 band and write the WebP sizes the site serves.

    python3 scripts/places.py <folder-with-the-downloaded-photos>

Writes site/assets/img/places/<id>-1600.webp and -800.webp. The originals stay out of the repo.
"""
import json, os, sys
from PIL import Image, ImageEnhance

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
data = json.load(open(os.path.join(ROOT, 'data', 'places.json')))
out = os.path.join(ROOT, 'site', 'assets', 'img', 'places')
os.makedirs(out, exist_ok=True)
for pid, p in data['photos'].items():
    img = Image.open(os.path.join(src, p['src'])).convert('RGB')
    if p.get('saturation'):
        img = ImageEnhance.Color(img).enhance(p['saturation'])
    w, h = img.size
    ch = min(h, w // 2)  # a 2:1 band, full width
    top = round((h - ch) * p.get('focus', 0.5))
    band = img.crop((0, top, w, top + ch))
    for size in (1600, 800):
        r = band.resize((size, size // 2), Image.LANCZOS)
        r.save(os.path.join(out, f'{pid}-{size}.webp'), 'WEBP', quality=80 if size == 1600 else 78, method=6)
print(len(data['photos']), 'photos written')
