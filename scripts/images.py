"""Convert the project renders into the WebP sizes the site serves.

    python3 scripts/images.py [source-folder]

The source folder holds one folder per project, named as in data/projects.json
("folder"), with the PNG renders inside. Default: ~/Desktop/CAVA.
Writes site/assets/img/projects/<slug>/<n>-1600.webp and -800.webp (n follows
the image order in the data, 1 = cover) and data/image-sizes.json.
"""
import json, os, sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Desktop/CAVA')
data = json.load(open(os.path.join(ROOT, 'data', 'projects.json')))
sizes = {}
for p in data['projects']:
    out = os.path.join(ROOT, 'site', 'assets', 'img', 'projects', p['slug'])
    os.makedirs(out, exist_ok=True)
    for n, im in enumerate(p['images'], 1):
        img = Image.open(os.path.join(src, p['folder'], im['file'])).convert('RGB')
        for w in (1600, 800):
            r = img.copy()
            r.thumbnail((w, w * 2), Image.LANCZOS)
            r.save(os.path.join(out, f'{n}-{w}.webp'), 'WEBP', quality=80 if w == 1600 else 78, method=6)
            if w == 1600:
                sizes[f"{p['slug']}/{n}"] = [r.width, r.height]
json.dump(sizes, open(os.path.join(ROOT, 'data', 'image-sizes.json'), 'w'), indent=1)
print(len(sizes), 'images written')
