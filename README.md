# cava.design

Landing page for Studio CAVA, an architecture and interiors studio in San José, Costa Rica.

Static HTML, CSS and JavaScript in `site/`. No build step. Every push to `main` publishes `site/` to GitHub Pages through `.github/workflows/pages.yml`.

## Run locally

```sh
python3 -m http.server 8765 -d site
# open http://localhost:8765
```

## What is on the page

- Hero with the featured project, a studio section, six featured works, the six-stage process, interiors, a closing statement, a large map and the footer.
- **Project enquiry**: an eight-step sheet that opens from every "Get in touch" button. It validates and then shows a preview message. **It sends nothing yet.** The last screen offers a prefilled email to `hola@cava.design`.
- **Render viewer**: every render opens full screen. Use the arrow keys, click either half of the image, or swipe.
- **Map**: MapLibre GL 5.24.0 with OpenFreeMap tiles (free, no key), loaded only when the map nears the viewport. The pin is at the centre of San José until the studio address is set (`STUDIO` in `site/assets/js/site.js`).

## Renders

`site/assets/img/<letter>-1600.webp` and `-800.webp`, converted from the PNG renders. The captions and the list the viewer walks are in `RENDERS` in `site/assets/js/site.js`.

## Font

The layout is sized for **PP Neue Montreal** (Pangram Pangram, commercial). Until a web licence is bought the site uses **Inter Tight** from Google Fonts, the closest free match in width and weight. To switch:

1. Buy the web licence and put `PPNeueMontreal-Variable.woff2` in `site/assets/fonts/`.
2. Uncomment the `@font-face` block at the top of `site/assets/css/site.css`.
3. Put `"PP Neue Montreal"` first in `--font`, and try `--w-display: 530` to match the reference weight.

## Placeholders to replace

- Studio address, email (`hola@cava.design`) and office hours in the footer, the map card and the menu.
- Project names and locations in the works grid (taken from the July draft).
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
