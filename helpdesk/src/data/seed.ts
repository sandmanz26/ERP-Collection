import { addDays, addMinutes, startOfDay } from 'date-fns'
import { BUSINESS_HOURS, dueDates, policyFor } from '@/lib/sla'
import { quote } from '@/lib/rental'
import { ASSETS } from './assets'
import { ADDONS, ANNOUNCEMENTS, ASSET_CATEGORIES, BUILDINGS, CANNED, CATEGORIES, SPACES, TEAMS, USERS, VENDORS } from './reference'
import type { Activity, Booking, Notification, PendingReason, PmSchedule, Priority, Task, Ticket, TicketStatus } from './types'

/* deterministic RNG so every fresh load tells the same story */
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20261006)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const between = (a: number, b: number) => a + rnd() * (b - a)
const chance = (p: number) => rnd() < p
const weighted = <T,>(items: [T, number][]): T => {
  const total = items.reduce((a, [, w]) => a + w, 0)
  let r = rnd() * total
  for (const [v, w] of items) if ((r -= w) <= 0) return v
  return items[items.length - 1][0]
}

let seq = 0
const id = (p: string) => `${p}_${(++seq).toString(36)}${Math.floor(rnd() * 1e5).toString(36)}`

const NOW = new Date()
const minsAgo = (m: number) => addMinutes(NOW, -m)
const minsAhead = (m: number) => addMinutes(NOW, m)
const iso = (d: Date) => d.toISOString()

const requesters = USERS.filter((u) => u.role === 'requester' && u.id !== 'u_anisa' && !u.system)
const agentsByTeam = (teamId: string) => USERS.filter((u) => u.teamId === teamId && u.role === 'agent')
const manager = USERS.find((u) => u.id === 'u_dimas')!

/* ---------------------------------------------------------------- templates */

interface Tpl { cat: string; titles: string[]; desc: string; assetCat?: string; spaceKinds?: string[]; tags?: string[] }

const TPL: Tpl[] = [
  { cat: 'c_listrik', titles: ['Lampu area kerja mati', 'Stop kontak tidak ada aliran', 'Panel sering trip', 'Lampu emergency tidak menyala', 'Bau hangus dari box panel'], desc: 'Terjadi sejak shift pagi dan mengganggu pekerjaan di area ini.', assetCat: 'ac_listrik', spaceKinds: ['production', 'warehouse', 'office'], tags: ['listrik'] },
  { cat: 'c_utilitas', titles: ['Tekanan udara kompresor turun', 'Steam tidak stabil', 'Kebocoran pipa steam', 'Suara kasar dari kompresor', 'Suhu chiller naik'], desc: 'Mohon dicek karena berpengaruh ke mesin produksi.', assetCat: 'ac_utilitas', spaceKinds: ['production', 'utility'], tags: ['utilitas'] },
  { cat: 'c_ac', titles: ['AC tidak dingin', 'AC bocor menetes', 'AC berisik', 'Suhu ruangan terlalu panas'], desc: 'Ruangan terasa panas dan mengganggu kenyamanan kerja.', assetCat: 'ac_ac', spaceKinds: ['office', 'meeting', 'lab', 'production'], tags: ['ac'] },
  { cat: 'c_air', titles: ['Pipa air bocor', 'Toilet mampet', 'Air tidak mengalir', 'Keran patah', 'Pompa air berbunyi keras'], desc: 'Air menggenang dan mengganggu jalur kerja.', assetCat: 'ac_air', spaceKinds: ['restroom', 'utility', 'production'], tags: ['air'] },
  { cat: 'c_forklift', titles: ['Forklift tidak bisa angkat', 'Rem forklift kurang pakem', 'Ban forklift aus', 'Dock leveler macet', 'Hoist berbunyi saat naik'], desc: 'Mohon dicek sebelum dipakai lagi — mengganggu bongkar muat.', assetCat: 'ac_angkut', spaceKinds: ['warehouse'], tags: ['angkut'] },
  { cat: 'c_sipil', titles: ['Atap bocor saat hujan', 'Lantai retak di jalur forklift', 'Pintu roller door macet', 'Cat dinding mengelupas', 'Plafon jebol'], desc: 'Kondisi bangunan perlu diperbaiki sebelum bertambah parah.', assetCat: 'ac_gedung', spaceKinds: ['warehouse', 'production', 'office'], tags: ['bangunan'] },
  { cat: 'c_kebersihan', titles: ['Tumpahan oli di lantai', 'Tempat sampah penuh', 'Toilet kotor', 'Sabun habis di toilet', 'Limbah menumpuk'], desc: 'Mohon dibersihkan.', spaceKinds: ['production', 'restroom', 'warehouse'], tags: ['kebersihan'] },
  { cat: 'c_hama', titles: ['Ada tikus di gudang', 'Kecoa di kantin', 'Sarang tawon dekat loading dock'], desc: 'Terlihat berulang dalam dua hari ini.', spaceKinds: ['warehouse'], tags: ['hama'] },
  { cat: 'c_k3', titles: ['APAR kosong / kadaluarsa', 'Jalur evakuasi terhalang palet', 'Lantai licin tanpa tanda', 'Pagar pengaman mesin lepas', 'Hydrant bocor'], desc: 'Berpotensi mencelakakan. Mohon segera dicek.', assetCat: 'ac_k3', spaceKinds: ['production', 'warehouse'], tags: ['k3'] },
  { cat: 'c_it', titles: ['Jaringan lambat', 'Printer tidak bisa cetak', 'Komputer scanning hang', 'CCTV tidak merekam'], desc: 'Mengganggu pekerjaan administrasi.', assetCat: 'ac_it', spaceKinds: ['office', 'warehouse'], tags: ['it'] },
  { cat: 'c_lain', titles: ['Permintaan pindah meja', 'Papan nama area rusak', 'Kunci loker hilang', 'Minta pemasangan rak'], desc: 'Mohon dibantu.', spaceKinds: ['office', 'production'], tags: ['umum'] },
]

const AGENT_REPLIES = [
  'Terima kasih, laporan sudah kami terima. Teknisi akan segera cek.',
  'Kami sedang menuju lokasi. Mohon area bisa diakses.',
  'Penyebab sudah ditemukan. Perbaikan kami lanjutkan.',
  'Sparepart sedang dicarikan, kami kabari estimasi selesainya.',
  'Vendor sudah kami hubungi dan dijadwalkan datang.',
]
const RESOLUTIONS = [
  'Komponen rusak sudah diganti dan diuji — normal kembali.',
  'Unit direset dan dibersihkan. Dipantau 30 menit, aman.',
  'Pengaturan diperbaiki. Kabari kalau muncul lagi.',
  'Vendor sudah selesai memperbaiki dan menyerahkan laporan kerja.',
  'Sudah dibersihkan dan ditambahkan ke jadwal rutin supaya tidak berulang.',
  'Dipasang pengaman baru dan area sudah diberi tanda.',
]
const RATING_NOTES: Record<number, string[]> = { 5: ['Cepat, terima kasih!', 'Rapi dan jelas informasinya.'], 3: ['Beres tapi harus saya follow-up dulu.'], 1: ['Terlalu lama.'] }

/* ---------------------------------------------------------------- ticket factory */

function wall(from: Date, minutes: number, calendar: '24x7' | 'business') {
  let d = addMinutes(from, minutes)
  if (calendar === '24x7') return d
  for (let g = 0; g < 10; g++) {
    const mins = d.getHours() * 60 + d.getMinutes()
    const working = BUSINESS_HOURS.days.includes(d.getDay())
    if (working && mins >= BUSINESS_HOURS.startMin && mins < BUSINESS_HOURS.endMin) return d
    const next = new Date(d)
    if (!working || mins >= BUSINESS_HOURS.endMin) next.setDate(next.getDate() + 1)
    next.setHours(7, Math.floor(rnd() * 40), 0, 0)
    d = next
  }
  return d
}

interface Spec {
  tpl: Tpl
  title?: string
  createdAt: Date
  priority?: Priority
  status: TicketStatus
  requesterId: string
  assigneeId?: string
  spaceId?: string
  assetId?: string
  pendingReason?: PendingReason
  description?: string
  channel?: Ticket['channel']
  etaAt?: Date
  hazard?: boolean
  impact?: Ticket['impact']
  reporterName?: string
  /** minutes after creation that work finished */
  resolveAfterMin?: number
  confirmed?: boolean
  extra?: Activity[]
  rating?: number | null
}

function spaceFor(tpl: Tpl, assetSpace?: string) {
  if (assetSpace) return assetSpace
  const pool = SPACES.filter((s) => (tpl.spaceKinds ?? ['office']).includes(s.kind))
  return pick(pool.length ? pool : SPACES).id
}

function build(spec: Spec): Ticket {
  const cat = CATEGORIES.find((c) => c.id === spec.tpl.cat)!
  const priority = spec.priority ?? cat.defaultPriority
  const created = spec.createdAt
  const dues = dueDates(created, priority)
  const policy = policyFor(priority)
  const requester = USERS.find((u) => u.id === spec.requesterId)!
  const team = TEAMS.find((t) => t.id === cat.teamId)!

  let assetId = spec.assetId
  if (!assetId && spec.tpl.assetCat && chance(0.5)) {
    const pool = ASSETS.filter((a) => a.categoryId === spec.tpl.assetCat)
    if (pool.length) assetId = pick(pool).id
  }
  const asset = ASSETS.find((a) => a.id === assetId)
  const spaceId = spec.spaceId ?? spaceFor(spec.tpl, asset?.spaceId)

  const activity: Activity[] = [{ id: id('ac'), at: iso(created), actorId: requester.id, type: 'created', body: spec.description ?? spec.tpl.desc }]
  const assignee = spec.assigneeId ?? (spec.status === 'new' ? undefined : pick(agentsByTeam(team.id).length ? agentsByTeam(team.id) : [manager]).id)

  let t = created
  let firstResponseAt: Date | undefined
  let pausedMs = 0
  let pausedAt: Date | undefined
  let resolvedAt: Date | undefined
  let current: TicketStatus = 'new'
  const log = (type: Activity['type'], at: Date, actorId: string | null, extra: Partial<Activity> = {}) => activity.push({ id: id('ac'), at: iso(at), actorId, type, ...extra })

  if (spec.status !== 'new' && assignee) {
    const lag = priority === 'p1' ? between(2, 10) : between(3, policy.responseMin * 0.85)
    t = wall(created, lag, policy.calendar)
    if (t > NOW) t = NOW
    log('assign', t, 'u_rina', { to: assignee, body: `Ditugaskan ke ${USERS.find((u) => u.id === assignee)?.name}` })
    current = 'assigned'
    firstResponseAt = chance(0.9) ? t : wall(t, between(policy.responseMin * 0.9, policy.responseMin * 1.4), policy.calendar)
    if (firstResponseAt > NOW) firstResponseAt = new Date(NOW.getTime() - 60_000)
    log('comment', firstResponseAt, assignee, { body: pick(AGENT_REPLIES) })
  }

  if (['in_progress', 'pending', 'done'].includes(spec.status) && assignee) {
    t = new Date(Math.min(NOW.getTime() - 30_000, addMinutes(firstResponseAt ?? t, between(10, 60)).getTime()))
    log('status', t, assignee, { from: current, to: 'in_progress' })
    current = 'in_progress'
  }

  if (spec.status === 'pending' && assignee) {
    t = new Date(Math.min(NOW.getTime() - 20_000, addMinutes(t, between(20, 120)).getTime()))
    pausedAt = t
    log('status', t, assignee, { from: 'in_progress', to: 'pending', body: spec.pendingReason === 'parts' ? 'Menunggu sparepart' : spec.pendingReason === 'vendor' ? 'Menunggu vendor' : 'Menunggu pelapor' })
    current = 'pending'
  }

  if (spec.status === 'done' && assignee) {
    if (chance(0.22)) {
      const ps = addMinutes(t, between(10, 40))
      const pe = addMinutes(ps, between(60, 300))
      pausedMs += pe.getTime() - ps.getTime()
      log('status', ps, assignee, { from: 'in_progress', to: 'pending', body: 'Menunggu sparepart' })
      log('status', pe, assignee, { from: 'pending', to: 'in_progress' })
      t = pe
    }
    const work = spec.resolveAfterMin ?? policy.resolveMin * between(0.2, 1.3)
    let r = wall(created, work, policy.calendar)
    if (r <= t) r = addMinutes(t, 15)
    if (r > NOW) r = new Date(NOW.getTime() - 120_000)
    resolvedAt = r
    log('status', r, assignee, { from: 'in_progress', to: 'done', body: pick(RESOLUTIONS) })
    current = 'done'
  }

  if (spec.status === 'cancelled') {
    t = addMinutes(created, between(20, 600))
    log('status', t, requester.id, { from: 'new', to: 'cancelled', body: 'Sudah teratasi sendiri, mohon dibatalkan.' })
    current = 'cancelled'
  }

  if (spec.etaAt && assignee && current !== 'done' && current !== 'cancelled') {
    log('eta', new Date(Math.min(NOW.getTime() - 15_000, addMinutes(created, 25).getTime())), assignee, { to: iso(spec.etaAt), body: 'Estimasi selesai ditetapkan' })
  }

  if (spec.extra) activity.push(...spec.extra)
  activity.sort((a, b) => a.at.localeCompare(b.at))

  const updatedAt = activity[activity.length - 1].at
  const confirmed = current === 'done' && (spec.confirmed ?? (resolvedAt && NOW.getTime() - resolvedAt.getTime() > 3 * 86_400_000))
  let rating: Ticket['rating']
  if (confirmed && spec.rating !== null && chance(0.65)) {
    const score = spec.rating ?? weighted([[5, 68], [3, 22], [1, 10]])
    rating = { score, comment: chance(0.4) ? pick(RATING_NOTES[score] ?? ['OK.']) : undefined, at: iso(addMinutes(resolvedAt ?? created, between(30, 2000))) }
  }

  const tags = [...(spec.tpl.tags ?? [])]
  if (spec.hazard) tags.push('berbahaya')
  if (priority === 'p1') tags.push('darurat')

  const impact: Ticket['impact'] = spec.impact ?? (priority === 'p1' ? 'stop' : priority === 'p2' ? 'partial' : 'none')

  return {
    id: id('tk'), number: '',
    title: spec.title ?? pick(spec.tpl.titles),
    description: spec.description ?? spec.tpl.desc,
    categoryId: cat.id, priority, status: current,
    pendingReason: current === 'pending' ? spec.pendingReason ?? 'parts' : undefined,
    requesterId: requester.id, reporterName: spec.reporterName, assigneeId: assignee, teamId: team.id, spaceId, assetId,
    channel: spec.channel ?? weighted<Ticket['channel']>([['portal', 40], ['qr', 20], ['whatsapp', 18], ['phone', 12], ['walk_in', 10]]),
    impact, hazard: spec.hazard,
    createdAt: iso(created), updatedAt,
    etaAt: spec.etaAt && current !== 'done' && current !== 'cancelled' ? iso(spec.etaAt) : undefined,
    firstResponseAt: firstResponseAt ? iso(firstResponseAt) : undefined,
    resolvedAt: resolvedAt ? iso(resolvedAt) : undefined,
    confirmedAt: confirmed && resolvedAt ? iso(addMinutes(resolvedAt, between(30, 3000))) : undefined,
    pausedAt: pausedAt ? iso(pausedAt) : undefined, pausedMs, ...dues,
    tags, taskIds: [], rating,
    resolutionNote: resolvedAt ? activity.filter((a) => a.type === 'status' && a.to === 'done').at(-1)?.body : undefined,
    activity,
  }
}

/* ---------------------------------------------------------------- the book */

const defaultEta = (priority: Priority, created: Date) => {
  const h = { p1: between(1.5, 3), p2: between(4, 9), p3: between(20, 40), p4: between(48, 90) }[priority]
  const e = addMinutes(created, h * 60)
  return e < NOW && chance(0.6) ? addMinutes(NOW, between(60, 600)) : e
}

function ticketSpecs(): Spec[] {
  const specs: Spec[] = []
  const T = (cat: string, i = 0) => TPL.filter((t) => t.cat === cat)[i] ?? TPL.find((t) => t.cat === cat)!

  /* cerita yang bisa dipakai untuk demo */
  specs.push(
    { tpl: T('c_utilitas'), title: 'Boiler 1 trip — steam ke Line 1–3 berhenti', description: 'Boiler 1 trip pukul 07:40, alarm low water. Steam ke Line 1–3 hilang, produksi berhenti. Boiler 2 sedang standby dan belum dinyalakan.', createdAt: minsAgo(130), priority: 'p1', status: 'in_progress', requesterId: 'u_anisa', assigneeId: 'u_budi', assetId: 'a_boiler1', spaceId: 'sp_boiler', channel: 'phone', impact: 'stop', etaAt: minsAhead(80) },
    { tpl: T('c_utilitas', 3), title: 'Kompresor 2 suhu tinggi dan sering unload', description: 'Suhu discharge kompresor 2 mencapai 108 °C dan mesin sering unload. Sementara beban dialihkan ke kompresor 1.', createdAt: minsAgo(75), priority: 'p2', status: 'assigned', requesterId: 'u_galih', assigneeId: 'u_budi', assetId: 'a_komp2', spaceId: 'sp_kompresor', channel: 'qr', impact: 'partial', etaAt: minsAhead(300) },
    { tpl: T('c_sipil'), title: 'Atap Gudang Barang Jadi bocor saat hujan', description: 'Air menetes di dekat rak C-12, ada pallet barang jadi yang mulai basah. Sudah ditutup terpal sementara.', createdAt: minsAgo(14), priority: 'p2', status: 'new', requesterId: 'u_bayu', assetId: 'a_atap_gd', spaceId: 'sp_gd_jadi', channel: 'whatsapp', impact: 'partial' },
    { tpl: T('c_forklift', 1), title: 'Rem Forklift FL-02 tidak pakem', description: 'Pedal rem terasa dalam dan forklift meluncur saat membawa beban. Unit sudah diparkir dan diberi tanda jangan dipakai.', createdAt: minsAgo(50), priority: 'p1', status: 'assigned', requesterId: 'u_kevin', assigneeId: 'u_budi', assetId: 'a_fl02', spaceId: 'sp_dock', channel: 'walk_in', impact: 'partial', hazard: true, etaAt: minsAhead(200) },
    { tpl: T('c_listrik'), title: 'Lampu High Bay Line 2 mati 6 titik', description: 'Enam titik lampu high bay di sisi timur Line 2 mati, area gelap saat shift malam.', createdAt: minsAgo(60 * 20), priority: 'p3', status: 'in_progress', requesterId: 'u_galih', assigneeId: 'u_agus', assetId: 'a_hibay2', spaceId: 'sp_line2', channel: 'qr', etaAt: minsAhead(60 * 15) },
    { tpl: T('c_ac'), title: 'AC Lab QC tidak dingin, suhu 28 °C', description: 'Suhu lab QC naik ke 28 °C. Sampel uji tidak boleh lebih dari 25 °C — pengujian tertunda.', createdAt: minsAgo(60 * 30), priority: 'p2', status: 'pending', pendingReason: 'parts', requesterId: 'u_farah', assigneeId: 'u_budi', assetId: 'a_ac_qc', spaceId: 'sp_lab', channel: 'portal', impact: 'partial', etaAt: minsAhead(60 * 32) },
    { tpl: T('c_air', 4), title: 'Pompa IPAL berbunyi kasar', description: 'Pompa duty IPAL berbunyi kasar sejak kemarin dan arus naik.', createdAt: minsAgo(60 * 28), priority: 'p3', status: 'in_progress', requesterId: 'u_laras', assigneeId: 'u_wayan', assetId: 'a_pump_ipal', spaceId: 'sp_ipal', channel: 'portal', etaAt: minsAgo(150) },
    { tpl: T('c_it', 3), title: 'Palang parkir dan access control macet', description: 'Palang tidak mau naik saat kartu digesek; antrean kendaraan di pagi hari.', createdAt: minsAgo(60 * 9), priority: 'p3', status: 'assigned', requesterId: 'u_kevin', assigneeId: 'u_yoga', assetId: 'a_gate', spaceId: 'sp_parkir', channel: 'phone', etaAt: minsAhead(60 * 6) },
    { tpl: T('c_hama'), title: 'Tikus di Gudang Bahan Baku', description: 'Ditemukan kotoran tikus di dekat rak bahan baku dan karung terkoyak.', createdAt: minsAgo(40), priority: 'p3', status: 'new', requesterId: 'u_bayu', spaceId: 'sp_gd_baku', channel: 'whatsapp' },
    { tpl: T('c_k3'), title: 'Jalur evakuasi Line 3 terhalang palet', description: 'Palet bahan menumpuk di depan pintu darurat Line 3 sejak kemarin sore.', createdAt: minsAgo(200), priority: 'p2', status: 'in_progress', requesterId: 'u_laras', assigneeId: 'u_maya', spaceId: 'sp_line3', channel: 'qr', hazard: true, etaAt: minsAhead(40) },
  )

  /* cerita Anisa — supervisor produksi */
  specs.push(
    { tpl: T('c_listrik', 0), title: 'Lampu High Bay Line 1 redup di sisi barat', description: 'Beberapa lampu di sisi barat Line 1 meredup dan berkedip, operator mengeluh pusing saat shift malam.', createdAt: minsAgo(60 * 26), priority: 'p3', status: 'assigned', requesterId: 'u_anisa', assigneeId: 'u_agus', assetId: 'a_hibay1', spaceId: 'sp_line1', channel: 'portal', etaAt: minsAhead(60 * 16) },
    { tpl: T('c_air', 1), title: 'Toilet produksi bocor di wastafel', description: 'Air menetes dari pipa bawah wastafel dan lantai licin.', createdAt: minsAgo(60 * 30), priority: 'p3', status: 'done', requesterId: 'u_anisa', assigneeId: 'u_budi', spaceId: 'sp_wc_prod', channel: 'portal', confirmed: false },
    { tpl: T('c_kebersihan', 0), title: 'Tumpahan oli di jalur Line 1', description: 'Tumpahan oli hidrolik di jalur kerja operator, sudah ditaburi pasir tapi masih licin.', createdAt: minsAgo(60 * 24 * 9), status: 'done', requesterId: 'u_anisa', assigneeId: 'u_wayan', spaceId: 'sp_line1', rating: 5 },
    { tpl: T('c_it', 1), title: 'Printer label packing tidak bisa cetak', description: 'Printer label di Area Packing menolak job cetak sejak pagi.', createdAt: minsAgo(60 * 24 * 20), status: 'done', requesterId: 'u_anisa', assigneeId: 'u_yoga', spaceId: 'sp_packing', rating: 3 },
  )

  /* laporan anonim dari QR */
  const guestTitles: [string, string, string][] = [
    ['Lampu mati depan toilet', 'c_listrik', 'sp_wc_prod'],
    ['Kran wastafel patah', 'c_air', 'sp_wc_prod'],
    ['Sampah belum diangkut', 'c_kebersihan', 'sp_packing'],
  ]
  guestTitles.forEach(([title, cat, space], i) => specs.push({ tpl: T(cat), title, createdAt: minsAgo(60 * (4 + i * 17)), status: i === 0 ? 'in_progress' : i === 1 ? 'assigned' : 'done', requesterId: 'u_guest', reporterName: ['Pak Joko (Operator)', 'Ibu Sari (Packing)', 'Pak Dede (Satpam)'][i], spaceId: space, channel: 'qr', assigneeId: i === 2 ? 'u_wayan' : undefined, etaAt: i < 2 ? minsAhead(60 * (6 + i * 8)) : undefined }))

  /* riwayat */
  const weights: [string, number][] = [['c_listrik', 14], ['c_utilitas', 9], ['c_ac', 12], ['c_air', 10], ['c_forklift', 7], ['c_sipil', 8], ['c_kebersihan', 11], ['c_hama', 3], ['c_k3', 6], ['c_it', 9], ['c_lain', 4]]
  for (let day = 0; day < 92; day++) {
    const dow = addDays(NOW, -day).getDay()
    const base = dow === 0 ? 0.2 : dow === 6 ? 1 : day < 21 ? 3.4 : 2.3
    const n = Math.max(0, Math.round(base + between(-1.2, 1.4)))
    for (let k = 0; k < n; k++) {
      const cat = weighted(weights)
      const tpl = pick(TPL.filter((t) => t.cat === cat))
      const hour = between(7, 16)
      const created = new Date(NOW.getTime() - day * 86_400_000)
      created.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), 0, 0)
      if (created > NOW) continue
      const age = (NOW.getTime() - created.getTime()) / 86_400_000
      const status: TicketStatus = age < 1
        ? weighted<TicketStatus>([['new', 14], ['assigned', 20], ['in_progress', 38], ['pending', 10], ['done', 18]])
        : age < 4
        ? weighted<TicketStatus>([['assigned', 8], ['in_progress', 22], ['pending', 10], ['done', 56], ['cancelled', 2]])
        : age < 8
        ? weighted<TicketStatus>([['in_progress', 3], ['pending', 3], ['done', 92], ['cancelled', 2]])
        : weighted<TicketStatus>([['done', 96], ['cancelled', 4]])
      const def = CATEGORIES.find((c) => c.id === cat)!.defaultPriority
      const order: Priority[] = ['p1', 'p2', 'p3', 'p4']
      const idx = order.indexOf(def)
      const p = weighted<number>([[idx, 62], [Math.max(0, idx - 1), 22], [Math.min(3, idx + 1), 14], [0, 2]])
      const priority = order[p]
      const open = ['assigned', 'in_progress', 'pending'].includes(status)
      specs.push({
        tpl, createdAt: created, priority, status, requesterId: pick(requesters).id,
        pendingReason: status === 'pending' ? pick<PendingReason>(['parts', 'vendor', 'production']) : undefined,
        etaAt: open ? defaultEta(priority, created) : undefined,
        hazard: cat === 'c_k3' && chance(0.5) ? true : undefined,
      })
    }
  }
  return specs
}

function buildAll() {
  const specs = ticketSpecs().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const tickets = specs.map(build)
  tickets.forEach((t, i) => { t.number = `TK-${1000 + i + 1}` })
  return tickets
}

/* ---------------------------------------------------------------- jadwal maintenance */

interface PmDef { id: string; name: string; asset?: string; space?: string; freq: PmSchedule['frequency']; dueIn: number; last: number | null; team: string; assignee?: string; vendor?: string; est: number; list: string[] }

const PM_DEFS: PmDef[] = [
  { id: 'pm_boiler_d', name: 'Cek harian boiler (level air, tekanan, blow down)', asset: 'a_boiler2', freq: 'daily', dueIn: 0, last: 1, team: 'tm_mek', assignee: 'u_budi', est: 30, list: ['Cek level air dan tekanan steam', 'Blow down sesuai prosedur', 'Cek burner dan suhu cerobong', 'Catat di logbook'] },
  { id: 'pm_boiler_m', name: 'Servis boiler bulanan', asset: 'a_boiler1', freq: 'monthly', dueIn: -2, last: 32, team: 'tm_mek', vendor: 'v_boiler', est: 240, list: ['Cek dan bersihkan burner', 'Uji safety valve', 'Cek kondisi tube', 'Uji pompa feed water'] },
  { id: 'pm_komp', name: 'Servis kompresor (filter, oli, drain)', asset: 'a_komp1', freq: 'monthly', dueIn: 5, last: 25, team: 'tm_mek', assignee: 'u_budi', est: 120, list: ['Ganti filter udara', 'Cek level oli', 'Drain kondensat', 'Cek suhu dan tekanan kerja'] },
  { id: 'pm_ct', name: 'Perawatan cooling tower & dosing', asset: 'a_ct1', freq: 'monthly', dueIn: 8, last: 22, team: 'tm_mek', assignee: 'u_budi', est: 120, list: ['Cek level basin', 'Dosing biocide', 'Cek nozzle dan fill', 'Grease bearing fan'] },
  { id: 'pm_genset', name: 'Uji beban genset', asset: 'a_genset', freq: 'monthly', dueIn: 3, last: 27, team: 'tm_elk', assignee: 'u_agus', vendor: undefined, est: 90, list: ['Cek bahan bakar, oli, coolant', 'Jalankan dengan beban 30 menit', 'Catat tegangan dan frekuensi', 'Uji perpindahan ATS'] },
  { id: 'pm_panel', name: 'Thermografi panel LVMDP', asset: 'a_lvmdp', freq: 'semiannual', dueIn: 40, last: 142, team: 'tm_elk', vendor: 'v_daya', est: 240, list: ['Scan termal koneksi', 'Kencangkan terminal', 'Cek breaker dan kontaktor', 'Laporan hasil'] },
  { id: 'pm_hydrant', name: 'Uji jalan pompa hydrant', asset: 'a_hydrant', freq: 'weekly', dueIn: 1, last: 6, team: 'tm_k3', assignee: 'u_maya', est: 45, list: ['Jalankan pompa 15 menit', 'Cek BBM dan aki', 'Cek tekanan discharge', 'Catat jam kerja'] },
  { id: 'pm_apar', name: 'Inspeksi APAR (seluruh area)', asset: 'a_apar_prod', freq: 'monthly', dueIn: -4, last: 34, team: 'tm_k3', assignee: 'u_maya', est: 180, list: ['Cek tekanan indikator', 'Cek segel dan selang', 'Ganti yang kadaluarsa', 'Perbarui tag inspeksi'] },
  { id: 'pm_fap', name: 'Uji fire alarm & detektor', asset: 'a_fap', freq: 'quarterly', dueIn: 33, last: 58, team: 'tm_k3', vendor: 'v_fire', est: 300, list: ['Uji 25% detektor', 'Cek sirine dan strobe', 'Cek baterai panel', 'Konfirmasi sinyal ke pos'] },
  { id: 'pm_tandon', name: 'Pembersihan tandon air bersih', asset: 'a_tandon', freq: 'semiannual', dueIn: 25, last: 156, team: 'tm_hk', vendor: 'v_pompa', est: 360, list: ['Kosongkan dan bersihkan tandon', 'Disinfeksi', 'Cek kebocoran', 'Uji kualitas air'] },
  { id: 'pm_ipal', name: 'Cek harian IPAL', asset: 'a_ipal', freq: 'daily', dueIn: 0, last: 1, team: 'tm_hk', assignee: 'u_wayan', est: 30, list: ['Cek pH dan DO', 'Cek pompa dan blower', 'Buang lumpur berlebih', 'Catat hasil'] },
  { id: 'pm_ac', name: 'Cuci AC kantor & meeting', asset: 'a_ac_kantor', freq: 'quarterly', dueIn: 12, last: 79, team: 'tm_mek', vendor: 'v_dingin', est: 480, list: ['Cuci indoor dan outdoor', 'Cek freon', 'Cek drain', 'Cek thermostat'] },
  { id: 'pm_forklift', name: 'Servis forklift FL-01', asset: 'a_fl01', freq: 'monthly', dueIn: 7, last: 23, team: 'tm_mek', vendor: 'v_fork', est: 150, list: ['Ganti oli dan filter', 'Cek rem dan kemudi', 'Cek mast dan chain', 'Cek ban dan lampu'] },
  { id: 'pm_hoist', name: 'Inspeksi overhead crane Line 3', asset: 'a_hoist', freq: 'quarterly', dueIn: -8, last: 99, team: 'tm_mek', vendor: 'v_fork', est: 240, list: ['Cek wire rope dan hook', 'Uji limit switch', 'Uji beban', 'Pelumasan'] },
  { id: 'pm_toilet', name: 'Kebersihan toilet produksi (3×/hari)', space: 'sp_wc_prod', freq: 'daily', dueIn: 0, last: 1, team: 'tm_hk', assignee: 'u_wayan', est: 40, list: ['Bersihkan dan sikat', 'Isi sabun dan tisu', 'Kosongkan sampah'] },
  { id: 'pm_hama', name: 'Pest control seluruh area', space: 'sp_gd_baku', freq: 'monthly', dueIn: 14, last: 16, team: 'tm_hk', vendor: 'v_hama', est: 240, list: ['Penyemprotan area gudang', 'Cek perangkap tikus', 'Laporan temuan'] },
  { id: 'pm_k3', name: 'Inspeksi K3 area produksi', space: 'sp_line1', freq: 'weekly', dueIn: 2, last: 5, team: 'tm_k3', assignee: 'u_maya', est: 90, list: ['Jalur evakuasi bebas hambatan', 'Pagar pengaman mesin terpasang', 'APAR di tempat', 'Rambu dan marka jelas'] },
  { id: 'pm_cctv', name: 'Cek CCTV & NVR', asset: 'a_nvr', freq: 'weekly', dueIn: -1, last: 8, team: 'tm_it', assignee: 'u_yoga', est: 45, list: ['Semua kamera merekam', 'Retensi penyimpanan', 'Bersihkan lensa luar'] },
]

function buildPm() {
  return PM_DEFS.map<PmSchedule>((p) => ({
    id: p.id, name: p.name, assetId: p.asset, spaceId: p.space, frequency: p.freq,
    nextDueAt: iso(new Date(startOfDay(addDays(NOW, p.dueIn)).getTime() + (8 + (p.est > 200 ? 0 : 1)) * 3_600_000)),
    lastDoneAt: p.last == null ? undefined : iso(addDays(NOW, -p.last)),
    checklist: p.list, teamId: p.team, assigneeId: p.assignee, vendorId: p.vendor, active: true, estMinutes: p.est,
  }))
}

function taskFromTicket(t: Ticket, n: number): Task | null {
  if (!t.assigneeId || ['new', 'cancelled'].includes(t.status)) return null
  if (t.priority !== 'p1' && !(t.priority === 'p2' && chance(0.7)) && !chance(0.18)) return null
  const done = t.status === 'done'
  const created = new Date(new Date(t.firstResponseAt ?? t.createdAt).getTime() + 5 * 60_000)
  const started = addMinutes(created, between(10, 90))
  const status: Task['status'] = done ? 'completed' : t.status === 'pending' ? 'on_hold' : t.status === 'in_progress' ? 'in_progress' : 'open'
  const task: Task = {
    id: id('tg'), number: `MT-${3000 + n}`, title: t.title, type: 'corrective', status, priority: t.priority,
    assetId: t.assetId, spaceId: t.spaceId, ticketId: t.id, assigneeId: t.assigneeId, createdAt: iso(created), scheduledFor: iso(started),
    dueAt: t.etaAt ?? t.dueResolveAt, startedAt: status === 'open' ? undefined : iso(started), completedAt: done ? t.resolvedAt : undefined,
    checklist: [
      { id: id('ck'), text: 'Amankan area dan isolasi sumber energi', done: done || status === 'in_progress' },
      { id: id('ck'), text: 'Cari penyebab', done: done || status === 'in_progress' },
      { id: id('ck'), text: 'Perbaiki atau ganti', done },
      { id: id('ck'), text: 'Uji dan konfirmasi ke pelapor', done },
    ],
    timeLogs: status === 'open' ? [] : [{ id: id('tl'), userId: t.assigneeId, minutes: Math.round(between(25, 180)), at: iso(started), note: 'Diagnosa dan perbaikan di lokasi' }],
    materials: done && chance(0.5) ? [{ id: id('mt'), name: pick(['Kontaktor 25A', 'Selang hidrolik', 'Kapasitor 35µF', 'Sensor suhu', 'Closer pintu', 'Lampu LED 150W', 'Ball valve 3/4"']), qty: Math.ceil(between(1, 3)), unitCost: Math.round(between(35, 650)) * 1000 }] : [],
    completionNote: done ? t.resolutionNote : undefined,
  }
  t.taskIds.push(task.id)
  t.activity.push({ id: id('ac'), at: task.createdAt, actorId: t.assigneeId, type: 'task', body: `Membuat tugas ${task.number}`, to: task.id })
  t.activity.sort((a, b) => a.at.localeCompare(b.at))
  return task
}

function buildTasks(tickets: Ticket[], pms: PmSchedule[]) {
  const out: Task[] = []
  let n = 0
  tickets.forEach((t) => { const k = taskFromTicket(t, n + 1); if (k) { out.push(k); n++ } })
  pms.forEach((pm) => {
    const def = PM_DEFS.find((d) => d.id === pm.id)!
    const mk = (status: Task['status'], when: Date): Task => {
      const done = status === 'completed'
      n++
      const late = done && chance(0.18)
      return {
        id: id('tg'), number: `MT-${3000 + n}`, title: pm.name, type: 'preventive', status, priority: ASSETS.find((a) => a.id === pm.assetId)?.criticality === 'critical' ? 'p2' : 'p3',
        assetId: pm.assetId, spaceId: pm.spaceId ?? ASSETS.find((a) => a.id === pm.assetId)?.spaceId, pmId: pm.id, assigneeId: pm.assigneeId ?? (pm.vendorId ? undefined : pick(agentsByTeam(pm.teamId).concat([USERS.find((u) => u.id === 'u_budi')!])).id),
        vendorId: pm.vendorId, createdAt: iso(addDays(when, -3)), scheduledFor: iso(when), dueAt: iso(addMinutes(when, 24 * 60)),
        startedAt: done || status === 'in_progress' ? iso(when) : undefined, completedAt: done ? iso(addMinutes(when, pm.estMinutes + (late ? 60 * 30 : 0))) : undefined,
        checklist: pm.checklist.map((text, i) => ({ id: id('ck'), text, done: done || (status === 'in_progress' && i < 2) })),
        timeLogs: done ? [{ id: id('tl'), userId: pm.assigneeId ?? 'u_budi', minutes: pm.estMinutes, at: iso(when), note: 'Pekerjaan rutin' }] : [],
        materials: [], vendorCost: pm.vendorId && done ? Math.round(between(2, 14)) * 1_000_000 : undefined,
        completionNote: done ? 'Semua poin dicek, tidak ada temuan.' : undefined,
      }
    }
    if (def.last != null) out.push(mk('completed', addDays(NOW, -def.last)))
    const due = new Date(pm.nextDueAt)
    const daysTo = (due.getTime() - NOW.getTime()) / 86_400_000
    if (daysTo < 7) out.push(mk(daysTo < -3 ? 'open' : daysTo < 0 ? 'scheduled' : daysTo < 1 ? 'in_progress' : 'scheduled', due))
  })
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/* ---------------------------------------------------------------- reservasi */

const EVENTS = ['Briefing shift', 'Meeting mingguan produksi', 'Review anggaran', 'Training SOP baru', 'Meeting vendor', 'Interview kandidat', 'Audit internal', 'Rapat K3', 'Presentasi pemasaran', 'Evaluasi bulanan']
const EXTERNAL = [
  { name: 'Pak Hendra', company: 'PT Safe Fire Indonesia', phone: '0812-9000-1001', title: 'Pelatihan pemadam kebakaran', space: 'sp_training' },
  { name: 'Ibu Marlina', company: 'Koperasi Karyawan Mandiri', phone: '0813-9000-1002', title: 'Rapat anggota tahunan', space: 'sp_aula' },
  { name: 'Pak Tegar', company: 'SMK Negeri 1 Cikarang', phone: '0811-9000-1003', title: 'Kunjungan industri siswa', space: 'sp_aula' },
  { name: 'Bu Ratna', company: 'Yayasan Peduli Bangsa', phone: '0812-9000-1004', title: 'Bazar dan bakti sosial', space: 'sp_kantin' },
  { name: 'Pak Dion', company: 'Komunitas Futsal Cikarang', phone: '0856-9000-1005', title: 'Turnamen futsal persahabatan', space: 'sp_lapangan' },
  { name: 'Ibu Wulan', company: 'PT Mitra Logistik', phone: '0812-9000-1006', title: 'Workshop customs', space: 'sp_meetB' },
]
let bkSeq = 0
const nextBk = () => `RSV-${String(++bkSeq).padStart(4, '0')}`

function buildBookings(): Booking[] {
  const out: Booking[] = []
  const rooms = SPACES.filter((s) => s.rental)
  const users = USERS.filter((u) => u.role === 'requester' && u.id !== 'u_anisa' && !u.system)
  const mk = (b: Omit<Booking, 'id' | 'number' | 'createdAt' | 'fee' | 'addonIds'> & { addonIds?: string[]; fee?: number; createdAt?: string }): Booking => {
    const space = SPACES.find((s) => s.id === b.spaceId)!
    const addonIds = b.addonIds ?? []
    const fee = b.fee ?? (b.kind === 'block' ? 0 : quote(space, b.renterType, new Date(b.start), new Date(b.end), addonIds, b.attendees, ADDONS).total)
    return { ...b, id: id('bk'), number: nextBk(), createdAt: b.createdAt ?? iso(addDays(new Date(b.start), -3)), fee, addonIds }
  }
  for (let day = -10; day <= 10; day++) {
    const date = addDays(startOfDay(NOW), day)
    const weekend = [0, 6].includes(date.getDay())
    for (const room of rooms) {
      if (weekend && !['hall', 'field'].includes(room.kind)) continue
      if (['hall', 'canteen', 'field'].includes(room.kind) && !chance(0.28)) continue
      const r = room.rental!
      let cursor = Math.round(((room.kind === 'field' ? 16 : r.openHour + 1) + between(0, 1.5)) * 2) / 2
      const heavy = room.capacity >= 8 && room.kind === 'meeting' ? 0.8 : room.kind === 'meeting' ? 0.6 : 0.4
      while (cursor < r.closeHour - 1) {
        let advance = pick([0.5, 1])
        if (chance(heavy)) {
          const dur = room.kind === 'meeting' ? pick([1, 1, 1, 1.5, 2, 0.5]) : pick([2, 3, 4])
          if (cursor + dur > r.closeHour) break
          advance = dur + pick([0, 0.5, 1])
          const start = new Date(date); start.setHours(Math.floor(cursor), (cursor % 1) * 60, 0, 0)
          const end = addMinutes(start, dur * 60)
          const u = pick(users)
          out.push(mk({
            spaceId: room.id, kind: 'booking', userId: u.id, renterType: 'internal', renterName: u.name, title: pick(EVENTS), start: iso(start), end: iso(end),
            attendees: Math.max(2, Math.min(room.capacity, Math.round(between(3, Math.max(4, room.capacity * 0.7))))),
            status: day < 0 && chance(0.05) ? 'cancelled' : 'approved', phone: u.phone,
          }))
        }
        cursor += advance
      }
    }
  }
  const ensure = (b: Parameters<typeof mk>[0]) => {
    const s = new Date(b.start).getTime(), e = new Date(b.end).getTime()
    for (let i = out.length - 1; i >= 0; i--) if (out[i].spaceId === b.spaceId && new Date(out[i].start).getTime() < e && new Date(out[i].end).getTime() > s) out.splice(i, 1)
    out.push(mk(b))
  }
  const at = (dayOffset: number, hour: number, dur: number) => { const d = addDays(startOfDay(NOW), dayOffset); d.setHours(hour, 0, 0, 0); return [iso(d), iso(addMinutes(d, dur * 60))] as const }
  const me = (u: string, extra: Partial<Booking> = {}) => { const user = USERS.find((x) => x.id === u)!; return { userId: u, renterType: 'internal' as const, renterName: user.name, phone: user.phone, ...extra } }

  // Eksternal: ada yang sudah disetujui, menunggu, dan ditolak
  EXTERNAL.forEach((x, i) => {
    const [s, e] = at(1 + i * 2, x.space === 'sp_lapangan' ? 17 : x.space === 'sp_kantin' ? 14 : 9, x.space === 'sp_aula' ? 4 : 3)
    const approved = i < 2
    ensure({ spaceId: x.space, kind: 'booking', userId: 'u_eko', renterType: 'external', renterName: x.name, company: x.company, phone: x.phone, title: x.title, start: s, end: e, attendees: x.space === 'sp_aula' ? 90 : 20, status: i === 5 ? 'rejected' : approved ? 'approved' : 'pending', addonIds: SPACES.find((p) => p.id === x.space)!.rental!.addonIds.slice(0, 2), decidedBy: i === 5 || approved ? 'u_eko' : undefined, decidedAt: i === 5 || approved ? iso(minsAgo(60 * 30)) : undefined, rejectReason: i === 5 ? 'Bentrok dengan jadwal audit pelanggan pada hari yang sama.' : undefined, createdAt: iso(minsAgo(60 * (20 + i * 9))) })
  })
  // Karyawan: persetujuan untuk fasilitas besar
  ensure({ ...me('u_dewi'), spaceId: 'sp_aula', kind: 'booking', title: 'Gathering departemen pemasaran', start: at(6, 13, 4)[0], end: at(6, 13, 4)[1], attendees: 60, status: 'pending', addonIds: ['ad_sound', 'ad_snack'], createdAt: iso(minsAgo(60 * 5)) })
  ensure({ ...me('u_anisa'), spaceId: 'sp_aula', kind: 'booking', title: 'Gathering Line 1 — apresiasi produksi', start: at(8, 14, 3)[0], end: at(8, 14, 3)[1], attendees: 45, status: 'pending', addonIds: ['ad_sound', 'ad_snack'], createdAt: iso(minsAgo(60 * 2)) })
  ensure({ ...me('u_anisa'), spaceId: 'sp_meetB', kind: 'booking', title: 'Briefing shift sore', start: at(0, 14, 1)[0], end: at(0, 14, 1)[1], attendees: 10, status: 'approved' })
  ensure({ ...me('u_anisa'), spaceId: 'sp_training', kind: 'booking', title: 'Pelatihan SOP baru Line 1', start: at(2, 9, 3)[0], end: at(2, 9, 3)[1], attendees: 24, status: 'approved', addonIds: ['ad_proyektor', 'ad_snack'] })
  ensure({ ...me('u_rina'), spaceId: 'sp_rapat', kind: 'booking', title: 'Review jadwal maintenance', start: at(1, 10, 2)[0], end: at(1, 10, 2)[1], attendees: 8, status: 'approved' })
  // Blokir maintenance
  ensure({ spaceId: 'sp_aula', kind: 'block', userId: 'u_dimas', renterType: 'internal', renterName: 'Maintenance', title: 'Servis AC aula', start: at(4, 8, 8)[0], end: at(4, 8, 8)[1], attendees: 0, status: 'approved', note: 'Aula tidak bisa dipakai — servis AC.' })
  return out
}

/* ---------------------------------------------------------------- notifikasi */

function buildNotifications(tickets: Ticket[], bookings: Booking[]): Notification[] {
  const n: Notification[] = []
  const mk = (userId: string, text: string, at: string, to: string, tone: Notification['tone'], read = false) => n.push({ id: id('nt'), userId, text, at, read, to, tone })
  const mine = tickets.filter((t) => t.requesterId === 'u_anisa')
  const done = mine.find((t) => t.status === 'done' && !t.confirmedAt)
  const boiler = mine.find((t) => t.priority === 'p1')
  if (done) mk('u_anisa', `${done.number} sudah selesai — mohon konfirmasi`, done.resolvedAt!, `/tiket/${done.id}`, 'success')
  if (boiler) mk('u_anisa', `${boiler.number}: estimasi selesai diperbarui ke ${new Date(boiler.etaAt!).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, iso(minsAgo(22)), `/tiket/${boiler.id}`, 'info')
  const pend = bookings.find((b) => b.userId === 'u_anisa' && b.status === 'pending')
  if (pend) mk('u_anisa', `Pengajuan ${pend.number} (${pend.title}) menunggu persetujuan`, pend.createdAt, '/reservasi', 'warning', true)

  const open = tickets.filter((t) => !['done', 'cancelled'].includes(t.status))
  open.filter((t) => t.assigneeId === 'u_budi').slice(0, 3).forEach((t, i) => mk('u_budi', i === 0 ? `${t.number} mendekati batas target` : `${t.number} ditugaskan ke Anda`, iso(minsAgo(10 + i * 40)), `/tiket/${t.id}`, i === 0 ? 'danger' : 'info', i > 1))
  const unassigned = open.filter((t) => !t.assigneeId)
  if (unassigned[0]) mk('u_rina', `${unassigned.length} tiket belum ditugaskan`, iso(minsAgo(12)), '/tiket?view=unassigned', 'warning')
  const p1 = open.find((t) => t.priority === 'p1')
  if (p1) mk('u_rina', `Darurat: ${p1.title}`, p1.createdAt, `/tiket/${p1.id}`, 'danger')
  const pending = bookings.filter((b) => b.status === 'pending')
  if (pending.length) mk('u_rina', `${pending.length} pengajuan reservasi menunggu persetujuan`, iso(minsAgo(60)), '/reservasi?tab=daftar', 'warning')
  if (pending.length) mk('u_eko', `${pending.length} pengajuan reservasi menunggu persetujuan`, iso(minsAgo(60)), '/reservasi?tab=daftar', 'warning')
  return n
}

export function seedData() {
  seq = 0
  bkSeq = 0
  const tickets = buildAll()
  const pms = buildPm()
  const tasks = buildTasks(tickets, pms)
  const bookings = buildBookings()
  return {
    users: USERS, teams: TEAMS, buildings: BUILDINGS, spaces: SPACES, categories: CATEGORIES, assetCategories: ASSET_CATEGORIES, assets: ASSETS,
    vendors: VENDORS, addons: ADDONS, canned: CANNED, announcements: ANNOUNCEMENTS,
    tickets, tasks, pmSchedules: pms, bookings, notifications: buildNotifications(tickets, bookings),
  }
}
