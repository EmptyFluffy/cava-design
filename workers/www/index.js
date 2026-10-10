// www.cava.design: every request goes to the same path on https://cava.design (301).
export default {
  fetch(request) {
    const url = new URL(request.url);
    return Response.redirect(`https://cava.design${url.pathname}${url.search}`, 301);
  },
};
