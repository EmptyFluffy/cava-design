"""Solar radiation for the climate map and the town pages, from the Global Solar Atlas (CC BY 4.0).

    python3 scripts/sun-map.py <folder of the unzipped Costa Rica GeoTIFFs>

The folder is Costa-Rica_GISdata_LTAy_YearlyMonthlyTotals_GlobalSolarAtlas-v2_GEOTIFF, from
https://api.globalsolaratlas.info/download/Costa%20Rica/Costa-Rica_GISdata_LTAym_YearlyMonthlyTotals_GlobalSolarAtlas-v2_GEOTIFF.zip
(about 14 MB; not kept in the repo). Writes:
  site/assets/img/ghi-cr.webp   yearly global horizontal irradiation, coloured, for the map (transparent at sea)
  site/assets/data/ghi.json     the overlay's corners and colour scale
  data/town-data.json           ghi (kWh/m2 a year) and pvout (kWh per kWp a year) for each town
Needs Pillow.
"""
import json
import os
import sys

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
folder = sys.argv[1]
W, E, N, S = -86.0, -82.5, 11.25, 8.0          # the window drawn on the map
LOW, HIGH = 1500, 2200                           # kWh/m2 a year: the colour scale's ends
# light sand to deep orange, the same warm family as the sun path's temperatures
STOPS = [(0.0, (244, 236, 214)), (0.35, (236, 200, 120)), (0.7, (226, 140, 64)), (1.0, (194, 70, 34))]


def ramp(t):
    t = max(0.0, min(1.0, t))
    for (a, ca), (b, cb) in zip(STOPS, STOPS[1:]):
        if t <= b:
            k = (t - a) / (b - a)
            return tuple(round(x + (y - x) * k) for x, y in zip(ca, cb))
    return STOPS[-1][1]


def reader(name):
    im = Image.open(os.path.join(folder, name))
    t = im.tag_v2
    return im, im.load(), t[33922][3], t[33922][4], t[33550][0]


ghi, gpx, lng0, lat0, step = reader('GHI.tif')
x0, x1 = int((W - lng0) / step), int((E - lng0) / step)
y0, y1 = int((lat0 - N) / step), int((lat0 - S) / step)
out = Image.new('RGBA', (x1 - x0, y1 - y0))
opx = out.load()
for y in range(y0, y1):
    for x in range(x0, x1):
        v = gpx[x, y]
        if v > 100:  # no data at sea is a tiny float
            opx[x - x0, y - y0] = ramp((v - LOW) / (HIGH - LOW)) + (255,)
out = out.resize((out.width * 3 // 4, out.height * 3 // 4), Image.LANCZOS)
os.makedirs(os.path.join(ROOT, 'site', 'assets', 'data'), exist_ok=True)
out.save(os.path.join(ROOT, 'site', 'assets', 'img', 'ghi-cr.webp'), 'WEBP', quality=82, method=6)
json.dump({
    'source': 'Global Solar Atlas 2.0 (World Bank Group, Solargis), CC BY 4.0, 1999 to 2018',
    'corners': [[W, N], [E, N], [E, S], [W, S]], 'low': LOW, 'high': HIGH,
    'stops': [[a, '#%02x%02x%02x' % c] for a, c in STOPS],
}, open(os.path.join(ROOT, 'site', 'assets', 'data', 'ghi.json'), 'w'))

pv, ppx, plng0, plat0, pstep = reader('PVOUT.tif')
td_path = os.path.join(ROOT, 'data', 'town-data.json')
td = json.load(open(td_path))
for slug, t in td['towns'].items():
    lng, lat = t['coords']
    g = gpx[int((lng - lng0) / step), int((lat0 - lat) / step)]
    p = ppx[int((lng - plng0) / pstep), int((plat0 - lat) / pstep)]
    t['ghi'], t['pvout'] = round(g), round(p)
    print('%-16s GHI %5d kWh/m2  PVOUT %5d kWh/kWp' % (slug, t['ghi'], t['pvout']))
json.dump(td, open(td_path, 'w'), indent=1, ensure_ascii=False)
open(td_path, 'a').write('\n')
print('overlay', out.size, os.path.getsize(os.path.join(ROOT, 'site', 'assets', 'img', 'ghi-cr.webp')) // 1024, 'KB')
