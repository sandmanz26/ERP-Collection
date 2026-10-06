import * as React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export function Stars({ value, onChange, size = 'md', readOnly }: { value: number; onChange?: (n: number) => void; size?: 'sm' | 'md' | 'lg'; readOnly?: boolean }) {
  const [hover, setHover] = React.useState(0)
  const shown = hover || value
  const px = { sm: 'size-3.5', md: 'size-5', lg: 'size-8' }[size]
  return (
    <div className="inline-flex items-center gap-1" role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) =>
        readOnly ? (
          <Star key={n} className={cn(px, n <= value ? 'fill-warning text-warning' : 'text-border-strong')} />
        ) : (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} — ${WORDS[n]}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange?.(n)} className="rounded p-0.5 transition-transform hover:scale-110">
            <Star className={cn(px, n <= shown ? 'fill-warning text-warning' : 'text-border-strong')} />
          </button>
        ),
      )}
      {!readOnly && shown > 0 && <span className="ml-2 text-[12.5px] font-medium text-fg-muted">{WORDS[shown]}</span>}
    </div>
  )
}
