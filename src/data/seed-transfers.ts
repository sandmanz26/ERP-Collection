import type { StockTransfer, StockTransferLine } from './types'
import { iso } from './seed-util'
import { items, warehouseStock } from './seed-inventory'

/* ------------------------------------------------------------------
   Goods moving between warehouses.

   The central warehouse in Cakung buys for the whole company; the regional
   stores draw from it. A transfer is the only way stock legitimately leaves
   one warehouse and appears in another, which is why it carries a reason and
   two signatures — who sent it and who received it.

   The seeded stock counts are current, so a RECEIVED transfer has already
   been applied to both ends. A transfer still IN_TRANSIT has left the source
   and has not arrived: that quantity is deliberately absent from both.
   ------------------------------------------------------------------ */

const bySku = new Map(items.map((i) => [i.sku, i.id]))

/** The source line the goods are drawn from — the batch and its cost travel with them. */
function line(warehouseId: string, sku: string, qty: number, extra: Partial<StockTransferLine> = {}): StockTransferLine {
  const itemId = bySku.get(sku)
  if (!itemId) throw new Error(`Unknown SKU in transfer: ${sku}`)
  const source = warehouseStock.find((s) => s.warehouseId === warehouseId && s.itemId === itemId)
  if (!source) throw new Error(`${warehouseId} does not hold ${sku}`)
  return {
    id: `trl_${warehouseId}_${itemId}`,
    itemId,
    stockId: source.id,
    qty,
    batchNo: source.batchNo,
    expiryDate: source.expiryDate,
    unitCost: source.unitCost,
    ...extra,
  }
}

export const stockTransfers: StockTransfer[] = [
  {
    id: 'trf_001', code: 'TRF-2026-0001',
    fromWarehouseId: 'wh_jkt', toWarehouseId: 'wh_bdg',
    status: 'RECEIVED',
    reason: 'Penambahan stok seragam untuk proyek Bandung yang mulai Juli.',
    lines: [
      line('wh_jkt', 'ITM-UNI-0002', 60, { qtyReceived: 60 }),
      line('wh_jkt', 'ITM-UNI-0004', 60, { qtyReceived: 60 }),
      line('wh_jkt', 'ITM-UNI-0012', 120, { qtyReceived: 120 }),
    ],
    requestedBy: 'Rizal Maulana',
    createdAt: iso(-64), updatedAt: iso(-56),
    dispatchedAt: iso(-61), dispatchedBy: 'Lina Marlina',
    expectedAt: iso(-58),
    receivedAt: iso(-58), receivedBy: 'Nurhayati Dewi',
    toBinLocation: 'RAK-A-01-1',
  },
  {
    id: 'trf_002', code: 'TRF-2026-0002',
    fromWarehouseId: 'wh_jkt', toWarehouseId: 'wh_sby',
    status: 'RECEIVED',
    reason: 'Rotasi APD sebelum audit K3 cabang Surabaya.',
    lines: [
      line('wh_jkt', 'ITM-PPE-0001', 300, { qtyReceived: 294, varianceReason: 'Satu dus isi 6 pasang rusak terkena air saat perjalanan.' }),
      line('wh_jkt', 'ITM-PPE-0004', 24, { qtyReceived: 24 }),
    ],
    requestedBy: 'Fitri Handayani',
    createdAt: iso(-38), updatedAt: iso(-29),
    dispatchedAt: iso(-34), dispatchedBy: 'Lina Marlina',
    expectedAt: iso(-30),
    receivedAt: iso(-29), receivedBy: 'Rina Kusuma',
    toBinLocation: 'RAK-B-01-1',
    note: 'Selisih 6 pasang dicatat sebagai kerusakan dalam perjalanan, bukan kekurangan kirim.',
  },
  {
    id: 'trf_003', code: 'TRF-2026-0003',
    fromWarehouseId: 'wh_jkt', toWarehouseId: 'wh_site_cpi',
    status: 'IN_TRANSIT',
    reason: 'Pengisian site store Menara Cakrawala menjelang pembersihan fasad.',
    lines: [
      line('wh_jkt', 'ITM-CHM-0001', 24),
      line('wh_jkt', 'ITM-CNS-0001', 120),
      line('wh_jkt', 'ITM-CNS-0002', 60),
    ],
    requestedBy: 'Ratna Wulandari',
    createdAt: iso(-4), updatedAt: iso(-2),
    dispatchedAt: iso(-2), dispatchedBy: 'Lina Marlina',
    expectedAt: iso(1),
    toBinLocation: 'RAK-01',
    note: 'Dikirim bersama pengantaran rutin harian.',
  },
  {
    id: 'trf_004', code: 'TRF-2026-0004',
    fromWarehouseId: 'wh_bks', toWarehouseId: 'wh_bpn',
    status: 'DRAFT',
    reason: 'Balikpapan kehabisan sarung tangan dan masker; Bekasi punya kelebihan.',
    lines: [
      line('wh_bks', 'ITM-PPE-0001', 150),
      line('wh_bks', 'ITM-PPE-0002', 30),
    ],
    requestedBy: 'Bayu Setiawan',
    createdAt: iso(-1), updatedAt: iso(-1),
    expectedAt: iso(6),
    note: 'Menunggu konfirmasi ekspedisi; belum dikeluarkan dari gudang Bekasi.',
  },
  {
    id: 'trf_005', code: 'TRF-2026-0005',
    fromWarehouseId: 'wh_jkt', toWarehouseId: 'wh_bks',
    status: 'CANCELLED',
    reason: 'Permintaan ganda — barang yang sama sudah dikirim lewat TRF-2026-0001.',
    lines: [line('wh_jkt', 'ITM-UNI-0012', 80)],
    requestedBy: 'Dewi Anggraini',
    createdAt: iso(-52), updatedAt: iso(-50),
    note: 'Dibatalkan sebelum dikeluarkan dari gudang, jadi tidak ada stok yang berpindah.',
  },
]
