import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, FileCheck2, Receipt, Ship, Stamp, TriangleAlert, Wallet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import {
  allocateLandedCost, availableDate, costCompleteness, creditableTaxes, customsValueIdr,
  documentCompleteness, dutyTotal, freeTimeState, goodsValueIdr, landedCostTotal, ndpbmVariance,
  permitGate, pibGate, preferenceAtRisk,
} from '@/lib/importing'
import {
  CUSTOMS_LANES, CUSTOMS_OFFICES, importCostLabel, importDocLabel, IMPORT_DOC_TYPES, laneMeta,
  permitKindLabel, portLabel, SHIPMENT_STATES, shipmentStateIndex,
} from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber, fmtPercent, relativeLabel } from '@/lib/format'

export function ImportDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const s = useMfg()

  const sh = s.shipments.find((x) => x.id === id)
  if (!sh) {
    return <EmptyState title="Shipment not found" action={<Button onClick={() => navigate('/imports')}>Back to shipments</Button>} />
  }

  const supplier = s.suppliers.find((x) => x.id === sh.supplierId)
  const ft = freeTimeState(sh)
  const docs = documentCompleteness(sh)
  const costs = costCompleteness(sh)
  const allocation = allocateLandedCost(sh, s.items)
  const pref = preferenceAtRisk(sh, s.items)
  const pib = pibGate(sh, s.items)
  /* the permit gate stops mattering once the goods are cleared and in the store */
  const permitsApply = !['RECEIVED', 'CLEARED', 'CANCELLED'].includes(sh.status)
  const permits = permitsApply
    ? permitGate(sh, s.items, s.permits, s.settings.permitWarningDays)
    : { ok: true, problems: [] as ReturnType<typeof permitGate>['problems'] }
  const taxes = creditableTaxes(sh)
  const fx = ndpbmVariance(sh)
  const avail = availableDate(sh, supplier, s.items)
  const stateIdx = shipmentStateIndex(sh.status)

  const nextState = SHIPMENT_STATES.filter((x) => x.value !== 'CANCELLED')[stateIdx + 1]

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={
          <>
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link to="/imports"><ArrowLeft /> Shipments</Link>
            </Button>
            <StatusBadge value={sh.status} size="sm" />
            {sh.lane !== 'PENDING' && (
              <Tooltip content={laneMeta(sh.lane).hint}>
                <span><StatusBadge value={sh.lane} size="sm" /></span>
              </Tooltip>
            )}
          </>
        }
        title={`${sh.code} · ${supplier?.name ?? ''}`}
        description={sh.note}
        meta={
          <>
            <span className="text-[12.5px] text-fg-muted">{portLabel(sh.portOfLoading)} → {portLabel(sh.portOfDischarge)}</span>
            {sh.vessel && <span className="text-[12.5px] text-fg-muted">{sh.vessel} {sh.voyage}</span>}
            {sh.containerNo && <span className="font-mono text-[12.5px] text-fg-muted">{sh.containerNo} · {sh.containerType}</span>}
          </>
        }
        actions={
          nextState && sh.status !== 'RECEIVED' ? (
            <Button
              onClick={() => {
                if (nextState.value === 'PIB_SUBMITTED' && !pib.ok) {
                  toast.push({ tone: 'error', title: 'PIB cannot be lodged', description: pib.problems[0].detail })
                  return
                }
                if (nextState.value === 'ORDERED' && !permits.ok) {
                  toast.push({ tone: 'error', title: 'Blocked at the permit gate', description: permits.problems[0].detail })
                  return
                }
                s.advanceShipment(sh.id, nextState.value)
                toast.push({ tone: 'success', title: `Moved to ${nextState.label.toLowerCase()}`, description: nextState.gate })
              }}
            >
              <Check /> Advance to {nextState.short.toLowerCase()}
            </Button>
          ) : undefined
        }
      />

      {/* ---------------- state machine ---------------- */}
      <Card>
        <CardBody className="scrollbar-thin overflow-x-auto py-4">
          <div className="flex min-w-[880px] items-start gap-1">
            {SHIPMENT_STATES.filter((x) => x.value !== 'CANCELLED').map((st, i) => {
              const done = i < stateIdx
              const current = i === stateIdx
              return (
                <Tooltip key={st.value} content={st.gate}>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full text-[10.5px] font-semibold ${
                          done ? 'bg-success text-white' : current ? 'bg-primary text-primary-fg' : 'bg-neutral-soft text-neutral-soft-fg'
                        }`}
                      >
                        {done ? <Check className="size-3" /> : i + 1}
                      </span>
                      {i < SHIPMENT_STATES.length - 2 && (
                        <span className={`h-0.5 flex-1 rounded ${done ? 'bg-success' : 'bg-border'}`} />
                      )}
                    </div>
                    <p className={`mt-1.5 truncate text-[11px] ${current ? 'font-semibold text-fg' : 'text-fg-muted'}`}>{st.short}</p>
                  </div>
                </Tooltip>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* ---------------- urgent ---------------- */}
      {(ft.chargeableDays > 0 || (ft.running && (ft.daysRemaining ?? 9) <= 2) || !pib.ok || !permits.ok) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {ft.running && (
            <Card className={ft.chargeableDays > 0 ? 'border-danger/50' : 'border-warning/50'}>
              <CardBody className="flex items-start gap-3">
                <TriangleAlert className={`mt-0.5 size-5 shrink-0 ${ft.chargeableDays > 0 ? 'text-danger' : 'text-warning'}`} />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">
                    {ft.chargeableDays > 0
                      ? `${ft.chargeableDays} day${ft.chargeableDays === 1 ? '' : 's'} past free time — ${fmtCurrency(ft.accrued, 'IDR')} accrued`
                      : `${ft.daysRemaining} day${ft.daysRemaining === 1 ? '' : 's'} of free time left`}
                  </p>
                  <Because className="mt-1">
                    Discharged {fmtDate(sh.dischargedAt)} with {sh.freeTimeDays} days free; the clock lapses {fmtDate(ft.expiresOn)}.
                    The carrier charges {fmtCurrency(sh.demurragePerDay, 'IDR')} a day after that, and none of it is recoverable.
                  </Because>
                </div>
              </CardBody>
            </Card>
          )}
          {!pib.ok && (
            <Card className="border-danger/50">
              <CardBody className="flex items-start gap-3">
                <Stamp className="mt-0.5 size-5 shrink-0 text-danger" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">The declaration is incomplete</p>
                  {pib.problems.map((p, i) => (
                    <div key={i} className="mt-1">
                      <p className="text-[12.5px] font-medium text-danger">{p.title}</p>
                      <Because>{p.detail}</Because>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
          {!permits.ok && (
            <Card className="border-danger/50">
              <CardBody className="flex items-start gap-3">
                <FileCheck2 className="mt-0.5 size-5 shrink-0 text-danger" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">Permit problem</p>
                  {permits.problems.map((p, i) => (
                    <div key={i} className="mt-1">
                      <p className="text-[12.5px] font-medium text-danger">{p.title}</p>
                      <Because>{p.detail}</Because>
                      <p className="mt-0.5 text-[12px] text-fg"><span className="font-medium text-primary">Do this — </span>{p.remedy}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
          {pref && !pref.cooOnFile && (
            <Card className="border-warning/50">
              <CardBody className="flex items-start gap-3">
                <Receipt className="mt-0.5 size-5 shrink-0 text-warning" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-fg">
                    {fmtCurrency(pref.atRisk, 'IDR')} of duty rides on a missing certificate
                  </p>
                  <Because className="mt-1">
                    Under {pref.scheme} this consignment attracts {fmtCurrency(pref.preferentialDuty, 'IDR')}. Without the
                    certificate it attracts {fmtCurrency(pref.mfnDuty, 'IDR')}. Lodge the correction before the declaration is
                    final; after that the money is gone.
                  </Because>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          {/* ---------------- lines and landed cost ---------------- */}
          <Card>
            <CardHeader
              icon={<Wallet />}
              title="Lines and landed cost"
              description="Every non-creditable cost spread on its own basis — freight by volume, trucking by weight, duty per line at that line's own rate. PPN and PPh 22 are deliberately absent: they are creditable, and putting them in inventory over-states material cost by fourteen per cent."
              actions={
                !sh.costFinalised && sh.status === 'RECEIVED' ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      const map = Object.fromEntries(allocation.map((a) => [a.line.id, Math.round(a.landedUnitCost)]))
                      s.finaliseLandedCost(sh.id, map)
                      toast.push({ tone: 'success', title: 'Landed cost finalised', description: 'Lots revalued from provisional; the difference posts as purchase price variance.' })
                    }}
                  >
                    Finalise & post
                  </Button>
                ) : sh.costFinalised ? (
                  <Badge tone="success" size="sm">finalised {fmtDate(sh.costFinalisedAt)}</Badge>
                ) : (
                  <Badge tone="warning" size="sm">{fmtPercent(costs.percent, 0)} of costs actual</Badge>
                )
              }
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {allocation.map((a) => {
                  const item = s.items.find((i) => i.id === a.line.itemId)
                  return (
                    <div key={a.line.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-fg">{a.itemName}</p>
                          <p className="font-mono text-[11.5px] text-fg-muted">
                            {a.itemCode} · HS {a.line.hsCode} · duty applied {a.line.dutyRateApplied}%
                            {item?.dutyRatePreferential !== undefined && a.line.dutyRateApplied > item.dutyRatePreferential && (
                              <span className="ml-1.5 text-danger">MFN, not {item.preferentialScheme}</span>
                            )}
                          </p>
                          {a.line.note && <Because className="mt-1">{a.line.note}</Because>}
                        </div>
                        <div className="flex shrink-0 gap-5 text-right">
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Quantity</p>
                            <p className="tnum text-[12.5px] font-semibold">{fmtNumber(a.line.quantity, a.line.quantity < 10 ? 2 : 0)} {a.line.uom}</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Standard</p>
                            <p className="tnum text-[12.5px]">{fmtCurrency(a.standardCost, 'IDR', { compact: true })}</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">Landed / unit</p>
                            <p className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(a.landedUnitCost, 'IDR', { compact: true })}</p>
                          </div>
                          <div>
                            <p className="text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">PPV</p>
                            <p className={`tnum text-[12.5px] font-semibold ${a.ppvAmount > 0 ? 'text-danger' : 'text-success'}`}>
                              {a.ppvPercent > 0 ? '+' : ''}{fmtPercent(a.ppvPercent, 1)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 rounded-lg bg-surface-sunken/60 px-3 py-2">
                        <span className="text-[11px] text-fg-muted">
                          Goods <strong className="tnum text-fg">{fmtCurrency(a.goodsCost, 'IDR', { compact: true })}</strong>
                        </span>
                        {a.allocated.filter((x) => x.amount > 0).map((x) => (
                          <Tooltip key={x.code} content={`Spread ${x.basis.replace(/_/g, ' ').toLowerCase()}.`}>
                            <span className="text-[11px] text-fg-muted">
                              {x.label} <strong className="tnum text-fg">{fmtCurrency(x.amount, 'IDR', { compact: true })}</strong>
                            </span>
                          </Tooltip>
                        ))}
                        <span className="text-[11px] font-medium text-fg">
                          = <strong className="tnum">{fmtCurrency(a.landedTotal, 'IDR', { compact: true })}</strong>
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* ---------------- documents ---------------- */}
          <Card>
            <CardHeader
              icon={<FileCheck2 />}
              title="Documents"
              description="A PIB cannot be lodged with a mandatory document missing. The certificate of origin is optional in form and expensive in fact."
              actions={
                <div className="flex items-center gap-2">
                  <Progress value={docs.percent} tone={docs.percent === 100 ? 'success' : 'warning'} className="w-24" size="sm" />
                  <span className="tnum text-[11.5px] text-fg-muted">{docs.done}/{docs.total}</span>
                </div>
              }
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {sh.documents.map((doc) => {
                  const meta = IMPORT_DOC_TYPES.find((t) => t.value === doc.type)
                  return (
                    <div key={doc.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-medium text-fg">
                          {importDocLabel(doc.type)}
                          {doc.mandatory && doc.status !== 'NOT_APPLICABLE' && <span className="ml-1.5 text-[11px] text-danger">required</span>}
                        </p>
                        <p className="truncate font-mono text-[11px] text-fg-muted">{doc.reference}</p>
                        {doc.note ? <Because className="mt-0.5">{doc.note}</Because> : <Because className="mt-0.5 text-[11px]">{meta?.hint}</Because>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StatusBadge value={doc.status} size="sm" />
                        {(doc.status === 'REQUIRED' || doc.status === 'REJECTED') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              s.setDocumentStatus(sh.id, doc.id, 'VERIFIED')
                              toast.push({ tone: 'success', title: `${importDocLabel(doc.type)} verified` })
                            }}
                          >
                            Mark received
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>

          {/* ---------------- costs ---------------- */}
          <Card>
            <CardHeader icon={<Receipt />} title="Costs" description="What each line is, how it spreads, and whether the number has stopped moving." />
            <CardBody className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="py-2 pl-4 font-medium">Cost</th>
                    <th className="px-2 py-2 font-medium">Basis</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="px-2 py-2 text-right font-medium">In IDR</th>
                    <th className="py-2 pr-4 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sh.costs.map((c) => (
                    <tr key={c.id} className="border-b border-border/70 last:border-0">
                      <td className="py-2 pl-4">
                        <p className="text-[12.5px] text-fg">{importCostLabel(c.code)}</p>
                        {c.note && <Because className="text-[11px]">{c.note}</Because>}
                      </td>
                      <td className="px-2 py-2">
                        <span className="text-[11.5px] text-fg-muted">
                          {c.creditable ? <Badge tone="info" size="sm">creditable</Badge> : c.basis.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="tnum text-[12px] text-fg-muted">{fmtCurrency(c.amount, c.currency, { compact: c.currency === 'IDR' })}</span>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <span className="tnum text-[12.5px] font-semibold text-fg">{fmtCurrency(c.amount * c.fxRate, 'IDR', { compact: true })}</span>
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {c.actual ? <Badge tone="success" size="sm">actual</Badge> : <Badge tone="warning" size="sm">estimate</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-surface-sunken/60">
                    <td className="py-2.5 pl-4 text-[12.5px] font-semibold text-fg" colSpan={3}>Landed cost (inventory)</td>
                    <td className="py-2.5 text-right"><span className="tnum text-[13px] font-semibold text-fg">{fmtCurrency(landedCostTotal(sh), 'IDR')}</span></td>
                    <td />
                  </tr>
                  <tr className="bg-surface-sunken/40">
                    <td className="py-2 pl-4 text-[12px] text-fg-muted" colSpan={3}>Creditable taxes (not inventory cost)</td>
                    <td className="py-2 text-right"><span className="tnum text-[12.5px] text-fg-muted">{fmtCurrency(taxes.total, 'IDR')}</span></td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </CardBody>
          </Card>
        </div>

        {/* ---------------- side ---------------- */}
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader icon={<Ship />} title="When it becomes issuable" />
            <CardBody className="space-y-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.06em] text-fg-subtle">Available to issue</p>
                <p className="tnum mt-1 text-[21px] font-semibold leading-none tracking-[-0.02em] text-fg">{fmtDate(avail.date)}</p>
                <p className="mt-1 text-[12px] text-fg-muted">{relativeLabel(avail.date)}</p>
              </div>
              <Because>{avail.explanation}</Because>
              <Separator />
              <MetaRow label="ETD">{fmtDate(sh.etd)}</MetaRow>
              <MetaRow label="ETA">{fmtDate(sh.eta)}</MetaRow>
              <MetaRow label="Discharged">{fmtDate(sh.dischargedAt)}</MetaRow>
              <MetaRow label="Free time">{sh.freeTimeDays} days · {fmtCurrency(sh.demurragePerDay, 'IDR', { compact: true })}/day after</MetaRow>
              <MetaRow label="Forwarder">{sh.forwarder ?? '—'}</MetaRow>
              <MetaRow label="B/L">{sh.billOfLadingNo ?? 'not issued'}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<Stamp />}
              title="Customs"
              actions={
                sh.status === 'PIB_SUBMITTED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const h = supplier?.laneHistory ?? { green: 1, yellow: 0, red: 0 }
                      const total = h.green + h.yellow + h.red || 1
                      const roll = Math.random()
                      const lane = roll < h.green / total ? 'GREEN' : roll < (h.green + h.yellow) / total ? 'YELLOW' : 'RED'
                      s.assignLane(sh.id, lane)
                      toast.push({
                        tone: lane === 'GREEN' ? 'success' : lane === 'YELLOW' ? 'warning' : 'error',
                        title: `Channelled ${lane.toLowerCase()}`,
                        description: CUSTOMS_LANES.find((x) => x.value === lane)!.hint,
                      })
                    }}
                  >
                    Channel
                  </Button>
                ) : undefined
              }
            />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Office">{CUSTOMS_OFFICES.find((o) => o.code === sh.customsOffice)?.name ?? '—'}</MetaRow>
              <MetaRow label="PIB">{sh.pibNumber ?? 'not lodged'}{sh.pibDate ? ` · ${fmtDate(sh.pibDate)}` : ''}</MetaRow>
              <MetaRow label="Lane">
                {sh.lane === 'PENDING' ? 'not channelled' : (
                  <Tooltip content={laneMeta(sh.lane).hint}>
                    <span><StatusBadge value={sh.lane} size="sm" /></span>
                  </Tooltip>
                )}
              </MetaRow>
              <MetaRow label="SPPB">{sh.sppbNumber ?? 'not issued'}{sh.sppbDate ? ` · ${fmtDate(sh.sppbDate)}` : ''}</MetaRow>
              <MetaRow label="Broker">{sh.ppjk ?? '—'}</MetaRow>
              <MetaRow label="Duty (bea masuk)">{fmtCurrency(dutyTotal(sh), 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="PPN impor">{fmtCurrency(taxes.ppn, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="PPh 22 impor">{fmtCurrency(taxes.pph22, 'IDR', { compact: true })}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Wallet />} title="Value & rates" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Goods, at settlement rate">{fmtCurrency(goodsValueIdr(sh), 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Customs value (CIF)">{fmtCurrency(customsValueIdr(sh), 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="Landed cost">{fmtCurrency(landedCostTotal(sh), 'IDR', { compact: true })}</MetaRow>
              {fx && (
                <>
                  <MetaRow label="NDPBM (duty rate)">{fmtNumber(fx.ndpbm)}</MetaRow>
                  <MetaRow label="Settlement rate">{fmtNumber(fx.settlementRate)}</MetaRow>
                  <MetaRow label="FX variance">
                    <span className={fx.amount > 0 ? 'text-danger' : 'text-success'}>{fmtCurrency(fx.amount, 'IDR', { compact: true })}</span>
                  </MetaRow>
                </>
              )}
            </CardBody>
            {fx && (
              <CardBody className="border-t border-border">
                <Because>
                  Duty and PDRI were computed on the Minister of Finance rate in force on the PIB date. The supplier is paid at
                  a different one. The gap is a real number on a real shipment, and it is invisible in any system that keeps
                  only one rate.
                </Because>
              </CardBody>
            )}
          </Card>

          {sh.permitIds.length > 0 && (
            <Card>
              <CardHeader icon={<FileCheck2 />} title="Permits" />
              <CardBody className="space-y-2.5">
                {sh.permitIds.map((pid) => {
                  const p = s.permits.find((x) => x.id === pid)
                  if (!p) return null
                  const expired = p.expiresAt && p.expiresAt < (sh.eta ?? '')
                  return (
                    <div key={pid} className="border-b border-border pb-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[12.5px] font-medium text-fg">{permitKindLabel(p.kind)}</p>
                          <p className="truncate font-mono text-[11px] text-fg-muted">{p.number}</p>
                        </div>
                        {p.expiresAt && (
                          <span className={`tnum shrink-0 text-[11px] ${expired ? 'font-semibold text-danger' : 'text-fg-muted'}`}>
                            {expired ? 'lapses first' : `to ${fmtDate(p.expiresAt)}`}
                          </span>
                        )}
                      </div>
                      {p.note && <Because className="mt-0.5 text-[11px]">{p.note}</Because>}
                    </div>
                  )
                })}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
