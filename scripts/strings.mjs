// Interface text for the generated pages (/projects/ and /es/proyectos/), one block per language.
// The Spanish home page is not here: it is derived from site/index.html by scripts/home-es.mjs.

export const UI = {
  en: {
    lang: 'en', locale: 'en_US', dir: '', projectsDir: 'projects',
    other: { code: 'ES', name: 'Español', lang: 'es' },
    nav: { aria: 'Main', home: 'Studio CAVA, home', projects: 'Projects', studio: 'Studio', process: 'Process', contact: 'Contact', cta: 'Get in touch' },
    reach: { label: '(Start a project)', text: 'Tell us about your lot and what you want to build. We answer within a working day.' },
    footer: {
      aria: 'Footer', nav: '(Navigation)', home: 'Home', contactUs: 'Contact us', studio: '(Studio)',
      about: 'Studio CAVA is an architecture and interiors practice based in San José, working across Costa Rica. Formerly AVARQ.',
      info: '(Info)', address: 'A:', hoursKey: 'H:', hours: 'Monday to Friday, 8:00 to 17:00', top: 'Back to top ↑',
    },
    wa: {
      aria: 'Chat on WhatsApp, opens in a new tab',
      general: 'Hi Studio CAVA, I would like to talk about a project.',
      projects: 'Hi Studio CAVA, I saw your projects and would like to talk about one of mine.',
      project: (name) => `Hi Studio CAVA, I saw ${name} on your site and would like to talk about a project.`,
    },
    index: {
      title: 'Projects | Studio CAVA',
      description: (n) => `${n} projects by Studio CAVA: houses, retreats, hangars, a bakery and a museum, each with its images and technical sheet.`,
      h1: 'Projects',
    },
    project: {
      description: (name, type) => `${name}, ${type.toLowerCase()} by Studio CAVA. Images and technical sheet.`,
      crumb: 'Projects', sheet: '(Technical sheet)',
      rows: {
        project: 'Project', type: 'Type', location: 'Location', year: 'Year', status: 'Status', siteArea: 'Site area', builtArea: 'Built area',
        program: 'Program', structure: 'Structure', materials: 'Materials', climate: 'Climate strategy', team: 'Team', images: 'Images',
      },
      images: (n) => `${n} image${n > 1 ? 's' : ''}`,
      tbc: 'To be confirmed',
      tbcNote: 'Entries marked "To be confirmed" are placeholders until the studio confirms them.',
      more: (name) => `More images of ${name}`,
      nextAria: 'Next project', next: '(Next project)',
    },
    map: {
      label: '(Location)', approximate: 'Approximate', tbc: 'Location to be confirmed',
      placeholderNote: 'The pin is a placeholder until the site is confirmed.',
      aria: (name, place) => `Map of Guanacaste with the location of ${name}: ${place}`,
      ariaPlaceholder: (name) => `Map of Guanacaste with a placeholder pin for ${name}`,
    },
  },

  es: {
    lang: 'es', locale: 'es_CR', dir: 'es/', projectsDir: 'proyectos',
    other: { code: 'EN', name: 'English', lang: 'en' },
    nav: { aria: 'Principal', home: 'Studio CAVA, inicio', projects: 'Proyectos', studio: 'Estudio', process: 'Proceso', contact: 'Contacto', cta: 'Escríbanos' },
    reach: { label: '(Empezar un proyecto)', text: 'Cuéntenos sobre su lote y lo que quiere construir. Respondemos en un día hábil.' },
    footer: {
      aria: 'Pie de página', nav: '(Navegación)', home: 'Inicio', contactUs: 'Contáctenos', studio: '(Estudio)',
      about: 'Studio CAVA es un estudio de arquitectura e interiores con base en San José que trabaja en todo Costa Rica. Antes AVARQ.',
      info: '(Info)', address: 'D:', hoursKey: 'H:', hours: 'Lunes a viernes, 8:00 a 17:00', top: 'Volver arriba ↑',
    },
    wa: {
      aria: 'Escribir por WhatsApp, se abre en otra pestaña',
      general: 'Hola Studio CAVA, quisiera conversar sobre un proyecto.',
      projects: 'Hola Studio CAVA, vi sus proyectos y quisiera conversar sobre el mío.',
      project: (name) => `Hola Studio CAVA, vi ${name} en su sitio y quisiera conversar sobre un proyecto.`,
    },
    index: {
      title: 'Proyectos | Studio CAVA',
      description: (n) => `${n} proyectos de Studio CAVA: casas, un hotel, hangares, una panadería y un museo, cada uno con sus imágenes y su ficha técnica.`,
      h1: 'Proyectos',
    },
    project: {
      description: (name, type) => `${name}, ${type.toLowerCase()} de Studio CAVA. Imágenes y ficha técnica.`,
      crumb: 'Proyectos', sheet: '(Ficha técnica)',
      rows: {
        project: 'Proyecto', type: 'Tipo', location: 'Ubicación', year: 'Año', status: 'Estado', siteArea: 'Área del lote', builtArea: 'Área construida',
        program: 'Programa', structure: 'Estructura', materials: 'Materiales', climate: 'Estrategia climática', team: 'Equipo', images: 'Imágenes',
      },
      images: (n) => `${n} ${n > 1 ? 'imágenes' : 'imagen'}`,
      tbc: 'Por confirmar',
      tbcNote: 'Los datos marcados "Por confirmar" son provisionales hasta que el estudio los confirme.',
      more: (name) => `Más imágenes de ${name}`,
      nextAria: 'Siguiente proyecto', next: '(Siguiente proyecto)',
    },
    map: {
      label: '(Ubicación)', approximate: 'Aproximada', tbc: 'Ubicación por confirmar',
      placeholderNote: 'El pin es provisional hasta confirmar el sitio.',
      aria: (name, place) => `Mapa de Guanacaste con la ubicación de ${name}: ${place}`,
      ariaPlaceholder: (name) => `Mapa de Guanacaste con un pin provisional para ${name}`,
    },
  },
};
