// avarq.net, the studio's old site (Squarespace): every address forwards (301) to its page on cava.design,
// so links to the old pages keep their value. Anything not listed goes to the home.
const MAP = {
  '/': '/', '/inicio': '/', '/pagina-nueva': '/',
  '/about-us': '/studio/', '/contact': '/#contact',
  '/projects': '/projects/', '/projects-1': '/projects/', '/sunsets': '/projects/',
  '/projects-1/treehouse': '/projects/tree-house/',
  '/projects-1/casa-alcaraban': '/projects/casa-alcaravan/',
  '/projects-1/militarymuseum': '/projects/military-museum/',
  '/projects-1/leanandgreen': '/projects/lean-and-green/',
  '/projects-1/leanandgreen-49n3n': '/projects/lean-and-green/',
  '/projects-1/dawnpatrol': '/projects/dawn-patrol-bakery/',
  '/projects-1/indios-desnudos-renovation': '/projects/',
  '/projects-1/two-bungalows': '/projects/',
  '/projects-1/two-bungalows-tj3g6': '/projects/',
  '/blog': '/guides/',
  '/blog/how-to-build-a-house-in-costa-rica': '/guides/building-permits/',
  '/blog/what-is-a-moodboard': '/services/interiors/',
  '/blog/what-is-architecure': '/studio/',
  '/blog/what-is-architecure-wglkf': '/studio/',
};
export const target = (pathname) => MAP[(pathname.replace(/\/+$/, '') || '/').toLowerCase()] ?? '/';
export default {
  fetch(request) {
    return Response.redirect(`https://cava.design${target(new URL(request.url).pathname)}`, 301);
  },
};
