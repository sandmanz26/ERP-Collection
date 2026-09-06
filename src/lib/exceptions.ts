/**
 * The exception engine.
 *
 * A dashboard that shows totals tells you the business exists. This tells you
 * what is about to go wrong and who has to move. Every rule below is something
 * that has actually cost an exporter money: a container refused at the border
 * for want of a stamp, a buyer over their limit given another order, a sawmill
 * whose legality certificate lapsed halfway through a purchase order.
 *
 * Nothing here is a stored flag. Each rule is evaluated against the current
 * records every time the page renders.
 */
import type {
  Budget, Buyer, CompanyProfile, GoodsReceipt, Item, Project, PurchaseOrder, SalesInvoice,
  Shipment, StockCount, StockTransfer, Supplier, SupplierBill, Warehouse, WorkOrder,
} from '@/data/types'
import type { ItemPosition } from './inventory'
import { complianceSpec, exportDocLabel, stageIndex } from '@/data/reference'
import { budgetTotal } from './costing'
import { billOutstanding, isBillOpen, matchBill, orderProgress, orderValue } from './procurement'

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM'

export interface Exception {
  id: string
  severity: Severity
  /** which desk owns it */
  area: 'Commercial' | 'Costing' | 'Procurement' | 'Warehouse' | 'Production' | 'Export' | 'Finance'
  title: string
  detail: string
  /** what it is attached to, so the row can be clicked through */
  entity: string
  to: string
  value?: number
  currency?: string
}

const DAY = 86_400_000
const daysUntil = (iso?: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : 9999)
const daysSince = (iso?: string) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : 0)

export interface ExceptionInput {
  projects: Project[]
  buyers: Buyer[]
  suppliers: Supplier[]
  budgets: Budget[]
  orders: PurchaseOrder[]
  receipts: GoodsReceipt[]
  bills: SupplierBill[]
  invoices: SalesInvoice[]
  workOrders: WorkOrder[]
  shipments: Shipment[]
  positions: ItemPosition[]
  warehouseLoads: { warehouse: Warehouse; cbm: number; utilisationPct: number; value: number }[]
  transfers: StockTransfer[]
  counts: StockCount[]
  company: CompanyProfile
  items: Item[]
  settings: { billVarianceTolerancePct: number; poApprovalThresholdIdr: number; certificateWarningDays: number; slowMovingDays: number }
}

export function buildExceptions(input: ExceptionInput): Exception[] {
  const out: Exception[] = []
  const push = (e: Exception) => out.push(e)

  /* ---------------- commercial ---------------- */

  input.projects
    .filter((p) => p.status === 'OPEN' || p.status === 'WON')
    .forEach((p) => {
      const buyer = input.buyers.find((b) => b.id === p.buyerId)
      if (!buyer) return

      if (buyer.status === 'ON_HOLD' || buyer.status === 'BLACKLISTED') {
        push({
          id: `ex_hold_${p.id}`,
          severity: 'HIGH',
          area: 'Commercial',
          title: `${buyer.tradingName} is on hold and has a live order`,
          detail: `${p.code} is at ${p.stage.toLowerCase().replace('_', ' ')} while the buyer is ${buyer.status === 'ON_HOLD' ? 'on credit hold' : 'blacklisted'}. Nothing further should be committed until finance clears them.`,
          entity: p.code,
          to: `/projects/${p.id}`,
        })
      }

      if (buyer.outstanding > buyer.creditLimit) {
        push({
          id: `ex_credit_${buyer.id}_${p.id}`,
          severity: 'CRITICAL',
          area: 'Finance',
          title: `${buyer.tradingName} is over their credit limit`,
          detail: `Outstanding is ${buyer.currency} ${Math.round(buyer.outstanding).toLocaleString()} against a limit of ${buyer.currency} ${Math.round(buyer.creditLimit).toLocaleString()}. ${p.code} is still moving forward.`,
          entity: buyer.code,
          to: `/buyers/${buyer.id}`,
          value: buyer.outstanding - buyer.creditLimit,
          currency: buyer.currency,
        })
      }

      /* deposit agreed but never arrived, while the factory has already started */
      if (p.depositPct > 0 && !p.depositReceivedAt && stageIndex(p.stage) >= stageIndex('PROCUREMENT')) {
        push({
          id: `ex_dep_${p.id}`,
          severity: 'CRITICAL',
          area: 'Finance',
          title: `${p.code} is being bought for without a deposit`,
          detail: `The ${p.depositPct}% deposit has not been received, and the order is already at ${p.stage.toLowerCase().replace('_', ' ')}. Every rupiah committed from here is ours at risk.`,
          entity: p.code,
          to: `/projects/${p.id}`,
        })
      }

      /* a quotation that has been sitting with the buyer */
      if (p.stage === 'QUOTED' && p.quotedAt && daysSince(p.quotedAt) > 21) {
        push({
          id: `ex_quote_${p.id}`,
          severity: 'MEDIUM',
          area: 'Commercial',
          title: `${p.code} has been quoted for ${daysSince(p.quotedAt)} days with no answer`,
          detail: `Offered to ${p.buyerName} on ${new Date(p.quotedAt).toLocaleDateString('en-GB')}. Quotations go stale: the timber price behind this one has already moved.`,
          entity: p.code,
          to: `/projects/${p.id}`,
        })
      }

      /* drawings still unapproved while the floor is cutting */
      const unapproved = p.drawings.filter((d) => d.status !== 'APPROVED' && d.status !== 'SUPERSEDED')
      if (unapproved.length && stageIndex(p.stage) >= stageIndex('PRODUCTION')) {
        push({
          id: `ex_dwg_${p.id}`,
          severity: 'HIGH',
          area: 'Production',
          title: `${p.code} is in production on ${unapproved.length} unapproved drawing${unapproved.length > 1 ? 's' : ''}`,
          detail: `${unapproved.map((d) => `${d.code} rev ${d.revision}`).join(', ')} ${unapproved.length > 1 ? 'have' : 'has'} not been signed off by the buyer. Anything made to them is made at our own risk.`,
          entity: p.code,
          to: `/projects/${p.id}`,
        })
      }

      /* a sample the buyer rejected, with nothing sent since */
      const bySample = new Map<string, typeof p.samples>()
      p.samples.forEach((s) => bySample.set(s.itemRef, [...(bySample.get(s.itemRef) ?? []), s]))
      bySample.forEach((list, ref) => {
        const latest = list.sort((a, b) => b.round - a.round)[0]
        if (latest.status === 'REJECTED' || latest.status === 'REVISION_REQUESTED') {
          push({
            id: `ex_smp_${p.id}_${ref}`,
            severity: 'MEDIUM',
            area: 'Commercial',
            title: `${ref} sample came back marked up on ${p.code}`,
            detail: `${latest.feedback ?? 'The buyer asked for changes.'} Nothing has gone back since round ${latest.round}.`,
            entity: p.code,
            to: `/projects/${p.id}`,
          })
        }
      })
    })

  /* ---------------- costing ---------------- */

  input.projects
    .filter((p) => p.status === 'WON' && p.stage !== 'CLOSED')
    .forEach((p) => {
      const budget = input.budgets.find((b) => b.projectId === p.id && (b.status === 'APPROVED' || b.status === 'CLOSED'))
      const orders = input.orders.filter((o) => o.projectId === p.id && !['DRAFT', 'CANCELLED'].includes(o.status))

      if (!budget && orders.length) {
        push({
          id: `ex_nobudget_${p.id}`,
          severity: 'CRITICAL',
          area: 'Costing',
          title: `${p.code} has purchase orders and no approved budget`,
          detail: `${orders.length} order${orders.length > 1 ? 's' : ''} worth IDR ${Math.round(orders.reduce((a, o) => a + orderValue(o), 0)).toLocaleString()} raised against an order nobody has costed and signed.`,
          entity: p.code,
          to: `/projects/${p.id}`,
        })
      }

      if (budget) {
        const total = budgetTotal(budget)
        const exposure = orders.reduce(
          (a, o) => a + o.lines.reduce((la, l) => la + l.qty * l.unitPrice * (1 - l.discountPct / 100), 0),
          0,
        )
        const purchasedBudget = budget.lines
          .filter((l) => !['LABOUR', 'OVERHEAD', 'CONTINGENCY'].includes(l.category))
          .reduce((a, l) => a + l.qty * l.unitCost * (1 + l.wastagePct / 100), 0)
        if (purchasedBudget > 0 && exposure > purchasedBudget * 1.02) {
          push({
            id: `ex_over_${p.id}`,
            severity: 'CRITICAL',
            area: 'Costing',
            title: `${p.code} is committed past its budget`,
            detail: `Purchase orders total IDR ${Math.round(exposure).toLocaleString()} against a bought-in budget of IDR ${Math.round(purchasedBudget).toLocaleString()}. The overrun is ${Math.round(((exposure - purchasedBudget) / purchasedBudget) * 100)}% and it is already spent.`,
            entity: p.code,
            to: `/projects/${p.id}`,
            value: exposure - purchasedBudget,
            currency: 'IDR',
          })
        }
        const revenue = p.contractValue * p.exchangeRate
        const margin = revenue ? ((revenue - total) / revenue) * 100 : 0
        if (margin < budget.targetMarginPct - 3) {
          push({
            id: `ex_margin_${p.id}`,
            severity: margin < 8 ? 'HIGH' : 'MEDIUM',
            area: 'Costing',
            title: `${p.code} is budgeted at ${margin.toFixed(1)}% against a ${budget.targetMarginPct}% target`,
            detail: `The approved budget leaves ${margin.toFixed(1)} points of margin. Anything that goes wrong on this order comes straight out of it.`,
            entity: budget.code,
            to: `/projects/${p.id}`,
          })
        }
      }
    })

  input.budgets
    .filter((b) => b.status === 'SUBMITTED')
    .forEach((b) => {
      const p = input.projects.find((x) => x.id === b.projectId)
      const waiting = daysSince(b.submittedAt)
      if (waiting >= 3) {
        push({
          id: `ex_bapp_${b.id}`,
          severity: waiting > 10 ? 'HIGH' : 'MEDIUM',
          area: 'Costing',
          title: `${b.code} has been waiting ${waiting} days for approval`,
          detail: `Nothing can be ordered for ${p?.code ?? 'this order'} until the budget is signed, and the ship date does not move for us.`,
          entity: b.code,
          to: '/budgets',
        })
      }
    })

  /* ---------------- procurement ---------------- */

  input.orders.forEach((po) => {
    const progress = orderProgress(po, input.receipts)
    if (progress.overdue) {
      push({
        id: `ex_polate_${po.id}`,
        severity: progress.daysLate > 14 ? 'CRITICAL' : 'HIGH',
        area: 'Procurement',
        title: `${po.code} is ${progress.daysLate} days late from ${po.supplierName}`,
        detail: `${progress.receivedPct.toFixed(0)}% received. IDR ${Math.round(progress.openValue).toLocaleString()} still outstanding across ${po.lines.filter((l) => l.receivedQty < l.qty).length} line${po.lines.filter((l) => l.receivedQty < l.qty).length > 1 ? 's' : ''}.`,
        entity: po.code,
        to: `/purchase-orders/${po.id}`,
        value: progress.openValue,
        currency: 'IDR',
      })
    }
    if (po.status === 'AWAITING_APPROVAL') {
      const value = orderValue(po)
      push({
        id: `ex_poapp_${po.id}`,
        severity: value > input.settings.poApprovalThresholdIdr ? 'HIGH' : 'MEDIUM',
        area: 'Procurement',
        title: `${po.code} is waiting for approval`,
        detail: `IDR ${Math.round(value).toLocaleString()} to ${po.supplierName}${value > input.settings.poApprovalThresholdIdr ? ' — above the threshold, so it needs a director signature' : ''}. Raised ${daysSince(po.orderedAt)} days ago.`,
        entity: po.code,
        to: `/purchase-orders/${po.id}`,
        value,
        currency: 'IDR',
      })
    }
    if (progress.overReceived) {
      push({
        id: `ex_poover_${po.id}`,
        severity: 'MEDIUM',
        area: 'Warehouse',
        title: `${po.code} received over the ordered quantity`,
        detail: `More was booked in than was ordered, beyond the ${po.overReceiptTolerancePct}% tolerance. Either the order needs amending or the surplus needs sending back.`,
        entity: po.code,
        to: `/purchase-orders/${po.id}`,
      })
    }
  })

  /* material stopped at the gate for want of a legality document */
  input.receipts
    .filter((g) => g.lines.some((l) => l.rejectReason === 'NO_LEGALITY_DOC'))
    .forEach((g) => {
      push({
        id: `ex_legal_${g.id}`,
        severity: 'CRITICAL',
        area: 'Export',
        title: `${g.code} — timber received with no legality document`,
        detail: `${g.supplierName} delivered against ${g.poCode} without a legality reference for the batch. It is in the quarantine bay and cannot enter the V-Legal chain, which means it cannot legally leave the country in a finished piece.`,
        entity: g.code,
        to: `/receipts/${g.id}`,
      })
    })

  input.receipts
    .filter((g) => g.qcResult === 'FAILED' || (g.qcResult === 'PARTIAL' && daysSince(g.receivedAt) < 30))
    .forEach((g) => {
      const rejected = g.lines.reduce((a, l) => a + l.qtyRejected, 0)
      if (rejected <= 0) return
      push({
        id: `ex_qc_${g.id}`,
        severity: g.qcResult === 'FAILED' ? 'HIGH' : 'MEDIUM',
        area: 'Warehouse',
        title: `${g.code} failed inspection on arrival`,
        detail: `${rejected.toLocaleString()} ${g.lines[0]?.uom.toLowerCase()} rejected from ${g.supplierName}${g.lines.find((l) => l.rejectReason) ? ` — ${g.lines.find((l) => l.rejectReason)!.rejectReason?.toLowerCase().replace('_', ' ')}` : ''}. The order is short by that much and the supplier has not credited it.`,
        entity: g.code,
        to: `/receipts/${g.id}`,
      })
    })

  /* a supplier whose legality certificate is running out under a live order */
  input.suppliers.forEach((s) => {
    const open = input.orders.filter(
      (o) => o.supplierId === s.id && ['APPROVED', 'SENT', 'PARTIALLY_RECEIVED'].includes(o.status),
    )
    if (s.svlkExpiresAt) {
      const left = daysUntil(s.svlkExpiresAt)
      if (left < input.settings.certificateWarningDays) {
        push({
          id: `ex_supcert_${s.id}`,
          severity: left < 0 ? 'CRITICAL' : open.length ? 'HIGH' : 'MEDIUM',
          area: 'Export',
          title:
            left < 0
              ? `${s.name}'s SVLK certificate has expired`
              : `${s.name}'s SVLK certificate expires in ${left} days`,
          detail: open.length
            ? `${open.length} live order${open.length > 1 ? 's' : ''} sit${open.length > 1 ? '' : 's'} with this supplier. Timber received after the certificate lapses cannot be carried into a V-Legal document.`
            : 'No live orders, but nothing new may be placed against a lapsed certificate.',
          entity: s.code,
          to: `/suppliers`,
        })
      }
    }
  })

  /* our own licences */
  input.company.licences.forEach((lic) => {
    const left = daysUntil(lic.expiresAt)
    if (left < input.settings.certificateWarningDays) {
      push({
        id: `ex_ourcert_${lic.id}`,
        severity: left < 0 ? 'CRITICAL' : left < 30 ? 'HIGH' : 'MEDIUM',
        area: 'Export',
        title: left < 0 ? `Our ${lic.reference} has expired` : `Our ${lic.reference} expires in ${left} days`,
        detail: `${lic.issuer}. ${lic.note ?? 'Every export filed under it after that date is challengeable.'}`,
        entity: lic.reference,
        to: '/settings',
      })
    }
  })

  /* ---------------- warehouse & inventory ---------------- */

  /* Only where nothing is on order. An item below its point with a purchase
     order already running is purchasing doing its job, not an exception. */
  input.positions
    .filter((p) => p.belowReorder && p.onOrder <= 0 && p.item.status === 'ACTIVE')
    .forEach((p) => {
      const uncovered = true
      push({
        id: `ex_reorder_${p.item.id}`,
        severity: p.available <= 0 ? 'HIGH' : 'MEDIUM',
        area: 'Procurement',
        title: `${p.item.sku} is below its reorder point${uncovered ? ' with nothing on order' : ''}`,
        detail: `${p.available.toLocaleString()} ${p.item.uom.toLowerCase()} available against a reorder point of ${p.item.reorderPoint.toLocaleString()}. ${uncovered ? `Lead time is ${p.item.leadTimeDays} days and no order has been raised.` : `${p.onOrder.toLocaleString()} on order.`}`,
        entity: p.item.sku,
        to: '/inventory',
      })
    })

  input.warehouseLoads
    .filter((w) => w.utilisationPct > 92)
    .forEach((w) => {
      push({
        id: `ex_whfull_${w.warehouse.id}`,
        severity: w.utilisationPct > 100 ? 'HIGH' : 'MEDIUM',
        area: 'Warehouse',
        title: `${w.warehouse.name} is at ${w.utilisationPct.toFixed(0)}% of capacity`,
        detail: `${w.cbm.toFixed(1)} m³ against ${w.warehouse.capacityM3} m³. Deliveries booked against it will be stacked in the aisle.`,
        entity: w.warehouse.code,
        to: '/warehouses',
      })
    })

  input.transfers
    .filter((t) => t.status === 'IN_TRANSIT' && daysSince(t.issuedAt) > 5)
    .forEach((t) => {
      push({
        id: `ex_trf_${t.id}`,
        severity: 'MEDIUM',
        area: 'Warehouse',
        title: `${t.code} has been in transit for ${daysSince(t.issuedAt)} days`,
        detail: `Stock has left the sending warehouse and has not been booked in at the other end. Until it is, it belongs to neither and nobody can pick it.`,
        entity: t.code,
        to: '/transfers',
      })
    })

  input.counts
    .filter((c) => c.status === 'COUNTING' && daysSince(c.countedAt) > 2)
    .forEach((c) => {
      push({
        id: `ex_cnt_${c.id}`,
        severity: 'MEDIUM',
        area: 'Warehouse',
        title: `${c.code} was started ${daysSince(c.countedAt)} days ago and is still open`,
        detail: 'A count left half-finished is worse than no count: the ledger is frozen against numbers nobody has confirmed.',
        entity: c.code,
        to: '/counts',
      })
    })

  /* ---------------- production ---------------- */

  input.workOrders.forEach((w) => {
    const late = daysSince(w.dueAt)
    if (['COMPLETED', 'CANCELLED'].includes(w.status)) return
    if (w.status === 'ON_HOLD') {
      push({
        id: `ex_wohold_${w.id}`,
        severity: 'HIGH',
        area: 'Production',
        title: `${w.code} is on hold`,
        detail: w.holdReason ?? 'Stopped, with no reason recorded.',
        entity: w.code,
        to: '/production',
      })
    } else if (late > 0) {
      push({
        id: `ex_wolate_${w.id}`,
        severity: late > 10 ? 'HIGH' : 'MEDIUM',
        area: 'Production',
        title: `${w.code} is ${late} days past its due date`,
        detail: `${w.producedQty} of ${w.qty} made, still at ${w.stage.toLowerCase()}. ${w.workshop}.`,
        entity: w.code,
        to: '/production',
      })
    }
  })

  /* ---------------- export & compliance ---------------- */

  input.shipments.forEach((sh) => {
    const project = input.projects.find((p) => p.id === sh.projectId)
    const left = daysUntil(sh.etd)
    if (['SAILED', 'ARRIVED', 'CLOSED'].includes(sh.status)) return

    sh.documents
      .filter((d) => d.mandatory && d.status !== 'ISSUED')
      .forEach((d) => {
        if (left > 21) return
        push({
          id: `ex_doc_${sh.id}_${d.type}`,
          severity: left <= 5 ? 'CRITICAL' : left <= 12 ? 'HIGH' : 'MEDIUM',
          area: 'Export',
          title: `${exportDocLabel(d.type)} not issued for ${sh.code}`,
          detail: `${project?.code ?? sh.code} sails in ${left} day${left === 1 ? '' : 's'} to ${sh.podName}. The document is ${d.status.toLowerCase().replace('_', ' ')} and it is mandatory for this consignment.`,
          entity: sh.code,
          to: `/shipments`,
        })
      })

    if (sh.containers.some((c) => !c.containerNo) && left <= 10) {
      push({
        id: `ex_cnr_${sh.id}`,
        severity: 'MEDIUM',
        area: 'Export',
        title: `${sh.code} has containers with no number allocated`,
        detail: `Stuffing is ${sh.stuffingAt ? `set for ${new Date(sh.stuffingAt).toLocaleDateString('en-GB')}` : 'not scheduled'} and the carrier has not released every box. The fumigation certificate cannot be raised without the numbers.`,
        entity: sh.code,
        to: '/shipments',
      })
    }
  })

  input.projects
    .filter((p) => p.status === 'WON' && stageIndex(p.stage) >= stageIndex('PRODUCTION') && p.stage !== 'CLOSED')
    .forEach((p) => {
      const left = daysUntil(p.targetShipAt)
      p.compliance
        .filter((c) => c.status === 'REQUIRED' || c.status === 'IN_PROGRESS')
        .forEach((c) => {
          const spec = complianceSpec(c.key)
          if (!spec.blocking) return
          if (left > spec.leadTimeDays + 10) return
          push({
            id: `ex_comp_${p.id}_${c.key}`,
            severity: left <= spec.leadTimeDays ? 'CRITICAL' : 'HIGH',
            area: 'Export',
            title: `${spec.label} not in place for ${p.code}`,
            detail: `${spec.hint} It takes ${spec.leadTimeDays} days to obtain and the order ships in ${left}.`,
            entity: p.code,
            to: `/projects/${p.id}`,
          })
        })
    })

  /* ---------------- finance ---------------- */

  input.bills.filter(isBillOpen).forEach((b) => {
    const po = input.orders.find((o) => o.id === b.poId)
    const match = matchBill(b, po, input.receipts, input.settings.billVarianceTolerancePct)
    if (match.status !== 'MATCHED' && b.status !== 'DRAFT') {
      push({
        id: `ex_match_${b.id}`,
        severity: match.status === 'NO_RECEIPT' ? 'MEDIUM' : 'HIGH',
        area: 'Finance',
        title: `${b.code} does not match what we received`,
        detail: `${b.supplierName} invoiced IDR ${Math.round(b.subtotal).toLocaleString()} against IDR ${Math.round(match.receivedValue).toLocaleString()} received. ${match.detail}`,
        entity: b.code,
        to: '/payables',
        value: match.variance,
        currency: 'IDR',
      })
    }
    const overdue = daysSince(b.dueAt)
    if (overdue > 0 && b.status === 'OVERDUE') {
      push({
        id: `ex_apod_${b.id}`,
        severity: overdue > 30 ? 'HIGH' : 'MEDIUM',
        area: 'Finance',
        title: `${b.code} is ${overdue} days overdue to ${b.supplierName}`,
        detail: `IDR ${Math.round(billOutstanding(b)).toLocaleString()} outstanding. A sawmill that is not paid does not cut for the next order.`,
        entity: b.code,
        to: '/payables',
        value: billOutstanding(b),
        currency: 'IDR',
      })
    }
  })

  input.invoices
    .filter((iv) => iv.status === 'OVERDUE')
    .forEach((iv) => {
      const overdue = daysSince(iv.dueAt)
      push({
        id: `ex_arod_${iv.id}`,
        severity: overdue > 30 ? 'CRITICAL' : 'HIGH',
        area: 'Finance',
        title: `${iv.code} is ${overdue} days overdue from ${iv.buyerName}`,
        detail: `${iv.currency} ${Math.round(iv.amount - iv.paidAmount).toLocaleString()} outstanding on a ${iv.kind.toLowerCase()} invoice.`,
        entity: iv.code,
        to: '/receivables',
        value: (iv.amount - iv.paidAmount) * iv.exchangeRate,
        currency: 'IDR',
      })
    })

  const order: Record<Severity, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 }
  return out.sort((a, b) => order[a.severity] - order[b.severity] || a.area.localeCompare(b.area))
}

export const bySeverity = (list: Exception[], s: Severity) => list.filter((e) => e.severity === s)
export const byArea = (list: Exception[], area: Exception['area']) => list.filter((e) => e.area === area)
