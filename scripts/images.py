"""Convert the project renders into the WebP sizes the site serves.

    python3 scripts/images.py [source-folder]

The source folder holds one folder per project, named as in data/projects.json
("folder"), with the PNG renders inside. Default: ~/Desktop/CAVA/Proyectos.
Writes site/assets/img/projects/<slug>/<n>-1600.webp and -800.webp (n follows
the image order in the data, 1 = cover) and data/image-sizes.json.
"""
import json, os, sys
from PIL import Image
from grade import grade

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else '~/Desktop/CAVA/Proyectos')
data = json.load(open(os.path.join(ROOT, 'data', 'projects.json')))
sizes = {}
for p in data['projects']:
    out = os.path.join(ROOT, 'site', 'assets', 'img', 'projects', p['slug'])
    os.makedirs(out, exist_ok=True)
    for n, im in enumerate(p['images'], 1):
        img = Image.open(os.path.join(src, p['folder'], im['file'])).convert('RGB')
        for w in (1600, 1200, 800):                         # 1200: a phone at 3x, without the 1600
            r = img.copy()
            r.thumbnail((w, w * 2), Image.LANCZOS)
            if p.get('grade') and not im.get('plan'):      # the studio grade (scripts/grade.py), photos only
                r = grade(r, f"{p['slug']}/{n}")
            r.save(os.path.join(out, f'{n}-{w}.webp'), 'WEBP', quality=92 if im.get('plan') else 80 if w >= 1200 else 78, method=6)
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
    # site analysis layers (cut out on transparency, registered per view): one size, alpha kept
    an = p.get('analysis')
    if an:
        for v in an['views']:
            for l in an['layers']:
                if v['key'] not in l.get('views', [v['key']]):      # a layer drawn in some views only
                    continue
                img = Image.open(os.path.join(src, p['folder'], an['dir'], f"{v['key']}-{l['key']}.png")).convert('RGBA')
                img.save(os.path.join(out, f"a-{v['key']}-{l['key']}.webp"), 'WEBP', quality=90, method=6)
                sizes[f"{p['slug']}/a-{v['key']}-{l['key']}"] = [img.width, img.height]
    # construction drawings (line art: a higher quality, so the lines stay clean)
    for d in [x for s in p.get('drawings', []) for x in s['items']] + p.get('views', []):
        img = Image.open(os.path.join(src, p['folder'], d['file'])).convert('RGB')
        for w in (1600, 1200, 800):
            r = img.copy()
            r.thumbnail((w, w * 2), Image.LANCZOS)
            r.save(os.path.join(out, f"d-{d['id']}-{w}.webp"), 'WEBP', quality=88, method=6)
            if w == 1600:
                sizes[f"{p['slug']}/d-{d['id']}"] = [r.width, r.height]
    # what a design started from (inspiration): black-and-white photographs, already cropped in the folder
    for ph in (p.get('inspiration') or {}).get('photos', []):
        img = Image.open(os.path.join(src, p['folder'], ph['file'])).convert('RGB')
        for w in (1600, 1200, 800):
            r = img.copy()
            r.thumbnail((w, w * 2), Image.LANCZOS)
            r.save(os.path.join(out, f"i-{ph['id']}-{w}.webp"), 'WEBP', quality=82 if w >= 1200 else 78, method=6)
            if w == 1600:
                sizes[f"{p['slug']}/i-{ph['id']}"] = [r.width, r.height]
# hero diptychs: data/projects.json "hero" may hold {"mix": ["slug/n", "slug/n"], "fy": [y, y]}, two upright
# photos side by side as one slide (a thin gap in the hero's black), and stacked for a portrait screen.
# Files: site/assets/img/hero/<id>-{800,1600}.webp and <id>-p-{800,1600}.webp (named by width).
def mix_id(keys):
    slugs = {k.split('/')[0] for k in keys}
    return '-'.join([keys[0].replace('/', '-')] + [k.split('/')[1] for k in keys[1:]]) if len(slugs) == 1 else '-'.join(k.replace('/', '-') for k in keys)
def crop_to(img, ratio, fy):
    w, h = img.size
    if w / h > ratio:                                   # too wide: trim the sides, centred
        nw = round(h * ratio); x = (w - nw) // 2
        return img.crop((x, 0, x + nw, h))
    nh = round(w / ratio); y = round((h - nh) * fy)     # too tall: trim top and bottom around the focus
    return img.crop((0, y, w, y + nh))
GROUND, GAP = (8, 8, 7), 16                             # --black; 0.5% of the 3200 px master
hero_out = os.path.join(ROOT, 'site', 'assets', 'img', 'hero')
os.makedirs(hero_out, exist_ok=True)
by_slug = {p['slug']: p for p in data['projects']}
for e in data.get('hero', []):
    if not isinstance(e, dict):
        continue
    keys, fys = e['mix'], e.get('fy', [0.5] * len(e['mix']))
    srcs = []
    for k in keys:
        slug, n = k.split('/'); p = by_slug[slug]
        srcs.append(Image.open(os.path.join(src, p['folder'], p['images'][int(n) - 1]['file'])).convert('RGB'))
    mid = mix_id(keys)
    for tall, (W, H) in ((False, (3200, 1800)), (True, (1800, 3200))):
        canvas = Image.new('RGB', (W, H), GROUND)
        if tall:
            ch = (H - GAP) // 2
            for i, (im, fy) in enumerate(zip(srcs, fys)):
                canvas.paste(crop_to(im, W / ch, fy).resize((W, ch), Image.LANCZOS), (0, i * (ch + GAP)))
        else:
            cw = (W - GAP) // 2
            for i, (im, fy) in enumerate(zip(srcs, fys)):
                canvas.paste(crop_to(im, cw / H, fy).resize((cw, H), Image.LANCZOS), (i * (cw + GAP), 0))
        name = mid + ('-p' if tall else '')
        for w in (1600, 800):
            r = canvas.resize((w, round(H * w / W)), Image.LANCZOS)
            r.save(os.path.join(hero_out, f'{name}-{w}.webp'), 'WEBP', quality=80 if w >= 1200 else 78, method=6)
            if w == 1600:
                sizes[f'hero/{name}'] = [r.width, r.height]
json.dump(sizes, open(os.path.join(ROOT, 'data', 'image-sizes.json'), 'w'), indent=1)
print(len(sizes), 'images written')
