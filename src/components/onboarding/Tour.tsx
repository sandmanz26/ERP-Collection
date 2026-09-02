import * as React from 'react'
import { useLocation } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Lightbulb, X } from 'lucide-react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TOURS, tourFor, type Tour, type TourStep } from './tours'

/* ================================================================
   which tours this browser has already seen
   ================================================================ */
interface TourState {
  seen: string[]
  markSeen: (id: string) => void
  reset: () => void
}
export const useTourState = create<TourState>()(
  persist(
    (set) => ({
      seen: [],
      markSeen: (id) => set((s) => (s.seen.includes(id) ? s : { seen: [...s.seen, id] })),
      reset: () => set({ seen: [] }),
    }),
    { name: 'meridian-freight-tours', version: 1 },
  ),
)

/** Start a tour by hand — used by "Show me around" in the account menu. */
let externalStart: ((id?: string) => void) | null = null
export const startTour = (id?: string) => externalStart?.(id)
export const replayableTours = TOURS

/* ================================================================
   geometry
   ================================================================ */
type Rect = { top: number; left: number; width: number; height: number }

const PAD = 8
const CARD_W = 372
const GAP = 14

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 }
}

/** Where the card goes so it stays on screen and does not cover the spotlight. */
function placeCard(rect: Rect | null, preferred: TourStep['placement']) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (!rect || preferred === 'center') {
    return { top: Math.max(24, vh / 2 - 150), left: Math.max(16, vw / 2 - CARD_W / 2), arrow: null as null | string }
  }
  const below = vh - (rect.top + rect.height)
  const right = vw - (rect.left + rect.width)

  /* A short target is usually a column header or a control, and the thing the
     reader wants to look at is the data directly under it — so put the card
     beside it rather than on top of what it is pointing at. */
  const short = rect.height < 64
  const sideFirst = short && (right > CARD_W + 32 || rect.left > CARD_W + 32)

  let side =
    preferred && preferred !== 'auto'
      ? preferred
      : sideFirst
        ? right > CARD_W + 32 ? 'right' : 'left'
        : below > 260 ? 'bottom' : rect.top > 260 ? 'top' : right > CARD_W + 40 ? 'right' : 'left'
  if (side === 'bottom' && below < 200) side = 'top'
  if (side === 'top' && rect.top < 200) side = 'bottom'

  let top: number
  let left: number
  if (side === 'bottom') {
    top = rect.top + rect.height + GAP
    left = rect.left + rect.width / 2 - CARD_W / 2
  } else if (side === 'top') {
    top = rect.top - GAP - 250
    left = rect.left + rect.width / 2 - CARD_W / 2
  } else if (side === 'right') {
    top = rect.top - 12
    left = rect.left + rect.width + GAP
  } else {
    top = rect.top - 12
    left = rect.left - GAP - CARD_W
  }
  left = Math.min(Math.max(16, left), vw - CARD_W - 16)
  top = Math.min(Math.max(16, top), vh - 220)
  return { top, left, arrow: side }
}

/* ================================================================
   the tour
   ================================================================ */
export function TourGuide() {
  const location = useLocation()
  const { seen, markSeen } = useTourState()
  const [tour, setTour] = React.useState<Tour | null>(null)
  const [index, setIndex] = React.useState(0)
  const [rect, setRect] = React.useState<Rect | null>(null)
  const [, force] = React.useReducer((x: number) => x + 1, 0)

  /* start automatically the first time a page with a tour is opened */
  React.useEffect(() => {
    const candidate = tourFor(location.pathname)
    if (!candidate || seen.includes(candidate.id) || tour) return
    const t = window.setTimeout(() => {
      setTour(candidate)
      setIndex(0)
    }, 550)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, seen])

  /* and by hand from the account menu */
  React.useEffect(() => {
    externalStart = (id) => {
      const t = id ? TOURS.find((x) => x.id === id) : tourFor(location.pathname)
      if (!t) return
      setTour(t)
      setIndex(0)
    }
    return () => { externalStart = null }
  }, [location.pathname])

  const steps = tour?.steps ?? []
  /* a step whose target is missing is dropped, so an empty table never leaves a
     tour pointing at nothing */
  const visible = React.useMemo(
    () => steps.filter((s) => !s.target || document.querySelector(`[data-tour="${s.target}"]`)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, tour, location.pathname],
  )
  const step = visible[index]

  const close = React.useCallback(() => {
    if (tour) markSeen(tour.id)
    setTour(null)
    setRect(null)
  }, [tour, markSeen])

  /* track the target through scroll and resize */
  React.useEffect(() => {
    if (!tour || !step) return
    const measure = () => {
      if (!step.target) { setRect(null); return }
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      setRect(el ? rectOf(el) : null)
    }
    const el = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null
    /* inline as well as block: a table column can be scrolled off to the right,
       and a spotlight on something nobody can see points at the wrong thing. */
    el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    const t = window.setTimeout(measure, el ? 420 : 0)
    const t2 = window.setTimeout(measure, el ? 700 : 0)
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.clearTimeout(t)
      window.clearTimeout(t2)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [tour, step, index])

  React.useEffect(() => {
    if (!tour) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setIndex((i) => Math.max(0, i - 1)) }
    }
    window.addEventListener('keydown', onKey)
    const onResize = () => force()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, index, visible.length])

  const next = () => {
    if (index >= visible.length - 1) close()
    else setIndex((i) => i + 1)
  }

  if (!tour || !step) return null
  const pos = placeCard(rect, step.placement)
  const last = index === visible.length - 1

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={`${tour.name} tour`}>
      {/* the blackout. One element with an enormous spread shadow cuts the hole,
          so the highlight tracks the target exactly rather than approximating it. */}
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-primary transition-all duration-300 ease-out"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            boxShadow: '0 0 0 9999px hsl(var(--overlay) / 0.72)',
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: 'hsl(var(--overlay) / 0.72)' }} />
      )}

      {/* clicking the dimmed area leaves the tour */}
      <button
        type="button"
        aria-label="Close the tour"
        onClick={close}
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
      />

      <div
        className="absolute w-[372px] max-w-[calc(100vw-32px)] rounded-xl border border-border bg-surface shadow-pop animate-slide-up"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-start gap-3 px-4 pb-2 pt-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg">
            <Lightbulb className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
              {tour.name} · {index + 1} of {visible.length}
            </p>
            <h2 className="mt-1 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-fg">{step.title}</h2>
          </div>
          <Button variant="ghost" size="iconXs" onClick={close} aria-label="Close the tour">
            <X />
          </Button>
        </div>

        <div className="px-4 pb-3 pl-[56px]">
          <p className="text-[13px] leading-relaxed text-fg-muted">{step.body}</p>
          {step.because && (
            <p className="mt-2 border-l-2 border-primary/40 pl-2.5 text-[12px] leading-relaxed text-fg-subtle">
              {step.because}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
          <div className="flex items-center gap-1.5 pl-1">
            {visible.map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-primary' : 'w-1.5 bg-border-strong',
                )}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={close}>Skip</Button>
            {index > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setIndex((i) => i - 1)}>
                <ArrowLeft /> Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={next}>
              {last ? 'Got it' : 'Next'} {!last && <ArrowRight />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
