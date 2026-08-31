import * as React from 'react'
import {
  BadgeCheck, CircleSlash, Info, Plus, Receipt, ShieldAlert, Sparkles, Trash2, TriangleAlert,
} from 'lucide-react'
import type { JobService, JobServiceStatus, Project } from '@/data/types'
import { JOB_SERVICE_STATUSES, docTypeLabel, serviceCategoryLabel, serviceTriggerLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { detectTriggers, recommendServices, serviceBlockers, serviceFinancials } from '@/lib/services'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardBody } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { EmptyState } from '@/components/ui/misc'
import { fmtCurrency, pluralDays } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

const statusMeta = (s: JobServiceStatus) => JOB_SERVICE_STATUSES.find((x) => x.value === s)

export function ServicesPanel({ project }: { project: Project }) {
  const toast = useToast()
  const store = useErp()
  const { services, jobServices, containers, partners } = store
  const [removing, setRemoving] = React.useState<JobService | null>(null)

  const attached = jobServices.filter((j) => j.projectId === project.id)
  const own = containers.filter((c) => c.projectId === project.id)
  const triggers = detectTriggers(project, containers)
  const recs = recommendServices(project, containers, attached, services)
  const blockers = serviceBlockers(recs, attached)
  const money = serviceFinancials(attached.filter((a) => a.status !== 'DECLINED'))

  const notYetAdded = recs.filter((r) => !r.attachedStatus)

  const add = (serviceId: string, mandatory: boolean, reasons: string[]) => {
    const cat = services.find((s) => s.id === serviceId)
    if (!cat) return
    const quantity =
      cat.basis === 'PER_CONTAINER' ? Math.max(1, own.length)
      : cat.basis === 'PER_CBM' ? Math.max(1, Math.round(own.length * 24))
      : cat.basis === 'PERCENT_OF_VALUE' ? project.cargoValue / 100
      : 1
    store.attachServices(project.id, [
      {
        id: uid('jsv'), projectId: project.id, serviceId: cat.id, code: cat.code, name: cat.name,
        status: 'PROPOSED', mandatory, reason: mandatory ? `Required: ${reasons.join(', ')}` : `Offered: ${reasons.join(', ')}`,
        quantity, buyRate: cat.buyRate, sellRate: cat.sellRate, currency: cat.currency,
        providerPartnerId: cat.providerPartnerId,
      },
    ])
    toast.push({
      tone: 'success',
      title: `${cat.code} added to the job`,
      description: mandatory
        ? 'Mandatory here — the job stays blocked until it is booked and completed.'
        : `Proposed at ${fmtCurrency(cat.sellRate * quantity, cat.currency, { compact: true })}. Confirm with the client before booking the provider.`,
    })
  }

  const setStatus = (js: JobService, status: JobServiceStatus) => {
    store.upsertJobService({
      ...js,
      status,
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : js.completedAt,
      scheduledAt: js.scheduledAt ?? (status === 'BOOKED' ? new Date().toISOString() : undefined),
    })
    if (status === 'DECLINED' && js.mandatory) {
      toast.push({
        tone: 'error',
        title: 'A mandatory service was declined',
        description: 'The refusal is on the record, but the job will not clear its gate until it is reinstated. Get the client’s decision in writing.',
      })
    }
  }

  return (
    <div className="space-y-4">
      {blockers.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-danger-soft-fg">
            <ShieldAlert className="size-4" />
            This job cannot ship as it stands
          </p>
          <ul className="mt-2 space-y-1.5">
            {blockers.map((b) => (
              <li key={b} className="text-[12.5px] leading-relaxed text-danger-soft-fg/90">
                {b}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- what the job looks like to the rules ---------------- */}
      <Card>
        <CardHeader
          icon={<Sparkles />}
          title="What this job triggers"
          description="Read straight off the commodity, HS codes, packaging, equipment, value and destination — nothing here is typed in by hand."
        />
        <CardBody>
          <div className="flex flex-wrap gap-1.5">
            {triggers
              .filter((t) => t !== 'ALWAYS')
              .map((t) => (
                <Badge key={t} tone="primary" size="md">
                  {serviceTriggerLabel(t)}
                </Badge>
              ))}
            {triggers.filter((t) => t !== 'ALWAYS').length === 0 && (
              <p className="text-[12.5px] text-fg-subtle">Nothing special about this cargo — the standard scope covers it.</p>
            )}
          </div>
        </CardBody>
      </Card>

      {/* ---------------- attached ---------------- */}
      <Card>
        <CardHeader
          icon={<BadgeCheck />}
          title="Services on this job"
          description="Every line carries the rule that put it there, so a refusal is a decision on the record rather than an omission."
          actions={
            <span className="tnum text-[12px] text-fg-muted">
              Sell <span className="font-semibold text-fg">{fmtCurrency(money.sell, 'IDR', { compact: true })}</span> · Margin{' '}
              <span className="font-semibold text-success">{fmtCurrency(money.margin, 'IDR', { compact: true })}</span>
            </span>
          }
        />
        <CardBody className="p-0">
          {attached.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState
                icon={<Sparkles />}
                title="No additional services yet"
                description="Everything the rules suggest for this cargo is listed below — add what the client agrees to."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {attached.map((js) => {
                const cat = services.find((s) => s.id === js.serviceId)
                const meta = statusMeta(js.status)
                const provider = partners.find((p) => p.id === js.providerPartnerId)
                return (
                  <div key={js.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[11.5px] text-fg-subtle">{js.code}</span>
                        <p className="text-[13px] font-medium text-fg">{js.name}</p>
                        {js.mandatory && (
                          <Tooltip content="A destination or regulatory requirement, not an upsell.">
                            <Badge tone="danger" size="sm">Mandatory</Badge>
                          </Tooltip>
                        )}
                        {cat?.producesDocument && (
                          <Badge tone="info" size="sm">{docTypeLabel(cat.producesDocument)}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-fg-muted">
                        {js.reason}
                        {cat && ` · ${serviceCategoryLabel(cat.category)} · books ${cat.leadTimeDays ? pluralDays(cat.leadTimeDays) : 'same day'} ahead`}
                        {provider && ` · ${provider.name}`}
                      </p>
                      {js.remarks && (
                        <p className="mt-1.5 rounded border-l-2 border-warning/50 bg-warning-soft/40 px-2 py-1 text-[11.5px] leading-relaxed text-fg-muted">
                          {js.remarks}
                        </p>
                      )}
                      {js.certificateNo && (
                        <p className="mt-1 font-mono text-[11px] text-success">Certificate {js.certificateNo}</p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="tnum text-[12.5px] font-medium text-fg">
                        {fmtCurrency(js.sellRate * js.quantity, js.currency, { compact: true })}
                      </span>
                      <span className="tnum text-[11px] text-fg-subtle">
                        {js.quantity} × {fmtCurrency(js.sellRate, js.currency, { compact: true })}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <Select
                        size="sm"
                        className="w-[150px]"
                        value={js.status}
                        onChange={(v) => setStatus(js, v)}
                        options={JOB_SERVICE_STATUSES.map((s) => ({ value: s.value, label: s.label, description: s.hint }))}
                        renderValue={(o) => (
                          <span className="flex items-center gap-1.5">
                            <Badge tone={(meta?.tone ?? 'neutral') as never} size="sm" dot>{o.label}</Badge>
                          </span>
                        )}
                      />
                      <Tooltip content={js.chargeId ? 'Already billed to the job' : 'Push onto the charge sheet'}>
                        <Button
                          variant="ghost"
                          size="iconXs"
                          disabled={!!js.chargeId || js.status === 'DECLINED'}
                          onClick={() => {
                            store.pushServiceToCharges(js.id)
                            toast.push({ tone: 'success', title: 'Charge raised', description: `${js.code} is now a billable line on this job.` })
                          }}
                        >
                          <Receipt />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Remove from this job">
                        <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setRemoving(js)}>
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>

      {/* ---------------- suggestions ---------------- */}
      <Card>
        <CardHeader
          icon={<Info />}
          title="Suggested for this cargo"
          description="Mandatory rules first. Anything red here is a border requirement — declining it is a decision the client has to make in writing."
        />
        <CardBody className="p-0">
          {notYetAdded.length === 0 ? (
            <div className="px-4 py-8">
              <EmptyState
                icon={<BadgeCheck />}
                title="Nothing outstanding"
                description="Every service the rules suggest for this cargo is already on the job."
              />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notYetAdded.map((r) => (
                <div key={r.service.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
                  <span
                    className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg ${
                      r.mandatory ? 'bg-danger-soft text-danger-soft-fg' : 'bg-bg-muted text-fg-muted'
                    }`}
                  >
                    {r.mandatory ? <TriangleAlert className="size-3.5" /> : <CircleSlash className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11.5px] text-fg-subtle">{r.service.code}</span>
                      <p className="text-[13px] font-medium text-fg">{r.service.name}</p>
                      <Badge tone={r.mandatory ? 'danger' : 'neutral'} size="sm">
                        {r.mandatory ? 'Mandatory' : 'Optional'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{r.service.deliverable}</p>
                    <p className="mt-1 text-[11.5px] text-fg-subtle">
                      Fired by {r.reasons.join(', ')}
                      {r.service.notes && ` · ${r.service.notes}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="tnum text-[12.5px] text-fg-muted">
                      {r.service.basis === 'PERCENT_OF_VALUE'
                        ? `${r.service.sellRate}% of value`
                        : fmtCurrency(r.service.sellRate, r.service.currency, { compact: true })}
                    </span>
                    <Button
                      variant={r.mandatory ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => add(r.service.id, r.mandatory, r.reasons)}
                    >
                      <Plus /> Add
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <ConfirmDelete
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        entityLabel="service"
        items={removing ? [`${removing.code} — ${removing.name}`] : []}
        cascade={
          removing?.mandatory
            ? ['This service is mandatory for this cargo. Removing it will raise a blocking exception on the job.']
            : removing?.chargeId
              ? ['A charge line was already raised from this service — it stays on the charge sheet.']
              : undefined
        }
        onConfirm={() => {
          if (!removing) return
          store.removeJobServices([removing.id])
          toast.push({ tone: 'success', title: 'Service removed from the job' })
          setRemoving(null)
        }}
      />
    </div>
  )
}
