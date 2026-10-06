import * as React from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uid } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info' | 'warning'
interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
  action?: { label: string; onClick: () => void }
}

const ToastCtx = React.createContext<{ push: (t: Omit<ToastItem, 'id'>) => void }>({ push: () => {} })
export const useToast = () => React.useContext(ToastCtx)

const icons: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 />,
  error: <XCircle />,
  info: <Info />,
  warning: <AlertTriangle />,
}
const tones: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-info',
  warning: 'text-warning',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([])

  const push = React.useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = uid('toast')
    setItems((prev) => [...prev, { ...t, id }].slice(-4))
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 5200)
  }, [])

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
            {items.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface-raised px-3.5 py-3 shadow-pop animate-slide-up"
              >
                <span className={cn('mt-px shrink-0 [&_svg]:size-[18px]', tones[t.tone])}>{icons[t.tone]}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-tight text-fg">{t.title}</p>
                  {t.description && <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{t.description}</p>}
                  {t.action && (
                    <button
                      onClick={() => {
                        t.action!.onClick()
                        setItems((prev) => prev.filter((x) => x.id !== t.id))
                      }}
                      className="mt-1.5 text-[12px] font-semibold text-primary hover:underline"
                    >
                      {t.action.label}
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                  className="grid size-5 shrink-0 place-items-center rounded text-fg-subtle hover:bg-neutral-soft hover:text-fg"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastCtx.Provider>
  )
}
