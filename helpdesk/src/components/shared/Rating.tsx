import { Frown, Meh, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'

const OPTS = [
  { score: 1, label: 'Kurang puas', icon: Frown, cls: 'text-danger' },
  { score: 3, label: 'Cukup', icon: Meh, cls: 'text-warning' },
  { score: 5, label: 'Puas', icon: Smile, cls: 'text-success' },
]

export function Rating({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-2" role="radiogroup" aria-label="Penilaian layanan">
      {OPTS.map((o) => (
        <button key={o.score} type="button" role="radio" aria-checked={value === o.score} onClick={() => onChange(o.score)} className={cn('flex min-w-[96px] flex-1 flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-[13px] font-medium transition-colors sm:flex-none', value === o.score ? 'border-primary bg-primary-soft' : 'border-border bg-surface hover:border-border-strong')}>
          <o.icon className={cn('size-7', o.cls)} />{o.label}
        </button>
      ))}
    </div>
  )
}

export function RatingFace({ score }: { score: number }) {
  const o = score >= 4 ? OPTS[2] : score >= 3 ? OPTS[1] : OPTS[0]
  return <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-medium', o.cls)}><o.icon className="size-4" />{o.label}</span>
}
