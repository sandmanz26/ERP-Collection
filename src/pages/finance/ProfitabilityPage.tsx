import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Banknote, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react'
import type { Project } from '@/data/types'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StageChip } from '@/components/shared/StageChip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { jobFinancials } from '@/lib/analytics'
import { fmtCurrency, fmtPercent, titleCase } from '@/lib/format'
import { countryFlag } from '@/data/reference'

export function ProfitabilityPage() {
  const nav = useNavigate()
  const { projects, charges, customers } = useErp()
  const [type, setType] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const fin = (p: Project) => jobFinancials(charges.filter((c) => c.projectId === p.id))
  const withCharges = projects.filter((p) => charges.some((c) => c.projectId === p.id))
  const totalRev = withCharges.reduce((a, p) => a + fin(p).revenue, 0)
  const totalCost = withCharges.reduce((a, p) => a + fin(p).cost, 0)
  const totalMargin = totalRev - totalCost
  const losers = withCharges.filter((p) => fin(p).marginPct < 8)
  const best = withCharges.slice().sort((a, b) => fin(b).margin - fin(a).margin)[0]

  const byLane = React.useMemo(() => {
    const map = new Map<string, { lane: string; country: string; revenue: number; margin: number; jobs: number }>()
    withCharges.forEach((p) => {
      const key = `${p.polCode}→${p.podCode}`
      const f = fin(p)
      const cur = map.get(key) ?? { lane: `${p.polName} → ${p.podName}`, country: p.destCountry, revenue: 0, margin: 0, jobs: 0 }
      cur.revenue += f.revenue
      cur.margin += f.margin
      cur.jobs++
      map.set(key, cur)
    })
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withCharges, charges])
  const laneMax = Math.max(...byLane.map((l) => l.revenue), 1)

  const partyName = (id: string) => {
    const c = customers.find((x) => x.id === id)
    return c?.tradeName || c?.legalName || '—'
  }

  const columns: Column<Project>[] = [
    {
      key: 'code', header: 'Job', width: 'w-[150px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg">{r.code}</span>,
    },
    {
      key: 'name', header: 'Description', width: 'min-w-[230px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.name}</p>
          <p className="truncate text-[11px] text-fg-muted">{partyName(r.clientId)}</p>
        </div>
      ),
    },
    {
      key: 'lane', header: 'Lane', width: 'min-w-[190px]', sortable: true,
      sortValue: (r) => `${r.polName}-${r.podName}`, exportValue: (r) => `${r.polCode} → ${r.podCode}`,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12px] text-fg">
          🇮🇩 {r.polName} <span className="text-fg-subtle">→</span> {countryFlag(r.destCountry)} {r.podName}
        </span>
      ),
    },
    {
      key: 'type', header: 'Type', width: 'w-[130px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.type, exportValue: (r) => r.type,
      cell: (r) => <Badge tone={r.type === 'CONSIGNMENT' ? 'purple' : 'outline'} size="sm">{titleCase(r.type)}</Badge>,
    },
    {
      key: 'stage', header: 'Stage', width: 'w-[166px]', sortable: true,
      sortValue: (r) => r.stage, exportValue: (r) => r.stage,
      cell: (r) => <StageChip stage={r.stage} />,
    },
    {
      key: 'revenue', header: 'Revenue', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => fin(r).revenue, exportValue: (r) => Math.round(fin(r).revenue),
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{fmtCurrency(fin(r).revenue, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'cost', header: 'Cost', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => fin(r).cost, exportValue: (r) => Math.round(fin(r).cost),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(fin(r).cost, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[142px]', align: 'right', sortable: true,
      sortValue: (r) => fin(r).margin, exportValue: (r) => Math.round(fin(r).margin),
      cell: (r) => {
        const m = fin(r).margin
        return <span className={`tnum text-[12.5px] font-medium ${m < 0 ? 'text-danger' : 'text-fg'}`}>{fmtCurrency(m, 'IDR', { compact: true })}</span>
      },
    },
    {
      key: 'marginPct', header: 'Margin %', width: 'w-[130px]', align: 'right', sortable: true,
      sortValue: (r) => fin(r).marginPct, exportValue: (r) => fin(r).marginPct.toFixed(1),
      cell: (r) => {
        const pct = fin(r).marginPct
        return (
          <div className="ml-auto flex w-[104px] items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-soft">
              <div
                className={`h-full rounded-full ${pct >= 20 ? 'bg-success' : pct >= 8 ? 'bg-warning' : 'bg-danger'}`}
                style={{ width: `${Math.max(2, Math.min(100, pct * 2.5))}%` }}
              />
            </div>
            <span className={`tnum w-9 text-right text-[12px] font-medium ${pct >= 20 ? 'text-success' : pct >= 8 ? 'text-warning' : 'text-danger'}`}>
              {pct.toFixed(0)}%
            </span>
          </div>
        )
      },
    },
    {
      key: 'invoiced', header: 'Invoiced', width: 'w-[140px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => fin(r).invoiced, exportValue: (r) => Math.round(fin(r).invoiced),
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(fin(r).invoiced, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'unapproved', header: 'Unapproved', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => fin(r).unapproved, exportValue: (r) => Math.round(fin(r).unapproved),
      cell: (r) => {
        const v = fin(r).unapproved
        return <span className={`tnum text-[12.5px] ${v > 0 ? 'text-warning' : 'text-fg-subtle'}`}>{v > 0 ? fmtCurrency(v, 'IDR', { compact: true }) : '—'}</span>
      },
    },
    {
      key: 'disputed', header: 'Disputed', width: 'w-[136px]', align: 'right', sortable: true,
      sortValue: (r) => fin(r).disputed, exportValue: (r) => Math.round(fin(r).disputed),
      cell: (r) => {
        const v = fin(r).disputed
        return <span className={`tnum text-[12.5px] ${v > 0 ? 'text-danger' : 'text-fg-subtle'}`}>{v > 0 ? fmtCurrency(v, 'IDR', { compact: true }) : '—'}</span>
      },
    },
  ]

  return (
    <>
      <PageHeader
        title="Job Profitability"
        description="Margin per shipment, not just per month. A forwarder's profit is made or lost on individual jobs — an unbudgeted demurrage or a half-empty box turns a healthy quote into a loss, and this is where that shows up."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue booked" value={fmtCurrency(totalRev, 'IDR', { compact: true })} icon={<Banknote />} accent="primary" sub={`${withCharges.length} jobs with charges`} />
        <KpiCard label="Gross margin" value={fmtCurrency(totalMargin, 'IDR', { compact: true })} icon={<TrendingUp />} accent={totalMargin > 0 ? 'success' : 'danger'} sub={fmtPercent(totalRev ? (totalMargin / totalRev) * 100 : 0)} />
        <KpiCard label="Jobs below 8% margin" value={losers.length} icon={<TrendingDown />} accent={losers.length ? 'danger' : 'success'} sub={losers.length ? losers.slice(0, 3).map((p) => p.code).join(', ') : 'All jobs healthy'} />
        <KpiCard label="Best job" value={best ? fmtCurrency(fin(best).margin, 'IDR', { compact: true }) : '—'} icon={<TrendingUp />} accent="success" sub={best?.code} />
      </div>

      <Card className="mb-5">
        <CardHeader
          title="Margin by trade lane"
          description="Where the money actually comes from — and which lanes are being run for volume rather than profit."
          actions={
            <div className="flex items-center gap-3 text-[11.5px] text-fg-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-primary/35" /> revenue
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-full bg-primary" /> margin
              </span>
            </div>
          }
        />
        <CardBody className="space-y-3">
          {byLane.map((l) => {
            const pct = l.revenue ? (l.margin / l.revenue) * 100 : 0
            return (
              <div key={l.lane}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] text-fg">
                    <span className="text-[14px]">{countryFlag(l.country)}</span>
                    {l.lane}
                    <span className="text-[11px] text-fg-subtle">· {l.jobs} job{l.jobs === 1 ? '' : 's'}</span>
                  </span>
                  <span className="tnum shrink-0 text-[12px] text-fg-muted">
                    {fmtCurrency(l.revenue, 'IDR', { compact: true })}
                    <span className={`ml-2 font-semibold ${pct >= 20 ? 'text-success' : pct >= 8 ? 'text-warning' : 'text-danger'}`}>
                      {pct.toFixed(0)}%
                    </span>
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-soft">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary/35" style={{ width: `${(l.revenue / laneMax) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${(l.margin / laneMax) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </CardBody>
      </Card>

      <DataTable
        data={projects}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="job"
        storageKey="profitability"
        exportName="job-profitability"
        initialSort={{ key: 'marginPct', dir: 'asc' }}
        searchText={(r) => [r.code, r.name, r.polName, r.podName, partyName(r.clientId)].join(' ')}
        onRowClick={(r) => nav(`/projects/${r.id}?tab=charges`)}
        rowTone={(r) => (fin(r).marginPct < 0 && charges.some((c) => c.projectId === r.id) ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'type', label: 'Job type', values: type, onChange: setType,
            options: ['FULL_EXPORT', 'CONSIGNMENT', 'PARTIAL_LCL', 'PROJECT_CARGO'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.type),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
        ]}
        rowActions={(r) => (
          <Tooltip content="Open charge sheet">
            <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.id}?tab=charges`)}>
              <ExternalLink />
            </Button>
          </Tooltip>
        )}
        footerSummary={(rows) => {
          const rev = rows.reduce((a, r) => a + fin(r).revenue, 0)
          const mar = rows.reduce((a, r) => a + fin(r).margin, 0)
          return (
            <span className="tnum">
              Revenue <span className="font-semibold text-fg">{fmtCurrency(rev, 'IDR', { compact: true })}</span> · Margin{' '}
              <span className="font-semibold text-fg">
                {fmtCurrency(mar, 'IDR', { compact: true })} {rev > 0 && `(${((mar / rev) * 100).toFixed(1)}%)`}
              </span>
            </span>
          )
        }}
      />
    </>
  )
}
