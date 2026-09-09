import * as React from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, Clock, TriangleAlert } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Because, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import { workCentreKindLabel } from '@/data/reference'
import { fmtDate, fmtNumber } from '@/lib/format'
import { TODAY } from '@/data/clock'

type Lane = 'BLOCKED' | 'RUNNING' | 'READY' | 'PENDING'

const LANES: { key: Lane; label: string; hint: string }[] = [
  { key: 'BLOCKED', label: 'Blocked', hint: 'Waiting on a gate — material, a kiln batch or a subcontractor.' },
  { key: 'RUNNING', label: 'Running & curing', hint: 'On the machine, or in the cure hall waiting on physics.' },
  { key: 'READY', label: 'Ready', hint: 'Everything upstream is done; this can start now.' },
  { key: 'PENDING', label: 'Queued', hint: 'Waiting for the operation before it.' },
]

export function ShopFloorPage() {
  const s = useMfg()
  const toast = useToast()
  const [centre, setCentre] = React.useState<string>('ALL')

  const rows = React.useMemo(
    () =>
      s.workOrders
        .filter((w) => ['RELEASED', 'IN_PROGRESS', 'ON_HOLD'].includes(w.status))
        .flatMap((w) =>
          w.operations
            .filter((op) => op.status !== 'DONE')
            .filter((op) => centre === 'ALL' || op.workCentreId === centre)
            .map((op) => ({ workOrder: w, op })),
        ),
    [s.workOrders, centre],
  )

  const lane = (status: string): Lane =>
    status === 'BLOCKED' ? 'BLOCKED' : status === 'RUNNING' || status === 'CURING' ? 'RUNNING' : status === 'READY' ? 'READY' : 'PENDING'

  const centres = s.workCentres.filter((w) => w.active)

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><ClipboardCheck className="size-3" /> Production</Badge>}
        title="Shop floor"
        description="Every open operation, by what is stopping it rather than by what department it belongs to. A supervisor opens this to answer one question: what can my bench start in the next hour?"
        actions={
          <Segmented
            value={centre}
            onChange={setCentre}
            options={[{ value: 'ALL', label: 'All centres' }, ...centres.slice(0, 4).map((c) => ({ value: c.id, label: c.code }))]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {LANES.map((l) => {
          const count = rows.filter((r) => lane(r.op.status) === l.key).length
          return (
            <KpiCard
              key={l.key}
              label={l.label}
              value={fmtNumber(count)}
              icon={l.key === 'BLOCKED' ? <TriangleAlert /> : <Clock />}
              accent={l.key === 'BLOCKED' ? (count ? 'danger' : 'success') : l.key === 'RUNNING' ? 'accent' : 'primary'}
              sub={l.hint}
            />
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {LANES.map((l) => {
          const items = rows.filter((r) => lane(r.op.status) === l.key)
          return (
            <Card key={l.key} className={l.key === 'BLOCKED' && items.length ? 'border-danger/40' : undefined}>
              <CardHeader
                title={l.label}
                description={l.hint}
                actions={<Badge tone={l.key === 'BLOCKED' ? 'danger' : 'outline'} size="sm">{items.length}</Badge>}
              />
              <CardBody className="space-y-2.5 p-3">
                {items.length === 0 && <EmptyState title="Nothing here" className="py-8" />}
                {items.map(({ workOrder: w, op }) => {
                  const product = s.products.find((p) => p.id === w.productId)
                  const wc = s.workCentres.find((c) => c.id === op.workCentreId)
                  const overdue = op.plannedEnd < TODAY
                  return (
                    <div key={op.id} className="rounded-lg border border-border bg-surface p-3 shadow-card">
                      <div className="flex items-start justify-between gap-2">
                        <Link to={`/work-orders/${w.id}`} className="min-w-0 font-mono text-[12px] font-semibold text-fg hover:text-primary hover:underline">
                          {w.code}
                        </Link>
                        <StatusBadge value={op.status} size="sm" />
                      </div>
                      <p className="mt-1 truncate text-[12.5px] font-medium text-fg">
                        {op.operationNo} · {op.name}
                      </p>
                      <p className="truncate text-[11.5px] text-fg-muted">
                        {product?.name} × {fmtNumber(w.quantity)}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-fg-muted">
                        <span>{wc?.code} · {workCentreKindLabel(wc?.kind ?? 'ASSEMBLY')}</span>
                        <span className="tnum">{fmtNumber(op.plannedHours, 1)} h</span>
                        <span className={`tnum ${overdue ? 'font-medium text-danger' : ''}`}>by {fmtDate(op.plannedEnd, 'short')}</span>
                      </div>
                      {op.blockReason && <Because className="mt-1.5 text-[11px] text-danger">{op.blockReason}</Because>}
                      {(op.status === 'READY' || op.status === 'RUNNING' || op.status === 'CURING') && (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="mt-2 w-full"
                          onClick={() => {
                            s.advanceOperation(w.id, op.operationNo)
                            toast.push({ tone: 'success', title: 'Signed off', description: `${w.code} operation ${op.operationNo} — ${op.name}.` })
                          }}
                        >
                          Sign off
                        </Button>
                      )}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
