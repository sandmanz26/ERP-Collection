import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, CheckCircle2, Copy, Eye, FileText, Pencil, Percent, Plus, Send, Target,
  Trash2, TrendingUp, Trophy, XCircle,
} from 'lucide-react'
import type { LossReason, Project, ProjectCharge, Quotation } from '@/data/types'
import { CHARGE_CODES, LOSS_REASONS, countryFlag, defaultCostType } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { Dialog, DialogContent, Sheet } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { EmptyState, Progress, Separator } from '@/components/ui/misc'
import { QuotationForm } from './QuotationForm'
import {
  effectiveQuoteStatus, isQuoteOpen, lossReasonBreakdown, pipelineByStatus, pipelineSummary, quoteTotals,
} from '@/lib/analytics2'
import { fmtCurrency, fmtDate, fmtDateTime, fmtMoney, fmtPercent, pluralDays, relativeDays, titleCase } from '@/lib/format'
import { nextCode, uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { STAGE_TEMPLATE } from '@/pages/projects/stageTemplate'

export function QuotationsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const store = useErp()
  const { quotations, customers, projects, removeQuotations, importQuotations, upsertQuotation, reviseQuotation, decideQuotation, convertQuotation } = store
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Quotation | null>(null)
  const [viewing, setViewing] = React.useState<Quotation | null>(null)
  const [deciding, setDeciding] = React.useState<{ quote: Quotation; outcome: 'ACCEPTED' | 'REJECTED' } | null>(null)
  const [deleting, setDeleting] = React.useState<Quotation | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [owner, setOwner] = React.useState<string[]>([])
  const [source, setSource] = React.useState<string[]>([])

  const pipeline = pipelineSummary(quotations)
  const losses = lossReasonBreakdown(quotations)
  const byStatus = pipelineByStatus(quotations)
  const statusMax = Math.max(...byStatus.map((s) => s.value), 1)
  const lossMax = Math.max(...losses.map((l) => l.value), 1)

  const customerName = (id: string) => {
    const c = customers.find((x) => x.id === id)
    return c?.tradeName || c?.legalName || '—'
  }

  const convert = (q: Quotation) => {
    if (q.convertedProjectId) {
      nav(`/projects/${q.convertedProjectId}`)
      return
    }
    const customer = customers.find((c) => c.id === q.customerId)
    if (!customer) return
    const now = new Date().toISOString()
    const shipperOffice = customer.offices.find((o) => o.roles.includes('SHIPPER')) ?? customer.offices[0]
    const consigneeOffice = customer.offices.find((o) => o.countryCode === q.destCountry) ?? customer.offices.at(-1) ?? customer.offices[0]
    const projectId = uid('prj')
    const etd = new Date()
    etd.setDate(etd.getDate() + 14)
    const eta = new Date(etd)
    eta.setDate(eta.getDate() + q.transitDays)
    const cut = (days: number) => {
      const d = new Date(etd)
      d.setDate(d.getDate() - days)
      return d.toISOString()
    }

    const project: Project = {
      id: projectId,
      code: nextCode('PRJ', projects.map((p) => p.code), 4, true),
      jobNo: `JKT/EXP/${String(new Date().getFullYear()).slice(-2)}/${String(projects.length + 900).padStart(4, '0')}`,
      name: `${customer.tradeName ?? customer.legalName} — ${q.podName} ${q.commodity.split(',')[0]}`,
      type: q.paymentTerm === 'CONSIGNMENT_SETTLEMENT' ? 'CONSIGNMENT' : q.mode === 'LCL' ? 'PARTIAL_LCL' : q.mode === 'BREAKBULK' ? 'PROJECT_CARGO' : 'FULL_EXPORT',
      status: 'ACTIVE', priority: 'STANDARD', stage: 'INQUIRY', stages: STAGE_TEMPLATE(),
      clientId: customer.id, clientOfficeId: q.customerOfficeId,
      shipperId: customer.id, shipperOfficeId: shipperOffice?.id ?? q.customerOfficeId,
      consigneeId: customer.id, consigneeOfficeId: consigneeOffice?.id ?? q.customerOfficeId,
      mode: q.mode, scope: q.scope, incoterm: q.incoterm, freightTerm: 'PREPAID', paymentTerm: q.paymentTerm,
      packageId: q.packageId,
      commodity: q.commodity, hsCodes: q.hsCodes, cargoValue: q.cargoValue ?? 0, cargoCurrency: q.currency,
      insured: false, dangerousGoods: false,
      polCode: q.polCode, polName: q.polName, podCode: q.podCode, podName: q.podName, destCountry: q.destCountry,
      blType: 'ORIGINAL_3_3', blStatus: 'NOT_ISSUED',
      siCutoff: cut(5), vgmCutoff: cut(4), gateInCutoff: cut(3),
      etd: etd.toISOString(), eta: eta.toISOString(),
      currency: q.currency, fxRate: q.fxRate,
      quotedRevenue: quoteTotals(q).revenue,
      ownerName: q.ownerName, createdAt: now, updatedAt: now,
      tags: ['from-quotation'],
      remarks: `Converted from quotation ${q.number} v${q.version}. ${q.remarks ?? ''}`.trim(),
      timeline: [
        { id: uid('tl'), at: now, type: 'STATUS', title: `Job opened from ${q.number}`, detail: `Quotation accepted at ${q.currency} ${fmtMoney(quoteTotals(q).revenue, q.currency)}.`, actor: q.ownerName },
      ],
    }

    const charges: ProjectCharge[] = q.lines
      .filter((l) => !l.optional)
      .map((l) => ({
        id: uid('chg'), projectId, chargeCode: l.chargeCode, description: l.description,
        costType: defaultCostType(l.chargeCode),
        category: CHARGE_CODES.find((c) => c.code === l.chargeCode)?.category ?? 'OTHER',
        basis: l.basis, quantity: l.quantity, buyRate: l.buyRate, sellRate: l.sellRate,
        currency: l.currency, fxRate: q.fxRate, vatApplicable: l.vatApplicable, whtApplicable: false,
        freightTerm: 'PREPAID', billable: true, status: 'DRAFT', fromPackage: !!q.packageId,
        createdAt: now,
      }))

    convertQuotation(q.id, project, charges)
    toast.push({
      tone: 'success',
      title: `${project.code} opened from ${q.number}`,
      description: `${charges.length} charge lines carried over. Nothing was re-keyed.`,
      action: { label: 'Open the job', onClick: () => nav(`/projects/${projectId}`) },
    })
    setViewing(null)
  }

  const columns: Column<Quotation>[] = [
    {
      key: 'number', header: 'Quotation', width: 'w-[152px]', pinned: true, sortable: true,
      sortValue: (r) => r.number, exportValue: (r) => r.number,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-medium text-fg">{r.number}</p>
          <p className="truncate text-[10.5px] text-fg-subtle">
            v{r.version}
            {r.revisionOfId && ' · revised'}
            {r.convertedProjectId && ' · converted'}
          </p>
        </div>
      ),
    },
    {
      key: 'customer', header: 'Customer', width: 'min-w-[190px]', sortable: true,
      sortValue: (r) => customerName(r.customerId), exportValue: (r) => customerName(r.customerId),
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{customerName(r.customerId)}</p>
          <p className="truncate text-[11px] text-fg-muted">{r.contactName ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'commodity', header: 'Enquiry', width: 'min-w-[220px]', sortable: true,
      sortValue: (r) => r.commodity, exportValue: (r) => r.commodity,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-fg">{r.commodity}</p>
          <p className="truncate text-[11px] text-fg-muted">
            {r.equipment.map((e) => `${e.quantity} × ${e.type}`).join(', ') || `${r.cargoCbm ?? 0} m³`}
          </p>
        </div>
      ),
    },
    {
      key: 'lane', header: 'Lane', width: 'min-w-[200px]', sortable: true,
      sortValue: (r) => `${r.polName}-${r.podName}`, exportValue: (r) => `${r.polCode} → ${r.podCode}`,
      cell: (r) => (
        <span className="flex items-center gap-1.5 text-[12px]">
          <span className="text-[13px]">🇮🇩</span>
          <span className="text-fg">{r.polName}</span>
          <span className="text-fg-subtle">→</span>
          <span className="text-[13px]">{countryFlag(r.destCountry)}</span>
          <span className="text-fg">{r.podName}</span>
        </span>
      ),
    },
    {
      key: 'source', header: 'Source', width: 'w-[150px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.source, exportValue: (r) => r.source,
      cell: (r) => <Badge tone="outline" size="sm">{titleCase(r.source)}</Badge>,
    },
    {
      key: 'value', header: 'Quote value', width: 'w-[150px]', align: 'right', sortable: true,
      sortValue: (r) => quoteTotals(r).revenueIdr, exportValue: (r) => Math.round(quoteTotals(r).revenueIdr),
      cell: (r) => {
        const t = quoteTotals(r)
        return (
          <div>
            <p className="tnum text-[12.5px] font-medium text-fg">{r.currency} {fmtMoney(t.revenue, r.currency)}</p>
            <p className="tnum text-[11px] text-fg-muted">{fmtCurrency(t.revenueIdr, 'IDR', { compact: true })}</p>
          </div>
        )
      },
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[100px]', align: 'right', sortable: true,
      sortValue: (r) => quoteTotals(r).marginPct, exportValue: (r) => quoteTotals(r).marginPct.toFixed(1),
      cell: (r) => {
        const m = quoteTotals(r).marginPct
        return <Badge tone={m >= 20 ? 'success' : m >= 12 ? 'warning' : 'danger'} size="sm">{m.toFixed(0)}%</Badge>
      },
    },
    {
      key: 'probability', header: 'Probability', width: 'w-[128px]', align: 'right', sortable: true,
      sortValue: (r) => r.probability, exportValue: (r) => r.probability,
      cell: (r) =>
        isQuoteOpen(r) ? (
          <div className="ml-auto flex w-[100px] items-center gap-2">
            <Progress value={r.probability} tone={r.probability >= 70 ? 'success' : r.probability >= 40 ? 'warning' : 'danger'} size="sm" />
            <span className="tnum w-8 text-right text-[11.5px] text-fg-muted">{r.probability}%</span>
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: 'validTo', header: 'Valid to', width: 'w-[136px]', sortable: true,
      sortValue: (r) => r.validTo, exportValue: (r) => r.validTo,
      cell: (r) => {
        const d = relativeDays(r.validTo)!
        const open = isQuoteOpen(r)
        return (
          <div>
            <p className="tnum text-[12.5px] text-fg">{fmtDate(r.validTo)}</p>
            {open && (
              <p className={`text-[11px] ${d < 0 ? 'text-danger' : d <= 3 ? 'text-warning' : 'text-fg-muted'}`}>
                {d < 0 ? 'lapsed' : d === 0 ? 'today' : `${pluralDays(d)} left`}
              </p>
            )}
          </div>
        )
      },
    },
    {
      key: 'status', header: 'Status', width: 'w-[168px]', sortable: true,
      sortValue: (r) => effectiveQuoteStatus(r), exportValue: (r) => effectiveQuoteStatus(r),
      cell: (r) => {
        const eff = effectiveQuoteStatus(r)
        return (
          <div className="flex items-center gap-1.5">
            <StatusBadge value={eff} size="sm" />
            {r.status === 'REJECTED' && r.lossReason && (
              <Tooltip content={LOSS_REASONS.find((l) => l.value === r.lossReason)?.hint ?? ''}>
                <Badge tone="outline" size="sm">{LOSS_REASONS.find((l) => l.value === r.lossReason)?.label}</Badge>
              </Tooltip>
            )}
          </div>
        )
      },
    },
    {
      key: 'owner', header: 'Owner', width: 'w-[150px]', sortable: true,
      sortValue: (r) => r.ownerName, exportValue: (r) => r.ownerName,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.ownerName}</span>,
    },
  ]

  return (
    <>
      <PageHeader
        title="Quotations & Pipeline"
        description="The front half of the job. An enquiry is priced from a rate card, revised as the client pushes back, and — when it is won — becomes a job with every line carried over. Losses are recorded with a reason, because a win rate without a reason is just a number."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setFormOpen(true) }}>
            <Plus /> New quotation
          </Button>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Open pipeline"
          value={fmtCurrency(pipeline.openValue, 'IDR', { compact: true })}
          icon={<FileText />} accent="primary"
          sub={`${pipeline.openCount} live quotations`}
        />
        <KpiCard
          label="Weighted value"
          value={fmtCurrency(pipeline.weightedValue, 'IDR', { compact: true })}
          icon={<Target />} accent="accent"
          sub="Discounted by probability"
        />
        <KpiCard
          label="Win rate"
          value={fmtPercent(pipeline.winRatePct, 0)}
          icon={<Trophy />}
          accent={pipeline.winRatePct >= 35 ? 'success' : 'warning'}
          sub={`${pipeline.won.length} won of ${pipeline.decided.length} decided · ${fmtPercent(pipeline.winRateByValue, 0)} by value`}
        />
        <KpiCard
          label="Average quoted margin"
          value={fmtPercent(pipeline.avgMarginPct)}
          icon={<Percent />}
          accent={pipeline.avgMarginPct >= 20 ? 'success' : 'warning'}
          sub="Across live quotations"
        />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Pipeline by status" description="Where the quoted value is sitting." />
          <CardBody className="space-y-2.5">
            {byStatus.filter((s) => s.count > 0).map((s) => (
              <div key={s.status} className="flex items-center gap-3">
                <span className="w-[140px] shrink-0 truncate text-[12.5px] text-fg-muted">{titleCase(s.status)}</span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-md ${s.status === 'ACCEPTED' ? 'bg-success/80' : s.status === 'REJECTED' ? 'bg-danger/70' : s.status === 'EXPIRED' ? 'bg-neutral-soft' : 'bg-primary/80'}`}
                    style={{ width: `${(s.value / statusMax) * 100}%` }}
                  />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[12px] text-fg-muted">{s.count}</span>
                <span className="tnum w-[76px] shrink-0 text-right text-[12px] text-fg">{fmtCurrency(s.value, 'IDR', { compact: true })}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Why we lose" description="Ranked by the value walked away. Price is rarely the whole story." />
          <CardBody className="space-y-2.5">
            {losses.length === 0 && <p className="py-6 text-center text-[12.5px] text-fg-subtle">Nothing lost yet.</p>}
            {losses.map((l) => (
              <div key={l.reason}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="text-[12.5px] text-fg">
                    {LOSS_REASONS.find((x) => x.value === l.reason)?.label ?? titleCase(l.reason)}
                    <span className="ml-2 text-[11px] text-fg-subtle">{l.count} quotation{l.count === 1 ? '' : 's'}</span>
                  </span>
                  <span className="tnum text-[12px] text-fg-muted">{fmtCurrency(l.value, 'IDR', { compact: true })}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                  <div className="h-full rounded-full bg-danger/75" style={{ width: `${(l.value / lossMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <DataTable
        data={quotations}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.number} v${r.version} — ${customerName(r.customerId)}`}
        entityLabel="quotation"
        storageKey="quotations"
        exportName="quotations"
        initialSort={{ key: 'validTo', dir: 'asc' }}
        searchText={(r) => [r.number, r.commodity, r.polName, r.podName, r.ownerName, r.contactName, customerName(r.customerId), r.remarks].join(' ')}
        onRowClick={(r) => setViewing(r)}
        rowTone={(r) => (effectiveQuoteStatus(r) === 'EXPIRED' ? 'opacity-60' : r.status === 'REJECTED' ? 'bg-danger-soft/15' : r.status === 'ACCEPTED' ? 'bg-success-soft/20' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['DRAFT', 'SENT', 'UNDER_NEGOTIATION', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(effectiveQuoteStatus(r)),
          },
          {
            key: 'owner', label: 'Owner', values: owner, onChange: setOwner,
            options: Array.from(new Set(quotations.map((q) => q.ownerName))).map((v) => ({ value: v, label: v })),
            match: (r, v) => v.includes(r.ownerName),
          },
          {
            key: 'source', label: 'Source', values: source, onChange: setSource,
            options: ['INBOUND_RFQ', 'OUTBOUND', 'TENDER', 'RENEWAL', 'AGENT_NOMINATION'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.source),
          },
        ]}
        onDelete={(ids) => {
          removeQuotations(ids)
          toast.push({ tone: 'success', title: `${ids.length} quotations deleted` })
        }}
        cascadeWarning={(rows) => {
          const converted = rows.filter((r) => r.convertedProjectId)
          return converted.length ? [`${converted.length} of these already became jobs — the jobs stay, but lose their audit link back to the quote`] : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.filter((r) => r.status === 'DRAFT').forEach((r) => upsertQuotation({ ...r, status: 'SENT', sentAt: new Date().toISOString() }))
              toast.push({ tone: 'success', title: `${rows.filter((r) => r.status === 'DRAFT').length} quotations marked as sent` })
              clear()
            }}
          >
            <Send /> Mark as sent
          </Button>
        )}
        importFields={[
          { key: 'number', label: 'Quotation number', required: true },
          { key: 'customerCode', label: 'Customer code', required: true },
          { key: 'commodity', label: 'Commodity', required: true },
          { key: 'mode', label: 'Mode' },
          { key: 'polCode', label: 'POL code', required: true },
          { key: 'podCode', label: 'POD code', required: true },
          { key: 'incoterm', label: 'Incoterm' },
          { key: 'currency', label: 'Currency' },
          { key: 'validFrom', label: 'Valid from', hint: 'YYYY-MM-DD' },
          { key: 'validTo', label: 'Valid to', hint: 'YYYY-MM-DD' },
          { key: 'status', label: 'Status' },
          { key: 'probability', label: 'Probability %' },
          { key: 'owner', label: 'Owner' },
          { key: 'sellTotal', label: 'Quoted sell total', hint: 'Creates a single summary line' },
        ]}
        importSample={{
          number: 'QT-2026-0100', customerCode: 'CUS-0001', commodity: 'Teak furniture', mode: 'FCL',
          polCode: 'IDSRG', podCode: 'NLRTM', incoterm: 'FOB', currency: 'USD', validFrom: '2026-09-01',
          validTo: '2026-09-30', status: 'SENT', probability: '60', owner: 'Elena Marchetti', sellTotal: '6200',
        }}
        toImportRow={(r) => ({
          number: r.number, customerCode: customers.find((c) => c.id === r.customerId)?.code ?? '',
          commodity: r.commodity, mode: r.mode, polCode: r.polCode, podCode: r.podCode,
          incoterm: r.incoterm, currency: r.currency, validFrom: r.validFrom.slice(0, 10),
          validTo: r.validTo.slice(0, 10), status: r.status, probability: r.probability,
          owner: r.ownerName, sellTotal: Math.round(quoteTotals(r).revenue),
        })}
        onImport={(rows) => {
          const mapped = rows
            .map((r) => {
              const cust = customers.find((c) => c.code === r.customerCode)
              if (!cust) return null
              const existing = quotations.find((q) => q.number === r.number)
              const now = new Date().toISOString()
              const sell = Number(r.sellTotal) || 0
              return {
                ...(existing ?? {}),
                id: existing?.id ?? uid('qt'),
                number: r.number,
                version: existing?.version ?? 1,
                customerId: cust.id, customerOfficeId: cust.offices[0]?.id ?? '',
                source: existing?.source ?? 'INBOUND_RFQ',
                status: (r.status || 'DRAFT') as Quotation['status'],
                mode: (r.mode || 'FCL') as Quotation['mode'],
                scope: existing?.scope ?? 'PORT_TO_PORT',
                incoterm: (r.incoterm || 'FOB') as Quotation['incoterm'],
                paymentTerm: existing?.paymentTerm ?? cust.defaultPaymentTerm,
                polCode: r.polCode, polName: existing?.polName ?? r.polCode,
                podCode: r.podCode, podName: existing?.podName ?? r.podCode,
                destCountry: existing?.destCountry ?? r.podCode.slice(0, 2),
                commodity: r.commodity, hsCodes: existing?.hsCodes ?? [],
                equipment: existing?.equipment ?? [],
                currency: (r.currency || 'USD') as Quotation['currency'],
                fxRate: existing?.fxRate ?? 16250,
                transitDays: existing?.transitDays ?? 21,
                freeTimeDays: existing?.freeTimeDays ?? 7,
                validFrom: r.validFrom || now.slice(0, 10),
                validTo: r.validTo || now.slice(0, 10),
                lines: existing?.lines ?? (sell ? [{ id: uid('ql'), chargeCode: 'OFR', description: 'All-in quoted rate', basis: 'PER_SHIPMENT' as const, quantity: 1, buyRate: sell * 0.8, sellRate: sell, currency: (r.currency || 'USD') as Quotation['currency'], vatApplicable: false, optional: false }] : []),
                probability: Number(r.probability) || 50,
                ownerName: r.owner || 'Elena Marchetti',
                createdAt: existing?.createdAt ?? now, updatedAt: now,
                events: existing?.events ?? [{ id: uid('qe'), at: now, type: 'CREATED' as const, note: 'Imported from CSV.', actor: 'Import' }],
              } as Quotation
            })
            .filter(Boolean) as Quotation[]
          importQuotations(mapped)
          toast.push({ tone: mapped.length ? 'success' : 'warning', title: mapped.length ? `${mapped.length} quotations imported` : 'Nothing imported' })
        }}
        rowActions={(r) => (
          <>
            <Tooltip content="Open quotation">
              <Button variant="ghost" size="iconXs" onClick={() => setViewing(r)}><Eye /></Button>
            </Tooltip>
            {isQuoteOpen(r) && (
              <Tooltip content="Revise — creates v{n+1} and supersedes this one">
                <Button variant="ghost" size="iconXs" onClick={() => {
                  const rev = reviseQuotation(r.id)
                  if (rev) {
                    toast.push({ tone: 'success', title: `Revision v${rev.version} opened`, description: `${r.number} was superseded.` })
                    setEditing(rev)
                    setFormOpen(true)
                  }
                }}><Copy /></Button>
              </Tooltip>
            )}
            <Tooltip content="Edit">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil /></Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}><Trash2 /></Button>
            </Tooltip>
          </>
        )}
        footerSummary={(rows) => {
          const value = rows.reduce((a, r) => a + quoteTotals(r).revenueIdr, 0)
          const weighted = rows.filter(isQuoteOpen).reduce((a, r) => a + (quoteTotals(r).revenueIdr * r.probability) / 100, 0)
          return (
            <span className="tnum">
              Value <span className="font-semibold text-fg">{fmtCurrency(value, 'IDR', { compact: true })}</span> · Weighted{' '}
              <span className="font-semibold text-fg">{fmtCurrency(weighted, 'IDR', { compact: true })}</span>
            </span>
          )
        }}
      />

      <QuotationForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <QuotationDetail
        quote={viewing}
        onClose={() => setViewing(null)}
        onEdit={(q) => { setViewing(null); setEditing(q); setFormOpen(true) }}
        onDecide={(q, outcome) => setDeciding({ quote: q, outcome })}
        onConvert={convert}
        customerName={customerName}
      />

      <DecideDialog
        state={deciding}
        onClose={() => setDeciding(null)}
        onConfirm={(outcome, payload) => {
          if (!deciding) return
          decideQuotation(deciding.quote.id, outcome, payload)
          toast.push({
            tone: outcome === 'ACCEPTED' ? 'success' : 'info',
            title: outcome === 'ACCEPTED' ? `${deciding.quote.number} won` : `${deciding.quote.number} lost`,
            description: outcome === 'ACCEPTED' ? 'Convert it to a job to carry the pricing across.' : payload?.lossReason ? `Recorded as ${LOSS_REASONS.find((l) => l.value === payload.lossReason)?.label}.` : undefined,
          })
          setDeciding(null)
        }}
      />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="quotation"
        items={deleting ? [`${deleting.number} v${deleting.version} — ${customerName(deleting.customerId)}`] : []}
        destructiveNote={deleting?.convertedProjectId ? 'This quotation already became a job. Deleting it breaks the audit link.' : undefined}
        onConfirm={() => {
          if (deleting) {
            removeQuotations([deleting.id])
            toast.push({ tone: 'success', title: 'Quotation deleted' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}

/* ---------------- detail sheet ---------------- */
function QuotationDetail({
  quote, onClose, onEdit, onDecide, onConvert, customerName,
}: {
  quote: Quotation | null
  onClose: () => void
  onEdit: (q: Quotation) => void
  onDecide: (q: Quotation, outcome: 'ACCEPTED' | 'REJECTED') => void
  onConvert: (q: Quotation) => void
  customerName: (id: string) => string
}) {
  if (!quote) return null
  const t = quoteTotals(quote)
  const eff = effectiveQuoteStatus(quote)
  const open = isQuoteOpen(quote) && eff !== 'EXPIRED'

  return (
    <Sheet
      open={!!quote}
      onOpenChange={(v) => !v && onClose()}
      width="max-w-3xl"
      eyebrow={
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[12px] text-fg-muted">{quote.number}</span>
          <Badge tone="outline" size="sm">v{quote.version}</Badge>
          <StatusBadge value={eff} size="sm" />
          <Badge tone="outline" size="sm">{titleCase(quote.source)}</Badge>
        </div>
      }
      title={quote.commodity}
      description={`${customerName(quote.customerId)}${quote.contactName ? ` · ${quote.contactName}` : ''} — ${quote.polName} → ${quote.podName}`}
      footer={
        <>
          <div className="mr-auto flex items-center gap-3 text-[12px]">
            <span className="text-fg-muted">
              Quoted <span className="tnum font-semibold text-fg">{quote.currency} {fmtMoney(t.revenue, quote.currency)}</span>
            </span>
            <Badge tone={t.marginPct >= 20 ? 'success' : t.marginPct >= 12 ? 'warning' : 'danger'} size="sm">
              {fmtPercent(t.marginPct)} margin
            </Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onEdit(quote)}><Pencil /> Edit</Button>
          {open && (
            <>
              <Button variant="outlineDanger" size="sm" onClick={() => onDecide(quote, 'REJECTED')}><XCircle /> Mark lost</Button>
              <Button variant="secondary" size="sm" onClick={() => onDecide(quote, 'ACCEPTED')}><CheckCircle2 /> Mark won</Button>
            </>
          )}
          {(quote.status === 'ACCEPTED' || open) && (
            <Button variant="primary" size="sm" onClick={() => onConvert(quote)}>
              {quote.convertedProjectId ? 'Open the job' : 'Convert to job'} <ArrowRight />
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4 p-5">
        {quote.convertedProjectId && (
          <div className="flex items-center gap-2.5 rounded-lg border border-success/30 bg-success-soft px-3.5 py-2.5 text-[12.5px] text-success-soft-fg">
            <CheckCircle2 className="size-4 shrink-0" />
            This quotation was converted to a job. Its pricing became the job's charge sheet.
          </div>
        )}
        {quote.status === 'REJECTED' && (
          <div className="rounded-lg border border-danger/25 bg-danger-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-danger-soft-fg">
            <p className="font-semibold">
              Lost — {LOSS_REASONS.find((l) => l.value === quote.lossReason)?.label ?? 'reason not recorded'}
              {quote.competitorName && ` to ${quote.competitorName}`}
            </p>
            {quote.remarks && <p className="mt-1">{quote.remarks}</p>}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <Stat label="Quoted value" value={`${quote.currency} ${fmtMoney(t.revenue, quote.currency)}`} sub={fmtCurrency(t.revenueIdr, 'IDR', { compact: true })} />
          <Stat label="Buying cost" value={`${quote.currency} ${fmtMoney(t.cost, quote.currency)}`} />
          <Stat label="Margin" value={`${quote.currency} ${fmtMoney(t.margin, quote.currency)}`} sub={fmtPercent(t.marginPct)} />
          <Stat label="Transit" value={`${quote.transitDays} days`} sub={`${quote.freeTimeDays} free days`} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-[12.5px]">
            <thead className="bg-surface-sunken text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Charge</th>
                <th className="px-3 py-2 text-right font-semibold">Qty</th>
                <th className="px-3 py-2 text-right font-semibold">Buy</th>
                <th className="px-3 py-2 text-right font-semibold">Sell</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quote.lines.map((l) => (
                <tr key={l.id} className={l.optional ? 'opacity-60' : ''}>
                  <td className="px-3 py-2">
                    <span className="font-mono text-[11px] text-fg-subtle">{l.chargeCode}</span>{' '}
                    <span className="text-fg">{l.description}</span>
                    {l.optional && <Badge tone="neutral" size="sm" className="ml-1.5">optional</Badge>}
                  </td>
                  <td className="tnum px-3 py-2 text-right text-fg-muted">{l.quantity}</td>
                  <td className="tnum px-3 py-2 text-right text-fg-muted">{fmtMoney(l.buyRate, l.currency)}</td>
                  <td className="tnum px-3 py-2 text-right text-fg">{fmtMoney(l.sellRate, l.currency)}</td>
                  <td className="tnum px-3 py-2 text-right font-medium text-fg">{fmtMoney(l.quantity * l.sellRate, l.currency)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border-strong bg-surface-sunken font-semibold">
                <td className="px-3 py-2.5" colSpan={4}>Total excluding optional lines</td>
                <td className="tnum px-3 py-2.5 text-right">{quote.currency} {fmtMoney(t.revenue, quote.currency)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {quote.terms && (
          <div className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Terms shown to the client</p>
            <p className="text-[12.5px] leading-relaxed text-fg-muted">{quote.terms}</p>
          </div>
        )}

        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-fg">Negotiation history</p>
          <ol className="relative space-y-0 border-l border-border pl-5">
            {quote.events.map((e) => (
              <li key={e.id} className="relative pb-4 last:pb-0">
                <span className={`absolute -left-[25px] top-1 size-3 rounded-full ring-4 ring-surface ${e.type === 'DECIDED' ? 'bg-success' : e.type === 'REVISED' ? 'bg-warning' : e.type === 'CONVERTED' ? 'bg-accent' : 'bg-primary'}`} />
                <div className="flex flex-wrap items-baseline gap-x-2.5">
                  <span className="text-[12.5px] font-medium text-fg">{titleCase(e.type)}</span>
                  <span className="tnum text-[11.5px] text-fg-subtle">{fmtDateTime(e.at)}</span>
                  <span className="text-[11.5px] text-fg-subtle">· {e.actor}</span>
                </div>
                <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-muted">{e.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Sheet>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
      <p className="truncate text-[10.5px] font-medium uppercase tracking-[0.07em] text-fg-subtle">{label}</p>
      <p className="tnum mt-1 truncate text-[15px] font-semibold text-fg">{value}</p>
      {sub && <p className="truncate text-[11px] text-fg-muted">{sub}</p>}
    </div>
  )
}

/* ---------------- win / loss dialog ---------------- */
function DecideDialog({
  state, onClose, onConfirm,
}: {
  state: { quote: Quotation; outcome: 'ACCEPTED' | 'REJECTED' } | null
  onClose: () => void
  onConfirm: (outcome: 'ACCEPTED' | 'REJECTED', payload?: { lossReason?: LossReason; competitorName?: string; note?: string }) => void
}) {
  const [reason, setReason] = React.useState<LossReason>('PRICE')
  const [competitor, setCompetitor] = React.useState('')
  const [note, setNote] = React.useState('')

  React.useEffect(() => {
    if (state) {
      setReason('PRICE')
      setCompetitor('')
      setNote('')
    }
  }, [state])

  if (!state) return null
  const lost = state.outcome === 'REJECTED'

  return (
    <Dialog open={!!state} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        size="sm"
        icon={lost ? <XCircle /> : <Trophy />}
        title={lost ? `Record ${state.quote.number} as lost` : `Record ${state.quote.number} as won`}
        description={
          lost
            ? 'A loss without a reason teaches nothing. Pick the reason that actually decided it.'
            : 'The quotation locks at 100% probability and can be converted into a job.'
        }
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              variant={lost ? 'danger' : 'primary'}
              size="sm"
              onClick={() => onConfirm(state.outcome, lost ? { lossReason: reason, competitorName: competitor || undefined, note: note || undefined } : { note: note || undefined })}
            >
              {lost ? 'Mark as lost' : 'Mark as won'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-5">
          {lost && (
            <>
              <Field label="Loss reason" required help="Ranked on the pipeline page by the value walked away.">
                <Select
                  value={reason}
                  onChange={setReason}
                  options={LOSS_REASONS.map((l) => ({ value: l.value, label: l.label, description: l.hint }))}
                />
              </Field>
              <Field label="Competitor" hint="optional">
                <Input value={competitor} onChange={(e) => setCompetitor(e.target.value)} placeholder="Pacific Rim Logistics" />
              </Field>
            </>
          )}
          <Field label="Note" hint="added to the negotiation history">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={lost ? 'What would have won it?' : 'Who confirmed, and on what terms?'} />
          </Field>
          <Separator />
          <div className="flex items-center justify-between text-[12.5px]">
            <span className="text-fg-muted">Value at stake</span>
            <span className="tnum font-semibold text-fg">
              {state.quote.currency} {fmtMoney(quoteTotals(state.quote).revenue, state.quote.currency)}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export { EmptyState, TrendingUp }
