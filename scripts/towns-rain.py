"""Adds monthly rain to data/town-data.json from the CHIRPS precipitation climatology (CHPclim v2).

    python3 scripts/towns-rain.py <folder with the 12 CHPclim2 GeoTIFFs>

The files are public, about 30 MB each (CHPclim2.90-90.01.tif to .12.tif):
https://data.chc.ucsb.edu/products/CHPclim/v2/monthly_9090/
They are not kept in the repo. Each value is the mean rain of that month, in mm, for the 0.05 degree
(about 5 km) cell that holds the town. Needs Pillow.
"""
import json
import os
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'data', 'town-data.json')

folder = sys.argv[1]
data = json.load(open(OUT))
towns = data['towns']
rain = {slug: [] for slug in towns}
for m in range(1, 13):
    path = os.path.join(folder, 'CHPclim2.90-90.%02d.tif' % m)
    if not os.path.exists(path):
        path = os.path.join(folder, '%02d.tif' % m)
    im = Image.open(path)
    lng0, lat0 = im.tag_v2[33922][3], im.tag_v2[33922][4]
    step = im.tag_v2[33550][0]
    px = im.load()
    for slug, t in towns.items():
        lng, lat = t['coords']
        v = px[int((lng - lng0) / step), int((lat0 - lat) / step)]
        if v < 0:
            sys.exit('no CHIRPS value for %s' % slug)
        rain[slug].append(round(v))
for slug, r in rain.items():
    towns[slug]['rain'] = r
    print('%-16s %5d mm  %s' % (slug, sum(r), ' '.join('%4d' % x for x in r)))
json.dump(data, open(OUT, 'w'), indent=1, ensure_ascii=False)
open(OUT, 'a').write('\n')
