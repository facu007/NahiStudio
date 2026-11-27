require('dotenv').config();
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const mailer = require('./mailer');

const port = process.env.PORT || 3456;
const dir = __dirname;

// Manifiesto explícito para que @vercel/nft (Node File Trace) empaquete todos los HTML, JS y la carpeta fotos/ en Vercel
const VERCEL_STATIC_BUNDLE_MANIFEST = [
  path.join(__dirname, 'index.html'),
  path.join(__dirname, 'admin.html'),
  path.join(__dirname, 'turnos.html'),
  path.join(__dirname, 'login.html'),
  path.join(__dirname, 'supabase-client.js'),
  path.join(__dirname, 'gallery-data.json'),
  path.join(__dirname, 'site-content.json'),
  path.join(__dirname, 'published-schedules.json'),
  path.join(__dirname, 'supabase-config.json'),
  path.join(__dirname, 'supabase-schema.sql'),
  path.join(__dirname, 'fotos', 'imgi_10_832478316_1138317815289557_8357992302156346057_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_11_902024821_18111104054269189_4890881016085880301_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_13_861911954_1131761712629862_1954115592653772609_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_14_851843619_18118320313897879_5122667710876184401_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_15_846504117_18106174985269189_2305949659410720467_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_18_831313350_18104431136269189_151488612152529768_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_22_504060229_17842497063514079_4107614235171648365_n.webp'),
  path.join(__dirname, 'fotos', 'imgi_25_539976307_17854872333514079_3988514524600607766_n.webp'),
  path.join(__dirname, 'fotos', 'imgi_28_771909433_18096793385269189_6790519837572543665_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_31_628792993_17875531770514079_7101006345959160330_n.webp'),
  path.join(__dirname, 'fotos', 'imgi_6_928715819_1678752167229555_3258636658814047340_n.jpg'),
  path.join(__dirname, 'fotos', 'imgi_9_857436431_17930539812514079_2849828327181330972_n.jpg'),
  path.join(__dirname, 'fotos', 'igexport-Dc1nPj0sBE7.mp4'),
  path.join(__dirname, 'fotos', 'igexport-Dd2I_0qAa9o.mp4'),
  path.join(__dirname, 'fotos', 'igexport-Dd7r8REtC7P.mp4'),
  path.join(__dirname, 'fotos', 'igexport-De-jsVethEQ.mp4'),
  path.join(__dirname, 'fotos', 'igexport-De0QjOPN0VR.mp4'),
  path.join(__dirname, 'fotos', 'igexport-DfYbk6ptM3G.mp4'),
  path.join(__dirname, 'assets', 'images', 'hero_editorial.jpg'),
  path.join(__dirname, 'assets', 'images', 'imgi_22_504060229_17842497063514079_4107-50ee06.webp'),
  path.join(__dirname, 'assets', 'images', 'imgi_25_539976307_17854872333514079_3988-ea76d1.webp'),
  path.join(__dirname, 'assets', 'images', 'imgi_28_771909433_18096793385269189_6790-05960c.jpg'),
  path.join(__dirname, 'assets', 'images', 'imgi_31_628792993_17875531770514079_7101-331086.webp'),
  path.join(__dirname, 'assets', 'images', 'imgi_6_928715819_1678752167229555_325863-f19bd9.jpg'),
  path.join(__dirname, 'assets', 'images', 'imgi_9_857436431_17930539812514079_28498-13ceb5.jpg'),
  path.join(__dirname, 'assets', 'images', 'tattoo_flash_01.jpg'),
  path.join(__dirname, 'assets', 'images', 'tattoo_flash_02.jpg')
];
VERCEL_STATIC_BUNDLE_MANIFEST.forEach(p => { try { fs.existsSync(p); } catch (_) {} });

// Configuración de Supabase desde variables de entorno o archivo configurado desde el Panel Admin
const SUPABASE_CONFIG_FILE = path.join(dir, 'supabase-config.json');
const TMP_SUPABASE_CONFIG_FILE = path.join(os.tmpdir(), 'nahi-supabase-config.json');
function loadSavedSupabaseConfig() {
  try {
    const f = (process.env.VERCEL && fs.existsSync(TMP_SUPABASE_CONFIG_FILE))
      ? TMP_SUPABASE_CONFIG_FILE
      : (fs.existsSync(SUPABASE_CONFIG_FILE) ? SUPABASE_CONFIG_FILE : null);
    if (f) return JSON.parse(fs.readFileSync(f, 'utf-8'));
  } catch (_) {}
  return {};
}
const DEFAULT_SUPABASE_URL = 'https://ogkcxihihaozhomilcur.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na2N4aWhpaGFvemhvbWlsY3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU4MTAzOTQsImV4cCI6MjExMTM4NjM5NH0.sVwdHAnv5v2wyGW80AfQ6ylXMz31FMVdkEMcPns-tRM';
const savedSbCfg = loadSavedSupabaseConfig();
let SUPABASE_URL = process.env.SUPABASE_URL || savedSbCfg.supabaseUrl || DEFAULT_SUPABASE_URL;
let SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || savedSbCfg.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY;
let SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || savedSbCfg.supabaseServiceKey || '';

let supabase = null;
function initSupabaseClient() {
  if (SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)) {
    try {
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
        auth: { persistSession: false }
      });
      console.log(`[Supabase] Conectado a ${SUPABASE_URL}`);
      return true;
    } catch (err) {
      console.warn('[Supabase] Error al inicializar cliente:', err.message);
      supabase = null;
    }
  } else {
    supabase = null;
    console.log('[Backend] Servidor Node.js de Nahi Studio activo con persistencia JSON.');
  }
  return false;
}
initSupabaseClient();

// Persistencia en disco /tmp para turnos e inscripciones del backend Node
const APPOINTMENTS_FILE = path.join(dir, 'appointments-data.json');
const TMP_APPOINTMENTS_FILE = path.join(os.tmpdir(), 'nahi-appointments-data.json');
function loadAppointmentsData() {
  try {
    const f = (process.env.VERCEL && fs.existsSync(TMP_APPOINTMENTS_FILE))
      ? TMP_APPOINTMENTS_FILE
      : (fs.existsSync(APPOINTMENTS_FILE) ? APPOINTMENTS_FILE : null);
    if (f) {
      const parsed = JSON.parse(fs.readFileSync(f, 'utf-8'));
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.appointments)) return parsed.appointments;
    }
  } catch (_) {}
  return [];
}
function saveAppointmentsData(list) {
  try {
    const target = process.env.VERCEL ? TMP_APPOINTMENTS_FILE : APPOINTMENTS_FILE;
    fs.writeFileSync(target, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    try {
      fs.writeFileSync(TMP_APPOINTMENTS_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (_) {}
  }
}

// Base de datos del Backend Node.js (sincronizada con disco y/o Supabase)
const localDatabase = {
  appointments: loadAppointmentsData(),
  enrollments: [],
  services: [
    {
      id: '22222222-2222-2222-2222-222222222201',
      name: 'Esculpidas & Nail Art Editorial',
      slug: 'esculpidas-nail-art',
      badge: '01 — NAIL ART',
      duration_minutes: 120,
      price_ars: 28000,
      deposit_ars: 5600,
      category: 'nails'
    },
    {
      id: '22222222-2222-2222-2222-222222222202',
      name: 'Kapping / Capping Gel + Diseño',
      slug: 'kapping-gel-diseno',
      badge: '01 — NAIL ART',
      duration_minutes: 90,
      price_ars: 24000,
      deposit_ars: 4800,
      category: 'nails'
    },
    {
      id: '22222222-2222-2222-2222-222222222203',
      name: 'Esmaltado Semipermanente + Nail Art',
      slug: 'semipermanente-nail-art',
      badge: '01 — NAIL ART',
      duration_minutes: 75,
      price_ars: 20000,
      deposit_ars: 4000,
      category: 'nails'
    },
    {
      id: '22222222-2222-2222-2222-222222222204',
      name: 'Service / Mantenimiento Nail Art',
      slug: 'service-mantenimiento-nails',
      badge: '01 — NAIL ART',
      duration_minutes: 90,
      price_ars: 22000,
      deposit_ars: 4400,
      category: 'nails'
    },
    {
      id: '22222222-2222-2222-2222-222222222205',
      name: 'Tattoo Fine Line / Mini & Flash',
      slug: 'tattoo-fine-line-flash',
      badge: '02 — TATTOO ART',
      duration_minutes: 90,
      price_ars: 35000,
      deposit_ars: 7000,
      category: 'tattoo'
    },
    {
      id: '22222222-2222-2222-2222-222222222206',
      name: 'Tattoo Blackwork & Diseño Custom',
      slug: 'tattoo-blackwork-custom',
      badge: '02 — TATTOO ART',
      duration_minutes: 150,
      price_ars: 55000,
      deposit_ars: 11000,
      category: 'tattoo'
    }
  ],
  gallery: []
};

// Cargar y persistir fotos de ejemplo de la galería (con soporte /tmp para Vercel Serverless)
const GALLERY_FILE = path.join(dir, 'gallery-data.json');
const TMP_GALLERY_FILE = path.join(os.tmpdir(), 'nahi-gallery-data.json');
function loadGalleryData() {
  try {
    if (process.env.VERCEL && fs.existsSync(TMP_GALLERY_FILE)) {
      return JSON.parse(fs.readFileSync(TMP_GALLERY_FILE, 'utf-8'));
    }
    if (fs.existsSync(GALLERY_FILE)) {
      const content = fs.readFileSync(GALLERY_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn('[Gallery] Error al leer gallery-data.json:', e.message);
  }
  return [];
}

function saveGalleryData(items) {
  try {
    const target = process.env.VERCEL ? TMP_GALLERY_FILE : GALLERY_FILE;
    fs.writeFileSync(target, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    try {
      fs.writeFileSync(TMP_GALLERY_FILE, JSON.stringify(items, null, 2), 'utf-8');
    } catch (_) {}
  }
}

localDatabase.gallery = loadGalleryData();

// Asegurar bucket público 'gallery' en Supabase Storage para alojar fotos en la nube
let galleryBucketReady = false;
async function ensureGalleryBucket() {
  if (!supabase || galleryBucketReady) return galleryBucketReady;
  try {
    const { data: existing, error: getErr } = await supabase.storage.getBucket('gallery');
    if (existing && !getErr) {
      galleryBucketReady = true;
      return true;
    }
    const { error: createErr } = await supabase.storage.createBucket('gallery', {
      public: true,
      fileSizeLimit: 10485760,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    });
    if (!createErr || String(createErr.message || '').toLowerCase().includes('already exists')) {
      galleryBucketReady = true;
      console.log('[Storage] Bucket público "gallery" listo en Supabase Storage.');
      return true;
    }
    console.warn('[Storage] Aviso al preparar bucket gallery:', createErr.message);
  } catch (e) {
    console.warn('[Storage] Excepción verificando bucket gallery:', e.message);
  }
  return false;
}
if (supabase) {
  ensureGalleryBucket().catch(() => {});
}

// Cargar y persistir horarios publicados por el Admin (con estado tachado en vivo)
const PUBLISHED_SCHEDULES_FILE = path.join(dir, 'published-schedules.json');
const TMP_PUBLISHED_SCHEDULES_FILE = path.join(os.tmpdir(), 'nahi-published-schedules.json');
function loadPublishedSchedulesLocal() {
  try {
    if (process.env.VERCEL && fs.existsSync(TMP_PUBLISHED_SCHEDULES_FILE)) {
      const parsedTmp = JSON.parse(fs.readFileSync(TMP_PUBLISHED_SCHEDULES_FILE, 'utf-8'));
      if (parsedTmp && typeof parsedTmp === 'object' && parsedTmp.days) return parsedTmp;
    }
    if (fs.existsSync(PUBLISHED_SCHEDULES_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PUBLISHED_SCHEDULES_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object' && parsed.days) return parsed;
    }
  } catch (e) {
    console.warn('[Schedules] Error al leer published-schedules.json:', e.message);
  }
  return { days: {} };
}

function savePublishedSchedulesLocal(data) {
  try {
    const target = process.env.VERCEL ? TMP_PUBLISHED_SCHEDULES_FILE : PUBLISHED_SCHEDULES_FILE;
    fs.writeFileSync(target, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    try {
      fs.writeFileSync(TMP_PUBLISHED_SCHEDULES_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (_) {}
  }
}

localDatabase.publishedSchedules = loadPublishedSchedulesLocal();

// =========================================================================
// CONTENIDO EDITABLE DEL SITIO WEB, SERVICIOS, PROMOS, CURSOS Y SECCIONES
// =========================================================================
const SITE_CONTENT_FILE = path.join(dir, 'site-content.json');
const TMP_SITE_CONTENT_FILE = path.join(os.tmpdir(), 'nahi-site-content.json');

function getDefaultSiteContent() {
  return {
  "services": [
    {
      "id": "22222222-2222-2222-2222-222222222201",
      "name": "Esculpidas & Nail Art Editorial",
      "slug": "esculpidas-nail-art",
      "badge": "01 — NAIL ART",
      "desc": "Construcción escultural a medida con diseño personalizado: efectos cromo, relieve 3D, perlas, gothic lettering o french editorial.",
      "duration": 120,
      "durationLabel": "120 min",
      "price": 28000,
      "deposit": 5600,
      "icon": "💎",
      "category": "nails",
      "isActive": true,
      "sortOrder": 1
    },
    {
      "id": "22222222-2222-2222-2222-222222222202",
      "name": "Kapping / Capping Gel + Diseño",
      "slug": "kapping-gel-diseno",
      "badge": "01 — NAIL ART",
      "desc": "Baño de gel fortificador sobre el largo de tu uña natural para máxima resistencia, nivelación perfecta y nail art a elección.",
      "duration": 90,
      "durationLabel": "90 min",
      "price": 24000,
      "deposit": 4800,
      "icon": "✨",
      "category": "nails",
      "isActive": true,
      "sortOrder": 2
    },
    {
      "id": "22222222-2222-2222-2222-222222222203",
      "name": "Esmaltado Semipermanente + Nail Art",
      "slug": "semipermanente-nail-art",
      "badge": "01 — NAIL ART",
      "desc": "Manicuría combinada de alta precisión con esmaltado de larga duración, french, glitter reflectivo o detalles cromados.",
      "duration": 75,
      "durationLabel": "75 min",
      "price": 20000,
      "deposit": 4000,
      "icon": "🖤",
      "category": "nails",
      "isActive": true,
      "sortOrder": 3
    },
    {
      "id": "22222222-2222-2222-2222-222222222204",
      "name": "Service / Mantenimiento Nail Art",
      "slug": "service-mantenimiento-nails",
      "badge": "01 — NAIL ART",
      "desc": "Balance de estructura, retiro de crecimiento y renovación completa del diseño (recomendado cada 21 días).",
      "duration": 90,
      "durationLabel": "90 min",
      "price": 22000,
      "deposit": 4400,
      "icon": "🔄",
      "category": "nails",
      "isActive": true,
      "sortOrder": 4
    },
    {
      "id": "22222222-2222-2222-2222-222222222205",
      "name": "Tattoo Fine Line / Mini & Flash",
      "slug": "tattoo-fine-line-flash",
      "badge": "02 — TATTOO ART",
      "desc": "Tatuajes delicados de trazo fino, caligrafía, botánicos, micro-tattoos o diseños seleccionados del Flash Book del estudio.",
      "duration": 90,
      "durationLabel": "60-90 min",
      "price": 35000,
      "deposit": 7000,
      "icon": "🖋️",
      "category": "tattoo",
      "isActive": true,
      "sortOrder": 5
    },
    {
      "id": "22222222-2222-2222-2222-222222222206",
      "name": "Tattoo Blackwork & Diseño Custom",
      "slug": "tattoo-blackwork-custom",
      "badge": "02 — TATTOO ART",
      "desc": "Sesión de tatuaje personalizado en tinta negra, puntillismo, lettering experimental u ornamental a medida.",
      "duration": 150,
      "durationLabel": "120-180 min",
      "price": 55000,
      "deposit": 11000,
      "icon": "🩸",
      "category": "tattoo",
      "isActive": true,
      "sortOrder": 6
    }
  ],
  "promosSection": {
    "pill": "TWO SIDES • PACKS & EXPERIENCIAS",
    "title": "Combiná tus dos caras en el estudio",
    "subtitle": "Propuestas pensadas para llevar la experiencia completa de Nail Art y Tattoo Art en Espacio Muna.",
    "bannerTag": "Agenda Online 24/7",
    "bannerTitle": "Reservá tu Horario en Tiempo Real",
    "bannerSubtitle": "Espacio Muna — Nahi Ciamprone Studio",
    "bannerBtnText": "Abrir Agenda Online",
    "items": [
      {
        "id": "promo_1",
        "badge": "01 — Cara Nails",
        "duration": "120 min",
        "title": "Full Set Esculpidas + Chrome / 3D",
        "desc": "Estructura completa a medida con relieve 3D, perlas o efecto cromado editorial.",
        "priceLabel": "Valor Sesión",
        "price": 28000,
        "ribbonText": "Belleza, precisión y arquitectura escultural",
        "btnText": "Reservar Nails",
        "serviceLink": "esculpidas",
        "isVip": false,
        "vipBadge": ""
      },
      {
        "id": "promo_2",
        "badge": "01 + 02 — Dual Identity",
        "duration": "180 min",
        "title": "Experiencia Dual: Nails + Mini Tattoo",
        "desc": "Las dos caras de Nahi Studio en una misma cita: set de Nail Art + tatuaje fine-line o pieza flash.",
        "priceLabel": "Pack Especial Dual",
        "price": 52000,
        "ribbonText": "Two Sides. One Identity.",
        "btnText": "Reservar Pack Dual",
        "serviceLink": "tattoo",
        "isVip": true,
        "vipBadge": "★ TWO SIDES VIP ★"
      },
      {
        "id": "promo_3",
        "badge": "02 — Cara Tattoo",
        "duration": "90 min",
        "title": "Flash Tattoo Session",
        "desc": "Elegí tu pieza del Flash Book disponible con diseño exclusivo en tinta negra y trazo fino.",
        "priceLabel": "Desde",
        "price": 35000,
        "ribbonText": "Tinta, carácter y expresión",
        "btnText": "Reservar Tattoo",
        "serviceLink": "flash",
        "isVip": false,
        "vipBadge": ""
      }
    ]
  },
  "coursesSection": {
    "pill": "NAHI STUDIO • WORKSHOPS & FORMACIÓN",
    "title": "Talleres & Perfeccionamiento",
    "subtitle": "Formación personalizada en técnicas de Nail Art editorial, estructura y expresión artística.",
    "trustBadges": [
      {
        "icon": "💎",
        "title": "Práctica Real",
        "subtitle": "Acompañamiento 1 a 1 en estudio"
      },
      {
        "icon": "🖤",
        "title": "Materiales Incluidos",
        "subtitle": "Todo listo para trabajar en clase"
      },
      {
        "icon": "📜",
        "title": "Certificado",
        "subtitle": "Diploma de asistencia Nahi Studio"
      },
      {
        "icon": "💬",
        "title": "Seguimiento",
        "subtitle": "Consultas post-taller directas"
      }
    ],
    "courses": [
      {
        "id": "33333333-3333-3333-3333-333333333301",
        "slug": "workshop-nail-art-3d-chrome",
        "badge": "01 — NAIL ART WORKSHOP",
        "duration": "1 Jornada Intensiva",
        "title": "Workshop: Nail Art Editorial, Cromo & 3D",
        "subtitle": "Diseño avanzado • Relieves, encapsulados, efectos metálicos y trazos",
        "desc": "Dominá las técnicas de diseño que definen la identidad visual de Nahi Studio: manejo de geles 3D, polvos cromados sin manchas, french orgánico y composición.",
        "syllabus": [
          "Preparación de superficie para cromos espejo y efectos metálicos",
          "Volumen 3D, relieves orgánicos y adherencia de perlas/tachas",
          "Trazos finos, lettering gótico y equilibrio visual del set",
          "Fotografía editorial de manos con luz dramática"
        ],
        "priceLabel": "Inversión",
        "price": 65000,
        "priceNote": "Cupos personalizados • Materiales incluidos",
        "modalityFilter": "presencial",
        "btnText": "Consultar por WhatsApp",
        "whatsappText": "Hola Nahi! Quiero info del Workshop de Nail Art Editorial, Cromo & 3D",
        "isActive": true,
        "sortOrder": 1
      }
    ]
  },
  "hero": {
    "statusPill": "NAHI CIAMPRONE STUDIO • ESPACIO MUNA",
    "scriptTitle": "Two Sides. One Identity.",
    "mainTitleLine1": "TWO SIDES.",
    "mainTitleHighlight": "ONE IDENTITY.",
    "ribbonTop": "RESERVÁ TU TURNO EN",
    "ribbonBrand": "NAHI STUDIO",
    "description": "Dos formas de expresión. Una misma esencia. Precisión escultural en uñas y carácter en tinta negra, unificados bajo una sola mirada artística.",
    "primaryBtnText": "01 — Explorar Nail Art",
    "secondaryBtnText": "02 — Explorar Tattoo Art",
    "guarantees": [
      "01 — Nail Art Editorial",
      "02 — Blackwork & Fine Line",
      "Espacio Muna"
    ],
    "styles": [
      {
        "id": "nails-crimson",
        "name": "01 · Crimson French",
        "badge": "01 / NAIL ART",
        "title": "Crimson French & Tattoo",
        "detail": "Almendradas con french rojo carmesí profundo en diálogo con tatuaje ornamental",
        "price": "$24.000",
        "time": "90 min",
        "img": "fotos/imgi_25_539976307_17854872333514079_3988514524600607766_n.webp"
      },
      {
        "id": "nails-3d",
        "name": "01 · Sculpted 3D",
        "badge": "01 / NAIL ART",
        "title": "Sculpted 3D & Pearl",
        "detail": "Volumen metálico dorado, perlas y relieve escultórico hecho a mano",
        "price": "$28.000",
        "time": "120 min",
        "img": "fotos/imgi_22_504060229_17842497063514079_4107614235171648365_n.webp"
      },
      {
        "id": "tattoo-cupido",
        "name": "02 · Cupido Tattoo",
        "badge": "02 / TATTOO ART",
        "title": "Cupido Blackwork",
        "detail": "Tatuaje en tinta negra con puntillismo fino y contraste clásico",
        "price": "$45.000",
        "time": "120 min",
        "img": "fotos/imgi_28_771909433_18096793385269189_6790519837572543665_n.jpg"
      },
      {
        "id": "tattoo-fudog",
        "name": "02 · Oriental Custom",
        "badge": "02 / TATTOO ART",
        "title": "León Fu Dog & Geometría",
        "detail": "Línea sólida y geometría sagrada en proyecto personalizado a gran escala",
        "price": "$55.000",
        "time": "150 min",
        "img": "fotos/imgi_18_831313350_18104431136269189_151488612152529768_n.jpg"
      }
    ]
  },
  "servicesSection": {
    "pill": "01 — NAIL ART",
    "title": "Arquitectura, cromo & detalle editorial.",
    "subtitle": "Trabajos reales de Nahi Ciamprone. Tocá cualquier fotografía para ampliarla en detalle.",
    "ctaCardTitle": "¿Querés ver todos los horarios disponibles?",
    "ctaCardDesc": "Abriremos nuestro turnero online en tiempo real para que elijas día y horario.",
    "ctaCardBtn": "Abrir Turnero Online"
  },
  "gallerySection": {
    "pill": "02 — TATTOO ART",
    "title": "Flash book, tinta & proyectos a medida.",
    "subtitle": "Blackwork, fine line, caligrafía y diseños personalizados. Tocá cualquier pieza para verla en detalle o consultar.",
    "instagramBtnText": "Ver más trabajos en Instagram @nahi.ciamprone"
  },
  "about": {
    "photoUrl": "fotos/imgi_14_851843619_18118320313897879_5122667710876184401_n.jpg?v=3",
    "photoTopBadge": "NAIL ARTIST & TATTOO ARTIST",
    "photoCardName": "Nahiara Ciamprone",
    "photoCardRole": "NAHI STUDIO • ESPACIO MUNA",
    "photoCardSub": "Two Sides. One Identity.",
    "stat1Value": "CARA 01",
    "stat1Label": "Nail Art Editorial & 3D",
    "stat2Value": "CARA 02",
    "stat2Label": "Blackwork & Fine Line Tattoo",
    "headerPill": "SOBRE LA ARTISTA",
    "headline": "ONE ARTIST. TWO EXPRESSIONS.",
    "subheadline": "Dos disciplinas, un mismo pulso estético en Espacio Muna.",
    "introParagraph1": "Soy Nahiara Ciamprone, creadora de NAHI STUDIO. Mi trabajo habita el cruce entre dos mundos que comparten la misma obsesión por el trazo, la forma y la identidad: el Nail Art escultural y el Tattoo Art.",
    "introParagraph2": "En Espacio Muna diseño tanto estructuras en uñas con relieves 3D, cromos metálicos y estética editorial, como tatuajes en tinta negra, fine-line, lettering experimental y piezas custom pensadas para acompañar el cuerpo.",
    "boxTitle": "Las Dos Caras de Nahi Studio",
    "specialties": [
      {
        "icon": "💎",
        "text": "Cara 01 — Nail Art: Esculpidas, Relieve 3D, Chrome & Editorial French"
      },
      {
        "icon": "✨",
        "text": "Cara 01 — Kapping Gel & Semipermanente con diseño de autor"
      },
      {
        "icon": "🖋️",
        "text": "Cara 02 — Tattoo Art: Fine Line, Botánicos & Micro-Tattoos"
      },
      {
        "icon": "🩸",
        "text": "Cara 02 — Blackwork, Puntillismo de arrastre & Lettering"
      },
      {
        "icon": "📖",
        "text": "Flash Book con diseños propios listos para tatuar"
      },
      {
        "icon": "🖤",
        "text": "Atención personalizada con turno previo en Espacio Muna"
      }
    ],
    "quote": "\"TWO SIDES. ONE SOUL. ENDLESS WAYS TO CREATE.\"",
    "closingParagraph1": "Cara A — Nails: Belleza, precisión, creatividad y detalle.",
    "closingParagraph2": "Cara B — Tattoos: Tinta, personalidad, expresión y carácter.",
    "closingSignature": "NAHIARA CIAMPRONE — ESPACIO MUNA"
  },
  "bookingSection": {
    "pill": "AGENDA ONLINE EN TIEMPO REAL",
    "title": "Reservá tu Turno o Sesión",
    "subtitle": "Elegí tu servicio de Nail Art o sesión de Tattoo Art, seleccioná fecha en el calendario interactivo y asegurá tu horario.",
    "primaryBtnText": "Abrir Turnero Online",
    "secondaryBtnText": "Panel Admin",
    "features": [
      {
        "icon": "🗓️",
        "title": "Calendario en Vivo",
        "desc": "Horarios reales actualizados por Nahi."
      },
      {
        "icon": "💎",
        "title": "01 · Nail Art",
        "desc": "Esculpidas, Kapping, Semipermanente y 3D."
      },
      {
        "icon": "🖋️",
        "title": "02 · Tattoo Art",
        "desc": "Sesiones Flash, Fine Line y Blackwork."
      }
    ],
    "turnosPageRibbon": "AGENDA ONLINE • NAHI STUDIO",
    "turnosPageTitle": "Reservar Turno",
    "turnosPageSubtitle": "Elegí tu servicio de Nail Art o Tattoo Art, seleccioná fecha en el calendario y asegurá tu horario en tiempo real.",
    "turnosHoursNote": "Atención en Espacio Muna con turno previo"
  },
  "location": {
    "pill": "UBICACIÓN & CONTACTO",
    "title": "Espacio Muna",
    "subtitle": "Atención personalizada con turno previo para Nail Art y Tattoo Art.",
    "addressTitle": "Estudio",
    "addressText": "Espacio Muna",
    "addressNote": "Dirección exacta enviada al confirmar tu turno por WhatsApp",
    "hoursTitle": "Horarios",
    "hoursLine1": "Con Turno Previo",
    "hoursLine2": "Consultá disponibilidad en la agenda online o por WhatsApp",
    "studioPhotoUrl": "fotos/imgi_14_851843619_18118320313897879_5122667710876184401_n.jpg?v=3",
    "whatsappNumber": "",
    "instagramHandle": "@nahi.ciamprone",
    "instagramUrl": "https://www.instagram.com/nahi.ciamprone/",
    "brandName": "NAHI STUDIO",
    "footerSubtitle": "TWO SIDES. ONE SOUL. ENDLESS WAYS TO CREATE.",
    "footerCopyright": "© 2026 NAHI STUDIO — NAHI CIAMPRONE. TODOS LOS DERECHOS RESERVADOS."
  },
  "faqs": {
    "pill": "INFORMACIÓN ÚTIL",
    "title": "Preguntas Frecuentes",
    "subtitle": "Todo lo que necesitás saber antes de tu turno de Nail Art o sesión de Tattoo.",
    "items": [
      {
        "id": "faq_1",
        "question": "¿Cómo reservo un turno de Nail Art?",
        "answer": "Podés reservar directamente desde el Turnero Online eligiendo fecha y horario disponible, o enviando tu solicitud por WhatsApp desde la sección 01 — Nail Art."
      },
      {
        "id": "faq_2",
        "question": "¿Cómo cotizo un tatuaje o reservo un diseño del Flash Book?",
        "answer": "En la sección 02 — Tattoo Art podés tocar cualquier pieza para verla en detalle y usar el formulario 'Contame tu idea' indicando zona del cuerpo, tamaño aproximado en cm y tu idea o referencia."
      },
      {
        "id": "faq_3",
        "question": "¿Dónde se encuentra el estudio?",
        "answer": "Atiendo en Espacio Muna con cita previa. Al confirmar tu reserva recibís todos los detalles de llegada y preparación."
      }
    ]
  }
};
}

function loadSiteContentLocal() {
  const defaults = getDefaultSiteContent();
  try {
    const fileToRead = (process.env.VERCEL && fs.existsSync(TMP_SITE_CONTENT_FILE))
      ? TMP_SITE_CONTENT_FILE
      : SITE_CONTENT_FILE;
    if (fs.existsSync(fileToRead)) {
      const parsed = JSON.parse(fs.readFileSync(fileToRead, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return {
          ...defaults,
          ...parsed,
          services: Array.isArray(parsed.services) && parsed.services.length > 0 ? parsed.services : defaults.services,
          promosSection: { ...defaults.promosSection, ...(parsed.promosSection || {}) },
          coursesSection: {
            ...defaults.coursesSection,
            ...(parsed.coursesSection || {}),
            courses: Array.isArray(parsed.coursesSection?.courses) ? parsed.coursesSection.courses : defaults.coursesSection.courses
          },
          hero: { ...defaults.hero, ...(parsed.hero || {}) },
          servicesSection: { ...defaults.servicesSection, ...(parsed.servicesSection || {}) },
          gallerySection: { ...defaults.gallerySection, ...(parsed.gallerySection || {}) },
          about: { ...defaults.about, ...(parsed.about || {}) },
          bookingSection: { ...defaults.bookingSection, ...(parsed.bookingSection || {}) },
          location: { ...defaults.location, ...(parsed.location || {}) },
          faqs: { ...defaults.faqs, ...(parsed.faqs || {}) }
        };
      }
    }
  } catch (e) {
    console.warn('[SiteContent] Error al leer site-content.json:', e.message);
  }
  return defaults;
}

function saveSiteContentLocal(contentObj) {
  try {
    const target = process.env.VERCEL ? TMP_SITE_CONTENT_FILE : SITE_CONTENT_FILE;
    fs.writeFileSync(target, JSON.stringify(contentObj, null, 2), 'utf-8');
  } catch (e) {
    try {
      fs.writeFileSync(TMP_SITE_CONTENT_FILE, JSON.stringify(contentObj, null, 2), 'utf-8');
    } catch (_) {}
  }
}

localDatabase.siteContent = loadSiteContentLocal();

function mapDbCategoryForServicesTable(cat) {
  const c = String(cat || '').toLowerCase();
  if (c === 'lifting') return 'lifting';
  if (c === 'cejas') return 'cejas';
  if (c === 'combo') return 'combo';
  return 'extensiones';
}

async function getSiteContentFull() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'site_content')
        .maybeSingle();

      if (!error && data && data.value && typeof data.value === 'object') {
        const defaults = getDefaultSiteContent();
        const remote = data.value;
        const merged = {
          ...defaults,
          ...remote,
          services: Array.isArray(remote.services) && remote.services.length > 0 ? remote.services : defaults.services,
          promosSection: { ...defaults.promosSection, ...(remote.promosSection || {}) },
          coursesSection: {
            ...defaults.coursesSection,
            ...(remote.coursesSection || {}),
            courses: Array.isArray(remote.coursesSection?.courses) ? remote.coursesSection.courses : defaults.coursesSection.courses
          },
          hero: { ...defaults.hero, ...(remote.hero || {}) },
          servicesSection: { ...defaults.servicesSection, ...(remote.servicesSection || {}) },
          gallerySection: { ...defaults.gallerySection, ...(remote.gallerySection || {}) },
          about: { ...defaults.about, ...(remote.about || {}) },
          bookingSection: { ...defaults.bookingSection, ...(remote.bookingSection || {}) },
          location: { ...defaults.location, ...(remote.location || {}) },
          faqs: { ...defaults.faqs, ...(remote.faqs || {}) }
        };
        localDatabase.siteContent = merged;
        saveSiteContentLocal(merged);
        return merged;
      }
    } catch (e) {
      console.warn('[Supabase] Error leyendo site_content:', e.message);
    }
  }
  if (!localDatabase.siteContent) {
    localDatabase.siteContent = loadSiteContentLocal();
  }
  return localDatabase.siteContent;
}

async function syncServicesToSupabaseTable(servicesList) {
  if (!supabase || !Array.isArray(servicesList)) return;
  try {
    const crypto = require('crypto');
    const rows = servicesList.map((s, idx) => {
      const rawId = String(s.id || '');
      const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
        ? rawId
        : crypto.randomUUID();
      s.id = validUuid;
      const slugBase = String(s.slug || s.name || `servicio-${idx + 1}`)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `servicio-${idx + 1}`;
      s.slug = slugBase;
      const priceNum = Number(s.price !== undefined ? s.price : s.price_ars) || 0;
      const depNum = Number(s.deposit !== undefined ? s.deposit : s.deposit_ars) || Math.ceil((priceNum * 0.2) / 100) * 100;
      return {
        id: validUuid,
        name: s.name || 'Servicio',
        slug: `${slugBase}-${validUuid.slice(-4)}`,
        badge: s.badge || '',
        description: s.desc || s.description || '',
        duration_minutes: Number(s.duration || s.duration_minutes) || 90,
        price_ars: priceNum,
        deposit_ars: depNum,
        icon: s.icon || '✨',
        category: mapDbCategoryForServicesTable(s.category),
        is_active: s.isActive !== false,
        sort_order: Number(s.sortOrder) || (idx + 1)
      };
    });
    if (rows.length > 0) {
      await supabase.from('services').upsert(rows, { onConflict: 'id' });
    }
  } catch (e) {
    console.warn('[Supabase] Aviso sincronizando tabla services:', e.message);
  }
}

async function syncCoursesToSupabaseTable(coursesList) {
  if (!supabase || !Array.isArray(coursesList)) return;
  try {
    const crypto = require('crypto');
    const rows = coursesList.map((c, idx) => {
      const rawId = String(c.id || '');
      const validUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)
        ? rawId
        : crypto.randomUUID();
      c.id = validUuid;
      const slugBase = String(c.slug || c.title || `curso-${idx + 1}`)
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `curso-${idx + 1}`;
      c.slug = slugBase;
      const priceNum = Number(c.price !== undefined ? c.price : c.price_ars) || 0;
      return {
        id: validUuid,
        title: c.title || 'Curso',
        slug: `${slugBase}-${validUuid.slice(-4)}`,
        level: c.subtitle || c.level || 'Inicial',
        modality: c.modalityFilter || c.modality || 'presencial',
        duration_hours: c.duration || c.duration_hours || '1 Jornada',
        price_ars: priceNum,
        deposit_ars: Number(c.deposit || c.deposit_ars) || Math.ceil((priceNum * 0.2) / 100) * 100,
        includes_kit: true,
        badge: c.badge || 'Certificado Oficial',
        description: c.desc || c.description || '',
        syllabus: Array.isArray(c.syllabus) ? c.syllabus : [],
        is_active: c.isActive !== false,
        sort_order: Number(c.sortOrder) || (idx + 1)
      };
    });
    if (rows.length > 0) {
      await supabase.from('courses').upsert(rows, { onConflict: 'id' });
    }
  } catch (e) {
    console.warn('[Supabase] Aviso sincronizando tabla courses:', e.message);
  }
}

async function saveSiteContentFull(incomingContent) {
  const current = await getSiteContentFull();
  const merged = {
    ...current,
    ...incomingContent,
    services: Array.isArray(incomingContent.services) ? incomingContent.services : current.services,
    promosSection: incomingContent.promosSection ? { ...current.promosSection, ...incomingContent.promosSection } : current.promosSection,
    coursesSection: incomingContent.coursesSection ? {
      ...current.coursesSection,
      ...incomingContent.coursesSection,
      courses: Array.isArray(incomingContent.coursesSection.courses) ? incomingContent.coursesSection.courses : current.coursesSection.courses
    } : current.coursesSection,
    hero: incomingContent.hero ? { ...current.hero, ...incomingContent.hero } : current.hero,
    servicesSection: incomingContent.servicesSection ? { ...current.servicesSection, ...incomingContent.servicesSection } : current.servicesSection,
    gallerySection: incomingContent.gallerySection ? { ...current.gallerySection, ...incomingContent.gallerySection } : current.gallerySection,
    about: incomingContent.about ? { ...current.about, ...incomingContent.about } : current.about,
    bookingSection: incomingContent.bookingSection ? { ...current.bookingSection, ...incomingContent.bookingSection } : current.bookingSection,
    location: incomingContent.location ? { ...current.location, ...incomingContent.location } : current.location,
    faqs: incomingContent.faqs ? { ...current.faqs, ...incomingContent.faqs } : current.faqs,
    updatedAt: new Date().toISOString()
  };

  if (Array.isArray(incomingContent.services)) {
    await syncServicesToSupabaseTable(merged.services);
  }
  if (incomingContent.coursesSection && Array.isArray(incomingContent.coursesSection.courses)) {
    await syncCoursesToSupabaseTable(merged.coursesSection.courses);
  }

  localDatabase.siteContent = merged;
  localDatabase.services = merged.services;
  saveSiteContentLocal(merged);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'site_content',
          value: merged,
          description: 'Contenido editable completo del sitio web, precios, cursos, promos y secciones'
        }, { onConflict: 'key' });
      if (error) {
        console.warn('[Supabase] Error guardando site_content en settings:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase] Excepción guardando site_content:', e.message);
    }
  }

  return merged;
}

async function getPublishedSchedulesMap() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'published_schedules')
        .maybeSingle();
      if (!error && data && data.value && typeof data.value === 'object') {
        const normalized = { days: data.value.days || {} };
        localDatabase.publishedSchedules = normalized;
        savePublishedSchedulesLocal(normalized);
        return normalized;
      }
    } catch (e) {
      console.warn('[Supabase] Error leyendo published_schedules:', e.message);
    }
  }
  if (!localDatabase.publishedSchedules || !localDatabase.publishedSchedules.days) {
    localDatabase.publishedSchedules = loadPublishedSchedulesLocal();
  }
  return localDatabase.publishedSchedules;
}

async function savePublishedSchedulesMap(mapObj) {
  const cleanMap = { days: (mapObj && mapObj.days) ? mapObj.days : {} };
  localDatabase.publishedSchedules = cleanMap;
  savePublishedSchedulesLocal(cleanMap);

  if (supabase) {
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: 'published_schedules',
          value: cleanMap,
          description: 'Horarios publicados por el admin con control de tachado en tiempo real'
        }, { onConflict: 'key' });
      if (error) {
        console.warn('[Supabase] Error guardando published_schedules:', error.message);
      }
    } catch (e) {
      console.warn('[Supabase] Excepción guardando published_schedules:', e.message);
    }
  }
  return cleanMap;
}

async function getBookedTimesForDate(dateStr) {
  let bookedAppts = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('start_time,end_time')
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');
      if (!error && Array.isArray(data)) {
        bookedAppts = data;
      }
    } catch (e) {
      console.warn('[Supabase] Error consultando citas del día:', e.message);
    }
  } else {
    bookedAppts = localDatabase.appointments
      .filter(a => (a.appointment_date === dateStr || a.date === dateStr) && a.status !== 'cancelled')
      .map(a => ({ start_time: a.start_time || a.time, end_time: a.end_time || a.endTime || '' }));
  }
  return bookedAppts;
}

function isTimeOverlappingBooked(slotTime, bookedAppts, slotDurationMin = 60) {
  const toMin = (t) => {
    if (!t) return 0;
    const [hh, mm] = String(t).split(':').map(Number);
    return (hh || 0) * 60 + (mm || 0);
  };
  const sStart = toMin(slotTime);
  const sEnd = sStart + slotDurationMin;
  return bookedAppts.some(appt => {
    const cleanStart = String(appt.start_time || '').slice(0, 5);
    if (cleanStart === slotTime) return true;
    const aStart = toMin(appt.start_time);
    const aEnd = appt.end_time ? toMin(appt.end_time) : aStart + slotDurationMin;
    return sStart < aEnd && sEnd > aStart;
  });
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper para parsear JSON body en requests POST/PATCH/PUT (soporta fotos hasta 10MB y pre-parsing de Vercel)
function parseJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return Promise.resolve(req.body);
    }
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(req.body ? JSON.parse(req.body) : {});
      } catch (err) {
        return Promise.reject(new Error('Invalid JSON format'));
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        const str = req.body.toString('utf-8');
        return Promise.resolve(str ? JSON.parse(str) : {});
      } catch (err) {
        return Promise.reject(new Error('Invalid JSON format'));
      }
    }
  }

  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1.2e7) { // ~12MB limit para fotos HD en Base64
        req.destroy();
        reject(new Error('Payload too large (máximo 10MB)'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('Invalid JSON format'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
  });
  res.end(JSON.stringify(data));
}

// Router API
async function handleApiRequest(req, res, pathname, queryParams) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey'
    });
    res.end();
    return;
  }

  // 1. GET /api/health
  if (req.method === 'GET' && pathname === '/api/health') {
    return sendJson(res, 200, {
      status: 'ok',
      service: 'Nahi Studio Backend',
      mode: supabase ? 'supabase' : 'local',
      supabaseConfigured: !!supabase,
      supabaseUrl: SUPABASE_URL || null,
      timestamp: new Date().toISOString()
    });
  }

  // 2. GET /api/config (Variables públicas para frontend)
  if (req.method === 'GET' && pathname === '/api/config') {
    return sendJson(res, 200, {
      supabaseUrl: SUPABASE_URL,
      supabaseAnonKey: SUPABASE_ANON_KEY,
      isConfigured: !!(SUPABASE_URL && SUPABASE_ANON_KEY),
      whatsapp: '5492914491141',
      studio: 'Nahi Studio • Bahía Blanca'
    });
  }

  // 2a. AUTENTICACIÓN DE ADMIN Y CLIENTAS (/api/auth/login, /api/auth/register, /api/auth/admin-password)
  const AUTH_STORE_FILE = path.join(dir, 'users-data.json');
  const TMP_AUTH_STORE_FILE = path.join(os.tmpdir(), 'nahi-users-data.json');
  function loadAuthStore() {
    const defaultStore = {
      admin: {
        id: 'admin_nahi',
        name: 'Nahiara Ciamprone',
        email: process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL !== 'micaela@lashart.com'
          ? process.env.ADMIN_EMAIL
          : 'admin@nahistudio.com',
        password: process.env.ADMIN_PASSWORD || 'NahiStudio2026',
        role: 'admin'
      },
      users: []
    };
    try {
      const target = (process.env.VERCEL && fs.existsSync(TMP_AUTH_STORE_FILE))
        ? TMP_AUTH_STORE_FILE
        : (fs.existsSync(AUTH_STORE_FILE) ? AUTH_STORE_FILE : null);
      if (target) {
        const parsed = JSON.parse(fs.readFileSync(target, 'utf-8'));
        if (parsed && typeof parsed === 'object') {
          return {
            admin: { ...defaultStore.admin, ...(parsed.admin || {}) },
            users: Array.isArray(parsed.users) ? parsed.users : []
          };
        }
      }
    } catch (e) {}
    return defaultStore;
  }
  function saveAuthStore(store) {
    try {
      const target = process.env.VERCEL ? TMP_AUTH_STORE_FILE : AUTH_STORE_FILE;
      fs.writeFileSync(target, JSON.stringify(store, null, 2), 'utf-8');
    } catch (e) {
      try {
        fs.writeFileSync(TMP_AUTH_STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
      } catch (_) {}
    }
  }

  if (req.method === 'POST' && pathname === '/api/auth/login') {
    try {
      const body = await parseJsonBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!email || !password) {
        return sendJson(res, 400, { error: 'Por favor ingresá tu email y contraseña.' });
      }
      const store = loadAuthStore();
      if (email === String(store.admin.email || '').toLowerCase()) {
        if (password !== store.admin.password) {
          return sendJson(res, 401, { error: 'Contraseña de administrador incorrecta.' });
        }
        const adminUser = {
          id: store.admin.id || 'admin_nahi',
          name: store.admin.name || 'Nahiara Ciamprone',
          email: store.admin.email,
          role: 'admin'
        };
        return sendJson(res, 200, {
          success: true,
          token: 'nahi_admin_token_' + Date.now(),
          user: adminUser
        });
      }

      const found = store.users.find(u => String(u.email || '').toLowerCase() === email);
      if (!found) {
        return sendJson(res, 404, {
          error: 'No encontramos una cuenta con ese email. Por favor registrate en la pestaña "Registrarse".',
          code: 'USER_NOT_FOUND'
        });
      }
      if (found.password !== password) {
        return sendJson(res, 401, { error: 'Contraseña incorrecta.' });
      }
      const clientUser = {
        id: found.id,
        name: found.name,
        phone: found.phone || '',
        email: found.email,
        role: 'client'
      };
      return sendJson(res, 200, {
        success: true,
        token: 'nahi_client_token_' + found.id + '_' + Date.now(),
        user: clientUser
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/auth/register') {
    try {
      const body = await parseJsonBody(req);
      const name = String(body.name || '').trim();
      const phone = String(body.phone || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!name || !email || !password) {
        return sendJson(res, 400, { error: 'Completá nombre, email y contraseña.' });
      }
      if (password.length < 4) {
        return sendJson(res, 400, { error: 'La contraseña debe tener al menos 4 caracteres.' });
      }
      const store = loadAuthStore();
      if (email === String(store.admin.email || '').toLowerCase()) {
        return sendJson(res, 409, { error: 'Ese correo pertenece a la administración. Iniciá sesión con tu contraseña.' });
      }
      const existing = store.users.find(u => String(u.email || '').toLowerCase() === email);
      if (existing) {
        return sendJson(res, 409, { error: 'Ya existe una cuenta con este correo. Podés iniciar sesión.' });
      }
      const newUser = {
        id: 'usr_' + Date.now(),
        name,
        phone,
        email,
        password,
        role: 'client',
        createdAt: new Date().toISOString()
      };
      store.users.push(newUser);
      saveAuthStore(store);

      const sessionUser = {
        id: newUser.id,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: 'client'
      };
      return sendJson(res, 201, {
        success: true,
        token: 'nahi_client_token_' + newUser.id + '_' + Date.now(),
        user: sessionUser
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if ((req.method === 'PUT' || req.method === 'POST') && pathname === '/api/auth/admin-password') {
    try {
      const body = await parseJsonBody(req);
      const currentPassword = String(body.currentPassword || '');
      const newPassword = String(body.newPassword || '');
      const newEmail = String(body.newEmail || '').trim().toLowerCase();

      const store = loadAuthStore();
      if (currentPassword !== store.admin.password) {
        return sendJson(res, 401, { error: 'La contraseña actual no es correcta.' });
      }
      if (!newPassword || newPassword.length < 4) {
        return sendJson(res, 400, { error: 'La nueva contraseña debe tener al menos 4 caracteres.' });
      }
      store.admin.password = newPassword;
      if (newEmail && newEmail.includes('@')) {
        store.admin.email = newEmail;
      }
      saveAuthStore(store);

      return sendJson(res, 200, {
        success: true,
        user: {
          id: store.admin.id,
          name: store.admin.name,
          email: store.admin.email,
          role: 'admin'
        }
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 2a-extra. Endpoints de Gestión del Backend (/api/admin/backend-status, /api/admin/supabase-config, /api/admin/sql-schema)
  if (req.method === 'GET' && pathname === '/api/admin/backend-status') {
    const authStore = loadAuthStore();
    const content = await getSiteContentFull();
    const pubMap = await getPublishedSchedulesMap();
    const pubDaysCount = pubMap && pubMap.days ? Object.keys(pubMap.days).length : 0;
    return sendJson(res, 200, {
      status: 'online',
      engine: supabase ? 'Node.js + Supabase PostgreSQL' : 'Node.js Backend API (JSON Storage)',
      supabaseConnected: !!supabase,
      supabaseUrl: SUPABASE_URL || '',
      adminEmail: authStore.admin.email,
      stats: {
        users: authStore.users.length,
        appointments: localDatabase.appointments.length,
        services: Array.isArray(content.services) ? content.services.length : localDatabase.services.length,
        galleryPhotos: localDatabase.gallery.length,
        publishedDays: pubDaysCount
      }
    });
  }

  if (req.method === 'POST' && pathname === '/api/admin/supabase-config') {
    try {
      const body = await parseJsonBody(req);
      const url = String(body.supabaseUrl || '').trim().replace(/\/+$/, '');
      const anonKey = String(body.supabaseAnonKey || '').trim();
      const serviceKey = String(body.supabaseServiceKey || '').trim();

      SUPABASE_URL = url;
      SUPABASE_ANON_KEY = anonKey;
      if (serviceKey) SUPABASE_SERVICE_ROLE_KEY = serviceKey;

      const cfgToSave = {
        supabaseUrl: SUPABASE_URL,
        supabaseAnonKey: SUPABASE_ANON_KEY,
        supabaseServiceKey: SUPABASE_SERVICE_ROLE_KEY
      };
      try {
        const target = process.env.VERCEL ? TMP_SUPABASE_CONFIG_FILE : SUPABASE_CONFIG_FILE;
        fs.writeFileSync(target, JSON.stringify(cfgToSave, null, 2), 'utf-8');
      } catch (e) {
        try {
          fs.writeFileSync(TMP_SUPABASE_CONFIG_FILE, JSON.stringify(cfgToSave, null, 2), 'utf-8');
        } catch (_) {}
      }

      const connected = initSupabaseClient();
      return sendJson(res, 200, {
        success: true,
        supabaseConnected: connected,
        supabaseUrl: SUPABASE_URL
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (req.method === 'GET' && pathname === '/api/admin/sql-schema') {
    try {
      const sqlFile = path.join(dir, 'supabase-schema.sql');
      const sql = fs.existsSync(sqlFile) ? fs.readFileSync(sqlFile, 'utf-8') : '';
      return sendJson(res, 200, { sql });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 2b. GET /api/payment-info & PUT /api/payment-info (Datos de transferencia para la seña del 20%)
  if (req.method === 'GET' && pathname === '/api/payment-info') {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'payment_info')
          .maybeSingle();
        if (!error && data && data.value && typeof data.value === 'object') {
          localDatabase.paymentInfo = data.value;
          return sendJson(res, 200, { paymentInfo: data.value });
        }
      } catch (e) {
        console.warn('[Supabase] Error leyendo payment_info:', e.message);
      }
    }
    const content = await getSiteContentFull();
    const fallbackInfo = localDatabase.paymentInfo || content.paymentInfo || {
      alias: '',
      cbu: '',
      holder: 'Nahiara Ciamprone',
      bank: '',
      whatsapp: content.location?.whatsappNumber || ''
    };
    return sendJson(res, 200, { paymentInfo: fallbackInfo });
  }

  if ((req.method === 'PUT' || req.method === 'POST') && pathname === '/api/payment-info') {
    try {
      const body = await parseJsonBody(req);
      const clean = {
        alias: String(body.alias || '').trim(),
        cbu: String(body.cbu || '').trim(),
        holder: String(body.holder || 'Nahiara Ciamprone').trim(),
        bank: String(body.bank || '').trim(),
        whatsapp: String(body.whatsapp || '').trim()
      };
      localDatabase.paymentInfo = clean;

      if (supabase) {
        try {
          await supabase.from('settings').upsert({
            key: 'payment_info',
            value: clean,
            description: 'Datos de transferencia para la seña'
          }, { onConflict: 'key' });
        } catch (e) {
          console.warn('[Supabase] Aviso guardando payment_info:', e.message);
        }
      }

      try {
        const currentContent = await getSiteContentFull();
        currentContent.paymentInfo = clean;
        if (clean.whatsapp && currentContent.location) {
          currentContent.location.whatsappNumber = clean.whatsapp;
        }
        saveSiteContentLocal(currentContent);
      } catch (_) {}

      return sendJson(res, 200, { success: true, paymentInfo: clean });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 3. GET /api/services
  if (req.method === 'GET' && pathname === '/api/services') {
    const includeInactive = queryParams.get('all') === 'true';
    const content = await getSiteContentFull();
    const list = Array.isArray(content.services) ? content.services : localDatabase.services;
    const filtered = includeInactive ? list : list.filter(s => s.isActive !== false);
    return sendJson(res, 200, { services: filtered });
  }

  // 3b. GET /api/site-content (Todo el contenido editable de la web, precios, cursos y secciones)
  if (req.method === 'GET' && pathname === '/api/site-content') {
    try {
      const content = await getSiteContentFull();
      return sendJson(res, 200, { content });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 3c. PUT /api/site-content (Guardar cambios en precios, servicios, cursos, promos o secciones)
  if ((req.method === 'PUT' || req.method === 'POST') && pathname === '/api/site-content') {
    try {
      const body = await parseJsonBody(req);
      const payload = body.content || body;
      const saved = await saveSiteContentFull(payload);
      return sendJson(res, 200, { success: true, content: saved });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 3d. POST /api/site-content/reset (Restaurar una sección o todo el sitio a los valores originales)
  if (req.method === 'POST' && pathname === '/api/site-content/reset') {
    try {
      const body = await parseJsonBody(req);
      const section = body.section;
      const defaults = getDefaultSiteContent();
      let updated;
      if (section && defaults[section] !== undefined) {
        updated = await saveSiteContentFull({ [section]: defaults[section] });
      } else {
        updated = await saveSiteContentFull(defaults);
      }
      return sendJson(res, 200, { success: true, content: updated });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 4. GET /api/turnos/availability
  if (req.method === 'GET' && pathname === '/api/turnos/availability') {
    const date = queryParams.get('date');
    if (!date) {
      return sendJson(res, 400, { error: 'El parámetro ?date=YYYY-MM-DD es obligatorio.' });
    }

    const [pubMap, bookedAppts] = await Promise.all([
      getPublishedSchedulesMap(),
      getBookedTimesForDate(date)
    ]);

    const publishedDay = pubMap.days && pubMap.days[date];
    if (publishedDay && publishedDay.published !== false && Array.isArray(publishedDay.slots)) {
      const slots = publishedDay.slots.map(s => {
        const time = String(s.time || '').slice(0, 5);
        const autoBooked = isTimeOverlappingBooked(time, bookedAppts, 60);
        const crossedOut = !!s.crossedOut;
        return {
          time,
          crossedOut,
          autoBooked,
          available: !crossedOut && !autoBooked
        };
      });
      return sendJson(res, 200, { date, isPublished: true, slots });
    }

    const defaultSlots = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];
    const slots = defaultSlots.map(time => {
      const autoBooked = isTimeOverlappingBooked(time, bookedAppts, 90);
      return {
        time,
        crossedOut: false,
        autoBooked,
        available: !autoBooked
      };
    });

    return sendJson(res, 200, { date, isPublished: false, slots });
  }

  // 5. POST /api/turnos (Crear turno)
  if (req.method === 'POST' && pathname === '/api/turnos') {
    try {
      const body = await parseJsonBody(req);
      const { serviceId, serviceName, date, time, endTime, name, phone, email, notes, price, depositArs, depositReceipt } = body;

      if (!date || !time || !name || !phone) {
        return sendJson(res, 400, { error: 'Faltan campos requeridos (date, time, name, phone).' });
      }

      const cleanTime = String(time).slice(0, 5);
      const [pubMap, bookedAppts] = await Promise.all([
        getPublishedSchedulesMap(),
        getBookedTimesForDate(date)
      ]);

      // Validar si el horario está tachado manualmente o ya ocupado por otro turno activo
      const publishedDay = pubMap.days && pubMap.days[date];
      if (publishedDay && publishedDay.published !== false && Array.isArray(publishedDay.slots)) {
        const pubSlot = publishedDay.slots.find(s => String(s.time || '').slice(0, 5) === cleanTime);
        if (pubSlot && pubSlot.crossedOut) {
          return sendJson(res, 409, { error: 'Ese horario fue marcado como ocupado recientemente. Por favor elegí otro horario.' });
        }
      }
      if (isTimeOverlappingBooked(cleanTime, bookedAppts, 60)) {
        return sendJson(res, 409, { error: 'Ese horario acaba de ser reservado. Por favor elegí otro horario disponible.' });
      }

      const trimmedNotes = (notes || '').trim();
      const fullClientNotes = serviceName
        ? (trimmedNotes ? `Tratamiento: ${serviceName}\n${trimmedNotes}` : `Tratamiento: ${serviceName}`)
        : (trimmedNotes || null);

      let createdAppointment = null;

      if (supabase) {
        const crypto = require('crypto');
        const generatedId = crypto.randomUUID();
        // Formato para tabla appointments
        const appointmentRow = {
          id: generatedId,
          professional_id: '11111111-1111-1111-1111-111111111111',
          service_id: serviceId || '22222222-2222-2222-2222-222222222202',
          appointment_date: date,
          start_time: cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime,
          end_time: (endTime || '16:00').slice(0, 5) + ':00',
          price_ars: price || 34000,
          client_name: name,
          client_phone: phone,
          client_email: email || null,
          client_notes: fullClientNotes,
          deposit_ars: Number(depositArs) || Math.ceil(((Number(price) || 34000) * 0.2) / 100) * 100,
          deposit_receipt_url: depositReceipt,
          payment_method: 'transferencia',
          payment_status: 'pending',
          status: 'pending'
        };

        let { error } = await supabase
          .from('appointments')
          .insert(appointmentRow);

        // Compatibilidad si todavía no se ejecutó add-deposit-sena.sql
        if (error && /deposit_receipt_url/.test(error.message || '')) {
          const { deposit_receipt_url, ...legacyRow } = appointmentRow;
          legacyRow.client_notes = `${fullClientNotes || ''}\n[Seña $${appointmentRow.deposit_ars} - comprobante: ${depositReceipt}]`.trim();
          ({ error } = await supabase.from('appointments').insert(legacyRow));
        }

        if (error) {
          console.warn('[Supabase] Error al insertar turno:', error);
          // Fallback a memoria local
        } else {
          createdAppointment = { ...appointmentRow, service_name: serviceName || null, created_at: new Date().toISOString() };
        }
      }

      // Si no hay Supabase o falló la conexión, crear objeto local; en ambos casos persistir en localDatabase para lectura Admin sin service_role
      if (!createdAppointment) {
        createdAppointment = {
          id: 'turn_' + Date.now(),
          appointment_date: date,
          start_time: cleanTime,
          end_time: endTime || '16:00',
          price_ars: price || 34000,
          client_name: name,
          client_phone: phone,
          client_email: email || '',
          client_notes: fullClientNotes || '',
          service_name: serviceName || null,
          deposit_ars: Number(depositArs) || 0,
          deposit_receipt_url: depositReceipt,
          status: 'pending',
          created_at: new Date().toISOString()
        };
      }
      if (!localDatabase.appointments.some(a => a.id === createdAppointment.id)) {
        localDatabase.appointments.push(createdAppointment);
        saveAppointmentsData(localDatabase.appointments);
      }

      // Enviar email personalizado de reserva si la clienta ingresó su correo
      const reqOrigin = req.headers.origin || `http://${req.headers.host || `localhost:${port}`}`;
      let emailNotification = { skipped: true };
      if (email && String(email).includes('@')) {
        emailNotification = await mailer.sendAppointmentEmail({
          supabase,
          type: 'booking',
          appointment: {
            ...createdAppointment,
            serviceName: serviceName || null
          },
          baseUrl: reqOrigin
        });
      }

      return sendJson(res, 201, {
        success: true,
        appointment: createdAppointment,
        emailNotification,
        mode: supabase ? 'supabase' : 'local'
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 6. GET /api/turnos (Listado de turnos para clientas o admin)
  if (req.method === 'GET' && pathname === '/api/turnos') {
    const email = queryParams.get('email');
    const status = queryParams.get('status');

    let remoteRows = [];
    if (supabase) {
      let query = supabase.from('appointments').select('*, services(name)').order('appointment_date', { ascending: false }).order('start_time', { ascending: true });
      if (email) query = query.eq('client_email', email);
      if (status && status !== 'all') query = query.eq('status', status);

      let { data, error } = await query;
      if (error) {
        let fbQuery = supabase.from('appointments').select('*').order('appointment_date', { ascending: false });
        if (email) fbQuery = fbQuery.eq('client_email', email);
        if (status && status !== 'all') fbQuery = fbQuery.eq('status', status);
        const fbRes = await fbQuery;
        data = fbRes.data;
        error = fbRes.error;
      }
      if (!error && Array.isArray(data)) {
        remoteRows = data;
      }
    }

    let localRows = localDatabase.appointments || [];
    if (email) localRows = localRows.filter(a => a.client_email === email);
    if (status && status !== 'all') localRows = localRows.filter(a => a.status === status);

    const seenIds = new Set(remoteRows.map(r => String(r.id)));
    const combined = [...remoteRows];
    localRows.forEach(lr => {
      if (!seenIds.has(String(lr.id))) {
        combined.push(lr);
      }
    });
    return sendJson(res, 200, { appointments: combined, count: combined.length });
  }

  // 7. PATCH /api/turnos/:id (Actualizar estado de turno + enviar email personalizado al cancelar)
  if (req.method === 'PATCH' && pathname.startsWith('/api/turnos/')) {
    const id = pathname.replace('/api/turnos/', '');
    try {
      const body = await parseJsonBody(req);
      const newStatus = body.status;
      const cancelReason = body.cancelReason || '';
      const cancelledBy = body.cancelledBy || 'client';
      const reqOrigin = req.headers.origin || `http://${req.headers.host || `localhost:${port}`}`;

      if (!newStatus) {
        return sendJson(res, 400, { error: 'Se requiere el campo status.' });
      }

      if (supabase) {
        // Leer estado previo y datos completos (incluyendo nombre del servicio) antes de actualizar
        let prevRow = null;
        try {
          const prevRes = await supabase
            .from('appointments')
            .select('*, services(name)')
            .eq('id', id)
            .maybeSingle();
          if (prevRes.data) prevRow = prevRes.data;
        } catch (e) {}

        let { data, error } = await supabase
          .from('appointments')
          .update({
            status: newStatus,
            ...(newStatus === 'confirmed' ? { payment_status: 'partial' } : {}),
            ...(newStatus === 'cancelled' && cancelReason ? { internal_notes: cancelReason } : {})
          })
          .eq('id', id)
          .select('*, services(name)');

        if (error) {
          const fallbackUpd = await supabase
            .from('appointments')
            .update({ status: newStatus })
            .eq('id', id)
            .select('*');
          data = fallbackUpd.data;
          error = fallbackUpd.error;
        }

        if (!error && data && data.length > 0) {
          const updatedRow = data[0];
          let emailNotification = { skipped: true };
          if (newStatus === 'cancelled' && (!prevRow || prevRow.status !== 'cancelled') && updatedRow.client_email) {
            emailNotification = await mailer.sendAppointmentEmail({
              supabase,
              type: 'cancellation',
              appointment: updatedRow,
              baseUrl: reqOrigin,
              extra: { cancelReason, cancelledBy }
            });
          }
          return sendJson(res, 200, { success: true, appointment: updatedRow, emailNotification });
        }
      }

      const found = localDatabase.appointments.find(a => a.id === id);
      if (found) {
        const wasCancelled = found.status === 'cancelled';
        found.status = newStatus;
        saveAppointmentsData(localDatabase.appointments);
        let emailNotification = { skipped: true };
        if (newStatus === 'cancelled' && !wasCancelled && found.client_email) {
          emailNotification = await mailer.sendAppointmentEmail({
            supabase,
            type: 'cancellation',
            appointment: found,
            baseUrl: reqOrigin,
            extra: { cancelReason, cancelledBy }
          });
        }
        return sendJson(res, 200, { success: true, appointment: found, emailNotification });
      }

      return sendJson(res, 404, { error: 'Turno no encontrado.' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 7a. DELETE /api/turnos/cancelled (Eliminar todos los turnos cancelados en bloque)
  if (req.method === 'DELETE' && (pathname === '/api/turnos/cancelled' || (pathname === '/api/turnos' && queryParams.get('status') === 'cancelled'))) {
    try {
      let deletedCount = 0;
      if (supabase) {
        const { data, error } = await supabase
          .from('appointments')
          .delete()
          .eq('status', 'cancelled')
          .select('id');
        if (!error && Array.isArray(data)) {
          deletedCount = data.length;
        }
      }
      const beforeCount = localDatabase.appointments.length;
      localDatabase.appointments = localDatabase.appointments.filter(a => a.status !== 'cancelled');
      saveAppointmentsData(localDatabase.appointments);
      const localRemoved = beforeCount - localDatabase.appointments.length;
      return sendJson(res, 200, {
        success: true,
        deletedCount: Math.max(deletedCount, localRemoved)
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 7a-2. DELETE /api/turnos/:id (Eliminar un turno específico de forma permanente)
  if (req.method === 'DELETE' && /^\/api\/turnos\/[^/]+$/.test(pathname) && pathname !== '/api/turnos/cancelled') {
    const id = decodeURIComponent(pathname.replace('/api/turnos/', ''));
    try {
      let deletedFromDb = false;
      if (supabase) {
        const { error } = await supabase
          .from('appointments')
          .delete()
          .eq('id', id);
        if (!error) {
          deletedFromDb = true;
        }
      }
      const beforeCount = localDatabase.appointments.length;
      localDatabase.appointments = localDatabase.appointments.filter(a => a.id !== id && a.supabaseId !== id);
      saveAppointmentsData(localDatabase.appointments);
      const deletedLocal = localDatabase.appointments.length < beforeCount;

      return sendJson(res, 200, {
        success: true,
        id,
        deleted: deletedFromDb || deletedLocal
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 7b. POST /api/turnos/:id/resend-email (Reenviar email personalizado de reserva o cancelación)
  if (req.method === 'POST' && /^\/api\/turnos\/[^/]+\/resend-email$/.test(pathname)) {
    const id = pathname.split('/')[3];
    try {
      const body = await parseJsonBody(req);
      const reqOrigin = req.headers.origin || `http://${req.headers.host || `localhost:${port}`}`;

      let targetRow = null;
      if (supabase) {
        const { data } = await supabase
          .from('appointments')
          .select('*, services(name)')
          .eq('id', id)
          .maybeSingle();
        if (data) targetRow = data;
      }
      if (!targetRow) {
        targetRow = localDatabase.appointments.find(a => a.id === id) || null;
      }
      if (!targetRow) {
        return sendJson(res, 404, { error: 'Turno no encontrado.' });
      }
      if (!targetRow.client_email) {
        return sendJson(res, 400, { error: 'Este turno no tiene un correo electrónico asociado.' });
      }

      const emailType = body.type || (targetRow.status === 'cancelled' ? 'cancellation' : 'booking');
      const emailNotification = await mailer.sendAppointmentEmail({
        supabase,
        type: emailType,
        appointment: targetRow,
        baseUrl: reqOrigin,
        extra: { forceSend: true, cancelReason: targetRow.internal_notes || targetRow.admin_notes || '' }
      });

      return sendJson(res, 200, { success: true, emailNotification });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 8. POST /api/courses/enroll (Inscripción a cursos)
  if (req.method === 'POST' && pathname === '/api/courses/enroll') {
    try {
      const body = await parseJsonBody(req);
      const { courseId, studentName, studentPhone, studentEmail, notes } = body;

      if (!studentName || !studentPhone || !studentEmail) {
        return sendJson(res, 400, { error: 'Faltan datos de la alumna.' });
      }

      if (supabase) {
        const { data, error } = await supabase
          .from('course_enrollments')
          .insert({
            course_id: courseId || '33333333-3333-3333-3333-333333333301',
            student_name: studentName,
            student_phone: studentPhone,
            student_email: studentEmail,
            notes: notes || null
          })
          .select()
          .single();

        if (!error && data) {
          return sendJson(res, 201, { success: true, enrollment: data });
        }
      }

      const localEnrollment = {
        id: 'enr_' + Date.now(),
        course_id: courseId,
        student_name: studentName,
        student_phone: studentPhone,
        student_email: studentEmail,
        created_at: new Date().toISOString()
      };
      localDatabase.enrollments.push(localEnrollment);
      return sendJson(res, 201, { success: true, enrollment: localEnrollment });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 9. GET /api/gallery (Listado de fotos de ejemplo para la web)
  if (req.method === 'GET' && pathname === '/api/gallery') {
    if (!localDatabase.gallery || localDatabase.gallery.length === 0) {
      localDatabase.gallery = loadGalleryData();
    }
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('gallery_photos')
          .select('*')
          .order('sort_order', { ascending: true });

        if (!error && data && data.length > 0) {
          const hasLegacyBrokenPaths = data.some(r => {
            const u = String(r.image_url || '');
            return u.startsWith('images/ej-') || u.startsWith('images/mica-');
          });
          if (!hasLegacyBrokenPaths) {
            const mapped = data.map(row => ({
              id: row.id,
              title: row.title,
              badge: row.badge,
              category: row.category,
              description: row.description,
              imageUrl: row.image_url,
              isFeatured: row.is_featured,
              isHero: row.is_hero,
              sortOrder: row.sort_order
            }));
            // Combinar con todas las fotos reales de gallery-data.json para que siempre estén las 11 obras completas
            const existingUrls = new Set(mapped.map(p => String(p.imageUrl || '').split('?')[0]));
            localDatabase.gallery.forEach(lp => {
              const baseLp = String(lp.imageUrl || '').split('?')[0];
              if (baseLp && !existingUrls.has(baseLp)) {
                mapped.push(lp);
                existingUrls.add(baseLp);
              }
            });
            return sendJson(res, 200, { photos: mapped });
          }
        }
      } catch (e) {
        console.warn('[Supabase] Error consultando gallery_photos:', e.message);
      }
    }
    return sendJson(res, 200, { photos: localDatabase.gallery });
  }

  // 9b. POST /api/receipts/upload (Comprobante de seña -> bucket privado 'receipts')
  if (req.method === 'POST' && pathname === '/api/receipts/upload') {
    try {
      const body = await parseJsonBody(req);
      if (!body.data || !body.path) {
        return sendJson(res, 400, { error: 'Faltan datos del comprobante.' });
      }
      const safePath = String(body.path).replace(/[^a-zA-Z0-9/_.-]/g, '').replace(/\.\.+/g, '.').replace(/^\/+/, '');
      const contentType = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(body.contentType || '')
        ? body.contentType
        : 'image/jpeg';
      const buffer = Buffer.from(String(body.data).replace(/^data:[^;]+;base64,/, ''), 'base64');

      if (supabase) {
        await supabase.storage.createBucket('receipts', { public: false, fileSizeLimit: 8 * 1024 * 1024 }).catch(() => {});
        const { error } = await supabase.storage.from('receipts').upload(safePath, buffer, { contentType, upsert: false });
        if (error) return sendJson(res, 500, { error: error.message });
        return sendJson(res, 201, { success: true, path: safePath });
      }

      // Sin Supabase: guardar localmente si el disco es escribible; en Vercel devolver data URL
      try {
        const localDir = path.join(dir, 'receipts', path.dirname(safePath));
        fs.mkdirSync(localDir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'receipts', safePath), buffer);
        return sendJson(res, 201, { success: true, path: safePath });
      } catch (fsErr) {
        return sendJson(res, 201, { success: true, path: String(body.data) });
      }
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 9c. GET /api/receipts/signed?path= (URL temporal para que la admin vea el comprobante)
  if (req.method === 'GET' && pathname === '/api/receipts/signed') {
    const receiptPath = queryParams.get('path');
    if (!receiptPath) return sendJson(res, 400, { error: 'Falta path.' });
    if (/^https?:|^data:/.test(receiptPath)) return sendJson(res, 200, { url: receiptPath });
    if (!supabase) return sendJson(res, 404, { error: 'Supabase no configurado.' });
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(receiptPath, 3600);
    if (error || !data) return sendJson(res, 404, { error: error ? error.message : 'No encontrado' });
    return sendJson(res, 200, { url: data.signedUrl });
  }

  // 10. POST /api/gallery/upload (Subir archivo de imagen a Supabase Storage + respaldo local o DataURL en serverless)
  if (req.method === 'POST' && pathname === '/api/gallery/upload') {
    try {
      const body = await parseJsonBody(req);
      if (!body.data) {
        return sendJson(res, 400, { error: 'Falta la imagen codificada en Base64 (body.data).' });
      }

      const mimeMatch = String(body.data).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
      const detectedMime = mimeMatch ? mimeMatch[1].toLowerCase() : 'image/jpeg';
      const rawBase64 = String(body.data).replace(/^data:image\/[^;]+;base64,/, '');
      const buffer = Buffer.from(rawBase64, 'base64');

      let ext = '.jpg';
      if (detectedMime === 'image/png') ext = '.png';
      else if (detectedMime === 'image/webp') ext = '.webp';
      else if (detectedMime === 'image/gif') ext = '.gif';
      else if (body.filename) {
        const parsedExt = path.extname(body.filename).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(parsedExt)) {
          ext = parsedExt;
        }
      }

      const contentTypeMap = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
      };
      const contentType = contentTypeMap[ext] || 'image/jpeg';

      const origBase = body.filename ? path.basename(body.filename, path.extname(body.filename)) : 'foto';
      const safeBase = (origBase || 'foto')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40) || 'foto';
      const filename = `ej-${Date.now()}-${safeBase}${ext}`;

      let localSaved = false;
      const localUrl = `images/uploads/${filename}`;
      try {
        if (!process.env.VERCEL) {
          const uploadsDir = path.join(dir, 'images', 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const targetPath = path.join(uploadsDir, filename);
          fs.writeFileSync(targetPath, buffer);
          localSaved = true;
        }
      } catch (fsErr) {
        console.warn('[Upload] Disco de solo lectura (serverless):', fsErr.message);
      }

      let finalUrl = localSaved ? localUrl : String(body.data);
      let storageMode = localSaved ? 'local' : 'inline';

      // Subir a Supabase Storage (URL pública permanente en CDN)
      if (supabase) {
        try {
          const bucketOk = await ensureGalleryBucket();
          if (bucketOk) {
            const { error: upErr } = await supabase.storage
              .from('gallery')
              .upload(filename, buffer, {
                contentType,
                cacheControl: '31536000',
                upsert: true
              });

            if (!upErr) {
              const { data: pubData } = supabase.storage.from('gallery').getPublicUrl(filename);
              if (pubData && pubData.publicUrl) {
                finalUrl = pubData.publicUrl;
                storageMode = 'supabase';
              }
            } else {
              console.warn('[Storage] Aviso al subir imagen a Supabase:', upErr.message);
            }
          }
        } catch (storageErr) {
          console.warn('[Storage] Excepción subiendo imagen:', storageErr.message);
        }
      }

      return sendJson(res, 201, {
        success: true,
        url: finalUrl,
        localUrl,
        storage: storageMode,
        filename
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 11. POST /api/gallery (Crear nueva foto de ejemplo)
  if (req.method === 'POST' && pathname === '/api/gallery') {
    try {
      const body = await parseJsonBody(req);
      const { title, badge, category, description, imageUrl, isFeatured, isHero, sortOrder } = body;

      if (!title || !imageUrl) {
        return sendJson(res, 400, { error: 'Título e imagen son obligatorios.' });
      }

      let created = null;

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('gallery_photos')
            .insert({
              title,
              badge: badge || 'Look Más Pedido',
              category: category || 'volumen',
              description: description || '',
              image_url: imageUrl,
              is_featured: !!isFeatured,
              is_hero: !!isHero,
              sort_order: sortOrder || (localDatabase.gallery.length + 1)
            })
            .select()
            .single();

          if (!error && data) {
            created = {
              id: data.id,
              title: data.title,
              badge: data.badge,
              category: data.category,
              description: data.description,
              imageUrl: data.image_url,
              isFeatured: data.is_featured,
              isHero: data.is_hero,
              sortOrder: data.sort_order
            };
          }
        } catch (e) {
          console.warn('[Supabase] Error insertando en gallery_photos:', e.message);
        }
      }

      if (!created) {
        created = {
          id: 'photo_' + Date.now(),
          title,
          badge: badge || 'Look Más Pedido',
          category: category || 'volumen',
          description: description || '',
          imageUrl,
          isFeatured: !!isFeatured,
          isHero: !!isHero,
          sortOrder: sortOrder || (localDatabase.gallery.length + 1)
        };
      }

      localDatabase.gallery.push(created);
      saveGalleryData(localDatabase.gallery);

      return sendJson(res, 201, { success: true, photo: created });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 12. PUT /api/gallery/:id (Actualizar foto de ejemplo existente)
  if ((req.method === 'PUT' || req.method === 'PATCH') && pathname.startsWith('/api/gallery/')) {
    const id = pathname.replace('/api/gallery/', '');
    try {
      const body = await parseJsonBody(req);
      let updated = null;

      if (supabase) {
        try {
          const updateObj = {};
          if (body.title !== undefined) updateObj.title = body.title;
          if (body.badge !== undefined) updateObj.badge = body.badge;
          if (body.category !== undefined) updateObj.category = body.category;
          if (body.description !== undefined) updateObj.description = body.description;
          if (body.imageUrl !== undefined) updateObj.image_url = body.imageUrl;
          if (body.isFeatured !== undefined) updateObj.is_featured = body.isFeatured;
          if (body.isHero !== undefined) updateObj.is_hero = body.isHero;
          if (body.sortOrder !== undefined) updateObj.sort_order = body.sortOrder;

          const { data, error } = await supabase
            .from('gallery_photos')
            .update(updateObj)
            .eq('id', id)
            .select();

          if (!error && data && data.length > 0) {
            const row = data[0];
            updated = {
              id: row.id,
              title: row.title,
              badge: row.badge,
              category: row.category,
              description: row.description,
              imageUrl: row.image_url,
              isFeatured: row.is_featured,
              isHero: row.is_hero,
              sortOrder: row.sort_order
            };
          }
        } catch (e) {
          console.warn('[Supabase] Error actualizando gallery_photos:', e.message);
        }
      }

      const idx = localDatabase.gallery.findIndex(p => p.id === id);
      if (idx !== -1) {
        localDatabase.gallery[idx] = {
          ...localDatabase.gallery[idx],
          ...body,
          id // garantizar id constante
        };
        saveGalleryData(localDatabase.gallery);
        if (!updated) updated = localDatabase.gallery[idx];
      }

      if (updated) {
        return sendJson(res, 200, { success: true, photo: updated });
      }

      return sendJson(res, 404, { error: 'Foto de ejemplo no encontrada' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 13. DELETE /api/gallery/:id (Eliminar foto de ejemplo)
  if (req.method === 'DELETE' && pathname.startsWith('/api/gallery/')) {
    const id = pathname.replace('/api/gallery/', '');
    try {
      if (supabase) {
        try {
          await supabase.from('gallery_photos').delete().eq('id', id);
        } catch (e) {
          console.warn('[Supabase] Error borrando de gallery_photos:', e.message);
        }
      }

      localDatabase.gallery = localDatabase.gallery.filter(p => p.id !== id);
      saveGalleryData(localDatabase.gallery);

      return sendJson(res, 200, { success: true, id });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 14. POST /api/gallery/reset (Restablecer a las fotos originales de la carpeta fotos/)
  if (req.method === 'POST' && pathname === '/api/gallery/reset') {
    try {
      const defaultPhotos = [
  {
    "id": "nahi_nail_1",
    "title": "Crimson French & Tattoo",
    "badge": "Cara A · Nail Art de Autor",
    "category": "nails",
    "description": "Almendradas con french rojo carmesí profundo en diálogo con tatuaje ornamental de muñeca.",
    "imageUrl": "fotos/imgi_25_539976307_17854872333514079_3988514524600607766_n.webp?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": true,
    "sortOrder": 1
  },
  {
    "id": "nahi_nail_2",
    "title": "Sculpted 3D & Perlas",
    "badge": "Cara A · Relieve Escultórico",
    "category": "nails",
    "description": "Diseño escultórico con volumen metálico dorado, perlas y detalles marinos sobre base lechosa.",
    "imageUrl": "fotos/imgi_22_504060229_17842497063514079_4107614235171648365_n.webp?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": true,
    "sortOrder": 2
  },
  {
    "id": "nahi_nail_3",
    "title": "Reflective Obsidian Glitter",
    "badge": "Cara A · Destello Reflectivo",
    "category": "nails",
    "description": "Glitter reflectivo oscuro con destellos plateados en forma almendra.",
    "imageUrl": "fotos/imgi_6_928715819_1678752167229555_3258636658814047340_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": true,
    "sortOrder": 3
  },
  {
    "id": "nahi_nail_4",
    "title": "Chrome Animal Print Coffin",
    "badge": "Cara A · Estructura Coffin",
    "category": "nails",
    "description": "Base metálica champagne con diseño animal print en negro intenso sobre estructura coffin.",
    "imageUrl": "fotos/imgi_9_857436431_17930539812514079_2849828327181330972_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": false,
    "sortOrder": 4
  },
  {
    "id": "nahi_nail_5",
    "title": "Editorial French & Red",
    "badge": "Cara A · French Clásico",
    "category": "nails",
    "description": "French clásico reinterpretado con líneas orgánicas y acento rojo carmesí.",
    "imageUrl": "fotos/imgi_31_628792993_17875531770514079_7101006345959160330_n.webp?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": false,
    "sortOrder": 5
  },
  {
    "id": "nahi_nail_6",
    "title": "Gothic Chrome & Studs",
    "badge": "Cara A · Nail Art de Autor",
    "category": "nails",
    "description": "Nail art negro profundo con lettering gótico, tachas metálicas y líneas cromadas.",
    "imageUrl": "fotos/imgi_13_861911954_1131761712629862_1954115592653772609_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": false,
    "sortOrder": 6
  },
  {
    "id": "nahi_tattoo_1",
    "title": "Cupido Blackwork & Puntillismo",
    "badge": "Cara B · Blackwork",
    "category": "tattoo",
    "description": "Cupido clásico en clave blackwork con sombreado de arrastre y puntillismo de alta definición.",
    "imageUrl": "fotos/imgi_28_771909433_18096793385269189_6790519837572543665_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": true,
    "sortOrder": 7
  },
  {
    "id": "nahi_tattoo_2",
    "title": "León Oriental Fu Dog & Geometría",
    "badge": "Cara B · Proyecto a Medida",
    "category": "tattoo",
    "description": "Pieza de pecho a gran escala: guardián oriental con líneas sólidas y esfera de geometría sagrada.",
    "imageUrl": "fotos/imgi_18_831313350_18104431136269189_151488612152529768_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": true,
    "sortOrder": 8
  },
  {
    "id": "nahi_tattoo_3",
    "title": "Lettering Distorsión — Viejo Karma",
    "badge": "Cara B · Lettering",
    "category": "tattoo",
    "description": "Tipografía experimental con efecto onda y firma caligráfica en tinta negra intensa.",
    "imageUrl": "fotos/imgi_11_902024821_18111104054269189_4890881016085880301_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": true,
    "sortOrder": 9
  },
  {
    "id": "nahi_tattoo_4",
    "title": "Fine Line & Caligrafía Infinito",
    "badge": "Cara B · Fine Line",
    "category": "tattoo",
    "description": "Trazo fino caligráfico con destellos astrales, micro-luna y línea ornamental.",
    "imageUrl": "fotos/imgi_15_846504117_18106174985269189_2305949659410720467_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": false,
    "sortOrder": 10
  },
  {
    "id": "nahi_tattoo_5",
    "title": "Femme Spots — Botánico Ornamental",
    "badge": "Cara B · Botánico",
    "category": "tattoo",
    "description": "Diseño botánico simétrico de trazo delicado adaptado a la anatomía del esternón.",
    "imageUrl": "fotos/imgi_10_832478316_1138317815289557_8357992302156346057_n.jpg?v=2",
    "mediaType": "image",
    "isFeatured": true,
    "isHero": false,
    "sortOrder": 11
  }
];

      if (supabase) {
        try {
          const defaultIds = defaultPhotos.map(p => p.id);
          await supabase.from('gallery_photos').delete().not('id', 'in', `(${defaultIds.join(',')})`);
          const rows = defaultPhotos.map(p => ({
            id: p.id,
            title: p.title,
            badge: p.badge,
            category: p.category,
            description: p.description,
            image_url: p.imageUrl,
            is_featured: p.isFeatured,
            is_hero: p.isHero,
            sort_order: p.sortOrder
          }));
          await supabase.from('gallery_photos').upsert(rows, { onConflict: 'id' });
        } catch (e) {
          console.warn('[Supabase] Error restableciendo gallery_photos:', e.message);
        }
      }

      localDatabase.gallery = defaultPhotos;
      saveGalleryData(defaultPhotos);

      return sendJson(res, 200, { success: true, photos: defaultPhotos });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 15. GET /api/schedule (Horarios semanales de trabajo)
  if (req.method === 'GET' && pathname === '/api/schedule') {
    const profId = '11111111-1111-1111-1111-111111111111';
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('weekly_schedule')
          .select('*')
          .eq('professional_id', profId)
          .order('day_of_week', { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          return sendJson(res, 200, { schedule: data });
        }
      } catch (e) {
        console.warn('[Supabase] Error consultando weekly_schedule:', e.message);
      }
    }

    const fallbackSchedule = [1, 2, 3, 4, 5, 6].map(d => ({
      professional_id: profId,
      day_of_week: d,
      start_time: '10:00:00',
      end_time: d === 6 ? '18:00:00' : '19:00:00',
      break_start: '13:00:00',
      break_end: '14:00:00',
      slot_duration_min: 60,
      is_active: true
    }));
    return sendJson(res, 200, { schedule: localDatabase.schedule || fallbackSchedule });
  }

  // 16. PUT /api/schedule (Guardar horarios semanales de trabajo)
  if (req.method === 'PUT' && pathname === '/api/schedule') {
    try {
      const body = await parseJsonBody(req);
      const days = Array.isArray(body.days) ? body.days : [];
      const profId = '11111111-1111-1111-1111-111111111111';

      const rows = days.map(item => ({
        professional_id: profId,
        day_of_week: Number(item.day_of_week),
        is_active: !!item.is_active,
        start_time: (item.start_time || '10:00').slice(0, 5) + ':00',
        end_time: (item.end_time || '19:00').slice(0, 5) + ':00',
        break_start: item.break_start ? item.break_start.slice(0, 5) + ':00' : null,
        break_end: item.break_end ? item.break_end.slice(0, 5) + ':00' : null,
        slot_duration_min: Number(item.slot_duration_min) || 60
      }));

      localDatabase.schedule = rows;

      if (supabase && rows.length > 0) {
        const { error } = await supabase
          .from('weekly_schedule')
          .upsert(rows, { onConflict: 'professional_id,day_of_week' });
        if (error) {
          console.warn('[Supabase] Error guardando weekly_schedule:', error.message);
          return sendJson(res, 500, { error: error.message });
        }
      }

      return sendJson(res, 200, { success: true, schedule: rows });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 17. GET /api/instagram/slots?date=YYYY-MM-DD&interval=60 (Horarios para Historia de Instagram estilo Vasca)
  if (req.method === 'GET' && pathname === '/api/instagram/slots') {
    const dateValue = queryParams.get('date');
    const intervalParam = queryParams.get('interval') || '60';
    if (!dateValue) {
      return sendJson(res, 400, { error: 'Se requiere ?date=YYYY-MM-DD' });
    }

    const timeToMin = (t) => {
      if (!t) return 0;
      const [hh, mm] = String(t).split(':').map(Number);
      return (hh || 0) * 60 + (mm || 0);
    };
    const minToTime = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

    const profId = '11111111-1111-1111-1111-111111111111';
    const dayOfWeek = new Date(`${dateValue}T12:00:00`).getDay();

    let schedRow = null;
    let bookedAppts = [];
    let isBlocked = false;

    if (supabase) {
      try {
        const [schedRes, apptRes, blockRes] = await Promise.all([
          supabase.from('weekly_schedule').select('*').eq('professional_id', profId).eq('day_of_week', dayOfWeek).maybeSingle(),
          supabase.from('appointments').select('start_time,end_time').eq('appointment_date', dateValue).neq('status', 'cancelled'),
          supabase.from('blocked_dates').select('id').eq('blocked_date', dateValue)
        ]);

        if (blockRes.data && blockRes.data.length > 0) {
          isBlocked = true;
        }
        if (schedRes.data) {
          schedRow = schedRes.data;
        }
        if (Array.isArray(apptRes.data)) {
          bookedAppts = apptRes.data;
        }
      } catch (e) {
        console.warn('[Supabase] Error en /api/instagram/slots:', e.message);
      }
    } else {
      bookedAppts = localDatabase.appointments
        .filter(a => (a.appointment_date === dateValue || a.date === dateValue) && a.status !== 'cancelled')
        .map(a => ({ start_time: a.start_time || a.time, end_time: a.end_time || a.endTime || '11:30' }));
    }

    const forceGenerate = queryParams.get('forceGenerate') === '1' || queryParams.get('forceGenerate') === 'true';
    const pubMap = await getPublishedSchedulesMap();
    const publishedDay = pubMap.days && pubMap.days[dateValue];
    const crossedByTime = {};
    if (publishedDay && Array.isArray(publishedDay.slots)) {
      publishedDay.slots.forEach(s => {
        if (s && s.time) crossedByTime[String(s.time).slice(0, 5)] = !!s.crossedOut;
      });
    }

    if (!forceGenerate && publishedDay && publishedDay.published !== false && Array.isArray(publishedDay.slots) && publishedDay.slots.length > 0) {
      const mergedSlots = publishedDay.slots.map(s => {
        const t = String(s.time || '').slice(0, 5);
        const autoBooked = isTimeOverlappingBooked(t, bookedAppts, 60);
        const crossedOut = !!s.crossedOut;
        return {
          time: t,
          crossedOut,
          autoBooked,
          isBooked: crossedOut || autoBooked
        };
      });
      return sendJson(res, 200, {
        slots: mergedSlots,
        isPublished: true,
        updatedAt: publishedDay.updatedAt || null,
        isBlocked: false,
        noSchedule: false
      });
    }

    if (isBlocked) {
      return sendJson(res, 200, { slots: [], isPublished: false, isBlocked: true, noSchedule: false });
    }

    if (!schedRow) {
      if (dayOfWeek === 0) {
        return sendJson(res, 200, { slots: [], isPublished: false, isBlocked: false, noSchedule: true });
      }
      schedRow = {
        is_active: true,
        start_time: '10:00:00',
        end_time: dayOfWeek === 6 ? '18:00:00' : '19:00:00',
        break_start: '13:00:00',
        break_end: '14:00:00'
      };
    }

    if (!schedRow.is_active) {
      return sendJson(res, 200, { slots: [], isPublished: false, isBlocked: false, noSchedule: true });
    }

    const slots = [];
    if (intervalParam === 'studio') {
      const studioTimes = ['10:00', '11:30', '14:00', '15:30', '17:00', '18:30'];
      const endMin = timeToMin(schedRow.end_time);
      for (const t of studioTimes) {
        const sStart = timeToMin(t);
        if (sStart >= endMin) continue;
        const sEnd = sStart + 90;
        const autoBooked = bookedAppts.some(appt => {
          const aStart = timeToMin(appt.start_time);
          const aEnd = appt.end_time ? timeToMin(appt.end_time) : aStart + 90;
          return sStart < aEnd && sEnd > aStart;
        });
        const crossedOut = !!crossedByTime[t];
        slots.push({ time: t, crossedOut, autoBooked, isBooked: crossedOut || autoBooked });
      }
    } else {
      const duration = Math.max(30, parseInt(intervalParam, 10) || 60);
      let current = timeToMin(schedRow.start_time);
      const end = timeToMin(schedRow.end_time);
      const breakStart = schedRow.break_start ? timeToMin(schedRow.break_start) : null;
      const breakEnd = schedRow.break_end ? timeToMin(schedRow.break_end) : null;

      while (current + duration <= end) {
        const slotStart = current;
        const slotEnd = current + duration;

        if (breakStart !== null && breakEnd !== null && slotStart < breakEnd && slotEnd > breakStart) {
          current = breakEnd;
          continue;
        }

        const timeStr = minToTime(slotStart);
        const autoBooked = bookedAppts.some(appt => {
          const apptStart = timeToMin(appt.start_time);
          const apptEnd = appt.end_time ? timeToMin(appt.end_time) : apptStart + duration;
          return slotStart < apptEnd && slotEnd > apptStart;
        });
        const crossedOut = !!crossedByTime[timeStr];

        slots.push({ time: timeStr, crossedOut, autoBooked, isBooked: crossedOut || autoBooked });
        current += duration;
      }
    }

    return sendJson(res, 200, { slots, isPublished: Boolean(publishedDay && publishedDay.published !== false), isBlocked: false, noSchedule: false });
  }

  // 18. GET /api/published-schedules (Consultar horarios subidos por el admin para web pública y panel)
  if (req.method === 'GET' && pathname === '/api/published-schedules') {
    const singleDate = queryParams.get('date');
    const onlyUpcoming = queryParams.get('upcoming') !== 'false';
    const pubMap = await getPublishedSchedulesMap();
    const allDaysObj = pubMap.days || {};

    if (singleDate) {
      const dayEntry = allDaysObj[singleDate];
      if (!dayEntry || dayEntry.published === false) {
        return sendJson(res, 200, { date: singleDate, isPublished: false, slots: [] });
      }
      const bookedAppts = await getBookedTimesForDate(singleDate);
      const enrichedSlots = (dayEntry.slots || []).map(s => {
        const t = String(s.time || '').slice(0, 5);
        const autoBooked = isTimeOverlappingBooked(t, bookedAppts, 60);
        const crossedOut = !!s.crossedOut;
        return { time: t, crossedOut, autoBooked, isBooked: crossedOut || autoBooked };
      });
      return sendJson(res, 200, {
        date: singleDate,
        isPublished: true,
        updatedAt: dayEntry.updatedAt || null,
        slots: enrichedSlots
      });
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const datesList = Object.keys(allDaysObj)
      .filter(d => allDaysObj[d] && allDaysObj[d].published !== false && Array.isArray(allDaysObj[d].slots) && allDaysObj[d].slots.length > 0)
      .filter(d => !onlyUpcoming || d >= todayStr)
      .sort();

    let apptsByDate = {};
    if (datesList.length > 0) {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('appointments')
            .select('appointment_date,start_time,end_time')
            .in('appointment_date', datesList)
            .neq('status', 'cancelled');
          if (Array.isArray(data)) {
            data.forEach(r => {
              if (!apptsByDate[r.appointment_date]) apptsByDate[r.appointment_date] = [];
              apptsByDate[r.appointment_date].push(r);
            });
          }
        } catch (e) {}
      } else {
        localDatabase.appointments.forEach(a => {
          const d = a.appointment_date || a.date;
          if (datesList.includes(d) && a.status !== 'cancelled') {
            if (!apptsByDate[d]) apptsByDate[d] = [];
            apptsByDate[d].push({ start_time: a.start_time || a.time, end_time: a.end_time || a.endTime || '' });
          }
        });
      }
    }

    const daysResult = datesList.map(d => {
      const entry = allDaysObj[d];
      const dayBooked = apptsByDate[d] || [];
      const slots = (entry.slots || []).map(s => {
        const t = String(s.time || '').slice(0, 5);
        const autoBooked = isTimeOverlappingBooked(t, dayBooked, 60);
        const crossedOut = !!s.crossedOut;
        return { time: t, crossedOut, autoBooked, isBooked: crossedOut || autoBooked };
      });
      return {
        date: d,
        isPublished: true,
        updatedAt: entry.updatedAt || null,
        slots
      };
    });

    return sendJson(res, 200, { days: daysResult });
  }

  // 19. PUT /api/published-schedules (Subir / publicar horarios de un día desde Admin)
  if (req.method === 'PUT' && pathname === '/api/published-schedules') {
    try {
      const body = await parseJsonBody(req);
      const date = body.date;
      const rawSlots = Array.isArray(body.slots) ? body.slots : [];

      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return sendJson(res, 400, { error: 'Fecha inválida (formato requerido YYYY-MM-DD).' });
      }

      const seen = new Set();
      const normalizedSlots = [];
      rawSlots.forEach(item => {
        const time = String(typeof item === 'string' ? item : (item.time || '')).trim().slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(time) && !seen.has(time)) {
          seen.add(time);
          normalizedSlots.push({
            time,
            crossedOut: Boolean(item && item.crossedOut)
          });
        }
      });

      normalizedSlots.sort((a, b) => a.time.localeCompare(b.time));

      const pubMap = await getPublishedSchedulesMap();
      if (!pubMap.days) pubMap.days = {};

      pubMap.days[date] = {
        date,
        published: true,
        updatedAt: new Date().toISOString(),
        slots: normalizedSlots
      };

      await savePublishedSchedulesMap(pubMap);

      const bookedAppts = await getBookedTimesForDate(date);
      const enrichedSlots = normalizedSlots.map(s => {
        const autoBooked = isTimeOverlappingBooked(s.time, bookedAppts, 60);
        return {
          time: s.time,
          crossedOut: s.crossedOut,
          autoBooked,
          isBooked: s.crossedOut || autoBooked
        };
      });

      return sendJson(res, 200, {
        success: true,
        date,
        isPublished: true,
        updatedAt: pubMap.days[date].updatedAt,
        slots: enrichedSlots
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 20. PATCH /api/published-schedules/toggle (Tachar o habilitar un horario en tiempo real)
  if (req.method === 'PATCH' && pathname === '/api/published-schedules/toggle') {
    try {
      const body = await parseJsonBody(req);
      const { date, time, crossedOut, fallbackSlots } = body;
      const cleanTime = String(time || '').trim().slice(0, 5);

      if (!date || !/^\d{2}:\d{2}$/.test(cleanTime)) {
        return sendJson(res, 400, { error: 'Se requieren date (YYYY-MM-DD) y time (HH:MM).' });
      }

      const pubMap = await getPublishedSchedulesMap();
      if (!pubMap.days) pubMap.days = {};

      if (!pubMap.days[date] || !Array.isArray(pubMap.days[date].slots) || pubMap.days[date].slots.length === 0) {
        const baseList = Array.isArray(fallbackSlots) && fallbackSlots.length > 0
          ? fallbackSlots.map(s => ({
              time: String(s.time || s).slice(0, 5),
              crossedOut: Boolean(s.crossedOut)
            }))
          : [{ time: cleanTime, crossedOut: false }];
        pubMap.days[date] = {
          date,
          published: true,
          updatedAt: new Date().toISOString(),
          slots: baseList
        };
      }

      const targetDay = pubMap.days[date];
      const existingSlot = targetDay.slots.find(s => s.time === cleanTime);
      if (existingSlot) {
        existingSlot.crossedOut = typeof crossedOut === 'boolean' ? crossedOut : !existingSlot.crossedOut;
      } else {
        targetDay.slots.push({
          time: cleanTime,
          crossedOut: typeof crossedOut === 'boolean' ? crossedOut : true
        });
        targetDay.slots.sort((a, b) => a.time.localeCompare(b.time));
      }
      targetDay.published = true;
      targetDay.updatedAt = new Date().toISOString();

      await savePublishedSchedulesMap(pubMap);

      const bookedAppts = await getBookedTimesForDate(date);
      const enrichedSlots = targetDay.slots.map(s => {
        const autoBooked = isTimeOverlappingBooked(s.time, bookedAppts, 60);
        return {
          time: s.time,
          crossedOut: !!s.crossedOut,
          autoBooked,
          isBooked: !!s.crossedOut || autoBooked
        };
      });

      return sendJson(res, 200, {
        success: true,
        date,
        isPublished: true,
        updatedAt: targetDay.updatedAt,
        slots: enrichedSlots
      });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 21. DELETE /api/published-schedules?date=YYYY-MM-DD (Quitar horarios publicados de un día)
  if (req.method === 'DELETE' && pathname === '/api/published-schedules') {
    try {
      const date = queryParams.get('date');
      if (!date) {
        return sendJson(res, 400, { error: 'Se requiere ?date=YYYY-MM-DD' });
      }
      const pubMap = await getPublishedSchedulesMap();
      if (pubMap.days && pubMap.days[date]) {
        delete pubMap.days[date];
        await savePublishedSchedulesMap(pubMap);
      }
      return sendJson(res, 200, { success: true, date });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 22. GET /api/email/settings (Plantillas personalizadas, estado EmailJS/SMTP/Resend e historial reciente)
  if (req.method === 'GET' && pathname === '/api/email/settings') {
    try {
      const templates = await mailer.getEmailTemplates(supabase);
      const provider = mailer.getProviderStatus(templates);
      const logs = mailer.loadEmailLogs().slice(0, 20);
      return sendJson(res, 200, { templates, provider, logs });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 23. PUT /api/email/templates (Guardar textos personalizados de reserva y cancelación)
  if (req.method === 'PUT' && pathname === '/api/email/templates') {
    try {
      const body = await parseJsonBody(req);
      const current = await mailer.getEmailTemplates(supabase);
      const incoming = body.templates || body;
      const templates = await mailer.saveEmailTemplates(supabase, {
        ...current,
        ...incoming,
        emailjs: { ...(current.emailjs || {}), ...(incoming.emailjs || {}) }
      });
      return sendJson(res, 200, { success: true, templates });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 24. PUT /api/email/provider (Configurar EmailJS 24/7 para GitHub Pages y/o credenciales SMTP en .env local)
  if (req.method === 'PUT' && pathname === '/api/email/provider') {
    try {
      const body = await parseJsonBody(req);
      const current = await mailer.getEmailTemplates(supabase);
      const updatedEmailJs = {
        ...(current.emailjs || {}),
        ...(body.emailjsPublicKey !== undefined ? { publicKey: String(body.emailjsPublicKey || '').trim() } : {}),
        ...(body.emailjsServiceId !== undefined ? { serviceId: String(body.emailjsServiceId || '').trim() } : {}),
        ...(body.emailjsTemplateId !== undefined ? { templateId: String(body.emailjsTemplateId || '').trim() } : {}),
        ...(body.senderName !== undefined ? { senderName: String(body.senderName || 'Mica Lashes').trim() } : {}),
        ...(body.replyTo !== undefined ? { replyTo: String(body.replyTo || 'micalashes.estudio@gmail.com').trim() } : {}),
        ...(body.adminEmail !== undefined ? { adminEmail: String(body.adminEmail || 'micalashes.estudio@gmail.com').trim() } : {})
      };
      const savedTemplates = await mailer.saveEmailTemplates(supabase, {
        ...current,
        emailjs: updatedEmailJs
      });
      mailer.updateEmailEnvConfig({
        SMTP_HOST: body.smtpHost,
        SMTP_PORT: body.smtpPort,
        SMTP_USER: body.smtpUser || body.replyTo,
        SMTP_PASS: body.smtpPass,
        EMAIL_FROM: body.emailFrom,
        ADMIN_EMAIL: body.adminEmail,
        RESEND_API_KEY: body.resendApiKey,
        EMAILJS_PUBLIC_KEY: body.emailjsPublicKey,
        EMAILJS_SERVICE_ID: body.emailjsServiceId,
        EMAILJS_TEMPLATE_ID: body.emailjsTemplateId
      });
      const provider = mailer.getProviderStatus(savedTemplates);
      return sendJson(res, 200, { success: true, provider, templates: savedTemplates });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 25. POST /api/email/preview (Renderizar vista previa HTML en vivo con datos de ejemplo)
  if (req.method === 'POST' && pathname === '/api/email/preview') {
    try {
      const body = await parseJsonBody(req);
      const type = body.type === 'cancellation' ? 'cancellation' : 'booking';
      const currentTemplates = await mailer.getEmailTemplates(supabase);
      const mergedTemplates = body.templates ? {
        ...currentTemplates,
        ...body.templates,
        booking: { ...currentTemplates.booking, ...(body.templates.booking || {}) },
        cancellation: { ...currentTemplates.cancellation, ...(body.templates.cancellation || {}) }
      } : currentTemplates;

      const sampleAppt = {
        clientName: 'Valentina Gómez',
        serviceName: 'Volumen Híbrido Glam',
        date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        time: '15:30',
        endTime: '17:30',
        price: 34000,
        clientEmail: 'valentina@ejemplo.com',
        clientNotes: 'Primera vez en el estudio ✨'
      };
      const reqOrigin = req.headers.origin || `http://${req.headers.host || `localhost:${port}`}`;
      const vars = mailer.buildAppointmentVars(sampleAppt, mergedTemplates, {
        cancelReason: type === 'cancellation' ? 'Reprogramación solicitada con anticipación.' : ''
      });
      const rendered = mailer.buildEmailLayout({ type, templates: mergedTemplates, vars, baseUrl: reqOrigin });
      return sendJson(res, 200, { success: true, subject: rendered.subject, html: rendered.html });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // 26. POST /api/email/test (Enviar un email real o de prueba de Reserva / Cancelación)
  if (req.method === 'POST' && pathname === '/api/email/test') {
    try {
      const body = await parseJsonBody(req);
      const to = String(body.to || '').trim();
      const type = body.type === 'cancellation' ? 'cancellation' : 'booking';
      if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        return sendJson(res, 400, { error: 'Ingresá un correo electrónico de destino válido.' });
      }
      const reqOrigin = req.headers.origin || `http://${req.headers.host || `localhost:${port}`}`;
      const testAppt = {
        clientName: body.clientName || 'Valentina Gómez (Prueba)',
        serviceName: 'Volumen Híbrido Glam',
        date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
        time: '16:00',
        endTime: '18:00',
        price: 34000,
        clientEmail: to,
        clientNotes: 'Correo de prueba enviado desde el Panel Admin'
      };
      const result = await mailer.sendAppointmentEmail({
        supabase,
        type,
        appointment: testAppt,
        baseUrl: reqOrigin,
        extra: {
          forceSend: true,
          isTest: true,
          cancelReason: type === 'cancellation' ? 'Este es un ejemplo de cómo recibe tu clienta el aviso de cancelación.' : ''
        }
      });
      return sendJson(res, result.success ? 200 : 500, result);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Endpoint no encontrado
  return sendJson(res, 404, { error: 'Endpoint de API no encontrado' });
}

// Servidor HTTP Principal
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // Interceptar rutas de la API (/api/...)
  if (pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, pathname, urlObj.searchParams);
  }

  // Servir archivos estáticos de forma segura (bloqueando archivos sensibles del servidor)
  let reqPath = decodeURIComponent(pathname).replace(/\/+$/, '');
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath === '/admin') reqPath = '/admin.html';
  if (reqPath === '/turnos') reqPath = '/turnos.html';
  if (reqPath === '/login') reqPath = '/login.html';

  const baseName = path.basename(reqPath).toLowerCase();
  const blockedFiles = new Set(['.env', '.env.example', 'server.js', 'mailer.js', 'email-logs.json', 'package.json', 'package-lock.json']);
  if (baseName.startsWith('.') || blockedFiles.has(baseName)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  let filePath = path.resolve(dir, '.' + reqPath);
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }
  if (!filePath.startsWith(path.resolve(dir))) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate'
      });
      res.end('404 Not Found - Nahi Studio');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const isMediaAsset = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.mp4', '.webm'].includes(ext);
    const cacheHeader = isMediaAsset ? 'public, max-age=86400' : 'public, max-age=0, must-revalidate';

    if ((ext === '.mp4' || ext === '.webm') && req.headers.range) {
      const range = req.headers.range;
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': cacheHeader
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheHeader
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module && !process.env.VERCEL) {
  server.listen(port, () => {
    console.log(`\n============================================================`);
    console.log(`✨ NAHI STUDIO — SERVIDOR Y BACKEND SUPABASE ACTIVO ✨`);
    console.log(`============================================================`);
    console.log(`🌐 Servidor local: http://localhost:${port}`);
    console.log(`📅 Turnos online:  http://localhost:${port}/turnos.html`);
    console.log(`🔐 Iniciar sesión: http://localhost:${port}/login.html`);
    console.log(`👑 Panel Admin:    http://localhost:${port}/admin.html`);
    console.log(`📡 API Health:     http://localhost:${port}/api/health`);
    console.log(`============================================================\n`);
  });
}

module.exports = (req, res) => {
  server.emit('request', req, res);
};
