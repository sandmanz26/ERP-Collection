import type {
  MrRequest, MrRequestLine, MrRequestStatus, MrSession, PurchaseRequest, PurchaseRequestLine,
} from './types'
import { items } from './seed-inventory'
import { suppliers, purchasePrices } from './seed-suppliers'
import { divisions } from './seed-divisions'
import { buildPrLines, lastPurchase, suppliersForItem } from '@/lib/procurement'
import { iso, on } from './seed-util'

/* ------------------------------------------------------------------
   Four monthly sessions: three already locked into purchase requests,
   and the current one still open.

   The purchase requests are not written out by hand — they are built with
   the same `buildPrLines` the Lock button uses, so the recap in this file
   and the recap the application produces are the same calculation.
   ------------------------------------------------------------------ */

const bySku = new Map(items.map((i) => [i.sku, i.id]))
const divByCode = new Map(divisions.map((d) => [d.code, d]))

/** [SKU, quantity, purpose, optional unit estimate from the division] */
type LineSpec = [string, number, string, number?]

interface RequestSpec {
  div: string
  status: MrRequestStatus
  lines: LineSpec[]
  note?: string
  returnReason?: string
}

let lineSeq = 0

function toLines(specs: LineSpec[]): MrRequestLine[] {
  return specs.map(([sku, qty, purpose, est]) => {
    const itemId = bySku.get(sku)
    if (!itemId) throw new Error(`Unknown SKU in a material request: ${sku}`)
    lineSeq += 1
    return {
      id: `mrl_${String(lineSeq).padStart(4, '0')}`,
      itemId,
      qty,
      purpose,
      estimatedUnitPrice: est,
    }
  })
}

const requests: MrRequest[] = []

function buildSession(
  id: string,
  code: string,
  month: number,
  year: number,
  status: MrSession['status'],
  window: { opensAt: string; closesAt: string; lockedAt?: string },
  specs: RequestSpec[],
  note?: string,
): MrSession {
  specs.forEach((spec) => {
    const division = divByCode.get(spec.div)
    if (!division) throw new Error(`Unknown division in a session: ${spec.div}`)
    const submitted = spec.status === 'SUBMITTED' || spec.status === 'APPROVED'
    requests.push({
      id: `mrq_${code.slice(3)}_${spec.div.slice(4).toLowerCase()}`,
      code: `${code}/${spec.div}`,
      sessionId: id,
      divisionId: division.id,
      status: spec.status,
      lines: toLines(spec.lines),
      submittedBy: submitted ? division.headName : undefined,
      submittedAt: submitted ? window.closesAt : undefined,
      reviewedBy: spec.status === 'APPROVED' || spec.status === 'RETURNED' ? 'Rizal Maulana' : undefined,
      reviewedAt: spec.status === 'APPROVED' || spec.status === 'RETURNED' ? window.closesAt : undefined,
      returnReason: spec.returnReason,
      note: spec.note,
      createdAt: window.opensAt,
      updatedAt: window.lockedAt ?? window.closesAt,
    })
  })

  return {
    id,
    code,
    title: `Material Request ${code.slice(3)}`,
    periodMonth: month,
    periodYear: year,
    opensAt: window.opensAt,
    closesAt: window.closesAt,
    status,
    createdBy: 'Siti Rahmawati',
    createdAt: window.opensAt,
    lockedAt: window.lockedAt,
    lockedBy: window.lockedAt ? 'Rizal Maulana' : undefined,
    purchaseRequestId: window.lockedAt ? id.replace('ses', 'pr') : undefined,
    note,
  }
}

/* ---------------- June: closed, ordered ---------------- */
const sesJun = buildSession(
  'ses_2026_06', 'MR-2026-06', 6, 2026, 'LOCKED',
  { opensAt: on(2026, 6, 1), closesAt: on(2026, 6, 10), lockedAt: on(2026, 6, 12) },
  [
    { div: 'DIV-OPS', status: 'APPROVED', lines: [
      ['ITM-UNI-0002', 120, 'Penambahan personel proyek Nusantara Auto Unit 2', 440_000],
      ['ITM-UNI-0003', 60, 'Penggantian sepatu PDL yang sudah tidak layak'],
      ['ITM-UNI-0012', 180, 'Name tag anggota baru', 34_000],
      ['ITM-SEC-0003', 40, 'Senter pos malam'],
      ['ITM-SEC-0006', 60, 'Buku mutasi triwulan'],
    ] },
    { div: 'DIV-GA', status: 'APPROVED', lines: [
      ['ITM-OFS-0003', 40, 'ATK kantor pusat', 41_000],
      ['ITM-OFS-0004', 60, 'Kertas A4 kantor pusat', 60_000],
      ['ITM-CNS-0006', 80, 'Galon air minum kantor'],
      ['ITM-CNS-0007', 12, 'Kopi dan teh pantry'],
    ] },
    { div: 'DIV-QHSE', status: 'APPROVED', lines: [
      ['ITM-PPE-0001', 400, 'Sarung tangan cleaning seluruh site'],
      ['ITM-PPE-0002', 60, 'Masker area rumah sakit', 42_000],
      ['ITM-PPE-0004', 24, 'Helm teknisi'],
    ] },
    { div: 'DIV-WH', status: 'APPROVED', lines: [
      ['ITM-CNS-0001', 600, 'Stok penyangga tisu toilet'],
      ['ITM-CNS-0002', 300, 'Kantong sampah gudang regional'],
      ['ITM-CHM-0001', 80, 'Floor cleaner stok pusat', 118_000],
    ] },
    { div: 'DIV-HRD', status: 'APPROVED', lines: [
      ['ITM-UNI-0006', 90, 'Seragam cleaning untuk rekrutmen Juni'],
      ['ITM-UNI-0007', 90, 'Sepatu anti slip rekrutmen'],
      ['ITM-OFS-0004', 20, 'Kertas berkas rekrutmen'],
    ] },
    { div: 'DIV-IT', status: 'APPROVED', lines: [
      ['ITM-OFS-0011', 8, 'Toner printer kantor pusat', 790_000],
      ['ITM-OFS-0006', 12, 'Tinta printer cabang'],
    ] },
    { div: 'DIV-SBY', status: 'APPROVED', lines: [
      ['ITM-OFS-0003', 24, 'ATK cabang Surabaya'],
      ['ITM-UNI-0002', 40, 'Seragam anggota Sentosa Mall'],
      ['ITM-CHM-0002', 30, 'Glass cleaner mall'],
    ] },
  ],
  'Sesi normal. Seluruh divisi mengajukan tepat waktu.',
)

/* ---------------- July: closed, approved, awaiting purchase orders ---------------- */
const sesJul = buildSession(
  'ses_2026_07', 'MR-2026-07', 7, 2026, 'LOCKED',
  { opensAt: on(2026, 7, 1), closesAt: on(2026, 7, 10), lockedAt: on(2026, 7, 11) },
  [
    { div: 'DIV-OPS', status: 'APPROVED', lines: [
      ['ITM-UNI-0002', 80, 'Rotasi seragam proyek Bank Prima', 445_000],
      ['ITM-UNI-0005', 60, 'Kopel rim dan sabuk'],
      ['ITM-UNI-0011', 40, 'Jas hujan menjelang musim hujan'],
      ['ITM-SEC-0001', 12, 'Handy talky pos baru', 1_650_000],
      ['ITM-SEC-0004', 30, 'Tongkat patroli'],
    ] },
    { div: 'DIV-GA', status: 'APPROVED', lines: [
      ['ITM-OFS-0003', 36, 'ATK bulanan', 41_500],
      ['ITM-OFS-0004', 70, 'Kertas A4'],
      ['ITM-OFS-0005', 40, 'Map ordner arsip kontrak'],
      ['ITM-CNS-0006', 90, 'Galon air minum'],
    ] },
    { div: 'DIV-QHSE', status: 'APPROVED', lines: [
      ['ITM-PPE-0001', 360, 'Sarung tangan bulanan'],
      ['ITM-PPE-0005', 60, 'Rompi reflektif juru parkir'],
      ['ITM-PPE-0007', 4, 'Harness pengganti hasil inspeksi', 1_850_000],
    ] },
    { div: 'DIV-WH', status: 'APPROVED', lines: [
      ['ITM-CNS-0001', 500, 'Tisu toilet stok'],
      ['ITM-CNS-0003', 200, 'Tisu tangan interfold'],
      ['ITM-TOL-0002', 60, 'Kain microfiber pengganti'],
    ] },
    { div: 'DIV-HRD', status: 'APPROVED', lines: [
      ['ITM-UNI-0006', 60, 'Seragam batch rekrutmen Juli'],
      ['ITM-UNI-0012', 120, 'Name tag anggota baru'],
    ] },
    { div: 'DIV-FIN', status: 'APPROVED', lines: [
      ['ITM-OFS-0005', 30, 'Ordner arsip pajak'],
      ['ITM-OFS-0008', 20, 'Amplop kop untuk penagihan'],
      ['ITM-OFS-0004', 25, 'Kertas cetak faktur'],
    ] },
    { div: 'DIV-IT', status: 'APPROVED', lines: [
      ['ITM-OFS-0011', 6, 'Toner cadangan'],
      ['ITM-OFS-0012', 10, 'Label barcode aset IT'],
    ] },
    { div: 'DIV-TRN', status: 'APPROVED', lines: [
      ['ITM-OFS-0009', 24, 'Spidol kelas pelatihan Gada Pratama'],
      ['ITM-OFS-0004', 30, 'Kertas modul pelatihan'],
      ['ITM-OFS-0010', 40, 'Buku nota praktik serah terima'],
    ] },
  ],
)

/* ---------------- August: locked, purchase request still being priced ---------------- */
const sesAug = buildSession(
  'ses_2026_08', 'MR-2026-08', 8, 2026, 'LOCKED',
  { opensAt: on(2026, 8, 1), closesAt: on(2026, 8, 12), lockedAt: on(2026, 8, 14) },
  [
    { div: 'DIV-OPS', status: 'APPROVED', lines: [
      ['ITM-UNI-0002', 140, 'Seragam proyek Sentosa Mall dan Cakrawala', 448_000],
      ['ITM-UNI-0003', 80, 'Sepatu PDL rotasi tahunan'],
      ['ITM-UNI-0004', 100, 'Topi anggota'],
      ['ITM-SEC-0003', 60, 'Senter pos malam tambahan'],
      ['ITM-SEC-0006', 80, 'Buku mutasi'],
      ['ITM-UNI-0012', 200, 'Name tag'],
    ] },
    { div: 'DIV-GA', status: 'APPROVED', lines: [
      ['ITM-OFS-0003', 48, 'ATK bulanan seluruh lantai', 42_000],
      ['ITM-OFS-0004', 80, 'Kertas A4', 62_000],
      ['ITM-OFS-0006', 16, 'Tinta printer'],
      ['ITM-OFS-0007', 12, 'Stapler pengganti'],
      ['ITM-CNS-0006', 100, 'Galon air minum'],
      ['ITM-CNS-0007', 14, 'Kopi dan teh pantry'],
    ] },
    { div: 'DIV-QHSE', status: 'APPROVED', lines: [
      ['ITM-PPE-0001', 480, 'Sarung tangan seluruh site'],
      ['ITM-PPE-0002', 80, 'Masker area infeksius RS Graha Medika'],
      ['ITM-PPE-0003', 40, 'Sepatu boot petugas taman'],
      ['ITM-PPE-0006', 30, 'Kacamata safety teknisi'],
    ] },
    { div: 'DIV-WH', status: 'APPROVED', lines: [
      ['ITM-CNS-0001', 700, 'Tisu toilet stok pusat dan regional'],
      ['ITM-CNS-0002', 400, 'Kantong sampah'],
      ['ITM-CHM-0001', 100, 'Floor cleaner'],
      ['ITM-CHM-0003', 90, 'Toilet bowl cleaner'],
      ['ITM-TOL-0001', 50, 'Mop set pengganti'],
    ] },
    { div: 'DIV-HRD', status: 'APPROVED', lines: [
      ['ITM-UNI-0006', 120, 'Seragam rekrutmen Agustus — dua kontrak baru'],
      ['ITM-UNI-0007', 120, 'Sepatu anti slip'],
      ['ITM-UNI-0012', 150, 'Name tag'],
      ['ITM-OFS-0004', 20, 'Kertas berkas rekrutmen'],
    ] },
    { div: 'DIV-FIN', status: 'APPROVED', lines: [
      ['ITM-OFS-0005', 24, 'Ordner tutup buku'],
      ['ITM-OFS-0008', 25, 'Amplop kop penagihan'],
    ] },
    { div: 'DIV-IT', status: 'APPROVED', lines: [
      ['ITM-OFS-0011', 10, 'Toner printer pusat dan cabang', 780_000],
      ['ITM-OFS-0006', 14, 'Tinta printer'],
      ['ITM-OFS-0012', 12, 'Label barcode aset'],
    ] },
    { div: 'DIV-TRN', status: 'APPROVED', lines: [
      ['ITM-OFS-0009', 20, 'Spidol kelas'],
      ['ITM-OFS-0010', 50, 'Buku nota praktik'],
      ['ITM-UNI-0002', 20, 'Seragam peraga pelatihan'],
    ] },
    { div: 'DIV-SBY', status: 'APPROVED', lines: [
      ['ITM-OFS-0003', 30, 'ATK cabang'],
      ['ITM-OFS-0004', 40, 'Kertas cabang'],
      ['ITM-UNI-0002', 50, 'Seragam anggota Sentosa Mall'],
      ['ITM-CHM-0002', 40, 'Glass cleaner mall'],
      ['ITM-CNS-0006', 60, 'Galon cabang'],
    ] },
  ],
  'Sesi terbesar tahun ini: dua kontrak baru mulai September.',
)

/* ---------------- September: open now ---------------- */
const sesSep = buildSession(
  'ses_2026_09', 'MR-2026-09', 9, 2026, 'OPEN',
  { opensAt: iso(-3), closesAt: iso(7) },
  [
    { div: 'DIV-OPS', status: 'SUBMITTED', lines: [
      ['ITM-UNI-0002', 100, 'Seragam anggota proyek Kelapa Gading yang akan dimulai', 450_000],
      ['ITM-UNI-0005', 50, 'Kopel rim dan sabuk'],
      ['ITM-UNI-0011', 80, 'Jas hujan — musim hujan mulai Oktober'],
      ['ITM-SEC-0001', 8, 'Handy talky pos cabang Kelapa Gading'],
      ['ITM-SEC-0003', 45, 'Senter'],
      ['ITM-PPE-0001', 200, 'Sarung tangan tim cleaning proyek baru'],
      ['ITM-OFS-0003', 24, 'ATK pos komandan regu'],
    ], note: 'Kebutuhan mengikuti PRJ-2026-0011 yang menunggu persetujuan.' },
    { div: 'DIV-GA', status: 'SUBMITTED', lines: [
      ['ITM-OFS-0003', 50, 'ATK bulanan', 42_000],
      ['ITM-OFS-0004', 85, 'Kertas A4', 62_500],
      ['ITM-OFS-0005', 35, 'Map ordner'],
      ['ITM-CNS-0006', 110, 'Galon air minum'],
      ['ITM-CNS-0007', 15, 'Kopi dan teh pantry'],
    ] },
    { div: 'DIV-QHSE', status: 'SUBMITTED', lines: [
      ['ITM-PPE-0001', 500, 'Sarung tangan seluruh site'],
      ['ITM-PPE-0002', 90, 'Masker'],
      ['ITM-PPE-0007', 4, 'Harness gondola — dua unit gagal inspeksi', 1_850_000],
      ['ITM-PPE-0004', 20, 'Helm safety'],
      ['ITM-CNS-0006', 40, 'Galon air minum ruang pelatihan K3'],
    ], note: 'Harness mendesak: pembersihan fasad Menara Cakrawala terjadwal 20 Oktober.' },
    { div: 'DIV-HRD', status: 'SUBMITTED', lines: [
      ['ITM-UNI-0006', 100, 'Seragam rekrutmen September'],
      ['ITM-UNI-0007', 100, 'Sepatu anti slip'],
      ['ITM-UNI-0012', 160, 'Name tag'],
      ['ITM-OFS-0003', 30, 'ATK ruang wawancara', 41_500],
      ['ITM-OFS-0004', 40, 'Kertas HVS berkas lamaran', 61_000],
    ] },
    { div: 'DIV-IT', status: 'SUBMITTED', lines: [
      ['ITM-OFS-0011', 8, 'Toner printer', 785_000],
      ['ITM-OFS-0012', 15, 'Label barcode aset baru'],
      ['ITM-OFS-0003', 12, 'ATK tim IT'],
    ] },
    { div: 'DIV-TRN', status: 'DRAFT', lines: [
      ['ITM-OFS-0009', 18, 'Spidol kelas Gada Pratama batch Oktober'],
      ['ITM-OFS-0004', 25, 'Kertas modul'],
    ], note: 'Menunggu konfirmasi jumlah peserta batch Oktober.' },
    { div: 'DIV-FIN', status: 'DRAFT', lines: [
      ['ITM-OFS-0005', 20, 'Ordner arsip'],
    ] },
    { div: 'DIV-SBY', status: 'RETURNED', lines: [
      ['ITM-OFS-0003', 30, 'ATK cabang'],
      ['ITM-MCH-0002', 2, 'Vacuum wet & dry pengganti'],
    ], returnReason: 'Vacuum bukan barang habis pakai dan tidak masuk anggaran MR bulanan. Ajukan melalui permintaan aset, atau pinjam unit dari gudang pusat yang menganggur.' },
  ],
  'Sesi berjalan. Ditutup otomatis pada tanggal penutupan, lalu dikunci oleh pengadaan.',
)

export const mrSessions: MrSession[] = [sesSep, sesAug, sesJul, sesJun]
export const mrRequests: MrRequest[] = requests

/* ------------------------------------------------------------------
   Purchase requests, built from the locked sessions with the same
   function the Lock button calls.
   ------------------------------------------------------------------ */

function assign(lines: PurchaseRequestLine[], opts: { assignRatio: number; priceRatio: number }) {
  return lines.map((line, index) => {
    const candidates = suppliersForItem(line.itemId, items, suppliers)
    /* Purchasing goes back to whoever supplied the item last — the price is known.
       Only when nobody has is the best-rated approved supplier tried instead. */
    const supplier = candidates.find((s) => lastPurchase(line.itemId, s.id, purchasePrices)) ?? candidates[0]
    const assigned = supplier && index / lines.length < opts.assignRatio
    if (!assigned) return line
    const last = lastPurchase(line.itemId, supplier.id, purchasePrices)
    const priced = index / lines.length < opts.priceRatio
    return {
      ...line,
      supplierId: supplier.id,
      agreedUnitPrice: priced && last ? last.unitPrice : undefined,
    }
  })
}

function purchaseRequest(
  session: MrSession,
  code: string,
  status: PurchaseRequest['status'],
  ratios: { assignRatio: number; priceRatio: number },
  extra: Partial<PurchaseRequest> = {},
): PurchaseRequest {
  const lines = assign(buildPrLines(requests.filter((r) => r.sessionId === session.id), items), ratios)
  return {
    id: session.id.replace('ses', 'pr'),
    code,
    sessionId: session.id,
    status,
    lines,
    createdBy: 'Rizal Maulana',
    createdAt: session.lockedAt ?? session.closesAt,
    updatedAt: session.lockedAt ?? session.closesAt,
    ...extra,
  }
}

export const purchaseRequests: PurchaseRequest[] = [
  purchaseRequest(sesAug, 'PR-2026-08-001', 'DRAFT', { assignRatio: 0.6, priceRatio: 0.35 }, {
    updatedAt: iso(-2),
    note: 'Sedang dinegosiasikan. Seragam dan ATK sudah dapat harga; sisanya menunggu penawaran.',
  }),
  purchaseRequest(sesJul, 'PR-2026-07-001', 'APPROVED', { assignRatio: 1, priceRatio: 1 }, {
    approvedBy: 'Hendra Wijayanto',
    approvedAt: on(2026, 7, 16),
    note: 'Disetujui direksi. Purchase order diterbitkan per supplier.',
  }),
  purchaseRequest(sesJun, 'PR-2026-06-001', 'ORDERED', { assignRatio: 1, priceRatio: 1 }, {
    approvedBy: 'Hendra Wijayanto',
    approvedAt: on(2026, 6, 15),
    note: 'Seluruh barang sudah diterima gudang pusat dan didistribusikan ke regional.',
  }),
]
