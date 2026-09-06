import * as React from 'react'
import { useErp } from '@/store/useErp'
import {
  itemPositions, stockRows, warehouseLoad, type ItemPosition, type StockRow,
} from '@/lib/inventory'
import { openOrderQty } from '@/lib/procurement'
import { buildExceptions, type Exception } from '@/lib/exceptions'

/**
 * The stock ledger is folded once and shared, because four separate screens
 * want the same derived position and folding four hundred movements four times
 * for every keystroke is how a demo starts to feel slow.
 */
export function useStock(): { rows: StockRow[]; positions: ItemPosition[] } {
  const movements = useErp((s) => s.movements)
  const items = useErp((s) => s.items)
  const reservations = useErp((s) => s.reservations)
  const orders = useErp((s) => s.orders)

  return React.useMemo(() => {
    const rows = stockRows(movements)
    const positions = itemPositions(items, rows, reservations, (id) => openOrderQty(orders, id), movements)
    return { rows, positions }
  }, [movements, items, reservations, orders])
}

export function useWarehouseLoads() {
  const { rows } = useStock()
  const warehouses = useErp((s) => s.warehouses)
  const items = useErp((s) => s.items)
  return React.useMemo(
    () => warehouseLoad(warehouses, rows, (id) => items.find((i) => i.id === id)),
    [warehouses, rows, items],
  )
}

export function useExceptions(): { exceptions: Exception[]; positions: ItemPosition[]; rows: StockRow[] } {
  const store = useErp()
  const { rows, positions } = useStock()
  const loads = useWarehouseLoads()

  const exceptions = React.useMemo(
    () =>
      buildExceptions({
        projects: store.projects,
        buyers: store.buyers,
        suppliers: store.suppliers,
        budgets: store.budgets,
        orders: store.orders,
        receipts: store.receipts,
        bills: store.bills,
        invoices: store.invoices,
        workOrders: store.workOrders,
        shipments: store.shipments,
        positions,
        warehouseLoads: loads,
        transfers: store.transfers,
        counts: store.counts,
        company: store.company,
        items: store.items,
        settings: store.settings,
      }),
    [
      store.projects, store.buyers, store.suppliers, store.budgets, store.orders, store.receipts,
      store.bills, store.invoices, store.workOrders, store.shipments, store.transfers, store.counts,
      store.company, store.items, store.settings, positions, loads,
    ],
  )

  return { exceptions, positions, rows }
}
