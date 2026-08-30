import * as React from 'react'
import { Copy, Eye, Pencil, Plus, Route, Tags, Timer, Trash2, TrendingUp } from 'lucide-react'
import type { ServicePackage } from '@/data/types'
import { CARRIERS, countryFlag } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { PackageForm } from './PackageForm'
import { fmtDate, fmtMoney, fmtPercent, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { packageMargin } from '@/lib/analytics'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function PackagesPage() {
  const toast = useToast()
  const { packages, projects, removePackages, upsertPackage, importPackages } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ServicePackage | null>(null)
  const [viewing, setViewing] = React.useState<ServicePackage | null>(null)
  const [deleting, setDeleting] = React.useState<ServicePackage | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [mode, setMode] = React.useState<string[]>([])

  const active = packages.filter((p) => p.status === 'ACTIVE')
  const expiringSoon = packages.filter((p) => {
    const d = relativeDays(p.validTo)
    return d !== null && d >= 0 && d <= 30 && p.status !== 'EXPIRED'
  })
  const avgMargin = packages.length
    ? packages.reduce((a, p) => a + packageMargin(p).marginPct, 0) / packages.length
    : 0

  const columns: Column<ServicePackage>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[166px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Package', width: 'min-w-[250px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">
            {r.carrier ?? 'Any carrier'} · {titleCase(r.scope)}
          </p>
        </div>
      ),
    },
    {
      key: 'lane', header: 'Trade lane', width: 'min-w-[264px]', sortable: true,
      sortValue: (r) => `${r.originPortName}-${r.destPortName}`,
      exportValue: (r) => `${r.originPortCode} → ${r.destPortCode}`,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12.5px]">
          <span className="text-[14px]">🇮🇩</span>
          <span className="text-fg">{r.originPortName}</span>
          <Route className="size-3.5 shrink-0 text-fg-subtle" />
          <span className="text-[14px]">{countryFlag(r.destCountry)}</span>
          <span className="text-fg">{r.destPortName}</span>
        </span>
      ),
    },
    {
      key: 'mode', header: 'Mode', width: 'w-[96px]', sortable: true,
      sortValue: (r) => r.mode, exportValue: (r) => r.mode,
      cell: (r) => <Badge tone={r.mode === 'AIR' ? 'purple' : r.mode === 'LCL' ? 'accent' : 'info'} size="sm">{r.mode}</Badge>,
    },
    {
      key: 'transit', header: 'Transit', width: 'w-[92px]', align: 'right', sortable: true,
      sortValue: (r) => r.transitDays, exportValue: (r) => r.transitDays,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.transitDays} d</span>,
    },
    {
      key: 'freetime', header: 'Free time', width: 'w-[100px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.freeTimeDays, exportValue: (r) => r.freeTimeDays,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.freeTimeDays} d</span>,
    },
    {
      key: 'sell', header: 'Indicative sell', width: 'w-[140px]', align: 'right', sortable: true,
      sortValue: (r) => packageMargin(r).sell, exportValue: (r) => packageMargin(r).sell,
      cell: (r) => (
        <span className="tnum text-[12.5px] font-medium text-fg">
          {r.currency} {fmtMoney(packageMargin(r).sell, r.currency)}
        </span>
      ),
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[104px]', align: 'right', sortable: true,
      sortValue: (r) => packageMargin(r).marginPct, exportValue: (r) => packageMargin(r).marginPct.toFixed(1),
      cell: (r) => {
        const m = packageMargin(r).marginPct
        return (
          <Badge tone={m >= 20 ? 'success' : m >= 12 ? 'warning' : 'danger'} size="sm">
            {fmtPercent(m, 0)}
          </Badge>
        )
      },
    },
    {
      key: 'lines', header: 'Lines', width: 'w-[80px]', align: 'right', sortable: true, defaultHidden: true,
      sortValue: (r) => r.rateLines.length, exportValue: (r) => r.rateLines.length,
      cell: (r) => <span className="tnum text-[12.5px] text-fg-muted">{r.rateLines.length}</span>,
    },
    {
      key: 'validity', header: 'Validity', width: 'w-[178px]', sortable: true,
      sortValue: (r) => r.validTo, exportValue: (r) => `${r.validFrom} → ${r.validTo}`,
      cell: (r) => {
        const days = relativeDays(r.validTo)
        const soon = days !== null && days >= 0 && days <= 30
        const gone = days !== null && days < 0
        return (
          <div>
            <p className="tnum text-[12.5px] text-fg">{fmtDate(r.validTo)}</p>
            <p className={`text-[11px] ${gone ? 'text-danger' : soon ? 'text-warning' : 'text-fg-muted'}`}>
              {gone ? `expired ${pluralDays(days!)} ago` : `${pluralDays(days!)} left`}
            </p>
          </div>
        )
      },
    },
    {
      key: 'usage', header: 'Used on', width: 'w-[96px]', align: 'right', sortable: true,
      sortValue: (r) => projects.filter((p) => p.packageId === r.id).length,
      exportValue: (r) => projects.filter((p) => p.packageId === r.id).length,
      cell: (r) => {
        const n = projects.filter((p) => p.packageId === r.id).length
        return <span className="tnum text-[12.5px] text-fg-muted">{n} job{n === 1 ? '' : 's'}</span>
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[120px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Service Packages"
        description="Rate cards per trade lane. Each package carries buying and selling rates, validity, free time and an explicit list of what is and is not included — so a quote can be produced in one click and the margin is known before the job starts."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New package
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Packages" value={packages.length} icon={<Tags />} accent="primary" sub={`${active.length} active`} />
        <KpiCard label="Trade lanes" value={new Set(packages.map((p) => `${p.originPortCode}-${p.destPortCode}`)).size} icon={<Route />} accent="accent" sub={`${new Set(packages.map((p) => p.destCountry)).size} destination countries`} />
        <KpiCard label="Average margin" value={fmtPercent(avgMargin)} icon={<TrendingUp />} accent={avgMargin >= 20 ? 'success' : 'warning'} sub="Across all rate cards" />
        <KpiCard label="Expiring ≤30 days" value={expiringSoon.length} icon={<Timer />} accent={expiringSoon.length ? 'warning' : 'success'} sub={expiringSoon.length ? expiringSoon.map((p) => p.code).join(', ') : 'Nothing to renegotiate'} />
      </div>

      <DataTable
        data={packages}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="package"
        storageKey="packages"
        exportName="service-packages"
        initialSort={{ key: 'code', dir: 'asc' }}
        searchText={(r) => [r.code, r.name, r.originPortName, r.destPortName, r.carrier, r.mode, ...r.inclusions].join(' ')}
        onRowClick={(r) => setViewing(r)}
        rowTone={(r) => (r.status === 'EXPIRED' ? 'opacity-55' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'ARCHIVED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'mode', label: 'Mode', values: mode, onChange: setMode,
            options: ['FCL', 'LCL', 'AIR', 'BREAKBULK', 'RORO'].map((v) => ({ value: v, label: v })),
            match: (r, v) => v.includes(r.mode),
          },
        ]}
        onDelete={(ids) => {
          removePackages(ids)
          toast.push({ tone: 'success', title: `${ids.length} packages deleted` })
        }}
        cascadeWarning={(rows) => {
          const used = projects.filter((p) => rows.some((r) => r.id === p.packageId))
          return used.length
            ? [`${used.length} job${used.length === 1 ? '' : 's'} were priced from these packages — their charge sheets stay intact but lose the tariff link`]
            : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) => upsertPackage({ ...r, status: 'ARCHIVED' }))
              toast.push({ tone: 'success', title: `${rows.length} packages archived` })
              clear()
            }}
          >
            Archive
          </Button>
        )}
        importFields={[
          { key: 'code', label: 'Package code', required: true },
          { key: 'name', label: 'Package name', required: true },
          { key: 'mode', label: 'Mode', hint: 'FCL / LCL / AIR / BREAKBULK' },
          { key: 'scope', label: 'Service scope', hint: 'PORT_TO_PORT / DOOR_TO_DOOR …' },
          { key: 'originPortCode', label: 'Origin port code', required: true },
          { key: 'destPortCode', label: 'Destination port code', required: true },
          { key: 'currency', label: 'Currency' },
          { key: 'transitDays', label: 'Transit days' },
          { key: 'freeTimeDays', label: 'Free time days' },
          { key: 'validFrom', label: 'Valid from', hint: 'YYYY-MM-DD' },
          { key: 'validTo', label: 'Valid to', hint: 'YYYY-MM-DD' },
          { key: 'status', label: 'Status' },
        ]}
        importSample={{
          code: 'PKG-VN-FCL-09', name: 'Java → Vietnam FCL', mode: 'FCL', scope: 'PORT_TO_PORT',
          originPortCode: 'IDTPP', destPortCode: 'VNSGN', currency: 'USD', transitDays: '9',
          freeTimeDays: '7', validFrom: '2026-09-01', validTo: '2026-12-31', status: 'ACTIVE',
        }}
        toImportRow={(r) => ({
          code: r.code, name: r.name, mode: r.mode, scope: r.scope, originPortCode: r.originPortCode,
          destPortCode: r.destPortCode, currency: r.currency, transitDays: r.transitDays,
          freeTimeDays: r.freeTimeDays, validFrom: r.validFrom.slice(0, 10), validTo: r.validTo.slice(0, 10),
          status: r.status,
        })}
        onImport={(rows) => {
          const mapped = rows.map((r) => {
            const existing = packages.find((p) => p.code === r.code)
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('pkg'),
              code: r.code,
              name: r.name,
              mode: (r.mode || 'FCL') as ServicePackage['mode'],
              scope: (r.scope || 'PORT_TO_PORT') as ServicePackage['scope'],
              originPortCode: r.originPortCode,
              originPortName: existing?.originPortName ?? r.originPortCode,
              destPortCode: r.destPortCode,
              destPortName: existing?.destPortName ?? r.destPortCode,
              destCountry: existing?.destCountry ?? r.destPortCode.slice(0, 2),
              incoterm: existing?.incoterm ?? 'FOB',
              currency: (r.currency || 'USD') as ServicePackage['currency'],
              transitDays: Number(r.transitDays) || 14,
              freeTimeDays: Number(r.freeTimeDays) || 7,
              validFrom: r.validFrom || new Date().toISOString().slice(0, 10),
              validTo: r.validTo || new Date().toISOString().slice(0, 10),
              status: (r.status || 'DRAFT') as ServicePackage['status'],
              inclusions: existing?.inclusions ?? [],
              exclusions: existing?.exclusions ?? [],
              rateLines: existing?.rateLines ?? [],
              usageCount: existing?.usageCount ?? 0,
            } as ServicePackage
          })
          importPackages(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} packages imported`, description: 'Rate lines must be maintained in the editor.' })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Preview rate card">
              <Button variant="ghost" size="iconXs" onClick={() => setViewing(r)}>
                <Eye />
              </Button>
            </Tooltip>
            <Tooltip content="Duplicate for renegotiation">
              <Button
                variant="ghost"
                size="iconXs"
                onClick={() => {
                  const copy: ServicePackage = {
                    ...structuredClone(r),
                    id: uid('pkg'),
                    code: `${r.code}-R`,
                    name: `${r.name} (revision)`,
                    status: 'DRAFT',
                    usageCount: 0,
                  }
                  upsertPackage(copy)
                  toast.push({ tone: 'success', title: 'Package duplicated', description: copy.code })
                }}
              >
                <Copy />
              </Button>
            </Tooltip>
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}>
                <Pencil />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
      />

      <PackageForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        {viewing && (
          <DialogContent
            size="lg"
            icon={<Tags />}
            title={viewing.name}
            description={`${viewing.code} · ${viewing.originPortName} → ${viewing.destPortName} · ${viewing.mode} · ${titleCase(viewing.scope)}`}
            footer={
              <>
                <span className="mr-auto text-[12px] text-fg-muted">
                  Valid {fmtDate(viewing.validFrom)} – {fmtDate(viewing.validTo)} · {viewing.transitDays} days transit ·{' '}
                  {viewing.freeTimeDays} free days
                </span>
                <Button variant="secondary" size="sm" onClick={() => setViewing(null)}>Close</Button>
                <Button variant="primary" size="sm" onClick={() => { setEditing(viewing); setViewing(null); setFormOpen(true) }}>
                  <Pencil /> Edit
                </Button>
              </>
            }
          >
            <div className="p-5">
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-[12.5px]">
                  <thead className="bg-surface-sunken text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Charge</th>
                      <th className="px-3 py-2 text-left font-semibold">Basis</th>
                      <th className="px-3 py-2 text-right font-semibold">Buy</th>
                      <th className="px-3 py-2 text-right font-semibold">Sell</th>
                      <th className="px-3 py-2 text-right font-semibold">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {viewing.rateLines.map((l) => {
                      const m = l.sellRate ? ((l.sellRate - l.buyRate) / l.sellRate) * 100 : 0
                      return (
                        <tr key={l.id}>
                          <td className="px-3 py-2">
                            <span className="font-mono text-[11px] text-fg-subtle">{l.chargeCode}</span>{' '}
                            <span className="text-fg">{l.description}</span>
                            {l.containerType && <Badge tone="outline" size="sm" className="ml-1.5">{l.containerType}</Badge>}
                            {!l.mandatory && <Badge tone="neutral" size="sm" className="ml-1.5">optional</Badge>}
                          </td>
                          <td className="px-3 py-2 text-fg-muted">{titleCase(l.basis)}</td>
                          <td className="tnum px-3 py-2 text-right text-fg-muted">{fmtMoney(l.buyRate, l.currency)}</td>
                          <td className="tnum px-3 py-2 text-right font-medium text-fg">{fmtMoney(l.sellRate, l.currency)}</td>
                          <td className={`tnum px-3 py-2 text-right font-medium ${m < 10 ? 'text-warning' : 'text-success'}`}>
                            {fmtPercent(m, 0)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-success/25 bg-success-soft/50 p-3.5">
                  <p className="mb-2 text-[12px] font-semibold text-success-soft-fg">Included</p>
                  <ul className="space-y-1 text-[12px] text-success-soft-fg/90">
                    {viewing.inclusions.map((i) => <li key={i}>· {i}</li>)}
                  </ul>
                </div>
                <div className="rounded-xl border border-danger/25 bg-danger-soft/50 p-3.5">
                  <p className="mb-2 text-[12px] font-semibold text-danger-soft-fg">Not included</p>
                  <ul className="space-y-1 text-[12px] text-danger-soft-fg/90">
                    {viewing.exclusions.map((i) => <li key={i}>· {i}</li>)}
                  </ul>
                </div>
              </div>
              {viewing.notes && (
                <p className="mt-3 rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-[12px] leading-relaxed text-fg-muted">
                  {viewing.notes}
                </p>
              )}
              {viewing.carrier && (
                <p className="mt-3 text-[12px] text-fg-muted">
                  Carrier: <span className="font-medium text-fg">{viewing.carrier}</span>
                  {CARRIERS.find((c) => c.name === viewing.carrier) && (
                    <span className="ml-1.5 font-mono text-[11px] text-fg-subtle">
                      {CARRIERS.find((c) => c.name === viewing.carrier)!.scac}
                    </span>
                  )}
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="package"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={
          deleting
            ? (() => {
                const used = projects.filter((p) => p.packageId === deleting.id)
                return used.length ? [`${used.length} jobs were priced from this package`] : []
              })()
            : []
        }
        onConfirm={() => {
          if (deleting) {
            removePackages([deleting.id])
            toast.push({ tone: 'success', title: 'Package deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
