import * as React from 'react'
import { AlertTriangle, Building2, CalendarRange, Plus, Trash2, Users, Wallet } from 'lucide-react'
import type { ManpowerRequirement, Project } from '@/data/types'
import { PROJECT_STATUSES, SHIFTS, serviceLabel, shiftHours } from '@/data/reference'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { SwitchField } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { DatePicker } from '@/components/ui/date-picker'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { useErp } from '@/store/useErp'
import { nextCode, uid } from '@/lib/utils'
import { fmtCurrency, fmtDate } from '@/lib/format'
import { buildingIsTaken, contractMonths, daysBetween, monthlyMargin, requiredHeadcount } from '@/lib/domain'

const inAYear = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

const blank = (existing: Project[]): Project => ({
  id: uid('prj'),
  code: nextCode('PRJ', existing.map((p) => p.code), 4, true),
  name: '', clientId: '', buildingId: '', contractNo: '', status: 'DRAFT',
  periodStart: new Date().toISOString(), periodEnd: inAYear(),
  requirements: [], projectManager: '', siteSupervisor: '',
  paymentTermDays: 30, managementFeePct: 10, autoRenew: true, renewalNoticeDays: 60, notes: '',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
})

export function ProjectForm({
  open,
  onOpenChange,
  initial,
  defaultClientId,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  initial?: Project | null
  defaultClientId?: string
}) {
  const { projects, clients, buildings, positions, upsertProject } = useErp()
  const toast = useToast()
  const [tab, setTab] = React.useState<'contract' | 'manpower' | 'commercial'>('contract')
  const [draft, setDraft] = React.useState<Project>(() => blank(projects))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : { ...blank(projects), clientId: defaultClientId ?? '' })
      setTab('contract')
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, defaultClientId])

  const set = <K extends keyof Project>(k: K, v: Project[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const client = clients.find((c) => c.id === draft.clientId)
  const clientBuildings = buildings.filter((b) => b.clientId === draft.clientId)
  const chosenBuilding = buildings.find((b) => b.id === draft.buildingId)
  const clash = draft.buildingId ? buildingIsTaken(draft.buildingId, projects, draft.id) : undefined
  const margin = monthlyMargin(draft)
  const months = contractMonths(draft)

  const addRequirement = () => {
    const position = positions.find((p) => p.status === 'ACTIVE')
    if (!position) return
    const line: ManpowerRequirement = {
      id: uid('req'),
      positionId: position.id,
      headcount: 1,
      deployed: 0,
      shift: 'PAGI',
      workDaysPerWeek: 6,
      hoursPerShift: 8,
      billRate: position.defaultBillRate,
      costRate: Math.round(((position.baseSalary + position.allowance) * 1.19) / 1000) * 1000,
    }
    setDraft((d) => ({ ...d, requirements: [...d.requirements, line] }))
    setTab('manpower')
  }

  const patchLine = (id: string, patch: Partial<ManpowerRequirement>) =>
    setDraft((d) => ({ ...d, requirements: d.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.code.trim()) e.code = 'A project code is required'
    if (projects.some((p) => p.code === draft.code && p.id !== draft.id)) e.code = 'This code is already used'
    if (!draft.name.trim()) e.name = 'Give the project a name'
    if (!draft.clientId) e.clientId = 'Pick the client that signs this contract'
    if (!draft.buildingId) e.buildingId = 'A project serves exactly one building'
    if (chosenBuilding && chosenBuilding.clientId !== draft.clientId) e.buildingId = 'That building belongs to another client'
    if (clash && (draft.status === 'ACTIVE' || draft.status === 'PENDING_APPROVAL')) {
      e.buildingId = `${clash.code} already runs on this building. End it first, or pick another building.`
    }
    if (!draft.projectManager.trim()) e.projectManager = 'Name the project manager'
    if (daysBetween(draft.periodStart, draft.periodEnd) <= 0) e.period = 'The end date has to fall after the start date'
    if (draft.requirements.length === 0) e.requirements = 'Add at least one manpower line — a project with no people cannot be billed'
    if (draft.requirements.some((r) => r.headcount < 1)) e.requirements = 'Every line needs at least one person'
    if (draft.requirements.some((r) => r.deployed > r.headcount)) e.requirements = 'Deployed cannot exceed the contracted headcount'
    if (draft.requirements.some((r) => r.billRate <= 0)) e.requirements = 'Every line needs a bill rate'
    setErrors(e)
    if (e.requirements) setTab('manpower')
    else if (Object.keys(e).length) setTab('contract')
    return Object.keys(e).length === 0
  }

  const save = () => {
    if (!validate()) return
    upsertProject(draft)
    toast.push({
      tone: 'success',
      title: initial ? 'Project updated' : 'Project created',
      description: `${draft.code} — ${requiredHeadcount(draft)} personnel across ${draft.requirements.length} lines`,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={
        <Badge tone={initial ? 'primary' : 'accent'} size="sm">
          {initial ? `Editing ${initial.code}` : 'New project'}
        </Badge>
      }
      title={initial ? initial.name : 'Create a project'}
      description="One client, one building, one period. A second building means a second project."
      footer={
        <>
          <span className="mr-auto text-[12px] text-fg-muted">
            <span className="tnum font-medium text-fg">{requiredHeadcount(draft)}</span> personnel ·{' '}
            <span className="tnum font-medium text-fg">{fmtCurrency(margin.value, 'IDR', { compact: true })}</span> per month
          </span>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            {initial ? 'Save changes' : 'Create project'}
          </Button>
        </>
      }
    >
      <Tabs
        value={tab}
        onChange={setTab}
        className="px-5"
        items={[
          { value: 'contract', label: 'Contract & site', icon: <CalendarRange /> },
          { value: 'manpower', label: 'Manpower', icon: <Users />, count: draft.requirements.length },
          { value: 'commercial', label: 'Commercial', icon: <Wallet /> },
        ]}
      />

      {tab === 'contract' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Project code" required error={errors.code}>
            <Input value={draft.code} onChange={(e) => set('code', e.target.value)} className="font-mono" invalid={!!errors.code} />
          </Field>
          <Field label="Status">
            <Select
              value={draft.status}
              onChange={(v) => set('status', v)}
              options={PROJECT_STATUSES.map((s) => ({ value: s.value, label: s.label, description: s.description }))}
            />
          </Field>
          <Field label="Project name" required error={errors.name} className="sm:col-span-2">
            <Input
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="Pengamanan & Kebersihan Menara Contoh"
              invalid={!!errors.name}
            />
          </Field>
          <Field label="Client" required error={errors.clientId}>
            <Select
              searchable
              value={draft.clientId}
              onChange={(v) => {
                set('clientId', v)
                const c = clients.find((x) => x.id === v)
                setDraft((d) => ({ ...d, buildingId: '', paymentTermDays: c?.paymentTermDays ?? d.paymentTermDays }))
              }}
              invalid={!!errors.clientId}
              placeholder="Pick a client"
              options={clients.map((c) => ({ value: c.id, label: c.brandName || c.legalName, description: `${c.code} · ${c.city}` }))}
            />
          </Field>
          <Field
            label="Building"
            required
            error={errors.buildingId}
            help="Only the buildings of the selected client are listed. A building already carrying a live project cannot take another."
          >
            <Select
              searchable
              value={draft.buildingId}
              onChange={(v) => set('buildingId', v)}
              invalid={!!errors.buildingId}
              disabled={!draft.clientId}
              placeholder={draft.clientId ? 'Pick a building' : 'Pick a client first'}
              emptyLabel="This client has no buildings yet"
              options={clientBuildings.map((b) => {
                const taken = buildingIsTaken(b.id, projects, draft.id)
                return {
                  value: b.id,
                  label: b.name,
                  description: taken ? `${b.code} · already served by ${taken.code}` : `${b.code} · ${b.city}`,
                  disabled: !!taken,
                }
              })}
            />
          </Field>
          <Field label="Contract number">
            <Input value={draft.contractNo} onChange={(e) => set('contractNo', e.target.value)} className="font-mono" placeholder="CLT/TG/2026/001" />
          </Field>
          <Field label="Project manager" required error={errors.projectManager}>
            <Input value={draft.projectManager} onChange={(e) => set('projectManager', e.target.value)} invalid={!!errors.projectManager} />
          </Field>
          <Field label="Period starts" required error={errors.period}>
            <DatePicker value={draft.periodStart} onChange={(v) => set('periodStart', v ?? draft.periodStart)} quickRanges={false} />
          </Field>
          <Field label="Period ends" required hint={`${months} months`}>
            <DatePicker value={draft.periodEnd} onChange={(v) => set('periodEnd', v ?? draft.periodEnd)} min={draft.periodStart} quickRanges={false} />
          </Field>
          <Field label="Site supervisor" hint="optional">
            <Input value={draft.siteSupervisor ?? ''} onChange={(e) => set('siteSupervisor', e.target.value)} />
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea value={draft.notes ?? ''} onChange={(e) => set('notes', e.target.value)} rows={3} />
          </Field>

          {chosenBuilding && (
            <div className="sm:col-span-2 rounded-xl border border-border bg-surface-sunken px-3.5 py-3">
              <p className="flex items-center gap-2 text-[12.5px] font-medium text-fg">
                <Building2 className="size-4 text-primary" /> {chosenBuilding.name}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                {chosenBuilding.address}, {chosenBuilding.city} · {chosenBuilding.floors} floors ·{' '}
                {chosenBuilding.areaSqm.toLocaleString('en-US')} m² · site contact {chosenBuilding.picName}
              </p>
              {chosenBuilding.accessNote && <p className="mt-1.5 text-[12px] leading-relaxed text-fg-muted">{chosenBuilding.accessNote}</p>}
            </div>
          )}

          {clash && (
            <div className="sm:col-span-2 flex gap-2.5 rounded-xl border border-warning/40 bg-warning-soft px-3.5 py-3 text-warning-soft-fg">
              <AlertTriangle className="mt-px size-4 shrink-0" />
              <p className="text-[12.5px] leading-relaxed">
                <span className="font-semibold">{clash.code}</span> already runs on this building until {fmtDate(clash.periodEnd)}. One
                building carries one project — end that contract, or choose a different building.
              </p>
            </div>
          )}
        </div>
      )}

      {tab === 'manpower' && (
        <div className="space-y-3 p-5">
          {errors.requirements && <p className="text-[12px] font-medium text-danger">{errors.requirements}</p>}

          {draft.requirements.length === 0 ? (
            <EmptyState
              icon={<Users />}
              title="No manpower lines yet"
              description="Add one line per position and shift: what is needed, and how many people."
              action={
                <Button variant="primary" size="sm" onClick={addRequirement}>
                  <Plus /> Add a line
                </Button>
              }
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full border-separate border-spacing-0 text-[13px]">
                  <thead>
                    <tr>
                      {['Position', 'Shift', 'Needed', 'Deployed', 'Days', 'Bill / person', 'Cost / person', ''].map((h) => (
                        <th
                          key={h}
                          className="whitespace-nowrap border-b border-border bg-surface-sunken px-2.5 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.055em] text-fg-muted"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {draft.requirements.map((line) => {
                      const position = positions.find((p) => p.id === line.positionId)
                      return (
                        <tr key={line.id}>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Select
                              size="sm"
                              searchable
                              value={line.positionId}
                              onChange={(v) => {
                                const p = positions.find((x) => x.id === v)
                                patchLine(line.id, {
                                  positionId: v,
                                  billRate: p?.defaultBillRate ?? line.billRate,
                                  costRate: p ? Math.round(((p.baseSalary + p.allowance) * 1.19) / 1000) * 1000 : line.costRate,
                                })
                              }}
                              className="min-w-[190px]"
                              options={positions
                                .filter((p) => p.status === 'ACTIVE')
                                .map((p) => ({
                                  value: p.id,
                                  label: p.name,
                                  group: serviceLabel(p.serviceType),
                                  description: p.certifications.length ? p.certifications.join(', ') : undefined,
                                }))}
                            />
                            {position && position.certifications.length > 0 && (
                              <p className="mt-1 max-w-[210px] text-[11px] leading-snug text-fg-subtle">
                                Requires {position.certifications.join(', ')}
                              </p>
                            )}
                          </td>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Select
                              size="sm"
                              value={line.shift}
                              onChange={(v) => patchLine(line.id, { shift: v })}
                              className="min-w-[124px]"
                              options={SHIFTS.map((s) => ({ value: s.value, label: s.label, description: s.hours }))}
                            />
                          </td>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Input
                              type="number"
                              min={1}
                              value={line.headcount}
                              onChange={(e) => patchLine(line.id, { headcount: Number(e.target.value) })}
                              className="tnum h-8 w-[74px] text-[12.5px]"
                            />
                          </td>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Input
                              type="number"
                              min={0}
                              max={line.headcount}
                              value={line.deployed}
                              onChange={(e) => patchLine(line.id, { deployed: Number(e.target.value) })}
                              invalid={line.deployed > line.headcount}
                              className="tnum h-8 w-[74px] text-[12.5px]"
                            />
                          </td>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Input
                              type="number"
                              min={1}
                              max={7}
                              value={line.workDaysPerWeek}
                              onChange={(e) => patchLine(line.id, { workDaysPerWeek: Number(e.target.value) })}
                              className="tnum h-8 w-[64px] text-[12.5px]"
                            />
                          </td>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Input
                              type="number"
                              step={100_000}
                              value={line.billRate}
                              onChange={(e) => patchLine(line.id, { billRate: Number(e.target.value) })}
                              className="tnum h-8 w-[128px] text-[12.5px]"
                            />
                          </td>
                          <td className="border-b border-border px-2.5 py-2 align-top">
                            <Input
                              type="number"
                              step={100_000}
                              value={line.costRate}
                              onChange={(e) => patchLine(line.id, { costRate: Number(e.target.value) })}
                              invalid={line.costRate >= line.billRate}
                              className="tnum h-8 w-[128px] text-[12.5px]"
                            />
                          </td>
                          <td className="border-b border-border px-2 py-2 align-top">
                            <Button
                              variant="ghost"
                              size="iconSm"
                              className="text-danger hover:bg-danger-soft"
                              aria-label="Remove line"
                              onClick={() => setDraft((d) => ({ ...d, requirements: d.requirements.filter((r) => r.id !== line.id) }))}
                            >
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" onClick={addRequirement}>
                  <Plus /> Add a line
                </Button>
                <div className="flex-1" />
                <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-border bg-surface-sunken px-3.5 py-2.5 text-[12px]">
                  <span className="text-fg-muted">
                    Headcount <span className="tnum ml-1 font-semibold text-fg">{requiredHeadcount(draft)}</span>
                  </span>
                  <span className="text-fg-muted">
                    Billed <span className="tnum ml-1 font-semibold text-fg">{fmtCurrency(margin.value, 'IDR', { compact: true })}</span>
                  </span>
                  <span className="text-fg-muted">
                    Cost <span className="tnum ml-1 font-semibold text-fg">{fmtCurrency(margin.cost, 'IDR', { compact: true })}</span>
                  </span>
                  <span className="text-fg-muted">
                    Margin{' '}
                    <span className={`tnum ml-1 font-semibold ${margin.margin > 0 ? 'text-success' : 'text-danger'}`}>
                      {fmtCurrency(margin.margin, 'IDR', { compact: true })} ({margin.pct.toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </div>

              <p className="text-[11.5px] leading-relaxed text-fg-subtle">
                One line per position and shift. {SHIFTS.filter((s) => s.value !== 'NON_SHIFT').map((s) => `${s.label} ${shiftHours(s.value)}`).join(' · ')}.
                Cost per person already carries BPJS and the THR provision.
              </p>
            </>
          )}
        </div>
      )}

      {tab === 'commercial' && (
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Field label="Payment term (days)" hint={client ? `client default: Net ${client.paymentTermDays}` : undefined}>
            <Input type="number" value={draft.paymentTermDays} onChange={(e) => set('paymentTermDays', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Management fee (%)" help="Charged on top of personnel cost; the rest of the margin comes from the rate itself.">
            <Input type="number" step={0.5} value={draft.managementFeePct} onChange={(e) => set('managementFeePct', Number(e.target.value))} className="tnum" />
          </Field>
          <Field label="Renewal notice (days)">
            <Input type="number" value={draft.renewalNoticeDays} onChange={(e) => set('renewalNoticeDays', Number(e.target.value))} className="tnum" />
          </Field>
          <div className="sm:col-span-2 rounded-xl border border-border bg-surface-sunken p-3.5">
            <SwitchField
              checked={draft.autoRenew}
              onChange={(v) => set('autoRenew', v)}
              label="Renews automatically"
              description="When off, an extension letter has to be sent before the notice period closes or the contract simply ends."
            />
          </div>
          <div className="sm:col-span-2 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Monthly value</p>
              <p className="tnum mt-1 text-[18px] font-semibold text-fg">{fmtCurrency(margin.value, 'IDR', { compact: true })}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Contract value</p>
              <p className="tnum mt-1 text-[18px] font-semibold text-fg">{fmtCurrency(margin.value * months, 'IDR', { compact: true })}</p>
              <p className="mt-0.5 text-[11.5px] text-fg-muted">{months} months</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Monthly margin</p>
              <p className={`tnum mt-1 text-[18px] font-semibold ${margin.margin > 0 ? 'text-success' : 'text-danger'}`}>
                {fmtCurrency(margin.margin, 'IDR', { compact: true })}
              </p>
              <p className="mt-0.5 text-[11.5px] text-fg-muted">{margin.pct.toFixed(1)}% of billed value</p>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  )
}
