import * as React from 'react'
import { addDays, addHours, setHours, setMinutes, startOfDay } from 'date-fns'
import { CalendarClock, Hourglass } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fmtDuration, fmtSmart, toLocalInput } from '@/lib/format'
import { isOpenStatus } from '@/lib/sla'
import { useNow } from '@/hooks/useNow'
import type { Priority, Ticket } from '@/data/types'

/** The promised finish time. Words first, colour second. */
export function EtaChip({ ticket, perspective = 'staff', className }: { ticket: Pick<Ticket, 'etaAt' | 'status' | 'assigneeId'>; perspective?: 'staff' | 'requester'; className?: string }) {
  const now = useNow(30_000)
  if (!isOpenStatus(ticket.status)) return null
  if (!ticket.etaAt) {
    if (perspective === 'requester') return <span className={cn('inline-flex items-center gap-1 text-[12.5px] text-fg-subtle', className)}><Hourglass className="size-3.5" />Estimasi belum ada</span>
    return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-warning-soft px-1.5 py-0.5 text-[12px] font-medium text-warning-soft-fg', className)}><Hourglass className="size-3.5" />{ticket.assigneeId ? 'Isi ETA' : 'Belum ada ETA'}</span>
  }
  const diff = new Date(ticket.etaAt).getTime() - now
  const late = diff < 0
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[12px] font-medium', late ? 'bg-danger-soft text-danger-soft-fg' : 'text-fg', className)} title={fmtSmart(ticket.etaAt)}>
      <CalendarClock className="size-3.5" />
      {fmtSmart(ticket.etaAt)}
      <span className={cn('font-normal', late ? '' : 'text-fg-subtle')}>· {late ? `lewat ${fmtDuration(diff)}` : `${fmtDuration(diff)} lagi`}</span>
    </span>
  )
}

export const defaultEtaFor = (priority: Priority) => {
  const now = new Date()
  const base = { p1: addHours(now, 2), p2: addHours(now, 6), p3: addDays(now, 1), p4: addDays(now, 3) }[priority]
  return roundTo15(base)
}

const roundTo15 = (d: Date) => new Date(Math.ceil(d.getTime() / 900_000) * 900_000)

/** Presets plus free choice, as a controlled field group (value is a `datetime-local` string). */
export function EtaFields({ value, onChange, optional }: { value: string; onChange: (v: string) => void; optional?: boolean }) {
  const t = new Date()
  const today = (h: number) => setMinutes(setHours(t, h), 0)
  const tomorrow = (h: number) => setMinutes(setHours(addDays(startOfDay(t), 1), h), 0)
  const chips: { label: string; at: Date }[] = [
    { label: '+1 jam', at: addHours(t, 1) },
    { label: '+2 jam', at: addHours(t, 2) },
    { label: '+4 jam', at: addHours(t, 4) },
    ...(today(16) > addHours(t, 0.5) ? [{ label: 'Hari ini 16:00', at: today(16) }] : []),
    { label: 'Besok 10:00', at: tomorrow(10) },
    { label: 'Besok 16:00', at: tomorrow(16) },
    { label: 'Lusa', at: setMinutes(setHours(addDays(startOfDay(t), 2), 10), 0) },
    { label: '1 minggu', at: setMinutes(setHours(addDays(startOfDay(t), 7), 10), 0) },
  ]
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pilihan cepat estimasi">
        {optional && <button type="button" aria-pressed={!value} onClick={() => onChange('')} className={cn('h-8 rounded-full border px-3 text-[12.5px] font-medium', !value ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong')}>Belum tahu</button>}
        {chips.map((c) => {
          const on = toLocalInput(roundTo15(c.at).toISOString()) === value
          return <button key={c.label} type="button" aria-pressed={on} onClick={() => onChange(toLocalInput(roundTo15(c.at).toISOString()))} className={cn('h-8 rounded-full border px-3 text-[12.5px] font-medium transition-colors', on ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong')}>{c.label}</button>
        })}
      </div>
      <Field label="Atau pilih waktu sendiri"><Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} /></Field>
      {value && <p className="text-[13px] text-fg-muted">Pelapor akan melihat: <strong className="text-fg">{fmtSmart(new Date(value).toISOString())}</strong></p>}
    </div>
  )
}

/** Stand-alone dialog for setting or moving an estimate. */
export function EtaDialog({
  open, onOpenChange, title = 'Estimasi selesai', description = 'Kapan pekerjaan ini kira-kira selesai? Pelapor bisa melihatnya.', value, priority, requireReason, confirmLabel = 'Simpan estimasi', onSave, allowClear, onSkip,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title?: string
  description?: string
  value?: string
  priority?: Priority
  requireReason?: boolean
  confirmLabel?: string
  allowClear?: boolean
  onSkip?: () => void
  onSave: (etaIso: string | undefined, reason?: string) => void
}) {
  const [val, setVal] = React.useState('')
  const [reason, setReason] = React.useState('')
  React.useEffect(() => {
    if (open) { setVal(toLocalInput(value ?? defaultEtaFor(priority ?? 'p3').toISOString())); setReason('') }
  }, [open, value, priority])
  const needReason = !!requireReason && !!value && toLocalInput(value) !== val
  const valid = !!val && new Date(val).getTime() > Date.now() - 60_000 && (!needReason || reason.trim().length >= 3)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" title={title} description={description} icon={<CalendarClock />}
        footer={<>
          {allowClear && value && <Button variant="ghost" className="mr-auto text-danger" onClick={() => { onSave(undefined); onOpenChange(false) }}>Hapus estimasi</Button>}
          {onSkip && <Button variant="ghost" className="mr-auto" onClick={() => { onSkip(); onOpenChange(false) }}>Lewati dulu</Button>}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button variant="primary" disabled={!valid} onClick={() => { onSave(new Date(val).toISOString(), reason.trim() || undefined); onOpenChange(false) }}>{confirmLabel}</Button>
        </>}>
        <div className="space-y-4 p-5">
          <EtaFields value={val} onChange={setVal} />
          {needReason && <Field label="Kenapa estimasinya berubah?" required hint="dilihat pelapor"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="mis. sparepart baru tiba besok" /></Field>}
        </div>
      </DialogContent>
    </Dialog>
  )
}
