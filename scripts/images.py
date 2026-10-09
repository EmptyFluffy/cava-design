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
            r.save(os.path.join(out, f'{n}-{w}.webp'), 'WEBP', quality=92 if im.get('plan') else 80 if w == 1600 else 78, method=6)
            if w == 1600:
                sizes[f"{p['slug']}/{n}"] = [r.width, r.height]
        # a plan shown as a titled plate in each language, up to 3600 px (a retina screen at full width)
        for lang, rel in (im.get('plate') or {}).items():
            img = Image.open(os.path.join(src, p['folder'], rel)).convert('RGB')
            for w in (3600, 2400, 1600, 800):
                r = img.copy()
                r.thumbnail((w, w * 2), Image.LANCZOS)
                r.save(os.path.join(out, f'{n}-{lang}-{w}.webp'), 'WEBP', quality=92, method=6)
                if w == 1600:
                    sizes[f"{p['slug']}/{n}-{lang}"] = [r.width, r.height]
        # a plan drawn for the desktop width it is shown at (numbers sized for it), up to 3600 px
        if im.get('desk'):
            img = Image.open(os.path.join(src, p['folder'], im['desk'])).convert('RGB')
            for w in (3600, 2400, 1600, 800):
                r = img.copy()
                r.thumbnail((w, w * 3), Image.LANCZOS)
                r.save(os.path.join(out, f'{n}-d-{w}.webp'), 'WEBP', quality=92, method=6)
                if w == 1600:
                    sizes[f"{p['slug']}/{n}-d"] = [r.width, r.height]
    # construction drawings (line art: a higher quality, so the lines stay clean)
    for d in (x for s in p.get('drawings', []) for x in s['items']):
        img = Image.open(os.path.join(src, p['folder'], d['file'])).convert('RGB')
        for w in (1600, 800):
            r = img.copy()
            r.thumbnail((w, w * 2), Image.LANCZOS)
            r.save(os.path.join(out, f"d-{d['id']}-{w}.webp"), 'WEBP', quality=88, method=6)
            if w == 1600:
                sizes[f"{p['slug']}/d-{d['id']}"] = [r.width, r.height]
json.dump(sizes, open(os.path.join(ROOT, 'data', 'image-sizes.json'), 'w'), indent=1)
print(len(sizes), 'images written')
