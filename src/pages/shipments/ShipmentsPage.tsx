import * as React from 'react'
import { Link } from 'react-router-dom'
import { Container, ShieldCheck } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { cn } from '@/lib/utils'
import { fmtCurrency, fmtDate, fmtNumber, relativeLabel, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { COMPLIANCE_SPECS, containerSpec, complianceSpec, exportDocLabel, exportDocSpec } from '@/data/reference'

export function ShipmentsPage() {
  const store = useErp()
  const [view, setView] = React.useState<'shipments' | 'compliance'>('shipments')

  const live = store.shipments.filter((s) => !['SAILED', 'ARRIVED', 'CLOSED'].includes(s.status))
  const outstandingDocs = store.shipments.flatMap((s) =>
    s.documents.filter((d) => d.mandatory && d.status !== 'ISSUED').map((d) => ({ shipment: s, doc: d })),
  )
  const totalCbm = store.shipments.reduce((a, s) => a + s.containers.reduce((x, c) => x + c.loadedCbm, 0), 0)

  /* every won order's compliance set, whether or not it has a shipment yet */
  const complianceRows = store.projects
    .filter((p) => p.status === 'WON' && p.stage !== 'CLOSED')
    .map((p) => ({
      project: p,
      required: p.compliance,
      blocking: p.compliance.filter((c) => complianceSpec(c.key).blocking),
      satisfied: p.compliance.filter((c) => c.status === 'SATISFIED').length,
    }))

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Make & ship</Badge>}
        title="Shipments & export documents"
        description="Furniture made of wood does not leave Indonesia on goodwill. The document set on each shipment is derived from where the goods are going and what they are made of — an EU destination brings a due diligence pack, wooden crating brings ISPM-15, and nothing at all moves without a V-Legal document behind it."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'shipments', label: 'Shipments', count: store.shipments.length },
              { value: 'compliance', label: 'Compliance board', count: complianceRows.length },
            ]}
          />
        }
      />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Shipments" value={String(store.shipments.length)} sub={`${live.length} still being prepared`} icon={<Container />} accent="primary" />
        <KpiCard
          label="Containers"
          value={String(store.shipments.reduce((a, s) => a + s.containers.length, 0))}
          sub={`${fmtNumber(totalCbm, 1)} m³ loaded`}
          accent="accent"
        />
        <KpiCard
          label="Mandatory documents outstanding"
          value={String(outstandingDocs.length)}
          sub={outstandingDocs.length ? 'each one can stop a container' : 'every set complete'}
          icon={<ShieldCheck />}
          accent={outstandingDocs.length ? 'danger' : 'success'}
        />
        <KpiCard
          label="Value on the water"
          value={fmtCurrency(
            store.shipments.filter((s) => s.status === 'SAILED' || s.status === 'ARRIVED').reduce((a, s) => a + s.invoiceValue * (store.projects.find((p) => p.id === s.projectId)?.exchangeRate ?? 1), 0),
            'IDR',
            { compact: true },
          )}
          sub="invoiced and shipped"
          accent="success"
        />
      </div>

      {view === 'shipments' && (
        <div className="space-y-4">
          {store.shipments.length === 0 && (
            <EmptyState title="No shipments yet" description="A shipment appears once an order reaches QC and packing." />
          )}
          {store.shipments
            .slice()
            .sort((a, b) => (a.etd < b.etd ? -1 : 1))
            .map((s) => {
              const project = store.projects.find((p) => p.id === s.projectId)
              const missing = s.documents.filter((d) => d.mandatory && d.status !== 'ISSUED')
              const days = Math.round((new Date(s.etd).getTime() - Date.now()) / 86_400_000)
              return (
                <Card key={s.id} className={cn(missing.length > 0 && days <= 7 && 'border-danger/40')}>
                  <CardHeader
                    icon={<Container />}
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {s.code}
                        <StatusBadge value={s.status} size="sm" />
                        {missing.length > 0 && (
                          <Badge size="sm" tone={days <= 7 ? 'danger' : 'warning'}>
                            {missing.length} mandatory document{missing.length > 1 ? 's' : ''} outstanding
                          </Badge>
                        )}
                      </span>
                    }
                    description={
                      <>
                        {project && (
                          <Link to={`/projects/${project.id}`} className="font-medium text-primary hover:underline">
                            {project.code}
                          </Link>
                        )}{' '}
                        · {s.buyerName} · {s.polName} → {s.podName} · {s.forwarderName}
                        {s.vesselName ? ` · ${s.vesselName} ${s.voyageNo}` : ' · no vessel booked'}
                      </>
                    }
                    actions={
                      <div className="text-right">
                        <p className="text-[12.5px] font-semibold text-fg">ETD {fmtDate(s.etd)}</p>
                        <p className="text-[11.5px] text-fg-muted">{relativeLabel(s.etd)}</p>
                      </div>
                    }
                  />
                  {s.note && (
                    <CardBody className="pb-0 pt-3">
                      <p className="rounded-lg border border-warning/35 bg-warning-soft/40 px-3 py-2 text-[12.5px] leading-relaxed text-warning-soft-fg">
                        {s.note}
                      </p>
                    </CardBody>
                  )}
                  <CardBody className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Containers</p>
                      <div className="space-y-2">
                        {s.containers.map((c) => {
                          const spec = containerSpec(c.size)
                          const usable = spec.usableCbm || 1
                          return (
                            <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[12.5px] font-medium text-fg">
                                  {c.containerNo ?? <span className="text-fg-subtle">no number allocated</span>}{' '}
                                  <Badge size="sm" tone="neutral">{c.size}</Badge>
                                </p>
                                <p className="tnum truncate text-[11.5px] text-fg-muted">
                                  {fmtNumber(c.loadedCbm, 1)} of {spec.usableCbm} m³ · {fmtNumber(c.loadedWeightKg)} kg ·{' '}
                                  {c.packages} packages{c.sealNo ? ` · seal ${c.sealNo}` : ''}
                                </p>
                              </div>
                              <UtilisationBar pct={(c.loadedCbm / usable) * 100} lowIsBad className="w-20 shrink-0" />
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 space-y-0.5 border-t border-border pt-2">
                        <MetaRow label="Booking">{s.bookingNo ?? '—'}</MetaRow>
                        <MetaRow label="Stuffing">{s.stuffingAt ? fmtDate(s.stuffingAt) : 'not scheduled'}</MetaRow>
                        <MetaRow label="ETA">{fmtDate(s.eta)}</MetaRow>
                        <MetaRow label="Invoice value">{fmtCurrency(s.invoiceValue, s.currency, { compact: true })} {s.incoterm}</MetaRow>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Document set</p>
                      <div className="divide-y divide-border rounded-lg border border-border">
                        {s.documents.map((d) => (
                          <div key={d.id} className="px-3 py-2">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Tooltip content={exportDocSpec(d.type)?.hint ?? ''}>
                                  <p className="truncate text-[12.5px] font-medium text-fg">
                                    {exportDocLabel(d.type)}
                                    {d.mandatory && <span className="ml-1.5 text-[10.5px] font-normal uppercase tracking-wide text-danger">required</span>}
                                  </p>
                                </Tooltip>
                                <p className="tnum truncate text-[11px] text-fg-muted">
                                  {d.reference ? `${d.reference} · ${fmtDate(d.issuedAt)}` : d.issuer}
                                </p>
                              </div>
                              <StatusBadge value={d.status} size="sm" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )
            })}
        </div>
      )}

      {view === 'compliance' && (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="What each order owes"
              description="Read off the destination and the pieces themselves. Nothing on this board was ticked by hand — an EU buyer turns on the due diligence pack, a crated slab turns on ISPM-15, an American panel component turns on the formaldehyde declaration."
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[900px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="px-4 py-2 font-medium">Order</th>
                    <th className="px-4 py-2 font-medium">Destination</th>
                    {COMPLIANCE_SPECS.map((c) => (
                      <th key={c.key} className="px-2 py-2 text-center font-medium">
                        <Tooltip content={`${c.label} — ${c.hint}`}>
                          <span className="cursor-help">{c.key.split('_')[0]}</span>
                        </Tooltip>
                      </th>
                    ))}
                    <th className="px-4 py-2 text-right font-medium">Ships</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {complianceRows.map(({ project, required }) => (
                    <tr key={project.id} className="hover:bg-bg-muted/50">
                      <td className="px-4 py-2.5">
                        <Link to={`/projects/${project.id}`} className="font-medium text-fg hover:text-primary">
                          {project.code}
                        </Link>
                        <p className="truncate text-[11.5px] text-fg-muted">{project.buyerName}</p>
                      </td>
                      <td className="px-4 py-2.5 text-fg-muted">
                        {project.destinationCountry} · {project.destinationPort}
                      </td>
                      {COMPLIANCE_SPECS.map((spec) => {
                        const item = required.find((r) => r.key === spec.key)
                        if (!item) {
                          return (
                            <td key={spec.key} className="px-2 py-2.5 text-center text-fg-subtle">
                              ·
                            </td>
                          )
                        }
                        const tone =
                          item.status === 'SATISFIED' ? 'bg-success'
                            : item.status === 'IN_PROGRESS' ? 'bg-warning'
                              : item.status === 'FAILED' ? 'bg-danger'
                                : 'bg-border-strong'
                        return (
                          <td key={spec.key} className="px-2 py-2.5 text-center">
                            <Tooltip content={`${spec.label}: ${titleCase(item.status)}${item.reference ? ` (${item.reference})` : ''}`}>
                              <span className={cn('mx-auto block size-3 rounded-full', tone)} />
                            </Tooltip>
                          </td>
                        )
                      })}
                      <td className="px-4 py-2.5 text-right text-fg-muted">
                        {fmtDate(project.targetShipAt, 'short')}
                        <span className="block text-[11px] text-fg-subtle">{relativeLabel(project.targetShipAt)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <CardBody className="border-t border-border">
              <div className="flex flex-wrap items-center gap-4 text-[11.5px] text-fg-muted">
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-success" /> satisfied</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-warning" /> in progress</span>
                <span className="flex items-center gap-1.5"><span className="size-3 rounded-full bg-border-strong" /> required, not started</span>
                <span className="flex items-center gap-1.5"><span className="text-fg-subtle">·</span> not required for this order</span>
              </div>
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {COMPLIANCE_SPECS.map((c) => (
              <Card key={c.key}>
                <CardHeader
                  icon={<ShieldCheck />}
                  title={
                    <span className="flex items-center gap-2">
                      {c.label}
                      {c.blocking && <Badge size="sm" tone="danger">blocking</Badge>}
                    </span>
                  }
                  description={`${c.authority} · ${c.leadTimeDays} days to obtain`}
                />
                <CardBody>
                  <p className="text-[12.5px] leading-relaxed text-fg-muted">{c.hint}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
