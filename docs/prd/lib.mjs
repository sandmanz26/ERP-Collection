import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

export const ROOT = new URL('../../', import.meta.url).pathname
export const IMG_DIR = join(ROOT, 'docs/prd/img')

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/* ---------- headings, registered so the contents page can be built from them ---------- */

export const headings = []
let chapterNo = 0
let chapterLabel = null
let h2No = 0
let h3No = 0

export function resetNumbering() { headings.length = 0; chapterNo = 0; chapterLabel = null; h2No = 0; h3No = 0 }

export function chapter(title, bodyFn, { label } = {}) {
  if (!label) chapterNo += 1
  h2No = 0; h3No = 0
  chapterLabel = label ? label.replace(/^Lampiran /, '') : null
  const no = label ?? `Bab ${chapterNo}`
  headings.push({ level: 1, no: label ? '' : String(chapterNo), title, label })
  /* The body is a function so its h2() calls run after the chapter has its number. */
  const body = typeof bodyFn === 'function' ? bodyFn() : bodyFn
  return `<section><h1 class="chapter"><span class="no">${no}</span>${esc(title)}</h1>${body}</section>`
}
export function h2(title) {
  h2No += 1; h3No = 0
  const no = `${chapterLabel ?? chapterNo}.${h2No}`
  headings.push({ level: 2, no, title })
  return `<h2><span class="no">${no}</span>${esc(title)}</h2>`
}
export function h3(title) {
  h3No += 1
  return `<h3>${esc(title)}</h3>`
}

/* ---------- blocks ---------- */

export const callout = (kind, title, html) =>
  `<div class="callout ${kind}"><span class="k">${esc(title)}</span>${html}</div>`

export const stats = (items, cls = '') =>
  `<div class="stats ${cls}">${items.map((s) => `<div class="stat ${s.c ?? ''}"><div class="v ${s.sm ? 'sm' : ''}">${s.v}</div><div class="l">${s.l}</div></div>`).join('')}</div>`

export const chip = (text, kind = '') => `<span class="chip ${kind}">${text}</span>`

export function table(head, rows, { cls = '', num = [] } = {}) {
  const th = head.map((h, i) => `<th class="${num.includes(i) ? 'num' : ''}">${h}</th>`).join('')
  const tr = rows.map((r) => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'k' : ''} ${num.includes(i) ? 'num' : ''}">${c}</td>`).join('')}</tr>`).join('')
  return `<table class="tbl ${cls}"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}

const dataUri = (path) => {
  const ext = extname(path).slice(1)
  const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
  return `data:${mime};base64,${readFileSync(path).toString('base64')}`
}

/** A screenshot of the real application, framed. Missing files are loudly reported, never silently dropped. */
export const missing = []
export function shot(name, caption, { sidebar = false, h, width } = {}) {
  const file = join(IMG_DIR, `${name}.png`)
  if (!existsSync(file)) { missing.push(name); return `<div class="callout risk"><span class="k">Gambar hilang</span>${esc(name)}</div>` }
  /* The application's sidebar is 238 of 1440 px. Cropping it makes the content
     fill the page width, which is what makes the text in a screenshot readable. */
  const img = sidebar ? 'width:100%' : 'width:119.8%;margin-left:-19.8%'
  return `<figure ${width ? `style="width:${width}; margin-left:auto; margin-right:auto"` : ''}><div class="shot"${h ? ` style="height:${h}"` : ''}><img src="${dataUri(file)}" style="${img}" alt="${esc(caption)}"></div><figcaption>${caption}</figcaption></figure>`
}
export function phones(names, caption) {
  const imgs = names.map((n) => {
    const file = join(IMG_DIR, `${n}.png`)
    if (!existsSync(file)) { missing.push(n); return '' }
    return `<div class="phone"><img src="${dataUri(file)}" alt=""></div>`
  })
  return `<figure><div class="phones">${imgs.join('')}</div><figcaption style="text-align:center">${caption}</figcaption></figure>`
}

export const dot = (kind, text = '') => `<span class="dot ${kind}"></span>${text ? `<span class="mx">${text}</span>` : ''}`

/** Counts the lines of every .ts/.tsx/.css file under a source directory. */
export function loc(rel) {
  let n = 0, files = 0
  const walk = (dir) => {
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      if (statSync(p).isDirectory()) walk(p)
      else if (/\.(tsx?|css)$/.test(f)) { n += readFileSync(p, 'utf8').split('\n').length; files += 1 }
    }
  }
  walk(join(ROOT, rel))
  return { lines: n, files }
}

export const fmt = (n) => n.toLocaleString('en-US')
