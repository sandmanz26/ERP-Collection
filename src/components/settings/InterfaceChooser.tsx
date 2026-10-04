import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { INTERFACES, useInterface, type InterfaceStyle } from '@/store/useInterface'
import { useToast } from '@/components/ui/toast'

/**
 * Two miniature screens, one per interface.
 *
 * They are drawn with fixed colours instead of the theme tokens on purpose: a
 * token-driven thumbnail would take on whichever interface is active, and the
 * "Classic" preview would stop looking like Classic the moment Modern was
 * selected. Each shows what it is for — the sidebar, the bar above it, three
 * summary figures and a table — in the proportions of the real thing.
 */
function Preview({ style }: { style: InterfaceStyle }) {
  const classic = style === 'classic'
  const c = classic
    ? { page: '#ecf0f5', side: '#222d32', sideInk: '#4b646f', top: '#337ab7', box: '#fff', line: '#ddd', radius: 2 }
    : { page: '#f3f6fa', side: '#fff', sideInk: '#c9d2de', top: '#fff', box: '#fff', line: '#e2e8f0', radius: 8 }
  const kpi = classic ? ['#337ab7', '#449d44', '#d58512'] : ['#dbe8fb', '#d9f2e3', '#fdecc8']

  return (
    <div aria-hidden className="flex h-[150px] overflow-hidden rounded border" style={{ background: c.page, borderColor: c.line }}>
      {/* sidebar */}
      <div className="flex w-[22%] flex-col gap-1.5 p-2" style={{ background: c.side, borderRight: `1px solid ${classic ? '#1a2226' : c.line}` }}>
        <div className="mb-1 h-3 rounded-sm" style={{ background: classic ? '#2e6da4' : '#1a5fd0', borderRadius: c.radius - 1 }} />
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-2"
            style={{
              background: i === 1 ? (classic ? '#1e282c' : '#e4edfc') : c.sideInk,
              opacity: i === 1 ? 1 : 0.55,
              borderRadius: c.radius - 1,
              borderLeft: classic && i === 1 ? '2px solid #3c8dbc' : undefined,
            }}
          />
        ))}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <div className="flex h-5 items-center justify-end gap-1 px-2" style={{ background: c.top, borderBottom: `1px solid ${classic ? '#2e6da4' : c.line}` }}>
          <div className="size-2 rounded-full" style={{ background: classic ? '#fff' : '#c9d2de', opacity: 0.8 }} />
          <div className="size-2.5 rounded-full" style={{ background: classic ? '#fff' : '#1a5fd0', opacity: classic ? 0.9 : 0.8 }} />
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-2">
          {/* summary figures */}
          <div className="flex gap-1.5">
            {kpi.map((bg, i) => (
              <div
                key={i}
                className="flex h-6 flex-1 overflow-hidden"
                style={{ background: c.box, border: `1px solid ${c.line}`, borderRadius: c.radius }}
              >
                <div className={classic ? 'w-3.5' : 'w-2 m-1 rounded'} style={{ background: bg }} />
                <div className="flex flex-1 flex-col justify-center gap-0.5 px-1">
                  <div className="h-1 w-3/5 rounded-sm" style={{ background: '#cbd5e1' }} />
                  <div className="h-1 w-2/5 rounded-sm" style={{ background: '#94a3b8' }} />
                </div>
              </div>
            ))}
          </div>

          {/* table */}
          <div
            className="flex flex-1 flex-col overflow-hidden"
            style={{
              background: c.box,
              border: `1px solid ${c.line}`,
              borderTop: classic ? '2px solid #d2d6de' : `1px solid ${c.line}`,
              borderRadius: c.radius,
            }}
          >
            <div className="h-2.5" style={{ background: classic ? '#f5f5f5' : '#f1f5f9', borderBottom: `1px solid ${c.line}` }} />
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex flex-1 items-center gap-2 px-1.5"
                style={{
                  background: classic && i % 2 === 0 ? '#f9f9f9' : undefined,
                  borderBottom: i < 3 ? `1px solid ${classic ? '#eee' : '#f1f5f9'}` : undefined,
                }}
              >
                <div className="h-1 w-1/4 rounded-sm" style={{ background: '#cbd5e1' }} />
                <div className="h-1 w-1/3 rounded-sm" style={{ background: '#e2e8f0' }} />
                <div
                  className="ml-auto h-1.5 w-5"
                  style={{
                    background: i === 1 ? (classic ? '#d9534f' : '#fbd5d8') : classic ? '#449d44' : '#cdeedc',
                    borderRadius: classic ? 2 : 999,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function InterfaceChooser() {
  const toast = useToast()
  const { style, setStyle } = useInterface()

  const choose = (next: InterfaceStyle) => {
    if (next === style) return
    setStyle(next)
    toast.push({
      tone: 'success',
      title: `${INTERFACES.find((i) => i.value === next)?.label} interface on`,
      description: 'Every screen now uses it. You can switch back here at any time.',
    })
  }

  return (
    <div role="radiogroup" aria-label="Interface" className="grid gap-4 sm:grid-cols-2">
      {INTERFACES.map((option) => {
        const active = option.value === style
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(option.value)}
            className={cn(
              'rounded-xl border bg-surface p-3 text-left transition-colors focus-visible:outline-2',
              active ? 'border-primary ring-2 ring-primary/25' : 'border-border hover:border-border-strong',
            )}
          >
            <Preview style={option.value} />
            <div className="mt-3 flex items-start gap-3 px-0.5">
              <span
                className={cn(
                  'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full border',
                  active ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong',
                )}
              >
                {active && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-fg">{option.label}</span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-fg-muted">{option.summary}</span>
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
