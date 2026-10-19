// Interface text for the generated pages (/projects/ and /es/proyectos/), one block per language.
// The Spanish home page is not here: it is derived from site/index.html by scripts/home-es.mjs.

export const UI = {
  en: {
    lang: 'en', locale: 'en_US', dir: '', projectsDir: 'projects', studioDir: 'studio', townsDir: 'architects',
    other: { code: 'ES', name: 'Español', lang: 'es' },
    nav: { aria: 'Main', home: 'Studio CAVA, home', projects: 'Projects', studio: 'Studio', process: 'Process', contact: 'Contact', cta: 'Get in touch', portal: 'Client portal', portalShort: 'Clients' },
    reach: { label: '(Start a project)', text: 'Tell us about your property and what you want to build. Let\'s start a conversation.' },
    footer: {
      aria: 'Footer', nav: '(Navigation)', home: 'Home', where: 'Where we work', contactUs: 'Contact us', studio: '(Studio)',
      about: 'Studio CAVA is an architecture and interiors practice based in San José and Guanacaste, working across Costa Rica. Formerly AVARQ.',
      info: '(Info)', address: 'A:', hoursKey: 'H:', hours: 'Monday to Friday, 8:00 to 17:00', top: 'Back to top ↑',
      careersCta: 'Work with us',
      tools: '(Tools)', cr: '(Costa Rica)', more: '(More)',
    },
    wa: {
      aria: 'Chat on WhatsApp, opens in a new tab',
      general: 'Hi Studio CAVA, I would like to talk about a project.',
      projects: 'Hi Studio CAVA, I saw your projects and would like to talk about one of mine.',
      project: (name) => `Hi Studio CAVA, I saw ${name} on your site and would like to talk about a project.`,
    },
    index: {
      title: 'Architecture projects in Costa Rica | Studio CAVA',
      description: (n) => `${n} projects by Studio CAVA: houses, retreats, hangars, a bakery and a museum, each with its images and technical sheet.`,
      h1: 'Projects',
    },
    project: {
      description: (name, type, place, town) => town
        ? `${name}, ${type.toLowerCase()} by Studio CAVA, architects in ${town}, Costa Rica: images, drawings and technical sheet.`
        : `${name}, ${type.toLowerCase()} in ${place} by Studio CAVA, architects in Costa Rica: images, drawings and technical sheet.`,
      crumb: 'Projects', sheet: '(Technical sheet)',
      rows: {
        project: 'Project', type: 'Type', typology: 'Typology', location: 'Location', year: 'Year', status: 'Status', siteArea: 'Site area', builtArea: 'Built area',
      },
      tbc: 'To be confirmed',
      tbcNote: 'Entries marked "To be confirmed" are placeholders until the studio confirms them.',
      more: (name) => `More images of ${name}`,
      nextAria: 'Next project', next: '(Next project)', similar: '(Similar projects)', about: '(The project)',
    },
    map: {
      label: '(Location)', approximate: 'Approximate', tbc: 'Location to be confirmed',
      placeholderNote: 'The pin is a placeholder until the site is confirmed.',
      aria: (name, place) => `Map showing where ${name} is: ${place}`,
      ariaPlaceholder: (name) => `Map of Guanacaste with a placeholder pin for ${name}`,
    },
  },

  es: {
    lang: 'es', locale: 'es_CR', dir: 'es/', projectsDir: 'proyectos', studioDir: 'estudio', townsDir: 'arquitectos',
    other: { code: 'EN', name: 'English', lang: 'en' },
    nav: { aria: 'Principal', home: 'Studio CAVA, inicio', projects: 'Proyectos', studio: 'Estudio', process: 'Proceso', contact: 'Contacto', cta: 'Escríbanos', portal: 'Portal de clientes', portalShort: 'Clientes' },
    reach: { label: '(Empezar un proyecto)', text: 'Cuéntenos sobre su propiedad y lo que quiere construir. Empecemos a conversar.' },
    footer: {
      aria: 'Pie de página', nav: '(Navegación)', home: 'Inicio', where: 'Dónde trabajamos', contactUs: 'Contáctenos', studio: '(Estudio)',
      about: 'Studio CAVA es un estudio de arquitectura e interiores con base en San José y Guanacaste que trabaja en todo Costa Rica. Antes AVARQ.',
      info: '(Info)', address: 'D:', hoursKey: 'H:', hours: 'Lunes a viernes, 8:00 a 17:00', top: 'Volver arriba ↑',
      careersCta: 'Trabaje con nosotros',
      tools: '(Herramientas)', cr: '(Costa Rica)', more: '(Más)',
    },
    wa: {
      aria: 'Escribir por WhatsApp, se abre en otra pestaña',
      general: 'Hola Studio CAVA, quisiera conversar sobre un proyecto.',
      projects: 'Hola Studio CAVA, vi sus proyectos y quisiera conversar sobre el mío.',
      project: (name) => `Hola Studio CAVA, vi ${name} en su sitio y quisiera conversar sobre un proyecto.`,
    },
    index: {
      title: 'Proyectos de arquitectura en Costa Rica | Studio CAVA',
      description: (n) => `${n} proyectos de Studio CAVA: casas, un hotel, hangares, una panadería y un museo, cada uno con sus imágenes y su ficha técnica.`,
      h1: 'Proyectos',
    },
    project: {
      description: (name, type, place, town) => town
        ? `${name}, ${type.toLowerCase()} de Studio CAVA, arquitectos en ${town}, Costa Rica: imágenes, planos y ficha técnica.`
        : `${name}, ${type.toLowerCase()} en ${place} de Studio CAVA, arquitectos en Costa Rica: imágenes, planos y ficha técnica.`,
      crumb: 'Proyectos', sheet: '(Ficha técnica)',
      rows: {
        project: 'Proyecto', type: 'Tipo', typology: 'Tipología', location: 'Ubicación', year: 'Año', status: 'Estado', siteArea: 'Área del lote', builtArea: 'Área construida',
      },
      tbc: 'Por confirmar',
      tbcNote: 'Los datos marcados "Por confirmar" son provisionales hasta que el estudio los confirme.',
      more: (name) => `Más imágenes de ${name}`,
      nextAria: 'Siguiente proyecto', next: '(Siguiente proyecto)', similar: '(Proyectos similares)', about: '(El proyecto)',
    },
    map: {
      label: '(Ubicación)', approximate: 'Aproximada', tbc: 'Ubicación por confirmar',
      placeholderNote: 'El pin es provisional hasta confirmar el sitio.',
      aria: (name, place) => `Mapa con la ubicación de ${name}: ${place}`,
      ariaPlaceholder: (name) => `Mapa de Guanacaste con un pin provisional para ${name}`,
    },
  },
};
