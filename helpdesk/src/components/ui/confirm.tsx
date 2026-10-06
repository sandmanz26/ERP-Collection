import * as React from 'react'
import * as D from '@radix-ui/react-dialog'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Input } from './input'

/* ------------------------------------------------------------------
   Destructive confirmation.
   Escalates: a plain confirm for 1 record, an itemised list for a few,
   and a typed keyword when the blast radius is large or cascading.
   ------------------------------------------------------------------ */

export interface ConfirmDeleteProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  entityLabel: string
  items: string[]
  cascade?: string[]
  requireTypedConfirmation?: boolean
  confirmWord?: string
  destructiveNote?: string
}

export function ConfirmDelete({
  open,
  onOpenChange,
  onConfirm,
  entityLabel,
  items,
  cascade,
  requireTypedConfirmation,
  confirmWord = 'DELETE',
  destructiveNote,
}: ConfirmDeleteProps) {
  const [typed, setTyped] = React.useState('')
  const count = items.length
  const needsTyping = requireTypedConfirmation ?? count >= 5
  const ready = !needsTyping || typed.trim().toUpperCase() === confirmWord

  React.useEffect(() => {
    if (open) setTyped('')
  }, [open])

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-[70] bg-overlay/60 backdrop-blur-[2px] animate-fade-in" />
        <D.Content className="fixed left-1/2 top-1/2 z-[71] w-[94vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-pop animate-slide-up">
          <div className="flex gap-3.5 px-5 pb-4 pt-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-danger-soft text-danger">
              <Trash2 className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <D.Title className="text-[15px] font-semibold tracking-[-0.01em] text-fg">
                Delete {count} {entityLabel}
                {count === 1 ? '' : 's'}?
              </D.Title>
              <D.Description className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
                This removes the {count === 1 ? 'record' : 'records'} from the workspace. This action cannot be undone.
              </D.Description>
            </div>
          </div>

          <div className="px-5">
            <div className="scrollbar-thin max-h-40 overflow-y-auto rounded-lg border border-border bg-surface-sunken">
              <ul className="divide-y divide-border">
                {items.slice(0, 60).map((label, i) => (
                  <li key={i} className="truncate px-3 py-1.5 font-mono text-[11.5px] text-fg-muted">
                    {label}
                  </li>
                ))}
              </ul>
              {items.length > 60 && (
                <p className="border-t border-border px-3 py-1.5 text-[11.5px] text-fg-subtle">
                  and {items.length - 60} more…
                </p>
              )}
            </div>
          </div>

          {(cascade?.length || destructiveNote) && (
            <div className="mx-5 mt-3 flex gap-2.5 rounded-lg border border-warning/30 bg-warning-soft px-3 py-2.5">
              <AlertTriangle className="mt-px size-4 shrink-0 text-warning-soft-fg" />
              <div className="text-[12px] leading-relaxed text-warning-soft-fg">
                {destructiveNote && <p className="font-medium">{destructiveNote}</p>}
                {cascade?.length ? (
                  <ul className="mt-1 list-inside list-disc space-y-0.5">
                    {cascade.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          )}

          {needsTyping && (
            <div className="mt-3 px-5">
              <label className="text-[12px] text-fg-muted">
                Type <span className="font-mono font-semibold text-fg">{confirmWord}</span> to confirm
              </label>
              <Input
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={confirmWord}
                className="mt-1.5 font-mono"
              />
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
            <D.Close asChild>
              <Button variant="secondary" size="sm">
                Cancel
              </Button>
            </D.Close>
            <Button
              variant="danger"
              size="sm"
              disabled={!ready}
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              className={cn(!ready && 'opacity-50')}
            >
              <Trash2 />
              Delete {count > 1 ? `${count} records` : 'record'}
            </Button>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}
