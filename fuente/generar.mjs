// Genera las piezas gráficas de redes/ a partir de plantillas HTML, con el Chromium de Playwright.
//
//   cd redes/fuente
//   npm install                      # solo la primera vez (Playwright)
//   npx playwright install chromium  # solo la primera vez
//   node generar.mjs                 # todo
//   node generar.mjs miniaturas      # solo lo que contenga «miniaturas» en su ruta de salida
//
// Los textos de las miniaturas de ejemplo están en SERIES y NOVEDAD, más abajo. Colores, logo y tipografías salen de la
// web de EduCanarias (src/index.css y src/components/Logo.tsx del repo de la app).
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(AQUI, '..')
const TMP = join(AQUI, '.tmp')
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright')
const FILTRO = process.argv[2] ?? ''

// ─── Marca ───────────────────────────────────────────────────────────────────────────────────────────────────────────

export const C = {
  ink: '#1C1917',
  ink2: '#44403C',
  muted: '#78716C',
  faint: '#A8A29E',
  line: '#E7E5E4',
  line2: '#D6D3D1',
  paper: '#FAFAF9',
  paper2: '#F5F5F4',
  white: '#FFFFFF',
  accent: '#2563EB',
  accentSoft: '#DBEAFE',
  sea: '#60A5FA',
  sun: '#FDE68A',
  success: '#059669',
  successSoft: '#D1FAE5',
  basalt: '#292524',
  lava: '#EA580C',
  ember: '#F59E0B',
}

const b64 = (f) => readFileSync(join(AQUI, 'fonts', f)).toString('base64')
const FONTS = `@font-face{font-family:Newsreader;src:url(data:font/woff2;base64,${b64('newsreader-latin-opsz-normal.woff2')}) format('woff2');font-weight:200 800;font-style:normal}
@font-face{font-family:Newsreader;src:url(data:font/woff2;base64,${b64('newsreader-latin-opsz-italic.woff2')}) format('woff2');font-weight:200 800;font-style:italic}
@font-face{font-family:Geist;src:url(data:font/woff2;base64,${b64('geist-latin-wght-normal.woff2')}) format('woff2');font-weight:100 900}`

const MOUNTAIN = 'M5 23.5 L13.2 12.6 C13.7 11.9 14.7 11.9 15.2 12.6 L17.4 15.5 L19 13.8 C19.5 13.3 20.3 13.3 20.7 13.9 L27 23.5 Z'

/** Elementos del isotipo (Teide, sol y mar) en su caja de 32×32. */
function markInner({ bg = C.ink, mountain = C.paper, sun = C.sun, sea = C.sea, rounded = true, art = 1 } = {}) {
  const rect = bg ? `<rect width="32" height="32"${rounded ? ' rx="9"' : ''} fill="${bg}"/>` : ''
  return `${rect}<g transform="translate(16 16) scale(${art}) translate(-16 -16)"><circle cx="22.5" cy="10" r="2.6" fill="${sun}"/><path d="${MOUNTAIN}" fill="${mountain}"/><path d="M5 25.2 H27" stroke="${sea}" stroke-width="1.6" stroke-linecap="round"/></g>`
}
const markSvg = (size, opts) => `<svg class="mark" viewBox="0 0 32 32" width="${size}" height="${size}" aria-hidden="true">${markInner(opts)}</svg>`

/** Isotipo de una tinta: el cuadrado con el paisaje calado (transparente). */
const MONO_PATH = [
  'M9 0H23A9 9 0 0 1 32 9V23A9 9 0 0 1 23 32H9A9 9 0 0 1 0 23V9A9 9 0 0 1 9 0Z',
  'M19.9 10A2.6 2.6 0 1 0 25.1 10A2.6 2.6 0 1 0 19.9 10Z',
  MOUNTAIN,
  'M5 24.4H27A0.8 0.8 0 0 1 27 26H5A0.8 0.8 0 0 1 5 24.4Z',
].join(' ')

const WM = JSON.parse(readFileSync(join(AQUI, 'wordmark.json'), 'utf8'))
const [WX0, WY0, WX1, WY1] = WM.bbox
/** «EduCanarias» en trazos (Newsreader Medium) al cuerpo indicado. */
function wordmarkSvg(size, color) {
  const s = size / 100
  return `<svg class="wm" viewBox="0 ${WY0} ${WX1} ${WY1 - WY0}" width="${(WX1 * s).toFixed(1)}" height="${((WY1 - WY0) * s).toFixed(1)}" aria-hidden="true"><path d="${WM.d}" fill="${color}"/></svg>`
}
/** Logotipo horizontal: isotipo + nombre, con las proporciones de la web (texto = 0,6 × isotipo; hueco = 0,32). */
const lockup = (m, color = C.ink, markOpts) =>
  `<div class="lockup" style="display:flex;align-items:center;gap:${(m * 0.32).toFixed(1)}px">${markSvg(m, markOpts)}${wordmarkSvg(m * 0.6, color)}</div>`

// ─── Archivos SVG del logotipo ───────────────────────────────────────────────────────────────────────────────────────

const svgFile = (w, h, inner) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fx(w)} ${fx(h)}" width="${fx(w)}" height="${fx(h)}">\n<title>EduCanarias</title>\n${inner}\n</svg>\n`
const fx = (n) => +n.toFixed(2)

function logoHorizontal(color) {
  const M = 64
  const s = (M * 0.6) / 100
  const tx = M * 1.32
  const ty = M / 2 - ((WY0 + WY1) / 2) * s
  const w = tx + WX1 * s
  return svgFile(w, M, `<g>${markInner()}</g>`.replace('<g>', `<g transform="scale(${M / 32})">`) + `\n<path transform="translate(${fx(tx)} ${fx(ty)}) scale(${s})" d="${WM.d}" fill="${color}"/>`)
}
function logoVertical(color) {
  const M = 96
  const s = (M * 0.46) / 100
  const tw = WX1 * s
  const w = Math.max(M, tw)
  const gap = M * 0.24
  const ty = M + gap - WY0 * s
  const h = M + gap + (WY1 - WY0) * s
  return svgFile(
    w,
    h,
    `<g transform="translate(${fx((w - M) / 2)} 0) scale(${M / 32})">${markInner()}</g>\n<path transform="translate(${fx((w - tw) / 2)} ${fx(ty)}) scale(${s})" d="${WM.d}" fill="${color}"/>`,
  )
}
function logoNombre(color) {
  return svgFile(WX1, WY1 - WY0, `<path transform="translate(0 ${fx(-WY0)})" d="${WM.d}" fill="${color}"/>`)
}

const LOGOS_SVG = {
  'isotipo.svg': svgFile(32, 32, markInner()),
  'isotipo-una-tinta-negro.svg': svgFile(32, 32, `<path fill-rule="evenodd" fill="${C.ink}" d="${MONO_PATH}"/>`),
  'isotipo-una-tinta-blanco.svg': svgFile(32, 32, `<path fill-rule="evenodd" fill="${C.white}" d="${MONO_PATH}"/>`),
  'logotipo-horizontal.svg': logoHorizontal(C.ink),
  'logotipo-horizontal-blanco.svg': logoHorizontal(C.white),
  'logotipo-vertical.svg': logoVertical(C.ink),
  'logotipo-vertical-blanco.svg': logoVertical(C.white),
  'nombre.svg': logoNombre(C.ink),
  'nombre-blanco.svg': logoNombre(C.white),
}

// ─── Plantilla base ──────────────────────────────────────────────────────────────────────────────────────────────────

function doc(w, h, css, body) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${FONTS}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{position:relative;font-family:Geist,sans-serif;color:${C.ink};-webkit-font-smoothing:antialiased;font-feature-settings:"ss01","cv11";text-rendering:geometricPrecision}
.serif{font-family:Newsreader,serif;font-weight:500;letter-spacing:-.02em;text-wrap:balance}
.serif em{font-style:italic}
.abs{position:absolute}
svg{display:block;flex:none}
${css}</style></head><body>${body}</body></html>`
}

/** Fondo «papel» con los brillos de og-image.png: sol arriba a la derecha, mar abajo a la izquierda, lila abajo a la derecha. */
function papel({ x = 0, y = 0, w, h }, base = C.paper) {
  const g = (cx, cy, rx, ry, color) => `radial-gradient(${fx(rx * w)}px ${fx(ry * h)}px at ${fx(x + cx * w)}px ${fx(y + cy * h)}px,${color},transparent 70%)`
  return [
    g(0.867, 0.175, 0.433, 0.667, 'rgba(253,230,138,.55)'),
    g(0.033, 1.016, 0.467, 0.667, 'rgba(191,219,254,.75)'),
    g(0.958, 1.016, 0.4, 0.571, 'rgba(221,214,254,.6)'),
    base,
  ].join(',')
}

/** Fondo «noche»: tinta con un resplandor de sol y otro de mar. */
function noche({ x = 0, y = 0, w, h }) {
  const g = (cx, cy, rx, ry, color) => `radial-gradient(${fx(rx * w)}px ${fx(ry * h)}px at ${fx(x + cx * w)}px ${fx(y + cy * h)}px,${color},transparent 70%)`
  return [
    g(0.82, 0.2, 0.5, 0.8, 'rgba(253,230,138,.16)'),
    g(0.9, 0.95, 0.45, 0.6, 'rgba(234,88,12,.12)'),
    g(0.05, 1.05, 0.5, 0.7, 'rgba(96,165,250,.16)'),
    C.ink,
  ].join(',')
}

const chipCss = (k = 1) => `.chips{display:flex;gap:${14 * k}px;align-items:center;flex-wrap:nowrap}
.chip{padding:${12 * k}px ${22 * k}px;border-radius:999px;border:${1.5 * k}px solid ${C.line};background:#fff;color:#292524;font-size:${21 * k}px;white-space:nowrap}
.chip.ok{background:#DCFCE7;border-color:#BBF7D0;color:#14532D}
.chip.url{background:transparent;border-color:transparent;color:${C.muted};padding-left:${6 * k}px}
.dark .chip{background:rgba(250,250,249,.06);border-color:rgba(250,250,249,.16);color:${C.line}}
.dark .chip.ok{background:rgba(16,185,129,.16);border-color:rgba(52,211,153,.35);color:#A7F3D0}
.dark .chip.url{background:transparent;border-color:transparent;color:${C.faint}}`

/** Hoja de papel de muestra (como las de og-plantilla-*.png): título, regla, campos y una tabla. */
function hoja({ titulo, badge = ['W', C.accent], w = 300, h = 372, rot = 3, k = 1, filas = 5, left = 0, top = 0 }) {
  const rows = Array.from({ length: filas }, () => '<div class="row"><i></i><i></i><i></i></div>').join('')
  return `<div class="paper" style="left:${left}px;top:${top}px;width:${w}px;height:${h}px;padding:${26 * k}px ${24 * k}px;transform:rotate(${rot}deg)">
<span class="badge" style="width:${34 * k}px;height:${34 * k}px;border-radius:${8 * k}px;font-size:${19 * k}px;background:${badge[1]}">${badge[0]}</span>
<p class="ptitle" style="margin-top:${14 * k}px;font-size:${19 * k}px">${titulo}</p><div class="rule" style="height:${2 * k}px;margin:${12 * k}px 0 ${14 * k}px"></div>
<div class="fields"><i style="height:${20 * k}px"></i><i style="height:${20 * k}px"></i><i style="height:${20 * k}px"></i><i style="height:${20 * k}px"></i></div>
<div class="table" style="margin-top:${14 * k}px"><div class="head" style="height:${20 * k}px"></div>${rows.replaceAll('<div class="row">', `<div class="row" style="height:${24 * k}px">`)}</div></div>`
}
const hojaCss = `.paper{position:absolute;overflow:hidden;background:#fff;border:1px solid ${C.line};border-radius:14px;box-shadow:0 30px 60px -24px rgba(28,25,23,.28),0 2px 6px rgba(28,25,23,.06)}
.badge{display:inline-grid;place-items:center;color:#fff;font-weight:700}
.ptitle{font-family:Newsreader,serif;line-height:1.15;font-weight:500;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rule{background:#1E3A5F}
.fields{display:grid;grid-template-columns:1fr 1.6fr;border:1px solid ${C.line2}}
.fields i{border-bottom:1px solid ${C.line2}}.fields i:nth-child(odd){background:${C.paper2};border-right:1px solid ${C.line2}}
.fields i:nth-last-child(-n+2){border-bottom:0}
.table{border:1px solid ${C.line2}}
.head{background:#E8EEF6;border-bottom:1px solid ${C.line2}}
.row{display:grid;grid-template-columns:1.4fr 1fr 1fr;border-bottom:1px solid ${C.line}}.row:last-child{border-bottom:0}
.row i{border-right:1px solid ${C.line}}.row i:last-child{border-right:0}`

/** Ventana con una captura de la app (recortada por recursos/capturas). */
const ventana = (captura, style) =>
  `<div class="win" style="${style}"><img src="${pathToFileURL(join(RAIZ, 'recursos', 'capturas', 'escritorio', `${captura}.png`)).href}" alt=""></div>`
const ventanaCss = `.win{position:absolute;border-radius:18px;overflow:hidden;box-shadow:0 40px 120px -30px rgba(12,10,9,.55),0 12px 32px -12px rgba(12,10,9,.25);border:1px solid rgba(255,255,255,.6)}
.win img{display:block;width:100%;height:auto}`

// ─── Piezas ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const PIEZAS = [] // { out, w, h, html, transparente? }
const add = (out, w, h, html, transparente = false) => PIEZAS.push({ out, w, h, html, transparente })

// Logotipos en PNG (fondo transparente), a partir de los SVG.
const PNG_LOGOS = [
  ['isotipo.svg', [64, 128, 256, 512, 1024]],
  ['isotipo-una-tinta-negro.svg', [512]],
  ['isotipo-una-tinta-blanco.svg', [512]],
  ['logotipo-horizontal.svg', [600, 1200, 2400]],
  ['logotipo-horizontal-blanco.svg', [600, 1200, 2400]],
  ['logotipo-vertical.svg', [600, 1200]],
  ['logotipo-vertical-blanco.svg', [600, 1200]],
  ['nombre.svg', [1200]],
  ['nombre-blanco.svg', [1200]],
]
for (const [file, widths] of PNG_LOGOS) {
  const svg = LOGOS_SVG[file]
  const [, vw, vh] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg).map(Number)
  for (const w of widths) {
    const h = Math.round((w * vh) / vw)
    const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    add(`logos/png/${file.replace('.svg', '')}-${w}.png`, w, h, doc(w, h, '', `<img src="${src}" width="${w}" height="${h}" style="display:block">`), true)
  }
}

// Foto de perfil: 800×800, el paisaje del isotipo a sangre (YouTube la recorta en círculo).
add('youtube/01-foto-de-perfil/perfil-800x800.png', 800, 800, doc(800, 800, '', markSvg(800, { rounded: false, art: 0.9 })))
// Vista previa del recorte circular, solo para comprobar.
add(
  'youtube/01-foto-de-perfil/vista-previa-circulo.png',
  400,
  400,
  doc(400, 400, 'body{background:#fff;display:grid;place-items:center}.c{border-radius:50%;overflow:hidden;width:320px;height:320px}', `<div class="c">${markSvg(320, { rounded: false, art: 0.9 })}</div>`),
)

// Marca de agua de los vídeos (YouTube Studio → Personalización → Marca de agua): cuadrada, ≥150 px, <1 MB.
for (const s of [150, 300]) add(`youtube/03-marca-de-agua/marca-de-agua-${s}x${s}.png`, s, s, doc(s, s, '', markSvg(s)), true)

/**
 * El paisaje del isotipo en grande, con sus proporciones exactas: (x, y) es el pie izquierdo de la montaña y K los
 * píxeles por unidad del isotipo (32 unidades de lado). El mar solo ocupa lo que la montaña, como en el logo.
 */
function paisaje({ w, h, K, x, y, halo = 0.45 }) {
  return `<svg class="abs" style="left:0;top:0" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true">
<defs><radialGradient id="halo"><stop offset="0" stop-color="${C.sun}" stop-opacity="${halo}"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient>
<linearGradient id="roca" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.paper}" stop-opacity=".96"/><stop offset="1" stop-color="${C.paper}" stop-opacity=".8"/></linearGradient></defs>
<g transform="translate(${fx(x - 5 * K)} ${fx(y - 23.5 * K)}) scale(${K})"><circle cx="22.5" cy="10" r="7" fill="url(#halo)"/><circle cx="22.5" cy="10" r="2.6" fill="${C.sun}"/>
<path d="${MOUNTAIN}" fill="url(#roca)"/><path d="M5 25.2 H27" stroke="${C.sea}" stroke-width="1.6" stroke-linecap="round"/></g></svg>`
}

/** Cuerpo del titular según su longitud (sin etiquetas): siempre entero y en tres líneas como mucho. */
const titularSize = (t, base = 1) => {
  const n = t.replace(/<[^>]+>/g, '').length
  return Math.round(base * (n <= 18 ? 104 : n <= 26 ? 96 : n <= 34 ? 86 : 78))
}

// ── Banner 2560×1440. Franja visible en ordenador: y 508–931. Zona segura (móvil): 1546×423 centrada. ──
const BAND = { x: 0, y: 508, w: 2560, h: 423 }
const SAFE = { x: 507, y: 508, w: 1546, h: 423 }

function banner({ oscuro = false, guia = false } = {}) {
  const ink = oscuro ? C.paper : C.ink
  const css = `${chipCss(1.2)}${hojaCss}
body{background:${oscuro ? noche(BAND) : papel(BAND)}}
.txt{position:absolute;left:${SAFE.x + 96}px;top:${SAFE.y + 52}px;width:900px}
.serif.h{margin-top:30px;font-size:80px;line-height:1.02;color:${ink}}
.chips{margin-top:30px}
.zone{position:absolute;border:4px dashed}
.lbl{position:absolute;font:600 30px Geist;white-space:nowrap}
.mtn{position:absolute}`
  // De izquierda a derecha, cada hoja encima de la anterior: así se lee el título de todas.
  const papeles = oscuro
    ? ''
    : [
        hoja({ titulo: 'Programación didáctica', w: 290, h: 330, rot: -6, left: 1540, top: 565 }),
        hoja({ titulo: 'Situación de aprendizaje', w: 290, h: 330, rot: 2, left: 1790, top: 548 }),
        hoja({ titulo: 'Rúbrica de evaluación', w: 290, h: 330, rot: 9, left: 2040, top: 565 }),
      ].join('')
  // En la versión oscura, el paisaje del isotipo en grande (Teide, sol y mar), dentro de la franja visible.
  const paisajeHtml = oscuro ? paisaje({ w: 2560, h: 1440, K: 22, x: 1680, y: 870 }) : ''
  // Recuadros con las medidas exactas; las etiquetas, por fuera de la franja para no tapar nada.
  const TAB = (2560 - 1855) / 2
  const bajo = BAND.y + BAND.h + 18
  const zonas = guia
    ? `<div class="zone" style="left:0;top:0;width:2560px;height:1440px;border-color:#7C3AED"></div><p class="lbl" style="left:28px;top:24px;color:#7C3AED">TV · 2560 × 1440 (la imagen completa)</p>
<div class="zone" style="left:0;top:${BAND.y}px;width:2560px;height:${BAND.h}px;border-color:#DC2626"></div><p class="lbl" style="left:28px;top:${BAND.y - 52}px;color:#DC2626">Ordenador · 2560 × 423</p>
<div class="zone" style="left:${TAB}px;top:${BAND.y}px;width:1855px;height:${BAND.h}px;border-color:#EA580C;border-top:0;border-bottom:0"></div><p class="lbl" style="left:${TAB}px;top:${bajo + 64}px;color:#EA580C">← Tableta · 1855 × 423 →</p>
<div class="zone" style="left:${SAFE.x}px;top:${SAFE.y}px;width:${SAFE.w}px;height:${SAFE.h}px;border-color:#059669;background:rgba(5,150,105,.06)"></div><p class="lbl" style="left:${SAFE.x}px;top:${bajo}px;color:#059669">Móvil = zona segura · 1546 × 423 · el texto y el logo, siempre aquí dentro</p>`
    : ''
  const body = `<div class="${oscuro ? 'dark' : ''}">${paisajeHtml}${papeles}
<div class="txt">${lockup(60, ink)}<h1 class="serif h">Prepara tus clases con el currículo canario</h1>
<div class="chips"><span class="chip ok">Gratis para empezar</span><span class="chip">Primaria · ESO · Bachillerato</span><span class="chip url">educanarias.app</span></div></div>${zonas}</div>`
  return doc(2560, 1440, css, body)
}
add('youtube/02-banner/banner-2560x1440.png', 2560, 1440, banner())
add('youtube/02-banner/banner-oscuro-2560x1440.png', 2560, 1440, banner({ oscuro: true }))
add('youtube/02-banner/guia-zonas-del-banner.png', 2560, 1440, banner({ guia: true }))

// ── Miniaturas 1280×720 ──
// Series (= listas de reproducción): cada una con el color de tarjeta que usa la app.
export const SERIES = [
  { id: 'programacion-didactica', nombre: 'Programación didáctica', bg: '#E0F2FE', fg: '#0369A1', titulo: 'Tu programación, <em>apartado a apartado</em>', hoja: 'Programación didáctica' },
  { id: 'situaciones-de-aprendizaje', nombre: 'Situaciones de aprendizaje', bg: '#FEF9C3', fg: '#B45309', titulo: 'Una SA con el <em>currículo canario</em>', captura: '04-sa-lista' },
  { id: 'correccion-y-evaluacion', nombre: 'Corrección y evaluación', bg: '#D1FAE5', fg: '#047857', titulo: 'Corrige con <em>una foto</em>', captura: '08-quien-es-quien' },
  { id: 'cuaderno', nombre: 'Cuaderno del docente', bg: '#F3E8FF', fg: '#7E22CE', titulo: 'Tus grupos, <em>por criterios</em>', captura: '13-cuaderno-grupos' },
  { id: 'documentos-y-plantillas', nombre: 'Documentos y plantillas', bg: '#FCE7F3', fg: '#BE185D', titulo: 'Actas e informes, <em>gratis</em>', hoja: 'Acta de la sesión de evaluación' },
  { id: 'certificados-de-profesionalidad', nombre: 'Certificados de profesionalidad', bg: '#F5F5F4', fg: '#44403C', titulo: 'El anexo IV, <em>con el BOE</em>', hoja: 'Anexo IV del módulo' },
]
export const NOVEDAD = { etiqueta: 'Novedad', titulo: 'Mapas mudos para <em>tus fichas</em>' }

function miniatura(s, { conTexto = true } = {}) {
  const css = `${hojaCss}${ventanaCss}
body{background:radial-gradient(700px 520px at 0 0,rgba(255,255,255,.75),transparent 70%),radial-gradient(640px 520px at 1280px 720px,rgba(255,255,255,.45),transparent 70%),${s.bg}}
.pill{position:absolute;left:64px;top:60px;padding:10px 20px;border-radius:999px;background:rgba(255,255,255,.85);color:${s.fg};font-size:22px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}
.serif.h{position:absolute;left:64px;top:132px;width:${s.captura || s.hoja ? 680 : 1100}px;font-size:${titularSize(s.titulo)}px;line-height:.98}
.serif.h em{color:${s.fg}}
.foot{position:absolute;left:64px;bottom:58px}`
  const visual = s.captura
    ? ventana(s.captura, 'left:700px;top:118px;width:760px;transform:rotate(-3deg)')
    : s.hoja
      ? hoja({ titulo: s.hoja, w: 420, h: 520, rot: 4, k: 1.4, filas: 7, left: 780, top: 110 })
      : ''
  const texto = conTexto ? `<span class="pill">${s.nombre}</span><h1 class="serif h">${s.titulo}</h1>` : ''
  return doc(1280, 720, css, `${visual}${texto}<div class="foot">${lockup(46)}</div>`)
}
function miniaturaNovedad(n, { conTexto = true } = {}) {
  const css = `body{background:${noche({ w: 1280, h: 720 })}}
.pill{position:absolute;left:64px;top:60px;padding:10px 20px;border-radius:999px;background:${C.sun};color:${C.ink};font-size:22px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}
.serif.h{position:absolute;left:64px;top:132px;width:760px;font-size:${titularSize(n.titulo)}px;line-height:.98;color:${C.paper}}
.serif.h em{color:${C.sun}}
.foot{position:absolute;left:64px;bottom:58px}`
  const texto = conTexto ? `<span class="pill">${n.etiqueta}</span><h1 class="serif h">${n.titulo}</h1>` : ''
  return doc(1280, 720, css, `${paisaje({ w: 1280, h: 720, K: 14, x: 870, y: 590 })}${texto}<div class="foot">${lockup(46, C.paper)}</div>`)
}
for (const s of SERIES) {
  add(`youtube/04-miniaturas/ejemplos/${s.id}.png`, 1280, 720, miniatura(s))
  add(`youtube/04-miniaturas/fondos/${s.id}.png`, 1280, 720, miniatura(s, { conTexto: false }))
}
add('youtube/04-miniaturas/ejemplos/novedad.png', 1280, 720, miniaturaNovedad(NOVEDAD))
add('youtube/04-miniaturas/fondos/novedad.png', 1280, 720, miniaturaNovedad(NOVEDAD, { conTexto: false }))

// ── Pantalla final 1920×1080 (últimos 5–20 s del vídeo) ──
const FINAL_VIDEOS = [
  { x: 1040, y: 100, w: 760, h: 428 },
  { x: 1040, y: 568, w: 760, h: 428 },
]
const FINAL_SUB = { x: 120, y: 700, d: 240 }
function pantallaFinal({ guia = false } = {}) {
  const css = `${chipCss(1.25)}
body{background:${papel({ w: 1920, h: 1080 })}}
.txt{position:absolute;left:120px;top:150px;width:800px}
.serif.h{margin-top:56px;font-size:92px;line-height:1.0}
.serif.h em{color:${C.accent}}
.chips{margin-top:40px}
.box{position:absolute;border:4px dashed ${C.accent};border-radius:16px;background:rgba(37,99,235,.06);display:grid;place-items:center;color:${C.accent};font-size:30px;font-weight:600}
.sub{border-radius:50%}`
  const cajas = guia
    ? FINAL_VIDEOS.map((v, i) => `<div class="box" style="left:${v.x}px;top:${v.y}px;width:${v.w}px;height:${v.h}px">${i ? 'Vídeo o lista recomendados' : 'Vídeo más reciente'}</div>`).join('') +
      `<div class="box sub" style="left:${FINAL_SUB.x}px;top:${FINAL_SUB.y}px;width:${FINAL_SUB.d}px;height:${FINAL_SUB.d}px;font-size:24px;text-align:center">Suscribirse</div>`
    : ''
  const body = `<div class="txt">${lockup(72)}<h1 class="serif h">Empieza gratis en <em>educanarias.app</em></h1>
<div class="chips"><span class="chip ok">Sin tarjeta</span><span class="chip">Currículo LOMLOE de Canarias</span></div></div>${cajas}`
  return doc(1920, 1080, css, body)
}
add('youtube/05-pantalla-final/pantalla-final-1920x1080.png', 1920, 1080, pantallaFinal())
add('youtube/05-pantalla-final/guia-elementos.png', 1920, 1080, pantallaFinal({ guia: true }))

// ── Portadas de Shorts 1080×1920 (zonas seguras de la interfaz: arriba 250, abajo 430, derecha 150) ──
function portadaShort(s, { conTexto = true } = {}) {
  const css = `${ventanaCss}
body{background:radial-gradient(900px 800px at 0 0,rgba(255,255,255,.75),transparent 70%),${s.bg}}
.pill{position:absolute;left:80px;top:300px;padding:12px 24px;border-radius:999px;background:rgba(255,255,255,.85);color:${s.fg};font-size:28px;font-weight:650;letter-spacing:.08em;text-transform:uppercase}
.serif.h{position:absolute;left:80px;top:380px;width:850px;font-size:${titularSize(s.titulo, 1.25)}px;line-height:.98}
.serif.h em{color:${s.fg}}
.win img{width:100%}
.foot{position:absolute;left:80px;top:690px}`
  const texto = conTexto ? `<span class="pill">${s.nombre}</span><h1 class="serif h">${s.titulo}</h1>` : ''
  return doc(1080, 1920, css, `${ventana(s.captura, 'left:80px;top:860px;width:1100px;transform:rotate(-3deg)')}${texto}<div class="foot">${lockup(64)}</div>`)
}
const SHORT = { ...SERIES[1], titulo: 'Una SA en <em>minutos</em>' }
add('youtube/07-shorts/portada-short-ejemplo.png', 1080, 1920, portadaShort(SHORT))
add('youtube/07-shorts/portada-short-fondo.png', 1080, 1920, portadaShort(SHORT, { conTexto: false }))

// ── Hoja de marca (resumen visual de la guía) ──
function hojaDeMarca() {
  const sw = (name, hex, dark = false, note = '') =>
    `<div class="sw"><div class="chip-c" style="background:${hex};${hex === C.paper || hex === '#FFFFFF' ? `border:1px solid ${C.line}` : ''}"></div><b>${name}</b><span>${hex}${note ? ` · ${note}` : ''}</span></div>`
  const css = `body{background:${C.paper};padding:72px 84px}
h2{font-size:18px;font-weight:650;letter-spacing:.09em;text-transform:uppercase;color:${C.accent};margin-bottom:22px}
.grid{display:grid;grid-template-columns:1.05fr 1fr;gap:56px 72px}
.card{background:#fff;border:1px solid ${C.line};border-radius:24px;padding:40px;display:flex;align-items:center;justify-content:center;gap:56px}
.card.dark{background:${C.ink};border-color:${C.ink}}
.sws{display:grid;grid-template-columns:repeat(5,1fr);gap:18px 16px}
.sw{font-size:15px;color:${C.ink2}}.sw b{display:block;margin-top:10px;font-weight:600;color:${C.ink}}.sw span{color:${C.muted};font-variant-numeric:tabular-nums}
.chip-c{height:76px;border-radius:14px}
.type .big{font-family:Newsreader,serif;font-weight:500;font-size:84px;letter-spacing:-.02em;line-height:1}
.type .gx{font-size:64px;font-weight:500;line-height:1;letter-spacing:-.01em}
.type p{margin-top:10px;color:${C.muted};font-size:17px}
.type .row{display:flex;gap:56px;align-items:flex-end}
.voz{font-family:Newsreader,serif;font-size:38px;line-height:1.15;letter-spacing:-.015em}
.voz small{display:block;margin-top:14px;font-family:Geist;font-size:17px;color:${C.muted};letter-spacing:0;line-height:1.5}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:52px}
header p{color:${C.muted};font-size:18px}
.series{display:flex;flex-wrap:wrap;gap:12px}
.series span{padding:12px 20px;border-radius:999px;font-size:17px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;border:1px solid rgba(28,25,23,.06)}`
  const body = `<header>${lockup(64)}<p>Hoja de marca · redes sociales · educanarias.app</p></header>
<div class="grid">
<section><h2>Logotipo</h2><div style="display:grid;gap:18px"><div class="card">${lockup(84)}</div><div class="card dark">${lockup(84, C.paper)}</div>
<div class="card" style="justify-content:space-around">${markSvg(110)}${markSvg(64)}${markSvg(36)}<svg viewBox="0 0 32 32" width="110" height="110"><path fill-rule="evenodd" fill="${C.ink}" d="${MONO_PATH}"/></svg></div></div>
<h2 style="margin-top:44px">Series de vídeos (color de miniatura)</h2><div class="series">${SERIES.map((s) => `<span style="background:${s.bg};color:${s.fg}">${s.nombre}</span>`).join('')}<span style="background:${C.ink};color:${C.sun}">Novedades</span></div></section>
<section><h2>Colores</h2><div class="sws">
${sw('Tinta', C.ink)}${sw('Papel', C.paper)}${sw('Azul', C.accent, false)}${sw('Mar', C.sea)}${sw('Sol', C.sun)}
${sw('Tinta 2', C.ink2)}${sw('Gris', C.muted)}${sw('Línea', C.line)}${sw('Azul suave', C.accentSoft)}${sw('Verde', C.success)}
${sw('Amarillo', '#FEF9C3')}${sw('Celeste', '#E0F2FE')}${sw('Verde suave', '#D1FAE5')}${sw('Lila', '#F3E8FF')}${sw('Rosa', '#FCE7F3')}
</div>
<h2 style="margin-top:44px">Tipografías</h2><div class="type"><div class="row"><div><div class="big">Newsreader</div><p>Titulares · Medium (500) · interletraje −2 %</p></div>
<div><div class="gx">Geist</div><p>Textos, rótulos y botones · 400–600</p></div></div></div>
<h2 style="margin-top:44px">Cómo hablamos</h2><p class="voz">«Tú revisas y decides.»<small>De tú, claro y concreto: qué hace y para qué te sirve en clase. Sin promesas infladas, sin jerga de IA. La última palabra es siempre del docente.</small></p>
</section></div>`
  return doc(1920, 1200, css, body)
}
add('marca/hoja-de-marca.png', 1920, 1200, hojaDeMarca())

// ─── Render ──────────────────────────────────────────────────────────────────────────────────────────────────────────

async function capturas(browser) {
  // Recorta la ventana de la app de las capturas originales (2880×1800, con el escritorio de fondo) y le redondea las
  // esquinas. Origen: promo/assets/screens del repo de la app (datos ficticios). Variable CAPTURAS=<carpeta>.
  const src = process.env.CAPTURAS
  if (!src) return
  const ELEGIDAS = ['01-inicio', '02-criterios-curriculo', '03-escribiendo-sa', '04-sa-lista', '05-sa-material', '07-entregas-subidas', '08-quien-es-quien', '13-cuaderno-grupos']
  const page = await browser.newPage({ viewport: { width: 2240, height: 1548 } })
  for (const n of ELEGIDAS) {
    const out = join(RAIZ, 'recursos', 'capturas', 'escritorio', `${n}.png`)
    if (FILTRO && !out.includes(FILTRO) && FILTRO !== 'capturas') continue
    mkdirSync(dirname(out), { recursive: true })
    const html = `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:2240px;height:1548px;border-radius:40px;overflow:hidden;position:relative"><img src="${pathToFileURL(join(src, `desktop-${n}.png`)).href}" style="position:absolute;left:-320px;top:-126px"></div></body></html>`
    const f = join(TMP, `captura-${n}.html`)
    writeFileSync(f, html)
    await page.goto(pathToFileURL(f).href)
    await page.screenshot({ path: out, omitBackground: true })
    console.log(`${relative(RAIZ, out)} · ${Math.round(statSync(out).size / 1024)} KB`)
  }
  await page.close()
}

/**
 * Cortinilla de entrada (3,5 s, 1920×1080, 30 fps, sin sonido): el mar se dibuja, sube el Teide, sale el sol y
 * aparece el nombre. Animaciones CSS en pausa que se fijan fotograma a fotograma; ffmpeg monta el MP4.
 */
async function cortinilla(browser) {
  const out = 'youtube/06-cortinilla/cortinilla-1920x1080.mp4'
  if (FILTRO && !out.includes(FILTRO)) return
  const W = 1920
  const H = 1080
  const FPS = 30
  const DUR = 3.5
  const M = 220
  const ease = 'cubic-bezier(.22,1,.36,1)'
  const css = `body{background:${noche({ w: W, h: H })}}

.stage{position:absolute;left:0;top:0;width:${W}px;height:${H}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px}
.row{display:flex;align-items:center;gap:${M * 0.32}px}
.sea{transform-box:fill-box;transform-origin:center;animation:sea .55s ${ease} 0s}
.mtn{animation:mtn .8s ${ease} .25s}
.sun{transform-box:fill-box;transform-origin:center;animation:sun .5s cubic-bezier(.34,1.56,.64,1) .85s}
.halo{animation:fade 1s ease-out .95s}
.wm{animation:wm .7s ${ease} 1.15s}
.tag{font-size:30px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:${C.sea};animation:tag .7s ${ease} 1.55s}
@keyframes sea{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes mtn{from{transform:translateY(12px)}to{transform:translateY(0)}}
@keyframes sun{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes wm{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}
@keyframes tag{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.sea,.mtn,.sun,.halo,.wm,.tag{animation-fill-mode:both!important;animation-play-state:paused!important}`
  const mark = `<svg viewBox="0 0 32 32" width="${M}" height="${M}" overflow="visible" aria-hidden="true">
<defs><clipPath id="sobre-el-mar"><rect x="-10" y="-10" width="52" height="34.3"/></clipPath>
<radialGradient id="h"><stop offset="0" stop-color="${C.sun}" stop-opacity=".4"/><stop offset="1" stop-color="${C.sun}" stop-opacity="0"/></radialGradient></defs>
<circle class="halo" cx="22.5" cy="10" r="8" fill="url(#h)"/><circle class="sun" cx="22.5" cy="10" r="2.6" fill="${C.sun}"/>
<g clip-path="url(#sobre-el-mar)"><path class="mtn" d="${MOUNTAIN}" fill="${C.paper}"/></g>
<path class="sea" d="M5 25.2 H27" stroke="${C.sea}" stroke-width="1.6" stroke-linecap="round"/></svg>`
  const html = doc(W, H, css, `<div class="stage"><div class="row">${mark}${wordmarkSvg(M * 0.6, C.paper)}</div><p class="tag">Para docentes de Canarias</p></div>`)
  const dir = join(TMP, 'cortinilla')
  mkdirSync(dir, { recursive: true })
  const f = join(TMP, 'cortinilla.html')
  writeFileSync(f, html)
  const page = await browser.newPage({ viewport: { width: W, height: H } })
  await page.goto(pathToFileURL(f).href, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const frames = Math.round(DUR * FPS)
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => document.getAnimations().forEach((a) => (a.currentTime = t)), (i * 1000) / FPS)
    await page.screenshot({ path: join(dir, `f${String(i).padStart(4, '0')}.png`) })
  }
  await page.screenshot({ path: join(RAIZ, 'youtube', '06-cortinilla', 'cortinilla-ultimo-fotograma.png') })
  await page.close()
  const mp4 = join(RAIZ, out)
  mkdirSync(dirname(mp4), { recursive: true })
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4])
  console.log(`${out} · ${DUR} s · ${Math.round(statSync(mp4).size / 1024)} KB`)
}

mkdirSync(TMP, { recursive: true })
mkdirSync(join(RAIZ, 'logos', 'svg'), { recursive: true })
mkdirSync(join(RAIZ, 'youtube', '06-cortinilla'), { recursive: true })
for (const [file, svg] of Object.entries(LOGOS_SVG)) {
  if (FILTRO && !`logos/svg/${file}`.includes(FILTRO)) continue
  writeFileSync(join(RAIZ, 'logos', 'svg', file), svg)
  console.log(`logos/svg/${file}`)
}
const browser = await chromium.launch()
try {
  await capturas(browser)
  const page = await browser.newPage()
  for (const p of PIEZAS) {
    if (FILTRO && !p.out.includes(FILTRO)) continue
    const out = join(RAIZ, p.out)
    mkdirSync(dirname(out), { recursive: true })
    const f = join(TMP, `${p.out.replaceAll('/', '__')}.html`)
    writeFileSync(f, p.html)
    await page.setViewportSize({ width: p.w, height: p.h })
    await page.goto(pathToFileURL(f).href, { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: out, omitBackground: p.transparente })
    console.log(`${p.out} · ${p.w}×${p.h} · ${Math.round(statSync(out).size / 1024)} KB`)
  }
  await cortinilla(browser)
} finally {
  await browser.close()
  rmSync(TMP, { recursive: true, force: true })
}
