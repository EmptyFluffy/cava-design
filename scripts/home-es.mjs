// The Spanish home page (/es/) is site/index.html with these replacements applied, in order.
// scripts/build.mjs fails if a replacement no longer matches, or if any English text from the
// home page is left in the Spanish one (names and a short list of shared words excepted).
// Image alt texts come from alt_es in data/projects.json, so they are not repeated here.

const wa = (text) => `https://wa.me/50671737336?text=${encodeURIComponent(text)}`;
const WA_EN = 'Hi Studio CAVA, I would like to talk about a project.';
const WA_ES = 'Hola Studio CAVA, quisiera conversar sobre un proyecto.';

export const SAME = new Set([
  // shared between the two pages on purpose
  'Studio CAVA', 'CAVA', 'WhatsApp', 'San José, Costa Rica', 'hola@cava.design', 'cava.design', 'Arquitectura',
  'Google', 'Instagram', '(Info)', '(Interior)', 'Hotel', 'Huacas', 'Tamarindo', 'website', 'summary_large_image',
  'WhatsApp +506 7173 7336', 'WhatsApp +506 7173 7336 ↗',
]);

export const PAIRS = [
  // ---------- head ----------
  ['<html lang="en">', '<html lang="es">'],
  ['<title>Studio CAVA | Architecture and interiors in Costa Rica</title>', '<title>Studio CAVA | Arquitectura e interiores en Costa Rica</title>'],
  ['content="Studio CAVA designs houses, retreats and cafés in Costa Rica, from the first site visit and uso de suelo to CFIA permits and site supervision."',
    'content="Studio CAVA diseña casas, hoteles pequeños y cafés en Costa Rica, desde la primera visita al lote y el uso de suelo hasta los permisos del CFIA y la supervisión de obra."'],
  ['<link rel="canonical" href="https://cava.design/">', '<link rel="canonical" href="https://cava.design/es/">'],
  ['<meta property="og:locale" content="en_US">', '<meta property="og:locale" content="es_CR">'],
  ['content="Architecture and interiors in Costa Rica. Houses, retreats and cafés drawn around the sun path, the slope and the dry season."',
    'content="Arquitectura e interiores en Costa Rica. Casas, hoteles pequeños y cafés pensados desde el recorrido del sol, la pendiente y la época seca."'],
  ['<meta property="og:url" content="https://cava.design/">', '<meta property="og:url" content="https://cava.design/es/">'],
  ['assets/js/renders.js', 'assets/js/renders.es.js'],

  // ---------- language links: back to English ----------
  ['href="es/" hreflang="es" lang="es" aria-label="Español">(ES)</a>', 'href="../" hreflang="en" lang="en" aria-label="English">(EN)</a>'],
  ['href="es/" hreflang="es" lang="es">Español</a>', 'href="../" hreflang="en" lang="en">English</a>'],

  // ---------- nav, hero ----------
  ['<nav class="nav" aria-label="Main">', '<nav class="nav" aria-label="Principal">'],
  ['>Projects</a>', '>Proyectos</a>'],
  ['>Studio</a>', '>Estudio</a>'],
  ['>Process</a>', '>Proceso</a>'],
  ['>Contact</a>', '>Contacto</a>'],
  ['>Home</a>', '>Inicio</a>'],
  ['Get in touch <span', 'Escríbanos <span'],
  ['>Menu</button>', '>Menú</button>'],
  ['<span>Featured project</span>', '<span>Proyecto destacado</span>'],
  ['View project <span', 'Ver proyecto <span'],
  ['Studio CAVA designs houses, retreats and cafés in Costa Rica, drawn around the sun path, the slope and the dry season.',
    'Studio CAVA diseña casas, hoteles pequeños y cafés en Costa Rica, pensados desde el recorrido del sol, la pendiente del terreno y la época seca.'],
  ['(Scroll down)', '(Bajar)'],

  // ---------- WhatsApp ----------
  [wa(WA_EN), wa(WA_ES)],
  ['aria-label="Chat on WhatsApp, opens in a new tab"', 'aria-label="Escribir por WhatsApp, se abre en otra pestaña"'],

  // ---------- studio ----------
  ['<span>Climate first</span><span>architecture</span>', '<span>El clima</span><span>primero</span>'],
  ['Every project starts with a site visit. We walk the lot in the morning and again in the afternoon, note where the sun lands and where the breeze comes from, and only then start drawing.',
    'Cada proyecto empieza con una visita al lote. Lo recorremos en la mañana y otra vez en la tarde, anotamos dónde pega el sol y de dónde viene la brisa, y solo entonces empezamos a dibujar.'],
  ['Deep roofs keep the afternoon sun off the glass. Rooms open on two sides so the breeze does the cooling. Materials are picked for salt air and humidity: teak, board-formed concrete, local stone.',
    'Los aleros profundos protegen el vidrio del sol de la tarde. Los espacios abren hacia dos lados para que la brisa refresque la casa. Los materiales se escogen por cómo aguantan el salitre y la humedad: teca, concreto con formaleta de tabla y piedra local.'],
  ['What we believe <span', 'Lo que creemos <span'],
  ['(Our studio)', '(El estudio)'],

  // ---------- works ----------
  ['<span>Featured</span><span class="indent-2">works</span>', '<span>Obras</span><span class="indent-2">selectas</span>'],
  [/aria-label="View (.+?) image"/g, 'aria-label="Ver imagen de $1"'],
  [/<span class="work__meta">([^<]+)<\/span>/g, (m, t) => `<span class="work__meta">${({ House: 'Casa', Hangars: 'Hangares', 'Mixed use': 'Uso mixto', Hotel: 'Hotel', 'View image →': 'Ver imagen →' })[t] ?? t}</span>`],
  ['All projects (11) <span', 'Todos los proyectos (11) <span'],
  ['View all images (24) <span', 'Ver todas las imágenes (24) <span'],

  // ---------- process ----------
  ['(Our process)', '(El proceso)'],
  ['<span>(01)</span>Site visit and uso de suelo', '<span>(01)</span>Visita al lote y uso de suelo'],
  ['<span>(02)</span>Concept design', '<span>(02)</span>Diseño conceptual'],
  ['<span>(03)</span>Design development', '<span>(03)</span>Anteproyecto'],
  ['<span>(04)</span>Permit drawings for CFIA', '<span>(04)</span>Planos para el permiso del CFIA'],
  ['<span>(05)</span>Construction documents', '<span>(05)</span>Planos constructivos'],
  ['<span>(06)</span>Site supervision', '<span>(06)</span>Supervisión de obra'],
  ['Building in Costa Rica has its own order: land use first, then design, then permits through CFIA and the municipality.',
    'Construir en Costa Rica tiene su propio orden: primero el uso de suelo, después el diseño y luego los permisos en el CFIA y la municipalidad.'],
  ['Our six stages follow that order, and each one ends with drawings you approve before the next begins.',
    'Nuestras seis etapas siguen ese orden, y cada una termina con planos que usted aprueba antes de pasar a la siguiente.'],
  ['Start a project <span', 'Empezar un proyecto <span'],

  // ---------- interiors ----------
  ['(Interiors and hospitality)', '(Interiores, hoteles y cafés)'],
  ['We draw the inside too. Kitchens, built-in joinery, lighting and café counters come from the same set of drawings as the roof, so the same timber and stone run from the facade to the shelves.',
    'También diseñamos el interior. Cocinas, muebles a la medida, iluminación y barras de café salen del mismo juego de planos que el techo, así la misma madera y la misma piedra van de la fachada a las repisas.'],

  // ---------- call to action, map ----------
  ['<span>From the lot</span><span class="right">to the keys</span>', '<span>Del lote</span><span class="right">a las llaves</span>'],
  ['Tell us about your project <span', 'Cuéntenos su proyecto <span'],
  ['(Find us)', '(Dónde estamos)'],
  ['aria-label="Map of Costa Rica with the studio in San José"', 'aria-label="Mapa de Costa Rica con el estudio en San José"'],
  ['San José, Costa Rica. Projects across Guanacaste, the Nicoya Peninsula and the Central Valley.',
    'San José, Costa Rica. Proyectos en Guanacaste, la península de Nicoya y el Valle Central.'],
  ['Open in Google Maps ↗', 'Abrir en Google Maps ↗'],
  ['>Where we work →</a>', '>Dónde trabajamos →</a>'],
  ['>Where we work</a>', '>Dónde trabajamos</a>'],

  // ---------- footer ----------
  ['aria-label="Footer"', 'aria-label="Pie de página"'],
  ['(Navigation)', '(Navegación)'],
  ['>Contact us</button>', '>Contáctenos</button>'],
  ['(Studio)', '(Estudio)'],
  ['Studio CAVA is an architecture and interiors practice based in San José, working across Costa Rica. Formerly AVARQ.',
    'Studio CAVA es un estudio de arquitectura e interiores con base en San José que trabaja en todo Costa Rica. Antes AVARQ.'],
  ['<dt>A:</dt>', '<dt>D:</dt>'],
  ['Monday to Friday, 8:00 to 17:00', 'Lunes a viernes, 8:00 a 17:00'],
  ['Back to top ↑', 'Volver arriba ↑'],

  // ---------- enquiry ----------
  ['(Project enquiry)', '(Consulta de proyecto)'],
  ['>Close</button>', '>Cerrar</button>'],
  ['A few questions about your site and your plans. It takes about three minutes, and it tells us whether we are the right studio for the project.',
    'Unas preguntas sobre su lote y sus planes. Toma unos tres minutos y nos dice si somos el estudio indicado para el proyecto.'],
  [/Your details, step (\d) of 8/g, 'Sus datos, paso $1 de 8'],
  [/The project, step (\d) of 8/g, 'El proyecto, paso $1 de 8'],
  ['Last question, step 8 of 8', 'Última pregunta, paso 8 de 8'],
  ['<span>Your details</span>', '<span>Sus datos</span>'],
  ['<span>The project</span>', '<span>El proyecto</span>'],
  ['<span>Last question</span>', '<span>Última pregunta</span>'],
  ['>Name <span', '>Nombre <span'],
  ['placeholder="Your name"', 'placeholder="Su nombre"'],
  ['Add your name so we know who to reply to.', 'Escriba su nombre para saber a quién responderle.'],
  ['>Email address <span', '>Correo electrónico <span'],
  ['placeholder="you@example.com"', 'placeholder="nombre@ejemplo.com"'],
  ['Enter an email address like name@example.com.', 'Escriba un correo como nombre@ejemplo.com.'],
  ['>Phone or WhatsApp</label>', '>Teléfono o WhatsApp</label>'],
  ['Do you own the land? <span', '¿Ya tiene el lote? <span'],
  ['value="Yes" required><span>Yes</span>', 'value="Sí" required><span>Sí</span>'],
  ['value="Yes"><span>Yes</span>', 'value="Sí"><span>Sí</span>'],
  ['value="In negotiation"><span>In negotiation</span>', 'value="En negociación"><span>En negociación</span>'],
  ['value="Not yet, still looking"><span>Not yet, still looking</span>', 'value="Todavía no, sigo buscando"><span>Todavía no, sigo buscando</span>'],
  ['Pick one to continue.', 'Elija una opción para continuar.'],
  ['What are you planning? <span class="req">*</span> <span class="hint">(select all that apply)</span>',
    '¿Qué tiene en mente? <span class="req">*</span> <span class="hint">(puede elegir varias)</span>'],
  ['value="New house"><span>New house</span>', 'value="Casa nueva"><span>Casa nueva</span>'],
  ['value="Renovation or extension"><span>Renovation or extension</span>', 'value="Remodelación o ampliación"><span>Remodelación o ampliación</span>'],
  ['value="Rental villa or retreat"><span>Rental villa or retreat</span>', 'value="Villa u hospedaje para alquilar"><span>Villa u hospedaje para alquilar</span>'],
  ['value="Café, restaurant or shop"><span>Café, restaurant or shop</span>', 'value="Café, restaurante o tienda"><span>Café, restaurante o tienda</span>'],
  ['value="Interiors only"><span>Interiors only</span>', 'value="Solo interiores"><span>Solo interiores</span>'],
  ['value="Not sure yet"><span>Not sure yet</span>', 'value="Todavía no sé"><span>Todavía no sé</span>'],
  ['Pick at least one.', 'Elija al menos una.'],
  ['Where is the site? <span', '¿Dónde está el lote? <span'],
  ['placeholder="Nosara, Guanacaste"', 'placeholder="Santa Ana, San José"'],
  ['Add a town or area, even a rough one.', 'Indique un pueblo o una zona, aunque sea aproximada.'],
  ['When would you like to start building?', '¿Cuándo le gustaría empezar a construir?'],
  ['placeholder="Early 2027"', 'placeholder="Inicios de 2027"'],
  ['Permits through CFIA and the municipality usually add several months after the design is finished. We map the full timeline with you at the first meeting.',
    'Los permisos del CFIA y la municipalidad suelen sumar varios meses después de terminar el diseño. En la primera reunión armamos con usted el cronograma completo.'],
  ['Construction budget (if known)', 'Presupuesto de construcción (si ya lo tiene)'],
  ['value="Under $300K"><span>Under $300K</span>', 'value="Menos de $300 mil"><span>Menos de $300 mil</span>'],
  ['value="$300K to $600K"><span>$300K to $600K</span>', 'value="$300 mil a $600 mil"><span>$300 mil a $600 mil</span>'],
  ['value="$600K to $1M"><span>$600K to $1M</span>', 'value="$600 mil a $1 millón"><span>$600 mil a $1 millón</span>'],
  ['value="$1M to $2M"><span>$1M to $2M</span>', 'value="$1 a $2 millones"><span>$1 a $2 millones</span>'],
  ['value="$2M+"><span>$2M+</span>', 'value="Más de $2 millones"><span>Más de $2 millones</span>'],
  ['Design fees are quoted per project after a first meeting, once we know the site and the scope.',
    'Los honorarios de diseño se cotizan por proyecto después de una primera reunión, cuando conocemos el lote y el alcance.'],
  ['Do you have a builder?', '¿Ya tiene constructor?'],
  ['value="Not yet, someone in mind"><span>Not yet, someone in mind</span>', 'value="Todavía no, pero tengo a alguien en mente"><span>Todavía no, pero tengo a alguien en mente</span>'],
  ['value="No, we would like a recommendation"><span>No, we would like a recommendation</span>', 'value="No, nos gustaría una recomendación"><span>No, nos gustaría una recomendación</span>'],
  ['Builder details (if you have one)', 'Datos del constructor (si ya lo tiene)'],
  ['placeholder="Company name, contact"', 'placeholder="Empresa, contacto"'],
  ['Tell us about the project</label>', 'Cuéntenos sobre el proyecto</label>'],
  ['placeholder="Bedrooms, the views you want to keep, how many months a year you will be there, anything you already know you want."',
    'placeholder="Habitaciones, las vistas que quiere conservar, cuántos meses al año va a estar ahí, lo que ya sabe que quiere."'],
  ['How did you find us?', '¿Cómo nos encontró?'],
  ['value="Friend or family"><span>Friend or family</span>', 'value="Un amigo o familiar"><span>Un amigo o familiar</span>'],
  ['value="A builder or agent"><span>A builder or agent</span>', 'value="Un constructor o agente"><span>Un constructor o agente</span>'],
  ['value="Other"><span>Other</span>', 'value="Otro"><span>Otro</span>'],
  ['If other, where?', 'Si fue otro, ¿dónde?'],
  ['placeholder="A magazine, an event, a project you saw"', 'placeholder="Una revista, un evento, un proyecto que vio"'],
  ['data-back hidden>Back</button>', 'data-back hidden>Atrás</button>'],
  ['data-next>Next →</button>', 'data-next>Siguiente →</button>'],
  ['(Preview)', '(Vista previa)'],
  ['tabindex="-1">Thank you.</p>', 'tabindex="-1">Gracias.</p>'],
  ['This form is a preview and is not connected yet, so nothing has been sent. To reach the studio today, send the same answers by email.',
    'Este formulario es una vista previa y todavía no está conectado, así que no se envió nada. Para escribirle al estudio hoy, mande las mismas respuestas por correo.'],
  ['Send by email →', 'Enviar por correo →'],

  // ---------- menu, viewer ----------
  ['(Menu)', '(Menú)'],
  ['aria-label="Menu"', 'aria-label="Menú"'],
  ['aria-label="Image viewer"', 'aria-label="Visor de imágenes"'],
  ['← Previous', '← Anterior'],
  ['data-lb-next>Next →', 'data-lb-next>Siguiente →'],
];
