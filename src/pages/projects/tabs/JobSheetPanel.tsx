import * as React from 'react'
import { AlertTriangle, Banknote, HandCoins, Landmark, Receipt, Wallet } from 'lucide-react'
import type { CostType, Project } from '@/data/types'
import { FIELD_SETTLEMENT_DAYS, costTypeMeta } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { jobSheet } from '@/lib/stuffing'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { fmtCurrency, fmtDate, fmtPercent } from '@/lib/format'

/* Tailwind only ships classes it can see, so the bucket tones are spelled out. */
const BUCKET_TONE: Record<CostType, { chip: string; bar: 'primary' | 'warning' | 'accent' }> = {
  MASTER: { chip: 'bg-primary-soft text-primary-soft-fg', bar: 'primary' },
  FIELD: { chip: 'bg-warning-soft text-warning-soft-fg', bar: 'warning' },
  REIMBURSEMENT: { chip: 'bg-accent-soft text-accent-soft-fg', bar: 'accent' },
}

const ICONS: Record<CostType, React.ReactNode> = {
  MASTER: <Landmark />,
  FIELD: <Wallet />,
  REIMBURSEMENT: <HandCoins />,
}

export function JobSheetPanel({ project }: { project: Project }) {
  const { charges, company } = useErp()
  const rows = charges.filter((c) => c.projectId === project.id)
  const sheet = jobSheet(rows)

  const worst = Math.max(1, ...sheet.buckets.map((b) => Math.max(b.cost, b.revenue)))

  return (
    <div className="space-y-4">
      {/* -------- headline -------- */}
      <Card>
        <CardHeader
          icon={<Receipt />}
          title="Job sheet"
          description="The recap operations hands finance before a job is closed: what was billed, what it cost in each bucket, and what cash is still out at the port."
          actions={
            <span className="text-[11.5px] text-fg-subtle">
              {project.jobNo} · prepared for {company.legalName}
            </span>
          }
        />
        <CardBody className="grid gap-4 sm:grid-cols-4">
          <Figure label="Billed to customer" value={fmtCurrency(sheet.revenue, 'IDR', { compact: true })} tone="primary" icon={<Banknote />} />
          <Figure label="Total cost" value={fmtCurrency(sheet.cost, 'IDR', { compact: true })} tone="neutral" icon={<Receipt />} />
          <Figure
            label="Gross margin"
            value={fmtCurrency(sheet.margin, 'IDR', { compact: true })}
            tone={sheet.margin > 0 ? 'success' : 'danger'}
            icon={<Banknote />}
            sub={fmtPercent(sheet.marginPct, 1)}
          />
          <Figure
            label="Field cash out"
            value={fmtCurrency(sheet.unsettledField, 'IDR', { compact: true })}
            tone={sheet.unsettledField > 0 ? 'warning' : 'success'}
            icon={<Wallet />}
            sub={sheet.unsettledField > 0 ? 'advanced, no receipts back' : 'all settled'}
          />
        </CardBody>
      </Card>

      {/* -------- the three buckets -------- */}
      <Card>
        <CardHeader
          icon={<Landmark />}
          title="Cost by bucket"
          description="How each cost is funded and settled — not what it is for. The three behave differently at month end, so they are never pooled."
        />
        <CardBody className="p-0">
          <div className="divide-y divide-border">
            {sheet.buckets.map((b) => {
              const meta = costTypeMeta(b.type)!
              const margin = b.revenue - b.cost
              return (
                <div key={b.type} className="px-4 py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className={`grid size-8 shrink-0 place-items-center rounded-lg [&_svg]:size-4 ${BUCKET_TONE[b.type].chip}`}>
                      {ICONS[b.type]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-[13px] font-semibold text-fg">{meta.label}</p>
                        <span className="text-[11.5px] italic text-fg-subtle">{meta.local}</span>
                        <Badge tone="outline" size="sm">{b.lines} line{b.lines === 1 ? '' : 's'}</Badge>
                      </div>
                      <p className="mt-1 max-w-2xl text-[11.5px] leading-relaxed text-fg-muted">{meta.hint}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tnum text-[13px] font-semibold text-fg">{fmtCurrency(b.cost, 'IDR', { compact: true })}</p>
                      <p className="tnum text-[11px] text-fg-subtle">
                        billed {fmtCurrency(b.revenue, 'IDR', { compact: true })}
                        {b.type !== 'REIMBURSEMENT' && (
                          <span className={margin >= 0 ? ' text-success' : ' text-danger'}> · {fmtCurrency(margin, 'IDR', { compact: true })}</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={(b.cost / worst) * 100} tone={BUCKET_TONE[b.type].bar} className="flex-1" />
                    {b.type === 'FIELD' && b.advanced > 0 && (
                      <Tooltip
                        content={
                          sheet.unsettledField > 0
                            ? `${fmtCurrency(sheet.unsettledField, 'IDR')} handed over with no receipts back yet.`
                            : `Every advance is accounted for. The gap between ${fmtCurrency(b.advanced, 'IDR')} advanced and ${fmtCurrency(b.settled, 'IDR')} spent is unused float the operator returned.`
                        }
                      >
                        <span className={`tnum shrink-0 text-[11.5px] ${sheet.unsettledField > 0 ? 'text-warning' : 'text-success'}`}>
                          {fmtCurrency(b.settled, 'IDR', { compact: true })} spent of {fmtCurrency(b.advanced, 'IDR', { compact: true })} advanced
                        </span>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardBody>
      </Card>

      {/* -------- what finance will query -------- */}
      {(sheet.unsettledLines.length > 0 || sheet.markedUpReimbursements.length > 0 || sheet.unbilled.length > 0) && (
        <Card>
          <CardHeader
            icon={<AlertTriangle />}
            title="Before this job closes"
            description="Each of these is something finance sends back if it is not dealt with first."
          />
          <CardBody className="space-y-3">
            {sheet.unsettledLines.length > 0 && (
              <Queried
                tone="warning"
                title={`${sheet.unsettledLines.length} field advance${sheet.unsettledLines.length === 1 ? '' : 's'} unsettled past ${FIELD_SETTLEMENT_DAYS} days`}
                detail="Cash left the float and no receipts came back. Until they do, this job's cost is understated and the operator is carrying it."
                items={sheet.unsettledLines.map(
                  (c) =>
                    `${c.chargeCode} — ${fmtCurrency(c.settlement?.advanceAmount ?? 0, 'IDR', { compact: true })} to ${c.settlement?.advancedTo ?? 'unknown'}${
                      c.settlement?.advancedAt ? ` on ${fmtDate(c.settlement.advancedAt)}` : ''
                    }`,
                )}
              />
            )}
            {sheet.markedUpReimbursements.length > 0 && (
              <Queried
                tone="danger"
                title={`${sheet.markedUpReimbursements.length} reimbursement${sheet.markedUpReimbursements.length === 1 ? '' : 's'} billed above cost`}
                detail="A disbursement is re-billed at what was paid. Marking one up turns a pass-through into revenue the customer did not agree to, and it is the first thing an audit finds."
                items={sheet.markedUpReimbursements.map(
                  (c) => `${c.chargeCode} — paid ${fmtCurrency(c.buyRate, c.currency)}, billed ${fmtCurrency(c.sellRate, c.currency)}`,
                )}
              />
            )}
            {sheet.unbilled.length > 0 && (
              <Queried
                tone="info"
                title={`${sheet.unbilled.length} billable line${sheet.unbilled.length === 1 ? '' : 's'} still in draft`}
                detail="These will not reach the invoice while they sit in draft. Approve them or mark them non-billable."
                items={sheet.unbilled.map((c) => `${c.chargeCode} — ${c.description}`)}
              />
            )}
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function Figure({
  label, value, sub, tone, icon,
}: { label: string; value: string; sub?: string; tone: string; icon: React.ReactNode }) {
  const tones: Record<string, string> = {
    primary: 'bg-primary-soft text-primary-soft-fg',
    neutral: 'bg-neutral-soft text-neutral-soft-fg',
    success: 'bg-success-soft text-success-soft-fg',
    warning: 'bg-warning-soft text-warning-soft-fg',
    danger: 'bg-danger-soft text-danger-soft-fg',
  }
  return (
    <div className="rounded-lg border border-border bg-surface-sunken/60 p-3.5">
      <div className="flex items-center gap-2">
        <span className={`grid size-6 place-items-center rounded ${tones[tone]} [&_svg]:size-3.5`}>{icon}</span>
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{label}</p>
      </div>
      <p className="tnum mt-2 text-[19px] font-semibold leading-none tracking-[-0.02em] text-fg">{value}</p>
      {sub && <p className="mt-1.5 text-[11.5px] text-fg-muted">{sub}</p>}
    </div>
  )
}

function Queried({
  tone, title, detail, items,
}: { tone: 'warning' | 'danger' | 'info'; title: string; detail: string; items: string[] }) {
  const map = {
    warning: 'border-warning/30 bg-warning-soft text-warning-soft-fg',
    danger: 'border-danger/30 bg-danger-soft text-danger-soft-fg',
    info: 'border-info/30 bg-info-soft text-info-soft-fg',
  } as const
  return (
    <div className={`rounded-lg border px-3.5 py-3 ${map[tone]}`}>
      <p className="text-[12.5px] font-semibold">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed opacity-85">{detail}</p>
      <ul className="mt-2 space-y-0.5">
        {items.slice(0, 6).map((i) => (
          <li key={i} className="text-[11.5px] opacity-90">{i}</li>
        ))}
        {items.length > 6 && <li className="text-[11.5px] opacity-70">and {items.length - 6} more</li>}
      </ul>
    </div>
  )
}
