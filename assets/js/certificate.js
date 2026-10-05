/*
 * Daintta PNT certificate generator
 * ---------------------------------
 * Overlays a learner's details onto the blank certificate template.
 *
 * Browser: load these before this file
 *   <script src="https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
 *   <script src="https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js"></script>
 * then call  DaintaCert.generate({...}) or DaintaCert.generatePathway({...})  -> { bytes, certId, values }
 *
 * Node: const DaintaCert = require('./certificate.js');
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('pdf-lib'), require('@pdf-lib/fontkit'));
  } else {
    root.DaintaCert = factory(root.PDFLib, root.fontkit);
  }
})(typeof self !== 'undefined' ? self : this, function (PDFLib, fontkit) {
  const { PDFDocument, rgb, setCharacterSpacing } = PDFLib;

  // Asset paths (relative to the web app root). Override via generate({ assets }).
  const DEFAULT_ASSETS = {
    template: 'assets/certs/certificate-template.pdf',
    pathwayTemplate: 'assets/certs/certificate-template-pathway.pdf',
    fonts: {
      Regular:  'assets/fonts/IBMPlexSans-Regular.ttf',
      Medium:   'assets/fonts/IBMPlexSans-Medium.ttf',
      SemiBold: 'assets/fonts/IBMPlexSans-SemiBold.ttf',
      Bold:     'assets/fonts/IBMPlexSans-Bold.ttf',
    },
  };

  // Positions measured from the approved certificate artwork.
  // Units: PDF points on A4 landscape (841.89 x 595.28), origin bottom-left.
  // x = left edge of text, y = text baseline, maxWidth = space before the artwork/divider.
  const NAVY = '#0A1628';
  const LAYOUT = {
    name:    { x: 205.0, y: 410.8, size: 28.0,  tracking: -0.29, minSize: 18, font: 'SemiBold', color: NAVY,      maxWidth: 280 },
    email:   { x: 205.0, y: 389.3, size: 9.95,  tracking: 0.70,  minSize: 7,  font: 'Regular',  color: '#4B586D', maxWidth: 270 },
    module:  { x: 206.1, y: 320.8, size: 18.65, tracking: -0.21, minSize: 12, font: 'SemiBold',    color: NAVY,      maxWidth: 335 },
    date:    { x: 206.1, y: 53.0,  size: 10.8,  tracking: 0.50,  minSize: 7,  font: 'SemiBold', color: NAVY,      maxWidth: 130 },
    score:   { x: 370.4, y: 53.0,  size: 10.8,  tracking: 0.50,  minSize: 7,  font: 'SemiBold', color: NAVY,      maxWidth: 130 },
    certId:  { x: 522.3, y: 53.0,  size: 10.8,  tracking: 0.50,  minSize: 7,  font: 'SemiBold', color: NAVY,      maxWidth: 135 },
    version: { x: 696.2, y: 53.0,  size: 10.8,  tracking: 0.50,  minSize: 7,  font: 'SemiBold', color: NAVY,      maxWidth: 130 },
  };

  // Extra text drawn only on the pathway template (its artwork has these areas left blank).
  const SLATE = '#2A374C';
  const LABEL = '#566177';
  const PATHWAY_LAYOUT = {
    sentence:    { x: 205.5, y: 352.2, size: 11.29, tracking: -0.14, minSize: 9, font: 'Regular', color: SLATE, maxWidth: 360 },
    scoreLabel1: { x: 370.4, y: 40.0,  size: 7.14, tracking: 0.92,  minSize: 6, font: 'SemiBold', color: LABEL, maxWidth: 135 },
    scoreLabel2: { x: 370.4, y: 29.4,  size: 7.14, tracking: 0.92,  minSize: 6, font: 'SemiBold', color: LABEL, maxWidth: 135 },
  };

  const PATHWAYS = {
    1: { title: 'Foundation Pathway',          modules: [1, 4] },
    2: { title: 'Practitioner Pathway',        modules: [1, 7] },
    3: { title: 'Applied Engineering Pathway', modules: [1, 10] },
  };

  const MODULE_TITLES = {
    1: 'PNT Fundamentals',
    2: 'How GNSS Works',
    3: 'GNSS Signals, Errors & Performance',
    4: 'High-Accuracy & Augmented GNSS',
    5: 'Alternative PNT Technologies',
    6: 'PNT Threats & Vulnerabilities',
    7: 'Resilient PNT Engineering',
    8: 'PNT Architecture & Systems Engineering',
    9: 'PNT Verification, Validation & Assurance',
    10: 'Applied PNT Engineering Capstone',
  };

  function hex(c) {
    const n = parseInt(c.replace('#', ''), 16);
    return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
  }

  function formatDate(d) {
    const date = d instanceof Date ? d : new Date(d);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Unambiguous alphabet: no 0/O, 1/I/L
  const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function randomBlock(n) {
    const bytes = new Uint8Array(n);
    (globalThis.crypto || require('crypto').webcrypto).getRandomValues(bytes);
    return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
  }
  function makeCertId(moduleNumber) {
    return `PNT-M${String(moduleNumber).padStart(2, '0')}-${randomBlock(4)}-${randomBlock(4)}`;
  }
  function makePathwayCertId(level) {
    return `PNT-L${level}-${randomBlock(4)}-${randomBlock(4)}`;
  }
  const pad2 = (n) => String(n).padStart(2, '0');

  async function load(src) {
    if (src instanceof Uint8Array || src instanceof ArrayBuffer) return src;
    if (typeof window === 'undefined') return require('fs').readFileSync(src);
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Could not load ${src} (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }

  // Letter-spacing (tracking, in points) is applied with the PDF Tc operator.
  function textWidth(font, text, size, tracking) {
    return font.widthOfTextAtSize(text, size) + tracking * (text.length - 1);
  }

  function drawField(page, font, spec, text) {
    if (!text) return;
    let size = spec.size;
    const tr = (s) => (spec.tracking || 0) * (s / spec.size); // tracking scales with size
    while (textWidth(font, text, size, tr(size)) > spec.maxWidth && size > spec.minSize) size -= 0.25;
    page.pushOperators(setCharacterSpacing(tr(size)));
    page.drawText(text, { x: spec.x, y: spec.y, size, font, color: hex(spec.color) });
    page.pushOperators(setCharacterSpacing(0));
  }

  async function openTemplate(templateSrc, assets) {
    const pdf = await PDFDocument.load(await load(templateSrc));
    pdf.registerFontkit(fontkit);
    const fonts = {};
    for (const [w, src] of Object.entries(Object.assign({}, DEFAULT_ASSETS.fonts, assets.fonts))) {
      fonts[w] = await pdf.embedFont(await load(src), { subset: true });
    }
    return { pdf, fonts, page: pdf.getPage(0) };
  }

  function setMeta(pdf, heading, name, certId) {
    pdf.setTitle(`Certificate – ${heading} – ${name}`);
    pdf.setAuthor('Daintta PNT Engineering Learning Programme');
    pdf.setSubject(`Certificate ID ${certId}`);
  }

  /**
   * Module certificate.
   * data = { name, email, moduleNumber (1-10), moduleTitle?, score, dateAwarded, certId?, contentVersion }
   */
  async function generate(data, opts = {}) {
    const assets = Object.assign({}, DEFAULT_ASSETS, opts.assets || {});
    const { pdf, fonts, page } = await openTemplate(assets.template, assets);
    const n = Number(data.moduleNumber);
    const title = data.moduleTitle || MODULE_TITLES[n] || '';
    const values = {
      name: data.name,
      email: data.email,
      module: `Module ${pad2(n)}: ${title}`,
      date: formatDate(data.dateAwarded || new Date()),
      score: `${Math.round(data.score)}%`,
      certId: data.certId || makeCertId(n),
      version: String(data.contentVersion || '0.1'),
    };
    for (const [key, spec] of Object.entries(LAYOUT)) drawField(page, fonts[spec.font], spec, values[key]);
    setMeta(pdf, values.module, data.name, values.certId);
    return { bytes: await pdf.save(), certId: values.certId, values };
  }

  /**
   * Pathway certificate.
   * data = {
   *   name, email, level (1-3), pathwayTitle?, modules? ([first, last]),
   *   averageScore (number, mean of the pathway's module scores), dateAwarded (date the last module was passed),
   *   certId?, contentVersion
   * }
   */
  async function generatePathway(data, opts = {}) {
    const assets = Object.assign({}, DEFAULT_ASSETS, opts.assets || {});
    const { pdf, fonts, page } = await openTemplate(assets.pathwayTemplate, assets);
    const level = Number(data.level);
    const def = PATHWAYS[level] || {};
    const [first, last] = data.modules || def.modules || [1, 10];
    const values = {
      name: data.name,
      email: data.email,
      module: `Level ${level}: ${data.pathwayTitle || def.title || ''}`,
      date: formatDate(data.dateAwarded || new Date()),
      score: `${Math.round(data.averageScore)}%`,
      certId: data.certId || makePathwayCertId(level),
      version: String(data.contentVersion || '0.1'),
      sentence: data.sentence || 'has successfully completed the training and passed all assessments for',
      scoreLabel1: data.scoreLabel || 'AVERAGE SCORE',
      scoreLabel2: data.scoreSubLabel || `(MODULES ${pad2(first)}\u2013${pad2(last)})`,
    };
    const layout = Object.assign({}, LAYOUT, PATHWAY_LAYOUT);
    for (const [key, spec] of Object.entries(layout)) drawField(page, fonts[spec.font], spec, values[key]);
    setMeta(pdf, values.module, data.name, values.certId);
    return { bytes: await pdf.save(), certId: values.certId, values };
  }

  return { generate, generatePathway, makeCertId, makePathwayCertId, formatDate, LAYOUT, PATHWAY_LAYOUT, MODULE_TITLES, PATHWAYS };
});
