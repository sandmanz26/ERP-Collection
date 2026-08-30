import * as React from 'react'
import { AlertTriangle, Boxes, CheckCircle2, Package, Plus, Trash2, Weight } from 'lucide-react'
import type { CargoItem, Container, ContainerType, Project } from '@/data/types'
import { CONTAINER_TYPES, HS_CODES } from '@/data/reference'
import { CONTAINER_SPECS, itemCbm, itemGrossKg, utilisation, validateContainerNo } from '@/lib/shipping'
import { Sheet } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { fmtNumber } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useErp } from '@/store/useErp'
import { useToast } from '@/components/ui/toast'

export function ContainerForm({
  open,
  onOpenChange,
  project,
  initial,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  project: Project
  initial?: Container | null
}) {
  const { containers, upsertContainer } = useErp()
  const toast = useToast()
  const [draft, setDraft] = React.useState<Container>(() => blank(project, containers))
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) {
      setDraft(initial ? structuredClone(initial) : blank(project, containers))
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial])

  const set = <K extends keyof Container>(k: K, v: Container[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const spec = CONTAINER_SPECS[draft.type]
  const u = utilisation(draft.type, draft.items, draft.tareKg)
  const noCheck = draft.containerNo ? validateContainerNo(draft.containerNo) : null

  const addItem = () =>
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          id: uid('itm'), containerId: d.id, description: '', packageUnit: 'CARTON', quantity: 1,
          lengthCm: 100, widthCm: 80, heightCm: 60, grossWeightKg: 20, netWeightKg: 18, stackable: true,
        },
      ],
    }))

  const patchItem = (id: string, patch: Partial<CargoItem>) =>
    setDraft((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }))

  const save = () => {
    const e: Record<string, string> = {}
    if (draft.containerNo && !validateContainerNo(draft.containerNo).valid)
      e.containerNo = validateContainerNo(draft.containerNo).reason!
    if (draft.items.some((i) => !i.description.trim())) e.items = 'Every cargo line needs a description'
    if (u.status === 'OVERLOADED') e.items = 'This unit exceeds the container specification — the terminal will refuse the gate-in'
    setErrors(e)
    if (Object.keys(e).length && !e.items) return
    if (e.containerNo) return
    if (e.items && u.status === 'OVERLOADED') {
      // allow saving a plan that is knowingly over, but warn loudly
      toast.push({ tone: 'warning', title: 'Saved over capacity', description: 'This unit will block the cargo-plan stage until it is re-planned.' })
    }
    upsertContainer({ ...draft, vgmKg: draft.vgmSubmittedAt ? Math.round(u.vgmKg) : draft.vgmKg })
    if (!e.items) toast.push({ tone: 'success', title: initial ? 'Container updated' : 'Container added', description: draft.containerNo ?? `Unit #${draft.seq}` })
    onOpenChange(false)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      width="max-w-4xl"
      eyebrow={
        <div className="flex items-center gap-2">
          <Badge tone={initial ? 'primary' : 'accent'} size="sm">{initial ? `Unit #${initial.seq}` : 'New unit'}</Badge>
          <Badge tone="outline" size="sm">{project.code}</Badge>
        </div>
      }
      title={initial ? initial.containerNo ?? `Container unit #${initial.seq}` : 'Add a container'}
      description="Allocate cargo into this unit. Volume and payload are validated against the ISO specification as you type."
      footer={
        <>
          <div className="mr-auto flex items-center gap-3">
            <UtilisationBar u={u} compact />
            <span className="tnum text-[12px] text-fg-muted">
              VGM {fmtNumber(u.vgmKg)} kg
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save}>{initial ? 'Save unit' : 'Add unit'}</Button>
        </>
      }
    >
      <div className="grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Container type" help="Specification drives the capacity and payload checks below.">
          <Select
            value={draft.type}
            onChange={(v) => set('type', v)}
            options={CONTAINER_TYPES.map((t) => ({
              value: t,
              label: t,
              description: `${CONTAINER_SPECS[t].label}${CONTAINER_SPECS[t].capacityCbm ? ` · ${CONTAINER_SPECS[t].capacityCbm} CBM` : ''}`,
            }))}
          />
        </Field>
        <Field label="Container number" error={errors.containerNo} help="Validated with the ISO 6346 check digit.">
          <Input
            value={draft.containerNo ?? ''}
            onChange={(e) => set('containerNo', e.target.value.toUpperCase())}
            className="font-mono uppercase"
            placeholder="MSKU6636215"
            invalid={!!errors.containerNo}
            trailing={
              noCheck ? (
                noCheck.valid ? <CheckCircle2 className="text-success" /> : <AlertTriangle className="text-danger" />
              ) : undefined
            }
          />
        </Field>
        <Field label="Status">
          <Select
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={(['PLANNED', 'BOOKED', 'AT_DEPOT', 'STUFFING', 'STUFFED', 'GATE_IN', 'LOADED', 'IN_TRANSIT', 'DISCHARGED', 'DELIVERED', 'RETURNED'] as const).map((s) => ({
              value: s,
              label: s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
            }))}
          />
        </Field>
        <Field label="Seal number">
          <Input value={draft.sealNo ?? ''} onChange={(e) => set('sealNo', e.target.value)} className="font-mono" />
        </Field>
        <Field label="Seal type">
          <Select
            clearable
            value={draft.sealType ?? null}
            onClear={() => set('sealType', undefined)}
            onChange={(v) => set('sealType', v)}
            options={[
              { value: 'BOLT', label: 'Bolt seal', description: 'ISO 17712 high security' },
              { value: 'CABLE', label: 'Cable seal' },
              { value: 'CUSTOMS', label: 'Customs seal' },
            ]}
          />
        </Field>
        <Field label="Depot">
          <Input value={draft.depot ?? ''} onChange={(e) => set('depot', e.target.value)} />
        </Field>
        <Field label="Stuffing date">
          <DatePicker value={draft.stuffingDate} onChange={(v) => set('stuffingDate', v ?? undefined)} />
        </Field>
        <Field label="Gate-in date">
          <DatePicker value={draft.gateInDate} onChange={(v) => set('gateInDate', v ?? undefined)} />
        </Field>
        <Field label="VGM submitted" help="SOLAS requires a verified gross mass before the vessel can load the unit.">
          <DatePicker value={draft.vgmSubmittedAt} onChange={(v) => set('vgmSubmittedAt', v ?? undefined)} />
        </Field>
        {spec.reefer && (
          <Field label="Reefer set point (°C)">
            <Input type="number" value={draft.reeferTempC ?? -18} onChange={(e) => set('reeferTempC', Number(e.target.value))} className="tnum" />
          </Field>
        )}
        {project.dangerousGoods && (
          <>
            <Field label="IMO class">
              <Input value={draft.imoClass ?? ''} onChange={(e) => set('imoClass', e.target.value)} placeholder="3" />
            </Field>
            <Field label="UN number">
              <Input value={draft.unNumber ?? ''} onChange={(e) => set('unNumber', e.target.value)} className="font-mono" placeholder="UN1263" />
            </Field>
          </>
        )}
        <Field label="Remarks" className="sm:col-span-3">
          <Textarea value={draft.remarks ?? ''} onChange={(e) => set('remarks', e.target.value)} rows={2} />
        </Field>
      </div>

      <div className="border-t border-border bg-surface-sunken/50 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_260px]">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-fg">
                <Package className="size-4 text-fg-muted" /> Cargo lines
                <span className="font-normal text-fg-muted">({draft.items.length})</span>
              </p>
              <Button variant="secondary" size="xs" onClick={addItem}>
                <Plus /> Add line
              </Button>
            </div>
            {errors.items && (
              <p className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-danger">
                <AlertTriangle className="size-3.5" /> {errors.items}
              </p>
            )}
            <div className="space-y-2">
              {draft.items.length === 0 && (
                <p className="rounded-lg border border-dashed border-border-strong px-3 py-6 text-center text-[12.5px] text-fg-subtle">
                  No cargo allocated yet. Add a line to start the load plan.
                </p>
              )}
              {draft.items.map((it) => {
                const cbm = itemCbm(it)
                const kg = itemGrossKg(it)
                return (
                  <div key={it.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_140px_100px]">
                      <Input
                        value={it.description}
                        onChange={(e) => patchItem(it.id, { description: e.target.value })}
                        placeholder="Teak dining table 180x90, knock-down"
                      />
                      <Select
                        searchable
                        clearable
                        size="md"
                        value={it.hsCode ?? null}
                        onClear={() => patchItem(it.id, { hsCode: undefined })}
                        onChange={(v) => patchItem(it.id, { hsCode: v })}
                        options={HS_CODES.map((h) => ({ value: h.code, label: h.code, description: h.description }))}
                        placeholder="HS code"
                      />
                      <Select
                        value={it.packageUnit}
                        onChange={(v) => patchItem(it.id, { packageUnit: v })}
                        options={(['CARTON', 'PALLET', 'CRATE', 'DRUM', 'BAG', 'ROLL', 'BUNDLE', 'PIECE'] as const).map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-6">
                      <NumField label="Qty" value={it.quantity} onChange={(v) => patchItem(it.id, { quantity: v })} />
                      <NumField label="L (cm)" value={it.lengthCm} onChange={(v) => patchItem(it.id, { lengthCm: v })} />
                      <NumField label="W (cm)" value={it.widthCm} onChange={(v) => patchItem(it.id, { widthCm: v })} />
                      <NumField label="H (cm)" value={it.heightCm} onChange={(v) => patchItem(it.id, { heightCm: v })} />
                      <NumField label="Gross/unit (kg)" value={it.grossWeightKg} onChange={(v) => patchItem(it.id, { grossWeightKg: v })} />
                      <NumField label="Net/unit (kg)" value={it.netWeightKg} onChange={(v) => patchItem(it.id, { netWeightKg: v })} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                      <span className="tnum text-[11.5px] text-fg-muted">
                        <Boxes className="mr-1 inline size-3.5" />
                        {fmtNumber(cbm, 3)} CBM
                      </span>
                      <span className="tnum text-[11.5px] text-fg-muted">
                        <Weight className="mr-1 inline size-3.5" />
                        {fmtNumber(kg)} kg gross
                      </span>
                      <Checkbox checked={it.stackable} onChange={(v) => patchItem(it.id, { stackable: v })} label={<span className="text-[11.5px]">Stackable</span>} />
                      <Input
                        value={it.poNumber ?? ''}
                        onChange={(e) => patchItem(it.id, { poNumber: e.target.value })}
                        placeholder="PO number"
                        className="h-7 w-[130px] text-[12px]"
                      />
                      <div className="flex-1" />
                      <Button
                        variant="dangerGhost"
                        size="iconXs"
                        onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((x) => x.id !== it.id) }))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <Textarea
                      value={it.marksAndNumbers ?? ''}
                      onChange={(e) => patchItem(it.id, { marksAndNumbers: e.target.value })}
                      placeholder={'Marks & numbers — printed on the packing list\nC/NO. 1-100\nMADE IN INDONESIA'}
                      rows={2}
                      className="mt-2 min-h-0 font-mono text-[11.5px]"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border bg-surface p-3.5">
              <p className="mb-3 text-[12.5px] font-semibold text-fg">{spec.label}</p>
              <UtilisationBar u={u} />
              <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-[11.5px]">
                <Row label="Tare weight" value={`${fmtNumber(draft.tareKg ?? spec.tareKg)} kg`} />
                <Row label="Cargo gross" value={`${fmtNumber(u.usedKg)} kg`} />
                <Row label="VGM (tare + cargo)" value={`${fmtNumber(u.vgmKg)} kg`} strong />
                <Row label="Packages" value={fmtNumber(draft.items.reduce((a, i) => a + i.quantity, 0))} />
              </div>
            </div>
            {u.status === 'OVERLOADED' && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-3 text-[12px] leading-relaxed text-danger-soft-fg">
                <p className="font-semibold">Over the {u.bottleneck === 'WEIGHT' ? 'payload' : 'volume'} limit</p>
                <p className="mt-1">
                  Move {u.bottleneck === 'WEIGHT' ? `${fmtNumber(u.usedKg - u.maxPayloadKg)} kg` : `${fmtNumber(u.usedCbm - u.capacityCbm, 2)} CBM`} to
                  another unit, or step up to a larger container type.
                </p>
              </div>
            )}
            {u.status === 'LIGHT' && draft.type !== 'LCL' && (
              <div className="rounded-xl border border-warning/30 bg-warning-soft px-3.5 py-3 text-[12px] leading-relaxed text-warning-soft-fg">
                <p className="font-semibold">Paying for air</p>
                <p className="mt-1">
                  Only {Math.max(u.volumePct, u.weightPct).toFixed(0)}% of this unit is used. Consolidate with another job or
                  drop to a smaller box to recover the freight.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10.5px] font-medium uppercase tracking-[0.05em] text-fg-subtle">{label}</span>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="tnum h-8 text-[12.5px]" />
    </label>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-fg-muted">{label}</span>
      <span className={`tnum ${strong ? 'font-semibold text-fg' : 'text-fg'}`}>{value}</span>
    </div>
  )
}

function blank(project: Project, containers: Container[]): Container {
  const mine = containers.filter((c) => c.projectId === project.id)
  const type: ContainerType = project.mode === 'LCL' || project.mode === 'AIR' ? 'LCL' : '40HC'
  return {
    id: uid('ctn'), projectId: project.id, seq: mine.length + 1, type, status: 'PLANNED',
    tareKg: CONTAINER_SPECS[type].tareKg || undefined, items: [],
  }
}
