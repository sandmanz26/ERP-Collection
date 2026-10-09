/* Builds docs/PRD-Tata-Gemilang.pdf.
 *
 *   node docs/prd/build.mjs
 *
 * Chromium lays the pages out; PyMuPDF (pip install pymupdf) finds where each
 * heading landed so the contents page carries real page numbers, then joins the
 * cover to the body and writes the PDF's own bookmarks. The body is rendered
 * twice for that reason: once with blank numbers, once with the real ones. The
 * numbers occupy the same space either way, so the second pass cannot reflow.
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { ROOT, headings, resetNumbering, missing, esc } from './lib.mjs'
import { checkAgainstModel, TABLES, RELATIONS, ENUMS } from './schema.mjs'
import { ch1, ch2, ch3, ch4, ch5, RULE_COUNT } from './content-a.mjs'
import { ch6, ch7, ch8 } from './content-b.mjs'
import { ch9, ch10, ch11, ch12 } from './content-c.mjs'
import { appendixA, appendixB, appendixC } from './content-d.mjs'

const HERE = new URL('./', import.meta.url).pathname
const BUILD = join(HERE, '.build')
const OUT = join(ROOT, 'docs/PRD-Tata-Gemilang.pdf')
mkdirSync(BUILD, { recursive: true })

const DATE = '9 Oktober 2026'
const VERSION = '1.0'

/* ---------- 0. the schema must agree with the model before anything is drawn ---------- */
const problems = checkAgainstModel()
if (problems.length) {
  console.error('Schema does not match src/data/types.ts:\n' + problems.map((p) => ' - ' + p).join('\n'))
  process.exit(1)
}
console.log(`schema ok: ${TABLES.length} tables, ${TABLES.reduce((a, t) => a + t.columns.length, 0)} columns, ${RELATIONS.length} relations, ${ENUMS.length} enums`)

/* ---------- fonts, embedded so the PDF never depends on the machine ---------- */
const font = (pkg, file) => `data:font/woff2;base64,${readFileSync(join(ROOT, 'node_modules/@fontsource-variable', pkg, 'files', file)).toString('base64')}`
const css = readFileSync(join(HERE, 'style.css'), 'utf8')
  .replace('{{INTER}}', font('inter', 'inter-latin-wght-normal.woff2'))
  .replace('{{MONO}}', font('jetbrains-mono', 'jetbrains-mono-latin-wght-normal.woff2'))

const shield = `<svg viewBox="0 0 32 32" width="100%" height="100%" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"><path d="M16 5.5l8 3v7.2c0 5-3.4 9.2-8 10.8-4.6-1.6-8-5.8-8-10.8V8.5l8-3z"/><path d="M16 5.5v21"/></svg>`

/* ---------- cover ---------- */
const cover = `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>${css}
@page { size: A4; margin: 0 }
html, body { width: 210mm; height: 297mm; margin: 0; }
.cv { position: relative; width: 210mm; height: 297mm; overflow: hidden; color: #fff;
  background: radial-gradient(120% 70% at 85% 8%, #2a7bf0 0, transparent 55%), linear-gradient(165deg, #0b3a8c 0%, #0a2a66 55%, #071b44 100%); }
.cv::before { content: ''; position: absolute; inset: 0; opacity: .09;
  background-image: linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px); background-size: 26px 26px; }
.cv .in { position: relative; height: 100%; padding: 22mm 20mm 18mm; display: flex; flex-direction: column; }
.brand { display: flex; align-items: center; gap: 4mm; }
.brand .mk { width: 12mm; height: 12mm; border-radius: 3mm; background: rgba(255,255,255,.16); padding: 2.4mm; }
.brand .t { font-weight: 700; font-size: 13pt; letter-spacing: -.01em; } .brand .s { font-size: 8.4pt; opacity: .72; margin-top: 1pt; }
.mid { margin-top: auto; margin-bottom: auto; }
.kicker { font-size: 9pt; letter-spacing: .24em; text-transform: uppercase; font-weight: 650; color: #9cc3ff; margin-bottom: 7mm; }
.cv h1 { font-size: 40pt; line-height: 1.04; letter-spacing: -.03em; font-weight: 780; margin: 0 0 6mm; max-width: 160mm; }
.cv .sub { font-size: 13pt; line-height: 1.45; color: #cfe0ff; max-width: 138mm; }
.rule { width: 22mm; height: 1.4mm; background: #5aa0ff; margin: 9mm 0 0; border-radius: 1mm; }
.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4mm; margin-bottom: 10mm; }
.kpis div { border-top: 1px solid rgba(255,255,255,.28); padding-top: 3mm; }
.kpis b { display: block; font-size: 19pt; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.kpis span { font-size: 7.8pt; color: #b8d0f5; line-height: 1.35; display: block; margin-top: 1pt; }
.meta { display: flex; justify-content: space-between; align-items: flex-end; font-size: 8.4pt; color: #b8d0f5; line-height: 1.55; }
.meta b { color: #fff; font-weight: 650; }
.note { max-width: 105mm; font-size: 7.6pt; color: #8fb0e6; line-height: 1.45; }
</style></head><body><div class="cv"><div class="in">
  <div class="brand"><div class="mk">${shield}</div><div><div class="t">PT Tata Gemilang</div><div class="s">Outsourcing Management System</div></div></div>
  <div class="mid">
    <div class="kicker">Product Requirements Document</div>
    <h1>Satu sistem untuk setiap pos yang harus terisi.</h1>
    <div class="sub">Dari kontrak dan penempatan, perlengkapan dan pengadaan, sampai penagihan dan uang masuk — fitur, aturan bisnis, arsitektur kode, dan pemetaan database.</div>
    <div class="rule"></div>
  </div>
  <div class="kpis">
    <div><b>25</b><span>layar kerja di 7 kelompok menu</span></div>
    <div><b>${RULE_COUNT}</b><span>aturan bisnis ditegakkan di titik input</span></div>
    <div><b>${TABLES.length}</b><span>tabel database dalam rancangan, diperiksa terhadap model</span></div>
    <div><b>106</b><span>privilege di 24 modul, dengan sumber yang dapat ditelusuri</span></div>
  </div>
  <div class="meta">
    <div><b>Versi ${VERSION}</b> · ${DATE}<br>Status: front-end demonstrator, siap pilot dan penyusunan backend</div>
    <div class="note">Seluruh nama perusahaan, orang, alamat, dan angka dalam dokumen ini fiktif dan berasal dari data contoh aplikasi.</div>
  </div>
</div></div></body></html>`

/* ---------- body ---------- */
function buildBody(pageOf) {
  resetNumbering(); missing.length = 0
  const chapters = [ch1(), ch2(), ch3(), ch4(), ch5(), ch6(), ch7(), ch8(), ch9(), ch10(), ch11(), ch12(), appendixA(), appendixB(), appendixC()]

  const toc = headings.map((h) => {
    const p = pageOf?.get(`${h.level}|${h.no}|${h.title}`) ?? ''
    const cls = h.level === 1 ? 'l1' : 'l2'
    const n = h.level === 1 ? (h.no || (h.label ? h.label.replace('Lampiran ', '') : '')) : h.no
    return `<div class="toc-row ${cls}"><span class="n">${esc(n)}</span><span class="t">${esc(h.title)}</span><span class="p">${p || '00'}</span></div>`
  }).join('')

  const control = `<section><h1 class="chapter" style="break-before:auto"><span class="no">Dokumen</span>Informasi Dokumen</h1>
    ${table2([
      ['Judul', 'PRD — PT Tata Gemilang Outsourcing Management System'],
      ['Versi · tanggal', `${VERSION} · ${DATE}`],
      ['Status produk', 'Front-end demonstrator lengkap dengan data fiktif di peramban. Backend, autentikasi server, dan integrasi belum dibangun.'],
      ['Pembaca', 'Pemilik bisnis dan manajemen (Bab 1–3, 5, 7, 8), pengguna kunci per fungsi (Bab 4, 6, 7), tim teknis (Bab 9–11), pengelola proyek (Bab 12).'],
      ['Dokumen terkait', '<code>docs/PRD.md</code> (aturan R1–R42, versi teks) · <code>README.md</code>'],
    ])}
    <h2 style="margin-top:14pt">Cara membaca dokumen ini</h2>
    <ul>
      <li><b>Hijau, biru, amber, merah.</b> Kotak sorot hijau menandai hal yang terbukti, biru informasi, amber peringatan atau ilustrasi, merah risiko.</li>
      <li><b>R-nomor</b> seperti <span class="rule-id">R35</span> adalah ID aturan bisnis pada <code>docs/PRD.md</code>; setiap nomor merujuk satu aturan yang ditegakkan di aplikasi.</li>
      <li><b>Angka uang</b> ditulis penuh dengan pemisah ribuan koma (<code>IDR 1,072,778,000</code>), sesuai tampilan aplikasi dan tangkapan layar di sini.</li>
      <li><b>Tangkapan layar</b> diambil dari aplikasi yang berjalan, bukan mockup. Data di dalamnya fiktif.</li>
      <li><b>Ilustrasi vs bukti.</b> Skenario di Bab 7 adalah ilustrasi penggunaan di atas data contoh; perbandingan di Bab 8 adalah penilaian desain. Keduanya diberi label tegas, dan batas klaim dinyatakan di Bab 1 dan Bab 8.</li>
    </ul>
    <h2>Riwayat versi</h2>
    ${table2([[VERSION, `${DATE} — Rilis pertama: fitur lengkap fase 1, alur proses, aturan bisnis, arsitektur, pemetaan database ${TABLES.length} tabel, rencana pilot.`]])}
  </section>
  <section><h1 class="chapter"><span class="no">Isi</span>Daftar Isi</h1><div class="toc">${toc}</div></section>`

  return { html: `<!doctype html><html lang="id"><head><meta charset="utf-8"><style>${css}</style></head><body>${control}${chapters.join('')}</body></html>`, headings: headings.map((h) => ({ ...h })) }
}
function table2(rows) {
  return `<table class="tbl first-bold"><tbody>${rows.map((r) => `<tr><td class="k" style="width:24%">${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`
}

/* ---------- render ---------- */
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
async function render(html, path, opts) {
  const page = await browser.newPage()
  await page.setContent(html, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({ path, format: 'A4', printBackground: true, ...opts })
  await page.close()
}

const header = `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:7px;color:#64738d;padding:0 17mm;display:flex;justify-content:space-between;border-bottom:.5px solid #dde4ef;padding-bottom:3px"><span>PT Tata Gemilang · Outsourcing Management System — PRD</span><span>Versi ${VERSION} · ${DATE}</span></div>`
const footer = `<div style="width:100%;font-family:Arial,Helvetica,sans-serif;font-size:7px;color:#64738d;padding:0 17mm;display:flex;justify-content:space-between"><span>Seluruh nama, angka, dan data dalam dokumen ini fiktif</span><span>Halaman <span class="pageNumber"></span></span></div>`
const bodyOpts = { displayHeaderFooter: true, headerTemplate: header, footerTemplate: footer, margin: { top: '19mm', bottom: '19mm', left: '17mm', right: '17mm' } }

const py = (...args) => JSON.parse(execFileSync('python3', [join(HERE, 'postprocess.py'), ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }))

console.log('pass 1 …')
const first = buildBody(null)
await render(first.html, join(BUILD, 'body1.pdf'), bodyOpts)
writeFileSync(join(BUILD, 'headings.json'), JSON.stringify(first.headings))
const pages1 = py('pages', join(BUILD, 'body1.pdf'), join(BUILD, 'headings.json'))

console.log('pass 2 …')
const pageOf = new Map(pages1.map((h) => [`${h.level}|${h.no}|${h.title}`, h.page]))
const second = buildBody(pageOf)
await render(second.html, join(BUILD, 'body.pdf'), bodyOpts)
writeFileSync(join(BUILD, 'headings.json'), JSON.stringify(second.headings))
const pages2 = py('pages', join(BUILD, 'body.pdf'), join(BUILD, 'headings.json'))
const drift = pages2.filter((h) => pageOf.get(`${h.level}|${h.no}|${h.title}`) !== h.page)
if (drift.length) console.warn('WARNING: contents page numbers drifted between passes for', drift.length, 'headings')

await render(cover, join(BUILD, 'cover.pdf'), { margin: { top: '0', bottom: '0', left: '0', right: '0' }, displayHeaderFooter: false, preferCSSPageSize: true })
await browser.close()

writeFileSync(join(BUILD, 'headings.json'), JSON.stringify(pages2))
const summary = py('merge', join(BUILD, 'cover.pdf'), join(BUILD, 'body.pdf'), join(BUILD, 'headings.json'), OUT, `PRD — PT Tata Gemilang Outsourcing Management System (v${VERSION})`)

console.log(`wrote ${OUT}`)
console.log(`pages: ${summary.pages} (cover + ${summary.pages - 1}) · size: ${(summary.bytes / 1024 / 1024).toFixed(1)} MB · headings with a page: ${pages2.filter((h) => h.page).length}/${pages2.length}`)
if (missing.length) { console.error('MISSING FIGURES:', [...new Set(missing)].join(', ')); process.exitCode = 1 }
const unfound = pages2.filter((h) => !h.page)
if (unfound.length) { console.error('Headings not located in the PDF:', unfound.map((h) => h.title).join(' | ')); process.exitCode = 1 }
