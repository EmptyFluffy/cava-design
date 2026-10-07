# cava.design

Landing page for Studio CAVA, an architecture and interiors studio in San José, Costa Rica.

Static HTML, CSS and JavaScript in `site/`. Every push to `main` publishes `site/` to GitHub Pages through `.github/workflows/pages.yml`.

The home page is written by hand. The project pages are generated from `data/projects.json` (see Projects below) and committed, so Pages needs no build step.

## Run locally

```sh
python3 -m http.server 8765 -d site
# open http://localhost:8765
```

## What is on the page

- Hero with the featured project, a studio section, six featured works, the six-stage process, interiors, a closing statement, a large map and the footer.
- **Projects**: `/projects/` lists all of them; each `/projects/<slug>/` shows the renders and a technical sheet.
- **WhatsApp**: +506 7173 7336, floating button, footer, menu, map card and the contact block on every project page.
- **Project enquiry**: an eight-step sheet that opens from every "Get in touch" button. It validates and then shows a preview message. **It sends nothing yet.** The last screen offers a prefilled email to `hola@cava.design`.
- **Render viewer**: every render opens full screen. Use the arrow keys, click either half of the image, or swipe.
- **Map**: MapLibre GL 5.24.0 with OpenFreeMap tiles (free, no key), loaded only when the map nears the viewport. The pin is at the centre of San José until the studio address is set (`STUDIO` in `site/assets/js/site.js`).

## Projects

`data/projects.json` is the source of truth: one entry per project with its name, type, technical sheet and images (the first image is the cover). A sheet field left as `null` shows as "To be confirmed".

```sh
python3 scripts/images.py ~/Desktop/CAVA   # renders -> site/assets/img/projects/<slug>/<n>-1600.webp and -800.webp
node scripts/build.mjs                      # -> site/projects/, site/projects/<slug>/, site/assets/js/renders.js
```

The renders folder holds one folder per project, named as `folder` in the data (for example `Portland House/Portland House C.png`). `images.py` needs Pillow. `build.mjs` also writes the list the home page render viewer walks (`renders.js`). The home page's featured works, interiors and hero link to the project pages by hand.

Each project also has `location`, `coords` ([lng, lat]) and `pin`: `exact`, `approximate` or `placeholder` (an invented spot in Guanacaste until the real site is known; the page says so). The technical sheet shows a small still map (MapLibre with OpenFreeMap, loaded by `assets/js/project.js` when it nears the viewport). Gallery images share the narrowest image's proportion, so rows line up and wider renders crop at the sides. `hero` lists the home page slides, which take turns every 6.5 s (not with reduced motion, not in a hidden tab).

**To add a project:** put its folder of renders in the source folder, add an entry to `data/projects.json` (with its Spanish `type_es` and an `alt_es` on each image), run both scripts, commit.

## Spanish

English lives at the root, Spanish under `/es/`: `/es/` and `/es/proyectos/<slug>/`. Every page links to its pair with `hreflang`, and the last item of the nav row, the menu and the footer switch language.

- **Project pages** come out of `build.mjs` in both languages. Their interface text is in `scripts/strings.mjs`; project text comes from the data, where any field can carry a Spanish version as `<field>_es` (`type_es`, `alt_es`, `location_es`).
- **The Spanish home** (`site/es/index.html`) is generated, not hand-written: `build.mjs` takes `site/index.html` and applies the replacements in `scripts/home-es.mjs`. Edit the English home, then add the Spanish of any new text to `home-es.mjs`. The build stops if a replacement no longer matches or if English text from the home is left on `/es/`, and names what to fix.
- **The scripts** (`site.js`, `project.js`) read `<html lang>` for the few strings they write themselves (form buttons and the emailed answers, the clock, map fallbacks).
- Spanish copy uses *usted*, the Costa Rican default for a studio.

## Font

The layout is sized for **PP Neue Montreal** (Pangram Pangram, commercial). Until a web licence is bought the site uses **Inter Tight** from Google Fonts, the closest free match in width and weight. To switch:

1. Buy the web licence and put `PPNeueMontreal-Variable.woff2` in `site/assets/fonts/`.
2. Uncomment the `@font-face` block at the top of `site/assets/css/site.css`.
3. Put `"PP Neue Montreal"` first in `--font`, and try `--w-display: 530` to match the reference weight.

## Placeholders to replace

- Studio address, email (`hola@cava.design`) and office hours in the footer, the map card and the menu.
- Technical sheets of every project (`data/projects.json`, all `null` for now).
- The enquiry form endpoint (Formspree, a Cloudflare Worker or Postmark).

## Domain

`cava.design` uses Cloudflare DNS. To point it at this site, add these records in Cloudflare with the proxy **off** (grey cloud) so GitHub can issue the certificate:

| Type  | Name | Content                 |
|-------|------|-------------------------|
| A     | @    | 185.199.108.153         |
| A     | @    | 185.199.109.153         |
| A     | @    | 185.199.110.153         |
| A     | @    | 185.199.111.153         |
| CNAME | www  | emptyfluffy.github.io   |

Then set the custom domain to `cava.design` in the repo's Settings > Pages, and tick "Enforce HTTPS" once the certificate is issued.
