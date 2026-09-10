import * as React from 'react'
import { Package, Wallet } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import type { Product } from '@/data/types'
import { FINISH_FAMILIES, finishMeta, PRODUCT_CATEGORIES } from '@/data/reference'
import { standardMaterialCost } from '@/data/seed-production'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function ProductsPage() {
  const { products, boms, routings, workCentres, salesOrders } = useMfg()
  const [category, setCategory] = React.useState<string[]>([])
  const [finish, setFinish] = React.useState<string[]>([])

  const conversion = React.useCallback(
    (productId: string) => {
      const r = routings.find((x) => x.productId === productId)
      if (!r) return { labour: 0, overhead: 0, hours: 0 }
      return r.operations.reduce(
        (acc, op) => {
          if (op.subcontracted) return { ...acc, overhead: acc.overhead + (op.subcontractCostPerUnit ?? 0) }
          const wc = workCentres.find((w) => w.id === op.workCentreId)
          const hours = (op.setupMinutes / 20 + op.runMinutesPerUnit) / 60
          return {
            labour: acc.labour + hours * (wc?.labourRatePerHour ?? 0),
            overhead: acc.overhead + hours * (wc?.overheadRatePerHour ?? 0),
            hours: acc.hours + hours,
          }
        },
        { labour: 0, overhead: 0, hours: 0 },
      )
    },
    [routings, workCentres],
  )

  const stdCost = React.useCallback(
    (p: Product) => {
      const c = conversion(p.id)
      return standardMaterialCost(p.id) + c.labour + c.overhead
    },
    [conversion],
  )

  const demand = React.useCallback(
    (p: Product) =>
      salesOrders
        .filter((o) => !['CLOSED', 'CANCELLED'].includes(o.status))
        .flatMap((o) => o.lines.filter((l) => l.productId === p.id))
        .reduce((a, l) => a + l.quantity - l.shippedQuantity, 0),
    [salesOrders],
  )

  const sellable = products.filter((p) => !p.isSubAssembly)
  const belowTarget = sellable.filter((p) => ((p.listPrice - stdCost(p)) / p.listPrice) * 100 < p.targetMarginPercent)

  const columns: Column<Product>[] = [
    {
      key: 'name', header: 'Product', width: 'min-w-[280px]', pinned: true, sortable: true, sortValue: (p) => p.name,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-fg">{p.name}</p>
          <p className="truncate font-mono text-[11.5px] text-fg-muted">
            {p.sku} · {p.collection}
            {p.isSubAssembly && <span className="ml-1.5 text-accent">sub-assembly</span>}
          </p>
        </div>
      ),
      exportValue: (p) => p.name,
    },
    {
      key: 'category', header: 'Category', width: 'w-[150px]', sortable: true, sortValue: (p) => p.category,
      cell: (p) => (
        <Tooltip content={PRODUCT_CATEGORIES.find((x) => x.value === p.category)?.hint ?? ''}>
          <span className="text-[12.5px] text-fg">{PRODUCT_CATEGORIES.find((x) => x.value === p.category)?.label}</span>
        </Tooltip>
      ),
      exportValue: (p) => p.category,
    },
    {
      key: 'finish', header: 'Finish', width: 'w-[160px]',
      cell: (p) => {
        const f = finishMeta(p.finish)
        return (
          <Tooltip content={`${f.hint} ${f.coats} coats, ${f.cureHours} h cure between them.`}>
            <span className="text-[12.5px] text-fg-muted">{f.label}</span>
          </Tooltip>
        )
      },
      exportValue: (p) => p.finish,
    },
    {
      key: 'size', header: 'Size (mm)', width: 'w-[160px]', defaultHidden: true,
      cell: (p) => <span className="tnum text-[12px] text-fg-muted">{p.widthMm} × {p.depthMm} × {p.heightMm}</span>,
      exportValue: (p) => `${p.widthMm}x${p.depthMm}x${p.heightMm}`,
    },
    {
      key: 'cbm', header: 'Packed m³', align: 'right', width: 'w-[110px]', defaultHidden: true,
      cell: (p) => <span className="tnum text-[12.5px]">{p.packedCbm ? fmtNumber(p.packedCbm, 2) : '—'}</span>,
      exportValue: (p) => p.packedCbm,
    },
    {
      key: 'bom', header: 'BOM lines', align: 'right', width: 'w-[110px]',
      cell: (p) => {
        const b = boms.find((x) => x.productId === p.id)
        return <span className="tnum text-[12.5px]">{b ? b.lines.length : <span className="text-danger">none</span>}</span>
      },
      exportValue: (p) => boms.find((x) => x.productId === p.id)?.lines.length ?? 0,
    },
    {
      key: 'ops', header: 'Operations', align: 'right', width: 'w-[115px]',
      cell: (p) => {
        const r = routings.find((x) => x.productId === p.id)
        return <span className="tnum text-[12.5px]">{r ? r.operations.length : <span className="text-danger">none</span>}</span>
      },
      exportValue: (p) => routings.find((x) => x.productId === p.id)?.operations.length ?? 0,
    },
    {
      key: 'material', header: 'Material', align: 'right', width: 'w-[130px]', sortable: true,
      sortValue: (p) => standardMaterialCost(p.id),
      cell: (p) => <span className="tnum text-[12.5px]">{fmtCurrency(standardMaterialCost(p.id), 'IDR', { compact: true })}</span>,
      exportValue: (p) => Math.round(standardMaterialCost(p.id)),
    },
    {
      key: 'stdCost', header: 'Standard cost', align: 'right', width: 'w-[140px]', sortable: true,
      headerHint: 'Material exploded through the BOM with yield, plus labour and overhead from the routing',
      sortValue: (p) => stdCost(p),
      cell: (p) => <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(stdCost(p), 'IDR', { compact: true })}</span>,
      exportValue: (p) => Math.round(stdCost(p)),
    },
    {
      key: 'price', header: 'List price', align: 'right', width: 'w-[130px]', sortable: true, sortValue: (p) => p.listPrice,
      cell: (p) => (p.isSubAssembly ? <span className="text-[12px] text-fg-subtle">n/a</span> : <span className="tnum text-[12.5px]">{fmtCurrency(p.listPrice, 'IDR', { compact: true })}</span>),
      exportValue: (p) => p.listPrice,
    },
    {
      key: 'margin', header: 'Margin at list', align: 'right', width: 'w-[150px]', sortable: true,
      sortValue: (p) => (p.listPrice ? ((p.listPrice - stdCost(p)) / p.listPrice) * 100 : 0),
      cell: (p) => {
        if (p.isSubAssembly) return <span className="text-[12px] text-fg-subtle">—</span>
        const m = ((p.listPrice - stdCost(p)) / p.listPrice) * 100
        return (
          <div>
            <p className={`tnum text-[12.5px] font-semibold ${m >= p.targetMarginPercent ? 'text-success' : 'text-danger'}`}>{fmtPercent(m, 1)}</p>
            <p className="tnum text-[11px] text-fg-muted">target {p.targetMarginPercent}%</p>
          </div>
        )
      },
      exportValue: (p) => (p.listPrice ? ((p.listPrice - stdCost(p)) / p.listPrice) * 100 : 0),
    },
    {
      key: 'demand', header: 'On order', align: 'right', width: 'w-[110px]', sortable: true, sortValue: (p) => demand(p),
      cell: (p) => <span className="tnum text-[12.5px]">{demand(p) ? fmtNumber(demand(p)) : <span className="text-fg-subtle">—</span>}</span>,
      exportValue: (p) => demand(p),
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Products"
        description="The catalogue, plus the sub-assemblies that are BOM nodes with routings of their own. Every standard cost here is exploded from the bill with its yields applied and run out over the routing — none of it is a typed figure."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Sellable products" value={fmtNumber(sellable.length)} icon={<Package />} accent="primary" sub={`${products.filter((p) => p.isSubAssembly).length} sub-assemblies`} />
        <KpiCard label="Collections" value={fmtNumber(new Set(products.filter((p) => !p.isSubAssembly).map((p) => p.collection)).size)} icon={<Package />} accent="accent" />
        <KpiCard
          label="Below target margin"
          value={fmtNumber(belowTarget.length)}
          icon={<Wallet />}
          accent={belowTarget.length ? 'warning' : 'success'}
          sub={belowTarget.length ? belowTarget[0].name : 'every line prices above target'}
        />
        <KpiCard
          label="Average margin at list"
          value={fmtPercent(sellable.reduce((a, p) => a + ((p.listPrice - stdCost(p)) / p.listPrice) * 100, 0) / Math.max(1, sellable.length), 1)}
          icon={<Wallet />}
          accent="success"
        />
      </div>

      <DataTable
        data={products}
        columns={columns}
        getId={(p) => p.id}
        getLabel={(p) => p.name}
        entityLabel="product"
        exportName="products"
        storageKey="products"
        searchText={(p) => `${p.sku} ${p.name} ${p.collection} ${p.category} ${p.finish}`}
        initialSort={{ key: 'demand', dir: 'desc' }}
        filters={[
          {
            key: 'category', label: 'Category', values: category, onChange: setCategory,
            options: PRODUCT_CATEGORIES.map((x) => ({ value: x.value, label: x.label })),
            match: (p, v) => v.includes(p.category),
          },
          {
            key: 'finish', label: 'Finish', values: finish, onChange: setFinish,
            options: FINISH_FAMILIES.map((x) => ({ value: x.value, label: x.label })),
            match: (p, v) => v.includes(p.finish),
          },
        ]}
      />
    </div>
  )
}
