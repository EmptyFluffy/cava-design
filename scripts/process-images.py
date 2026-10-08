"""Crop the process and service images in data/process.json to 3:2 and write the WebP sizes the site serves.

    python3 scripts/process-images.py <folder-with-the-sources>

The folder holds the photos by their 'src' name and the studio's drawings as <id>.png, or <id>-en.png and
<id>-es.png when they carry words. Writes site/assets/img/process/<id>[-es]-1600.webp and -800.webp.
The originals stay out of the repo.
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = sys.argv[1]
data = json.load(open(os.path.join(ROOT, 'data', 'process.json')))
out = os.path.join(ROOT, 'site', 'assets', 'img', 'process')
os.makedirs(out, exist_ok=True)

def write(img, name, focus):
    w, h = img.size
    if w / h > 1.5:  # wider than 3:2: keep the middle
        cw = round(h * 1.5); left = (w - cw) // 2
        img = img.crop((left, 0, left + cw, h))
    else:
        ch = round(w / 1.5); top = round((h - ch) * focus)
        img = img.crop((0, top, w, top + ch))
    for size in (1600, 800):
        img.resize((size, size * 2 // 3), Image.LANCZOS).save(os.path.join(out, f'{name}-{size}.webp'), 'WEBP', quality=80 if size == 1600 else 78, method=6)

n = 0
for pid, p in data['images'].items():
    focus = p.get('focus', 0.5)
    if p.get('ours'):
        for lang in (['en', 'es'] if p.get('lang') else [None]):
            f = f'{pid}-{lang}.png' if lang else f'{pid}.png'
            write(Image.open(os.path.join(src, f)).convert('RGB'), pid if lang in (None, 'en') else f'{pid}-es', focus); n += 1
    else:
        write(Image.open(os.path.join(src, p['src'])).convert('RGB'), pid, focus); n += 1
print(n, 'images written')
