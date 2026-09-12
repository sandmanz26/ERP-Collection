import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeft, Ban, Banknote, Building2, FileText, Plus, Send, Trash2, Wallet,
} from 'lucide-react'
import type { ClientReceipt, Invoice, InvoiceLine, PaymentMethod } from '@/data/types'
import { monthLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { EmptyState } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { uid } from '@/lib/utils'
import { useCan } from '@/lib/access'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { clientExposure, invoiceState, invoiceTotals } from '@/lib/finance'

const TH = 'whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted'
const TD = 'border-b border-border px-3 py-2.5 align-top'

const METHODS: { value: PaymentMethod; label: string; description: string }[] = [
  { value: 'TRANSFER', label: 'Bank transfer', description: 'The usual route; record the transfer reference' },
  { value: 'GIRO', label: 'Giro', description: 'Cleared on the giro date' },
  { value: 'CHEQUE', label: 'Cheque', description: 'Record the cheque number' },
  { value: 'CASH', label: 'Cash', description: 'Rare on a contract of this size' },
]

/* ================================================================
   Recording money in
   ================================================================ */

function CollectDialog({ invoice, open, onOpenChange }: { invoice: Invoice; open: boolean; onOpenChange: (v: boolean) => void }) {
  const toast = useToast()
  const { clientReceipts, company, recordClientReceipt } = useErp()
  const state = invoiceState(invoice, clientReceipts)
  const [amount, setAmount] = React.useState(0)
  const [method, setMethod] = React.useState<PaymentMethod>('TRANSFER')
  const [receivedAt, setReceivedAt] = React.useState(new Date().toISOString())
  const [reference, setReference] = React.useState('')
  const [note, setNote] = React.useState('')
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setAmount(Math.round(state.outstanding))
    setMethod('TRANSFER')
    setReceivedAt(new Date().toISOString())
    setReference('')
    setNote('')
    setError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice.id])

  const partial = amount > 0 && amount < state.outstanding

  const save = () => {
    const year = new Date().getFullYear()
    const row: ClientReceipt = {
      id: uid('rcp'),
      code: `RCP-${year}-${String(clientReceipts.filter((r) => r.code.startsWith(`RCP-${year}`)).length + 1).padStart(4, '0')}`,
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: Math.round(amount),
      method,
      receivedAt,
      reference: reference.trim() || undefined,
      bankAccount: company.bankAccount ? `${company.bankName ?? ''} ${company.bankAccount}`.trim() : undefined,
      recordedBy: '',
      createdAt: new Date().toISOString(),
      note: note.trim() || undefined,
    }
    const result = recordClientReceipt(row)
    if (!result.ok) {
      setError(result.error ?? 'That payment could not be recorded.')
      return
    }
    toast.push({
      tone: 'success',
      title: `${row.code} recorded`,
      description: partial
        ? `${fmtCurrency(row.amount, 'IDR')} in — ${fmtCurrency(state.outstanding - row.amount, 'IDR')} still owed on ${invoice.code}.`
        : `${invoice.code} is settled in full.`,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        icon={<Banknote />}
        title={`Record money against ${invoice.code}`}
        description={`${invoice.paymentTermDays} day terms${invoice.dueAt ? `, due ${fmtDate(invoice.dueAt)}` : ''}${state.overdue ? ` — ${state.daysOverdue} days over` : ''}`}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={save}>
              <Banknote /> Record {partial ? 'part payment' : 'payment'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 p-5">
          <div className="grid gap-3 rounded-lg border border-border bg-surface-sunken/60 p-3 sm:grid-cols-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Amount due</p>
              <p className="tnum text-[14px] font-semibold text-fg">{fmtCurrency(state.due, 'IDR')}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Already received</p>
              <p className="tnum text-[14px] font-semibold text-fg">{fmtCurrency(state.received, 'IDR')}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.055em] text-fg-subtle">Outstanding</p>
              <p className={`tnum text-[14px] font-semibold ${state.overdue ? 'text-danger' : 'text-fg'}`}>
                {fmtCurrency(state.outstanding, 'IDR')}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Amount" required hint={partial ? 'a part payment — the rest stays outstanding' : 'settles the invoice in full'}>
              <div className="flex gap-2">
                <Input type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="tnum" />
                <Button variant="secondary" size="sm" onClick={() => setAmount(Math.round(state.outstanding))}>Full</Button>
              </div>
            </Field>
            <Field label="Received on" required>
              <DatePicker value={receivedAt} onChange={(v) => setReceivedAt(v ?? new Date().toISOString())} clearable={false} />
            </Field>
            <Field label="Method" required>
              <Select value={method} onChange={setMethod} options={METHODS} />
            </Field>
            <Field label="Reference" hint="Nomor bukti transfer dari klien">
              <Input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="TRF/IN/26091204" />
            </Field>
          </div>

          <Field label="Note" hint="optional">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </Field>

          {error && (
            <p className="flex items-start gap-2 rounded-lg bg-danger-soft/50 px-3 py-2.5 text-[12.5px] text-danger-soft-fg">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {error}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ================================================================
   The invoice
   ================================================================ */

export function InvoiceDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const {
    invoices, clientReceipts, clients, projects, buildings, positions,
    upsertInvoice, issueInvoice, voidInvoice,
  } = useErp()

  const [collecting, setCollecting] = React.useState(false)
  const [issuing, setIssuing] = React.useState(false)
  const [issueDate, setIssueDate] = React.useState(new Date().toISOString())
  const [voiding, setVoiding] = React.useState(false)
  const [voidReason, setVoidReason] = React.useState('')
  const [adjusting, setAdjusting] = React.useState(false)
  const [adjLabel, setAdjLabel] = React.useState('')
  const [adjAmount, setAdjAmount] = React.useState(0)

  const invoice = invoices.find((i) => i.id === id)

  if (!invoice) {
    return (
      <EmptyState
        icon={<FileText />}
        title="This invoice is no longer in the register"
        description="It may have been deleted. Open the register to find another."
        action={<Button variant="primary" size="sm" onClick={() => nav('/invoices')}>Back to invoices</Button>}
      />
    )
  }

  const client = clients.find((c) => c.id === invoice.clientId)
  const project = projects.find((p) => p.id === invoice.projectId)
  const building = buildings.find((b) => b.id === project?.buildingId)
  const totals = invoiceTotals(invoice)
  const state = invoiceState(invoice, clientReceipts)
  const exposure = client ? clientExposure(client, invoices, clientReceipts) : null
  const editable = can('invoices.edit') && invoice.status === 'DRAFT'

  const positionName = (positionId?: string) => positions.find((p) => p.id === positionId)?.name ?? '—'
  const deductions = invoice.lines.filter((l) => l.kind === 'DEDUCTION')
  const unfilled = deductions.reduce((a, l) => a + l.qty, 0)

  const addAdjustment = () => {
    if (!adjLabel.trim() || adjAmount === 0) return
    const line: InvoiceLine = {
      id: uid('inl'),
      kind: 'ADJUSTMENT',
      description: adjLabel.trim(),
      qty: 1,
      unitPrice: Math.round(adjAmount),
      amount: Math.round(adjAmount),
    }
    upsertInvoice({ ...invoice, lines: [...invoice.lines, line] })
    setAdjusting(false)
    setAdjLabel('')
    setAdjAmount(0)
    toast.push({ tone: 'success', title: 'Adjustment added', description: `${line.description} · ${fmtCurrency(line.amount, 'IDR')}` })
  }

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/invoices" className="inline-flex items-center gap-1.5 text-[12px] font-medium text-fg-muted hover:text-primary">
            <ArrowLeft className="size-3.5" /> Invoices
          </Link>
        }
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono">{invoice.code}</span>
            <StatusBadge value={invoice.status} tone={invoice.status === 'VOID' ? 'neutral' : undefined} />
          </span>
        }
        description={`${client?.legalName ?? 'Unknown client'} — ${project?.name ?? 'removed project'} for ${monthLabel(invoice.periodMonth)} ${invoice.periodYear}.`}
        meta={
          <>
            {project && (
              <Link to={`/projects/${project.id}`} className="text-[12px] font-medium text-primary hover:underline">
                {project.code}
              </Link>
            )}
            {building && <span className="text-[12px] text-fg-muted">{building.name}</span>}
            {invoice.issuedAt ? (
              <span className="text-[12px] text-fg-muted">
                Issued {fmtDate(invoice.issuedAt)} · due {invoice.dueAt ? fmtDate(invoice.dueAt) : '—'} ({invoice.paymentTermDays} days)
              </span>
            ) : (
              <span className="text-[12px] text-fg-muted">Not issued yet</span>
            )}
            {invoice.poNumber && <span className="font-mono text-[12px] text-fg-subtle">{invoice.poNumber}</span>}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {can('invoices.void') && invoice.status !== 'VOID' && invoice.status !== 'PAID' && (
              <Button variant="secondary" onClick={() => { setVoiding(true); setVoidReason('') }}>
                <Ban /> Cancel
              </Button>
            )}
            {can('invoices.issue') && invoice.status === 'DRAFT' && (
              <Button variant="primary" onClick={() => { setIssuing(true); setIssueDate(new Date().toISOString()) }}>
                <Send /> Issue to client
              </Button>
            )}
            {can('receipts.collect') && state.live && state.outstanding > 0 && (
              <Button variant="primary" onClick={() => setCollecting(true)}>
                <Banknote /> Record payment
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Amount due"
          value={fmtCurrency(totals.due, 'IDR', { compact: true })}
          icon={<FileText />}
          accent="primary"
          sub={[
            fmtCurrency(totals.subtotal, 'IDR', { compact: true }),
            invoice.ppnRate ? `+ PPN ${Math.round(invoice.ppnRate * 100)}%` : null,
            invoice.pph23Rate ? `− PPh 23 ${(invoice.pph23Rate * 100).toFixed(0)}%` : null,
          ].filter(Boolean).join(' ')}
        />
        <KpiCard
          label="Unfilled posts deducted"
          value={unfilled}
          icon={<Building2 />}
          accent={unfilled ? 'warning' : 'success'}
          sub={unfilled ? `${fmtCurrency(Math.abs(totals.deductions), 'IDR', { compact: true })} off the contract` : 'every post was filled'}
        />
        <KpiCard
          label="Received"
          value={fmtCurrency(state.received, 'IDR', { compact: true })}
          icon={<Banknote />}
          accent={state.outstanding <= 0 && state.live ? 'success' : 'neutral'}
          sub={`${state.receipts.length} payment${state.receipts.length === 1 ? '' : 's'} recorded`}
        />
        <KpiCard
          label="Outstanding"
          value={fmtCurrency(state.outstanding, 'IDR', { compact: true })}
          icon={<Wallet />}
          accent={!state.live ? 'neutral' : state.outstanding <= 0 ? 'success' : state.overdue ? 'danger' : 'warning'}
          sub={
            !state.live
              ? invoice.status === 'VOID' ? 'cancelled' : 'not issued yet'
              : state.outstanding <= 0
                ? 'settled in full'
                : state.overdue
                  ? `${state.daysOverdue} days past ${invoice.dueAt ? fmtDate(invoice.dueAt) : 'term'}`
                  : `due ${invoice.dueAt ? fmtDate(invoice.dueAt) : '—'}`
          }
        />
      </div>

      {invoice.voidReason && (
        <Card className="mb-5">
          <CardBody className="flex items-start gap-2 text-[12.5px] text-fg-muted">
            <Ban className="mt-0.5 size-4 shrink-0 text-danger" />
            <span><span className="font-medium text-fg">Cancelled</span> — {invoice.voidReason}</span>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader
              icon={<FileText />}
              title="What is being billed"
              description="The contract as signed, then what the client does not have to pay for because the post stood empty."
              actions={
                editable ? (
                  <Button variant="secondary" size="sm" onClick={() => setAdjusting(true)}>
                    <Plus /> Adjustment
                  </Button>
                ) : undefined
              }
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    <th className={TH}>Description</th>
                    <th className={`${TH} text-right`}>Qty</th>
                    <th className={`${TH} text-right`}>Rate / month</th>
                    <th className={`${TH} text-right`}>Amount</th>
                    {editable && <th className={TH} />}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lines.map((line) => (
                    <tr key={line.id} className={line.kind === 'DEDUCTION' ? 'bg-warning-soft/20' : undefined}>
                      <td className={TD}>
                        <p className="max-w-[360px] truncate font-medium text-fg">{line.description}</p>
                        <p className="text-[11px] text-fg-subtle">
                          {line.kind === 'SERVICE' && positionName(line.positionId)}
                          {line.kind === 'DEDUCTION' && line.note}
                          {line.kind === 'ADJUSTMENT' && 'adjustment'}
                        </p>
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>
                        {line.kind === 'ADJUSTMENT' ? '—' : fmtNumber(line.qty)}
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right text-fg-muted`}>
                        {line.kind === 'ADJUSTMENT' ? '—' : fmtCurrency(line.unitPrice, 'IDR')}
                      </td>
                      <td className={`${TD} tnum whitespace-nowrap text-right font-semibold ${line.amount < 0 ? 'text-warning' : 'text-fg'}`}>
                        {fmtCurrency(line.amount, 'IDR')}
                      </td>
                      {editable && (
                        <td className={`${TD} text-right`}>
                          {line.kind === 'ADJUSTMENT' && (
                            <Tooltip content="Remove this adjustment">
                              <Button
                                variant="ghost"
                                size="iconXs"
                                onClick={() => upsertInvoice({ ...invoice, lines: invoice.lines.filter((l) => l.id !== line.id) })}
                              >
                                <Trash2 />
                              </Button>
                            </Tooltip>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <CardBody className="border-t border-border">
              <div className="ml-auto w-full max-w-sm space-y-1 divide-y divide-border">
                <MetaRow label="Services as contracted">{fmtCurrency(totals.services, 'IDR')}</MetaRow>
                {totals.deductions !== 0 && (
                  <MetaRow label={`Deduction — ${unfilled} unfilled posts`}>
                    <span className="text-warning">{fmtCurrency(totals.deductions, 'IDR')}</span>
                  </MetaRow>
                )}
                {totals.adjustments !== 0 && <MetaRow label="Adjustments">{fmtCurrency(totals.adjustments, 'IDR')}</MetaRow>}
                <MetaRow label="Dasar pengenaan pajak">{fmtCurrency(totals.subtotal, 'IDR')}</MetaRow>
                {invoice.ppnRate > 0 ? (
                  <MetaRow label={`PPN ${Math.round(invoice.ppnRate * 100)}%`}>{fmtCurrency(totals.ppn, 'IDR')}</MetaRow>
                ) : (
                  <MetaRow label="PPN"><span className="text-fg-muted">not applicable to this client</span></MetaRow>
                )}
                <MetaRow label="Invoice total">{fmtCurrency(totals.total, 'IDR')}</MetaRow>
                {invoice.pph23Rate > 0 && (
                  <MetaRow label={`PPh 23 ${(invoice.pph23Rate * 100).toFixed(0)}% withheld`}>
                    <span className="text-fg-muted">− {fmtCurrency(totals.pph23, 'IDR')}</span>
                  </MetaRow>
                )}
                <div className="flex items-center justify-between gap-4 pt-2">
                  <span className="text-[12.5px] font-medium text-fg">Transferred by the client</span>
                  <span className="tnum text-[15px] font-semibold text-fg">{fmtCurrency(totals.due, 'IDR')}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Banknote />} title="Money received" description="Full or partial, as many payments as it takes." />
            {state.receipts.length === 0 ? (
              <EmptyState
                icon={<Banknote />}
                title="Nothing received yet"
                description={
                  invoice.status === 'DRAFT'
                    ? 'This invoice has not been sent to the client.'
                    : invoice.dueAt
                      ? `Due ${fmtDate(invoice.dueAt)} under ${invoice.paymentTermDays} day terms.`
                      : 'No due date recorded.'
                }
              />
            ) : (
              <div className="scrollbar-thin overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      <th className={TH}>Receipt</th>
                      <th className={TH}>Date</th>
                      <th className={TH}>Method</th>
                      <th className={TH}>Reference</th>
                      <th className={`${TH} text-right`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.receipts.map((r) => (
                      <tr key={r.id}>
                        <td className={`${TD} whitespace-nowrap font-mono text-[12px] font-medium text-fg`}>{r.code}</td>
                        <td className={`${TD} tnum whitespace-nowrap text-fg-muted`}>{fmtDate(r.receivedAt)}</td>
                        <td className={TD}><Badge tone="outline" size="sm">{r.method.toLowerCase()}</Badge></td>
                        <td className={`${TD} font-mono text-[11.5px] text-fg-muted`}>
                          {r.reference ?? '—'}
                          {r.note && <span className="block max-w-[240px] truncate font-sans text-[11px] text-fg-subtle">{r.note}</span>}
                        </td>
                        <td className={`${TD} tnum whitespace-nowrap text-right font-semibold text-fg`}>{fmtCurrency(r.amount, 'IDR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="h-fit">
            <CardHeader title="Client" icon={<Building2 />} />
            <CardBody className="divide-y divide-border">
              <MetaRow label="Legal name"><span className="text-right">{client?.legalName}</span></MetaRow>
              <MetaRow label="NPWP"><span className="font-mono text-[11.5px]">{client?.npwp ?? '—'}</span></MetaRow>
              <MetaRow label="Account manager">{client?.accountManager}</MetaRow>
              <MetaRow label="Terms">{invoice.paymentTermDays} days</MetaRow>
              <MetaRow label="PPN">{invoice.ppnRate ? `${Math.round(invoice.ppnRate * 100)}%` : 'not applicable'}</MetaRow>
              <MetaRow label="PPh 23">{invoice.pph23Rate ? `${(invoice.pph23Rate * 100).toFixed(0)}% withheld` : 'not withheld'}</MetaRow>
            </CardBody>
          </Card>

          {exposure && (
            <Card className="h-fit">
              <CardHeader title="What this client owes" icon={<Wallet />} />
              <CardBody className="space-y-3">
                <div className="divide-y divide-border">
                  <MetaRow label="Outstanding">{fmtCurrency(exposure.outstanding, 'IDR', { compact: true })}</MetaRow>
                  <MetaRow label="Overdue">
                    <span className={exposure.overdue ? 'text-danger' : undefined}>
                      {fmtCurrency(exposure.overdue, 'IDR', { compact: true })}
                    </span>
                  </MetaRow>
                  <MetaRow label="Credit limit">{fmtCurrency(exposure.limit, 'IDR', { compact: true })}</MetaRow>
                </div>
                <div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-soft">
                    <div
                      className={`h-full rounded-full ${exposure.overLimit ? 'bg-danger' : exposure.usedPct > 70 ? 'bg-warning' : 'bg-primary'}`}
                      style={{ width: `${Math.min(100, exposure.usedPct)}%` }}
                    />
                  </div>
                  <p className={`mt-1.5 text-[11.5px] ${exposure.overLimit ? 'font-medium text-danger' : 'text-fg-subtle'}`}>
                    {Math.round(exposure.usedPct)}% of the credit limit used
                    {exposure.overLimit && ' — over the limit'}
                  </p>
                </div>
              </CardBody>
            </Card>
          )}

          {project && (
            <Card className="h-fit">
              <CardHeader title="Contract" icon={<FileText />} />
              <CardBody className="divide-y divide-border">
                <MetaRow label="Contract no"><span className="font-mono text-[11.5px]">{project.contractNo}</span></MetaRow>
                <MetaRow label="Period">{fmtDate(project.periodStart)} – {fmtDate(project.periodEnd)}</MetaRow>
                <MetaRow label="Manpower lines">{project.requirements.length}</MetaRow>
                <MetaRow label="Contracted posts">{project.requirements.reduce((a, r) => a + r.headcount, 0)}</MetaRow>
                <MetaRow label="Deployed">
                  <span className={unfilled ? 'text-warning' : undefined}>
                    {project.requirements.reduce((a, r) => a + r.deployed, 0)}
                  </span>
                </MetaRow>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <CollectDialog invoice={invoice} open={collecting} onOpenChange={setCollecting} />

      <Dialog open={issuing} onOpenChange={setIssuing}>
        <DialogContent
          icon={<Send />}
          title={`Issue ${invoice.code}?`}
          description="The lines are frozen and the payment clock starts. A bill the client has seen can only be withdrawn by cancelling it."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setIssuing(false)}>Not yet</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const result = issueInvoice(invoice.id, issueDate)
                  if (!result.ok) {
                    toast.push({ tone: 'error', title: 'Not issued', description: result.error ?? '' })
                    return
                  }
                  setIssuing(false)
                  toast.push({
                    tone: 'success',
                    title: `${invoice.code} issued`,
                    description: `${fmtCurrency(totals.due, 'IDR')} due in ${invoice.paymentTermDays} days.`,
                  })
                }}
              >
                <Send /> Issue it
              </Button>
            </>
          }
        >
          <div className="space-y-4 p-5">
            <Field label="Issue date" required hint="The payment term runs from this date">
              <DatePicker value={issueDate} onChange={(v) => setIssueDate(v ?? new Date().toISOString())} clearable={false} />
            </Field>
            <div className="space-y-1.5 rounded-lg bg-surface-sunken px-3 py-2.5 text-[12.5px] text-fg-muted">
              <p>{fmtCurrency(totals.services, 'IDR')} contracted, {fmtCurrency(Math.abs(totals.deductions), 'IDR')} deducted for {unfilled} unfilled posts.</p>
              <p className="font-medium text-fg">{fmtCurrency(totals.due, 'IDR')} will be due from {client?.brandName ?? client?.legalName}.</p>
            </div>
            {exposure?.overLimit && (
              <p className="flex items-start gap-2 rounded-lg bg-warning-soft/50 px-3 py-2.5 text-[12.5px] text-warning-soft-fg">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                This client already owes more than its credit limit. Issuing adds to that — worth a word with the account manager first.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={voiding} onOpenChange={setVoiding}>
        <DialogContent
          icon={<Ban />}
          title={`Cancel ${invoice.code}?`}
          description="The claim is withdrawn and the period can be billed again. Money already received against it would be left pointing at nothing, so that is refused."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setVoiding(false)}>Keep it</Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!voidReason.trim()}
                onClick={() => {
                  const result = voidInvoice(invoice.id, voidReason.trim())
                  if (!result.ok) {
                    toast.push({ tone: 'error', title: 'Not cancelled', description: result.error ?? '' })
                    return
                  }
                  setVoiding(false)
                  toast.push({ tone: 'warning', title: `${invoice.code} cancelled`, description: 'The period is free to be billed again.' })
                }}
              >
                Cancel the invoice
              </Button>
            </>
          }
        >
          <div className="p-5">
            <Field label="Reason" required hint="The client and the auditor will both ask">
              <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} placeholder="Salah kontrak — diterbitkan ulang dengan nomor baru…" />
            </Field>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={adjusting} onOpenChange={setAdjusting}>
        <DialogContent
          icon={<Plus />}
          title="Add an adjustment"
          description="Anything negotiated on top of the contract lines — overtime billed separately, a penalty agreed with the client, a credit for last month."
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setAdjusting(false)}>Cancel</Button>
              <Button variant="primary" size="sm" disabled={!adjLabel.trim() || adjAmount === 0} onClick={addAdjustment}>
                Add to the invoice
              </Button>
            </>
          }
        >
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Description" required className="sm:col-span-2">
              <Input value={adjLabel} onChange={(e) => setAdjLabel(e.target.value)} placeholder="Lembur hari raya — 24 orang × 2 hari" />
            </Field>
            <Field label="Amount" required hint="Negative for a credit to the client">
              <Input type="number" value={adjAmount || ''} onChange={(e) => setAdjAmount(Number(e.target.value))} className="tnum" />
            </Field>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
