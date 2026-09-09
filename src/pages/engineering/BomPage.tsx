import * as React from 'react'
import { ChevronDown, ChevronRight, GitBranch, Search, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useMfg } from '@/store/useMfg'
import type { BomLine } from '@/data/types'
import { whereUsed } from '@/lib/mrp'
import { standardMaterialCost } from '@/data/seed-production'
import { itemTypeLabel } from '@/data/reference'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function BomPage() {
  const { boms, products, items } = useMfg()
  const sellable = products.filter((p) => boms.some((b) => b.productId === p.id))
  const [productId, setProductId] = React.useState(sellable[0]?.id ?? '')
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [whereUsedQuery, setWhereUsedQuery] = React.useState('')

  const bom = boms.find((b) => b.productId === productId)
  const product = products.find((p) => p.id === productId)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const lineCost = (line: BomLine): number => {
    const gross = (line.netQuantity / (line.yield || 1)) * (1 + line.scrapPercent)
    if (line.componentType === 'SUB_ASSEMBLY') return gross * standardMaterialCost(line.componentId)
    return gross * (items.find((i) => i.id === line.componentId)?.standardCost ?? 0)
  }

  const total = bom ? bom.lines.reduce((a, l) => a + lineCost(l), 0) : 0
  const lowYield = bom ? bom.lines.filter((l) => l.yield < 0.75) : []

  const matchedItem = items.find(
    (i) => whereUsedQuery && (i.code.toLowerCase().includes(whereUsedQuery.toLowerCase()) || i.name.toLowerCase().includes(whereUsedQuery.toLowerCase())),
  )
  const usage = matchedItem ? whereUsed(matchedItem.id, boms, products) : []

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><GitBranch className="size-3" /> Engineering</Badge>}
        title="Bills of material"
        description="Every line carries a yield, because a bill without one silently under-orders every material it touches. Solid timber runs 62–72% from rough sawn, so a 0.086 m³ net requirement is really 0.129 m³ off the rack."
        actions={
          <Select
            value={productId}
            onChange={setProductId}
            options={sellable.map((p) => ({ value: p.id, label: `${p.sku} · ${p.name}` }))}
            className="w-[320px]"
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Bills on file" value={fmtNumber(boms.length)} icon={<GitBranch />} accent="primary" sub={`${products.filter((p) => p.isSubAssembly).length} of them sub-assemblies`} />
        <KpiCard label="Lines on this bill" value={fmtNumber(bom?.lines.length ?? 0)} icon={<GitBranch />} accent="accent" sub={`version ${bom?.version ?? '—'}, effective ${bom?.effectiveFrom ?? '—'}`} />
        <KpiCard label="Material cost, one unit" value={fmtCurrency(total, 'IDR', { compact: true })} icon={<GitBranch />} accent="primary" sub="exploded with yield and scrap applied" />
        <KpiCard
          label="Lines under 75% yield"
          value={fmtNumber(lowYield.length)}
          icon={<TriangleAlert />}
          accent={lowYield.length ? 'warning' : 'success'}
          sub={lowYield.length ? 'where the material money leaks' : 'nothing unusually wasteful'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            icon={<GitBranch />}
            title={product ? `${product.sku} · ${product.name}` : 'Bill of material'}
            description={bom?.note ?? 'Expand a sub-assembly to see the level beneath it.'}
            actions={bom ? <Badge tone="outline" size="sm">v{bom.version} · approved by {bom.approvedBy}</Badge> : undefined}
          />
          <CardBody className="p-0">
            {!bom && <EmptyState title="No active bill" description="This product has no bill of material on file." />}
            {bom && (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="py-2 pl-4 font-medium">Component</th>
                    <th className="px-2 py-2 text-right font-medium">Net</th>
                    <th className="px-2 py-2 text-right font-medium">Yield</th>
                    <th className="px-2 py-2 text-right font-medium">Gross</th>
                    <th className="px-2 py-2 text-right font-medium">Op</th>
                    <th className="py-2 pr-4 text-right font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {bom.lines.map((line) => {
                    const isSub = line.componentType === 'SUB_ASSEMBLY'
                    const sub = isSub ? products.find((p) => p.id === line.componentId) : undefined
                    const item = !isSub ? items.find((i) => i.id === line.componentId) : undefined
                    const subBom = isSub ? boms.find((b) => b.productId === line.componentId) : undefined
                    const gross = (line.netQuantity / (line.yield || 1)) * (1 + line.scrapPercent)
                    const open = expanded.has(line.id)
                    const alternate = line.alternateItemId ? items.find((i) => i.id === line.alternateItemId) : undefined
                    return (
                      <React.Fragment key={line.id}>
                        <tr className="border-b border-border/70 hover:bg-bg-muted/60">
                          <td className="py-2 pl-4">
                            <div className="flex items-start gap-1.5">
                              {isSub ? (
                                <button onClick={() => toggle(line.id)} className="mt-0.5 text-fg-subtle hover:text-fg">
                                  {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                                </button>
                              ) : (
                                <span className="mt-0.5 w-3.5" />
                              )}
                              <div className="min-w-0">
                                <p className="truncate text-[12.5px] font-medium text-fg">
                                  {sub?.name ?? item?.name}
                                  {isSub && <Badge tone="accent" size="sm" className="ml-2">sub-assembly</Badge>}
                                  {item?.imported && <Badge tone="info" size="sm" className="ml-2">imported</Badge>}
                                </p>
                                <p className="truncate font-mono text-[11px] text-fg-muted">
                                  {sub?.sku ?? item?.code}
                                  {item && ` · ${itemTypeLabel(item.type)}`}
                                </p>
                                {line.note && <Because className="mt-0.5 text-[11px]">{line.note}</Because>}
                                {alternate && (
                                  <p className="mt-0.5 text-[11px] text-fg-muted">
                                    Alternate approved: <span className="font-mono">{alternate.code}</span> — MRP offers it before raising a shortage.
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="tnum text-[12.5px]">{fmtNumber(line.netQuantity, line.netQuantity < 1 ? 4 : 1)}</span>
                            <span className="ml-1 text-[11px] text-fg-subtle">{line.uom}</span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <Tooltip content={line.yield < 1 ? `${fmtPercent((1 - line.yield) * 100, 0)} of what is issued never reaches the piece — offcuts, defecting, overspray.` : 'Consumed one for one.'}>
                              <span className={`tnum text-[12.5px] ${line.yield < 0.75 ? 'font-semibold text-warning' : 'text-fg-muted'}`}>
                                {fmtPercent(line.yield * 100, 0)}
                              </span>
                            </Tooltip>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="tnum text-[12.5px] font-semibold text-fg">{fmtNumber(gross, gross < 1 ? 4 : 2)}</span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="tnum text-[11.5px] text-fg-muted">{line.operationNo}</span>
                          </td>
                          <td className="py-2 pr-4 text-right">
                            <span className="tnum text-[12.5px]">{fmtCurrency(lineCost(line), 'IDR', { compact: true })}</span>
                          </td>
                        </tr>
                        {open && subBom && (
                          <tr className="bg-surface-sunken/50">
                            <td colSpan={6} className="py-1 pl-11 pr-4">
                              <table className="w-full">
                                <tbody>
                                  {subBom.lines.map((sl) => {
                                    const si = items.find((i) => i.id === sl.componentId)
                                    const sg = (sl.netQuantity / (sl.yield || 1)) * (1 + sl.scrapPercent) * line.netQuantity
                                    return (
                                      <tr key={sl.id} className="border-b border-border/40 last:border-0">
                                        <td className="py-1.5">
                                          <span className="text-[12px] text-fg">{si?.name}</span>
                                          <span className="ml-2 font-mono text-[10.5px] text-fg-subtle">{si?.code}</span>
                                        </td>
                                        <td className="py-1.5 text-right">
                                          <span className="tnum text-[11.5px] text-fg-muted">{fmtPercent(sl.yield * 100, 0)} yield</span>
                                        </td>
                                        <td className="w-[110px] py-1.5 text-right">
                                          <span className="tnum text-[12px] font-medium">{fmtNumber(sg, sg < 1 ? 4 : 2)} {sl.uom}</span>
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface-sunken/60">
                    <td className="py-2.5 pl-4 text-[12.5px] font-semibold text-fg" colSpan={5}>
                      Material cost, one unit
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="tnum text-[13px] font-semibold text-fg">{fmtCurrency(total, 'IDR')}</span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader
              icon={<Search />}
              title="Where used"
              description="What breaks if this material is discontinued, re-priced or short. The question asked constantly, and the one a flat bill cannot answer."
            />
            <CardBody className="space-y-3">
              <Input
                value={whereUsedQuery}
                onChange={(e) => setWhereUsedQuery(e.target.value)}
                placeholder="Item code or name — try HDW-RUN or oak"
              />
              {matchedItem && (
                <div className="rounded-lg border border-border bg-surface-sunken/60 p-3">
                  <p className="text-[12.5px] font-semibold text-fg">{matchedItem.name}</p>
                  <p className="font-mono text-[11px] text-fg-muted">{matchedItem.code}</p>
                  {matchedItem.imported && (
                    <Because className="mt-1.5">
                      Imported. Total lead time {matchedItem.supplierLeadDays + matchedItem.transitDays + matchedItem.inlandDays} days
                      — {matchedItem.supplierLeadDays} at the supplier, {matchedItem.transitDays} on the water, {matchedItem.inlandDays} inland.
                    </Because>
                  )}
                </div>
              )}
              {matchedItem && usage.length === 0 && <Because>Not used on any bill.</Because>}
              <div className="space-y-2">
                {usage.map((u, i) => (
                  <div key={`${u.product.id}_${i}`} className="flex items-start justify-between gap-3 border-b border-border pb-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-fg">{u.product.name}</p>
                      <p className="truncate text-[11px] text-fg-muted">
                        {u.via ? `via ${u.via}` : 'direct'} · {u.product.isSubAssembly ? 'sub-assembly' : 'finished good'}
                      </p>
                    </div>
                    <span className="tnum shrink-0 text-[12px] text-fg-muted">{fmtNumber(u.quantity, u.quantity < 1 ? 4 : 2)} per unit</span>
                  </div>
                ))}
              </div>
              {!whereUsedQuery && (
                <Because>
                  Type a code. The Hettich runner alone sits in the wardrobe, the sideboard, the nightstand and the desk — four
                  products stop when one container is late.
                </Because>
              )}
            </CardBody>
          </Card>

          {bom && (
            <Card>
              <CardHeader title="Where the material money goes" description="This bill, ranked by cost per unit." />
              <CardBody className="space-y-2.5">
                {[...bom.lines]
                  .sort((a, b) => lineCost(b) - lineCost(a))
                  .slice(0, 7)
                  .map((line) => {
                    const item = items.find((i) => i.id === line.componentId)
                    const sub = products.find((p) => p.id === line.componentId)
                    const cost = lineCost(line)
                    return (
                      <div key={line.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-3">
                          <span className="truncate text-[12px] text-fg">{item?.name ?? sub?.name}</span>
                          <span className="tnum shrink-0 text-[11.5px] font-medium text-fg-muted">{fmtPercent((cost / total) * 100, 0)}</span>
                        </div>
                        <Progress value={(cost / total) * 100} tone="primary" size="sm" />
                      </div>
                    )
                  })}
                <Separator />
                <Because>
                  {lowYield.length > 0
                    ? `${lowYield.length} line${lowYield.length === 1 ? '' : 's'} run below 75% yield. That is not waste to be scolded out of the shop floor — it is the nature of defecting solid timber, and the bill has to say so or every purchase order is short.`
                    : 'Nothing on this bill is unusually wasteful.'}
                </Because>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
