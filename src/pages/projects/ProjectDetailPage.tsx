import * as React from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Building2, CalendarClock, CheckCircle2, Container as ContainerIcon,
  FileSignature, FileStack, Info, Pencil, Radio, Receipt, Repeat, Ship, ShieldCheck, Sparkles, Stamp, Anchor,
} from 'lucide-react'
import { useErp } from '@/store/useErp'
import { STAGES, countryFlag, stageIndex } from '@/data/reference'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { Stepper } from '@/components/shared/Stepper'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { ProjectForm } from './ProjectForm'
import { ContainersTable } from './tabs/ContainersTable'
import { DocumentsTable } from './tabs/DocumentsTable'
import { ChargesTable } from './tabs/ChargesTable'
import { ServicesPanel } from './tabs/ServicesPanel'
import { recommendServices, serviceBlockers } from '@/lib/services'
import { MilestonesTable } from '@/pages/tracking/MilestonesTable'
import { CustomsTable } from '@/pages/customs/CustomsTable'
import { filingReadiness, milestoneHealth, quoteTotals } from '@/lib/analytics2'
import { documentCompliance, evaluateStageGate, jobFinancials } from '@/lib/analytics'
import { fmtCurrency, fmtDate, fmtDateTime, fmtNumber, fmtPercent, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { itemCbm, itemGrossKg } from '@/lib/shipping'
import { useToast } from '@/components/ui/toast'
import type { StageKey } from '@/data/types'

type TabKey = 'overview' | 'containers' | 'documents' | 'charges' | 'services' | 'tracking' | 'customs' | 'timeline'

export function ProjectDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const store = useErp()
  const project = store.projects.find((p) => p.id === id)
  const [edit, setEdit] = React.useState(false)
  const [selectedStage, setSelectedStage] = React.useState<StageKey>(project?.stage ?? 'INQUIRY')

  React.useEffect(() => {
    if (project) setSelectedStage(project.stage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id])

  if (!project)
    return (
      <EmptyState
        icon={<Ship />}
        title="Job not found"
        description="It may have been deleted from this workspace."
        action={<Button variant="secondary" size="sm" onClick={() => nav('/projects')}>Back to projects</Button>}
      />
    )

  const tab = (params.get('tab') as TabKey) ?? 'overview'
  const setTab = (t: TabKey) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true })

  const containers = store.containers.filter((c) => c.projectId === project.id)
  const documents = store.documents.filter((d) => d.projectId === project.id)
  const charges = store.charges.filter((c) => c.projectId === project.id)
  const projectServices = store.jobServices.filter((j) => j.projectId === project.id)
  const client = store.customers.find((c) => c.id === project.clientId)
  const shipper = store.customers.find((c) => c.id === project.shipperId)
  const consignee = store.customers.find((c) => c.id === project.consigneeId)
  const shipperOffice = shipper?.offices.find((o) => o.id === project.shipperOfficeId)
  const consigneeOffice = consignee?.offices.find((o) => o.id === project.consigneeOfficeId)
  const pkg = store.packages.find((p) => p.id === project.packageId)
  const milestones = store.milestones.filter((m) => m.projectId === project.id)
  const filings = store.filings.filter((f) => f.projectId === project.id)
  const sourceQuote = store.quotations.find((q) => q.convertedProjectId === project.id)
  const tracking = milestoneHealth(milestones)
  const peb = filings.find((f) => f.type === 'PEB')
  const pebReadiness = peb ? filingReadiness(peb) : null

  const serviceGate = serviceBlockers(
    recommendServices(project, store.containers, projectServices, store.services),
    projectServices,
  )
  const gate = evaluateStageGate(project, containers, documents, client, { filings, serviceBlockers: serviceGate })
  const fin = jobFinancials(charges)
  const compliance = documentCompliance(project, documents)
  const currentIdx = stageIndex(project.stage)
  const nextStage = STAGES[currentIdx + 1]
  const selectedStageData = project.stages.find((s) => s.key === selectedStage)
  const selectedMeta = STAGES.find((s) => s.key === selectedStage)

  const totalCbm = containers.reduce((a, c) => a + c.items.reduce((s, i) => s + itemCbm(i), 0), 0)
  const totalKg = containers.reduce((a, c) => a + c.items.reduce((s, i) => s + itemGrossKg(i), 0), 0)

  return (
    <>
      <Button variant="ghost" size="sm" className="-ml-2 mb-2 w-fit" onClick={() => nav('/projects')}>
        <ArrowLeft /> Projects
      </Button>

      <PageHeader
        eyebrow={
          <>
            <span className="font-mono text-[12px] text-fg-muted">{project.code}</span>
            <span className="font-mono text-[11.5px] text-fg-subtle">{project.jobNo}</span>
            <StatusBadge value={project.status} size="sm" />
            {project.priority !== 'STANDARD' && <StatusBadge value={project.priority} size="sm" />}
            <Badge tone={project.type === 'CONSIGNMENT' ? 'purple' : 'outline'} size="sm">{titleCase(project.type)}</Badge>
          </>
        }
        title={project.name}
        description={project.remarks}
        meta={
          <>
            <span className="flex items-center gap-1.5 text-[12.5px] text-fg-muted">
              <span className="text-[14px]">🇮🇩</span> {project.polName}
              <ArrowRight className="size-3.5 text-fg-subtle" />
              <span className="text-[14px]">{countryFlag(project.destCountry)}</span> {project.podName}
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Mode</span> · {project.mode} {project.incoterm}
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Vessel</span> · {project.vessel ?? '—'} {project.voyage ?? ''}
            </span>
            <span className="text-[12.5px] text-fg-muted">
              <span className="text-fg-subtle">Owner</span> · {project.ownerName}
            </span>
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setEdit(true)}>
              <Pencil /> Edit job
            </Button>
            {nextStage && (
              <Tooltip
                content={
                  gate.blockers.length
                    ? `${gate.blockers.length} blocking item${gate.blockers.length === 1 ? '' : 's'} must be cleared first`
                    : `Move this job to ${nextStage.label}`
                }
              >
                <span>
                  <Button
                    variant="primary"
                    disabled={gate.blockers.length > 0}
                    onClick={() => {
                      store.advanceStage(project.id, nextStage.key)
                      setSelectedStage(nextStage.key)
                      toast.push({ tone: 'success', title: `Moved to ${nextStage.label}` })
                    }}
                  >
                    Advance to {nextStage.short} <ArrowRight />
                  </Button>
                </span>
              </Tooltip>
            )}
          </>
        }
      />

      <Stepper project={project} selected={selectedStage} onSelect={setSelectedStage} className="mb-4" />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MiniStat label="Containers" value={`${containers.length}`} sub={`${fmtNumber(totalCbm, 1)} m³ · ${fmtNumber(totalKg / 1000, 1)} t`} icon={<ContainerIcon />} />
        <MiniStat label="Documents" value={`${compliance.satisfiedCount}/${compliance.requiredCount}`} sub={`${compliance.pct.toFixed(0)}% complete`} icon={<FileStack />} tone={compliance.pct === 100 ? 'success' : 'warning'} />
        <MiniStat label="Revenue" value={fmtCurrency(fin.revenue, 'IDR', { compact: true })} sub={`${charges.length} charge lines`} icon={<Receipt />} />
        <MiniStat
          label="Gross margin"
          value={fmtCurrency(fin.margin, 'IDR', { compact: true })}
          sub={fmtPercent(fin.marginPct)}
          icon={<Receipt />}
          tone={fin.marginPct >= 20 ? 'success' : fin.marginPct >= 8 ? 'warning' : 'danger'}
        />
        <MiniStat
          label="On-time"
          value={fmtPercent(tracking.onTimePct, 0)}
          sub={`${tracking.recorded}/${tracking.total} events recorded`}
          icon={<Radio />}
          tone={tracking.onTimePct >= 90 ? 'success' : tracking.onTimePct >= 75 ? 'warning' : 'danger'}
        />
        <MiniStat
          label="Open blockers"
          value={`${gate.blockers.length}`}
          sub={
            gate.warnings.length
              ? `${gate.warnings.length} warning${gate.warnings.length === 1 ? '' : 's'} as well`
              : gate.blockers.length
                ? 'clear these to advance'
                : 'nothing flagged'
          }
          icon={<AlertTriangle />}
          tone={gate.blockers.length ? 'danger' : 'success'}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-4"
        items={[
          { value: 'overview', label: 'Overview', icon: <Info /> },
          { value: 'containers', label: 'Containers', icon: <ContainerIcon />, count: containers.length },
          { value: 'documents', label: 'Documents', icon: <FileStack />, count: documents.length },
          { value: 'charges', label: 'Charges', icon: <Receipt />, count: charges.length },
          { value: 'services', label: 'Services', icon: <Sparkles />, count: projectServices.length },
          { value: 'tracking', label: 'Tracking', icon: <Radio />, count: milestones.length },
          { value: 'customs', label: 'Customs', icon: <Stamp />, count: filings.length },
          { value: 'timeline', label: 'Timeline', icon: <CalendarClock />, count: project.timeline.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            {(gate.blockers.length > 0 || gate.warnings.length > 0) && (
              <Card className={gate.blockers.length ? 'border-danger/30' : 'border-warning/30'}>
                <CardHeader
                  icon={<AlertTriangle />}
                  title={gate.blockers.length ? `${gate.blockers.length} items block this stage` : `${gate.warnings.length} warnings`}
                  description={
                    gate.blockers.length
                      ? `The job cannot advance past ${titleCase(project.stage)} until these are cleared.`
                      : 'Nothing is blocking, but these are worth a look.'
                  }
                  className={gate.blockers.length ? 'bg-danger-soft/40' : 'bg-warning-soft/40'}
                />
                <CardBody className="space-y-2">
                  {gate.blockers.map((b, i) => (
                    <p key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-fg">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-danger" />
                      {b}
                    </p>
                  ))}
                  {gate.warnings.map((w, i) => (
                    <p key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-fg-muted">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
                      {w}
                    </p>
                  ))}
                </CardBody>
              </Card>
            )}

            <Card>
              <CardHeader
                icon={<CheckCircle2 />}
                title={selectedMeta?.label}
                description={selectedMeta?.description}
                actions={
                  <Badge tone={selectedStage === project.stage ? 'primary' : stageIndex(selectedStage) < currentIdx ? 'success' : 'neutral'} size="md">
                    {selectedStage === project.stage ? 'Current stage' : stageIndex(selectedStage) < currentIdx ? 'Completed' : 'Upcoming'}
                  </Badge>
                }
              />
              <div className="divide-y divide-border">
                {selectedStageData?.tasks.map((t) => (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-start gap-3 px-4 py-2.5 transition-colors hover:bg-bg-muted/50"
                  >
                    <span className="pt-0.5">
                      <Checkbox checked={t.done} onChange={() => store.toggleStageTask(project.id, selectedStage, t.id)} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] ${t.done ? 'text-fg-muted line-through' : 'text-fg'}`}>
                        {t.label}
                        {t.blocking && !t.done && (
                          <Badge tone="danger" size="sm" className="ml-2">blocking</Badge>
                        )}
                      </span>
                      {t.hint && <span className="mt-0.5 block text-[11.5px] leading-snug text-fg-subtle">{t.hint}</span>}
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-fg-subtle">
                      {t.owner && <span className="block">{t.owner}</span>}
                      {t.done && t.completedAt ? <span className="block">{fmtDate(t.completedAt)}</span> : t.dueAt ? <span className="block">due {fmtDate(t.dueAt)}</span> : null}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-3 border-t border-border bg-surface-sunken/60 px-4 py-3">
                <Progress
                  value={
                    selectedStageData?.tasks.length
                      ? (selectedStageData.tasks.filter((t) => t.done).length / selectedStageData.tasks.length) * 100
                      : 0
                  }
                  className="max-w-[220px]"
                />
                <span className="tnum text-[12px] text-fg-muted">
                  {selectedStageData?.tasks.filter((t) => t.done).length} of {selectedStageData?.tasks.length} done
                </span>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader icon={<Building2 />} title="Parties" />
                <CardBody className="space-y-3">
                  <PartyBlock
                    role="Client — bill to"
                    name={client?.tradeName || client?.legalName}
                    detail={client?.offices.find((o) => o.id === project.clientOfficeId)?.name}
                    country={client?.offices.find((o) => o.id === project.clientOfficeId)?.countryCode}
                    to={client ? `/customers/${client.id}` : undefined}
                    warn={client && client.creditLimit > 0 && client.outstandingAr > client.creditLimit ? 'over credit limit' : undefined}
                  />
                  <PartyBlock
                    role="Shipper"
                    name={shipper?.tradeName || shipper?.legalName}
                    detail={shipperOffice ? `${shipperOffice.name} · ${shipperOffice.city}` : undefined}
                    country={shipperOffice?.countryCode}
                    to={shipper ? `/customers/${shipper.id}` : undefined}
                  />
                  <PartyBlock
                    role="Consignee"
                    name={consignee?.tradeName || consignee?.legalName}
                    detail={consigneeOffice ? `${consigneeOffice.name} · ${consigneeOffice.city}` : undefined}
                    country={consigneeOffice?.countryCode}
                    to={consignee ? `/customers/${consignee.id}` : undefined}
                    warn={consigneeOffice && !consigneeOffice.customsId ? 'no customs / EORI on file' : undefined}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader icon={<Anchor />} title="Transport & B/L" />
                <CardBody className="divide-y divide-border">
                  <MetaRow label="Carrier">{project.carrier ?? '—'}</MetaRow>
                  <MetaRow label="Vessel / voyage">{project.vessel ? `${project.vessel} ${project.voyage ?? ''}` : '—'}</MetaRow>
                  <MetaRow label="Booking no.">
                    <span className="font-mono text-[12px]">{project.bookingNo ?? '—'}</span>
                  </MetaRow>
                  <MetaRow label="Master B/L">
                    <span className="font-mono text-[12px]">{project.masterBlNo ?? '—'}</span>
                  </MetaRow>
                  <MetaRow label="House B/L">
                    <span className="font-mono text-[12px]">{project.houseBlNo ?? '—'}</span>
                  </MetaRow>
                  <MetaRow label="B/L type">{titleCase(project.blType)}</MetaRow>
                  <MetaRow label="B/L status">
                    <StatusBadge value={project.blStatus} size="sm" />
                  </MetaRow>
                  <MetaRow label="PEB">
                    <span className="font-mono text-[12px]">{project.pebNumber ?? '—'}</span>
                  </MetaRow>
                  <MetaRow label="COO">
                    {project.cooForm ? `${project.cooForm}${project.cooNumber ? ` · ${project.cooNumber}` : ''}` : '—'}
                  </MetaRow>
                </CardBody>
              </Card>
            </div>

            {project.consignment && (
              <Card className="border-purple/30">
                <CardHeader
                  icon={<Repeat />}
                  title="Consignment terms"
                  description={`Agreement ${project.consignment.agreementNo} — title stays with the shipper until the consignee sells.`}
                  className="bg-purple-soft/40"
                />
                <CardBody>
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-[12.5px] text-fg-muted">Sell-through</span>
                      <span className="tnum text-[12.5px] font-semibold text-fg">
                        {project.consignment.reportedUnitsSold} / {project.consignment.totalUnitsShipped} units
                      </span>
                    </div>
                    <Progress
                      value={(project.consignment.reportedUnitsSold / Math.max(1, project.consignment.totalUnitsShipped)) * 100}
                      tone="accent"
                    />
                    {project.consignment.minimumGuaranteedUnits ? (
                      <p className="mt-1.5 text-[11.5px] text-fg-muted">
                        Minimum guarantee {project.consignment.minimumGuaranteedUnits} units —{' '}
                        {project.consignment.reportedUnitsSold >= project.consignment.minimumGuaranteedUnits ? (
                          <span className="text-success">met</span>
                        ) : (
                          <span className="text-warning">
                            {project.consignment.minimumGuaranteedUnits - project.consignment.reportedUnitsSold} short, billable as a shortfall
                          </span>
                        )}
                      </p>
                    ) : null}
                  </div>
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    <div className="divide-y divide-border">
                      <MetaRow label="Settlement cycle">{project.consignment.settlementCycleDays} days</MetaRow>
                      <MetaRow label="Commission">{project.consignment.commissionPct}%</MetaRow>
                      <MetaRow label="Unsold return window">{project.consignment.unsoldReturnDays} days</MetaRow>
                    </div>
                    <div className="divide-y divide-border">
                      <MetaRow label="Last sales report">{fmtDate(project.consignment.lastSalesReportAt)}</MetaRow>
                      <MetaRow label="Settled to date">{fmtCurrency(project.consignment.settledAmount, project.consignment.currency)}</MetaRow>
                      <MetaRow label="Unsold stock">
                        {project.consignment.totalUnitsShipped - project.consignment.reportedUnitsSold} units
                      </MetaRow>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader icon={<CalendarClock />} title="Cut-off calendar" description="Missing one of these rolls the job to the next sailing." />
              <CardBody className="space-y-2.5">
                <CutoffRow label="SI cut-off" iso={project.siCutoff} />
                <CutoffRow label="VGM cut-off" iso={project.vgmCutoff} />
                <CutoffRow label="Gate-in cut-off" iso={project.gateInCutoff} />
                <Separator />
                <CutoffRow label="ETD" iso={project.etd} actual={project.atd} />
                <CutoffRow label="ETA" iso={project.eta} actual={project.ata} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader icon={<ShieldCheck />} title="Commercial" />
              <CardBody className="divide-y divide-border">
                <MetaRow label="Incoterm">{project.incoterm}</MetaRow>
                <MetaRow label="Freight term">{titleCase(project.freightTerm)}</MetaRow>
                <MetaRow label="Payment term">{titleCase(project.paymentTerm)}</MetaRow>
                <MetaRow label="Service scope">{titleCase(project.scope)}</MetaRow>
                <MetaRow label="Package">
                  {pkg ? (
                    <Link to="/packages" className="text-primary hover:underline">
                      {pkg.code}
                    </Link>
                  ) : (
                    'priced manually'
                  )}
                </MetaRow>
                <MetaRow label="Cargo value">{fmtCurrency(project.cargoValue, project.cargoCurrency)}</MetaRow>
                <MetaRow label="Insurance">
                  {project.insured ? fmtCurrency(project.insuranceValue ?? 0, project.cargoCurrency) : 'not insured'}
                </MetaRow>
                <MetaRow label="Commodity">{project.commodity}</MetaRow>
                <MetaRow label="HS codes">
                  <span className="font-mono text-[12px]">{project.hsCodes.join(', ') || '—'}</span>
                </MetaRow>
              </CardBody>
            </Card>

            {peb && (
              <Card className={peb.channel === 'MERAH' ? 'border-danger/30' : peb.channel === 'KUNING' ? 'border-warning/30' : undefined}>
                <CardHeader icon={<Stamp />} title="Customs" description="CEISA 4.0 filing and its response lane." />
                <CardBody className="space-y-3">
                  <div className="divide-y divide-border">
                    <MetaRow label="PEB">
                      <span className="font-mono text-[12px]">{peb.regNumber ?? 'not registered'}</span>
                    </MetaRow>
                    <MetaRow label="Response lane">
                      <Badge
                        tone={peb.channel === 'HIJAU' ? 'success' : peb.channel === 'KUNING' ? 'warning' : peb.channel === 'MERAH' ? 'danger' : 'neutral'}
                        size="sm"
                        dot
                      >
                        {peb.channel === 'PENDING' ? 'Awaiting response' : `Jalur ${titleCase(peb.channel)}`}
                      </Badge>
                    </MetaRow>
                    <MetaRow label="Filed by">{peb.filedByName}</MetaRow>
                  </div>
                  {pebReadiness && pebReadiness.mandatoryCount > 0 && (
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[12px] text-fg-muted">Supporting uploads</span>
                        <span className="tnum text-[12px] font-semibold text-fg">
                          {pebReadiness.uploadedCount}/{pebReadiness.mandatoryCount}
                        </span>
                      </div>
                      <Progress value={pebReadiness.pct} tone={pebReadiness.canSubmit ? 'success' : 'warning'} />
                      {!pebReadiness.canSubmit && (
                        <p className="mt-1.5 text-[11.5px] text-warning">Missing: {pebReadiness.missing.join(', ')}</p>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            )}

            {sourceQuote && (
              <Card>
                <CardHeader icon={<FileSignature />} title="Won from" description="The quotation this job was converted from." />
                <CardBody className="divide-y divide-border">
                  <MetaRow label="Quotation">
                    <Link to="/quotations" className="font-mono text-[12px] text-primary hover:underline">
                      {sourceQuote.number} v{sourceQuote.version}
                    </Link>
                  </MetaRow>
                  <MetaRow label="Quoted value">
                    {sourceQuote.currency} {fmtNumber(quoteTotals(sourceQuote).revenue, 2)}
                  </MetaRow>
                  <MetaRow label="Quoted margin">{fmtPercent(quoteTotals(sourceQuote).marginPct)}</MetaRow>
                  <MetaRow label="Actual margin">
                    <span className={fin.marginPct < quoteTotals(sourceQuote).marginPct - 3 ? 'text-danger' : 'text-success'}>
                      {fmtPercent(fin.marginPct)}
                    </span>
                  </MetaRow>
                </CardBody>
              </Card>
            )}

            {project.tags.length > 0 && (
              <Card>
                <CardHeader title="Tags" />
                <CardBody className="flex flex-wrap gap-1.5">
                  {project.tags.map((t) => (
                    <Badge key={t} tone="outline" size="md">{t}</Badge>
                  ))}
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'containers' && <ContainersTable project={project} scoped />}
      {tab === 'documents' && <DocumentsTable project={project} scoped />}
      {tab === 'charges' && <ChargesTable project={project} scoped />}
      {tab === 'services' && <ServicesPanel project={project} />}
      {tab === 'tracking' && <MilestonesTable project={project} scoped />}
      {tab === 'customs' && <CustomsTable project={project} scoped />}

      {tab === 'timeline' && (
        <Card>
          <CardHeader icon={<CalendarClock />} title="Job timeline" description="Every operational and financial event recorded against this job." />
          <div className="p-5">
            <ol className="relative space-y-0 border-l border-border pl-5">
              {project.timeline.map((e) => (
                <li key={e.id} className="relative pb-5 last:pb-0">
                  <span
                    className={`absolute -left-[25px] top-1 grid size-3 place-items-center rounded-full ring-4 ring-surface ${
                      e.type === 'EXCEPTION' ? 'bg-danger' : e.type === 'FINANCE' ? 'bg-success' : e.type === 'DOCUMENT' ? 'bg-info' : e.type === 'CUSTOMS' ? 'bg-purple' : 'bg-primary'
                    }`}
                  />
                  <div className="flex flex-wrap items-baseline gap-x-2.5">
                    <p className="text-[13px] font-medium text-fg">{e.title}</p>
                    <Badge tone="outline" size="sm">{titleCase(e.type)}</Badge>
                    <span className="tnum text-[11.5px] text-fg-subtle">{fmtDateTime(e.at)}</span>
                  </div>
                  {e.detail && <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">{e.detail}</p>}
                  <p className="mt-1 text-[11.5px] text-fg-subtle">by {e.actor}</p>
                </li>
              ))}
            </ol>
          </div>
        </Card>
      )}

      <ProjectForm open={edit} onOpenChange={setEdit} initial={project} />
    </>
  )
}

function MiniStat({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  tone?: 'success' | 'warning' | 'danger'
}) {
  const toneCls = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : tone === 'danger' ? 'text-danger' : 'text-fg'
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface px-3.5 py-3">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-bg-muted text-fg-muted [&_svg]:size-4">{icon}</span>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
        <p className={`tnum mt-1 truncate text-[17px] font-semibold leading-none tracking-[-0.02em] ${toneCls}`}>{value}</p>
        {sub && <p className="mt-1 truncate text-[11.5px] text-fg-muted">{sub}</p>}
      </div>
    </div>
  )
}

function PartyBlock({
  role,
  name,
  detail,
  country,
  to,
  warn,
}: {
  role: string
  name?: string
  detail?: string
  country?: string
  to?: string
  warn?: string
}) {
  const body = (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-sunken px-3 py-2.5 transition-colors hover:border-border-strong">
      {country && <span className="mt-0.5 text-[16px]">{countryFlag(country)}</span>}
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">{role}</p>
        <p className="mt-0.5 truncate text-[13px] font-medium text-fg">{name ?? '—'}</p>
        {detail && <p className="truncate text-[11.5px] text-fg-muted">{detail}</p>}
        {warn && (
          <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-warning">
            <AlertTriangle className="size-3" /> {warn}
          </p>
        )}
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function CutoffRow({ label, iso, actual }: { label: string; iso?: string; actual?: string }) {
  const d = relativeDays(iso)
  const done = !!actual
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-fg-muted">{label}</span>
      <span className="flex items-center gap-2">
        <span className="tnum text-[12.5px] font-medium text-fg">{fmtDate(iso)}</span>
        {done ? (
          <Badge tone="success" size="sm">actual {fmtDate(actual)}</Badge>
        ) : d === null ? (
          <Badge tone="neutral" size="sm">not set</Badge>
        ) : d < 0 ? (
          <Badge tone="danger" size="sm">{pluralDays(d)} ago</Badge>
        ) : d === 0 ? (
          <Badge tone="warning" size="sm">today</Badge>
        ) : d <= 2 ? (
          <Badge tone="warning" size="sm">in {pluralDays(d)}</Badge>
        ) : (
          <Badge tone="neutral" size="sm">in {pluralDays(d)}</Badge>
        )}
      </span>
    </div>
  )
}
