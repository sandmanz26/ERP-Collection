import * as React from 'react'
import { Check, Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Segmented } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useTheme } from '@/hooks/useTheme'
import { useUiStyle, type UiStyle } from '@/store/useUiStyle'
import { cn } from '@/lib/utils'

/* The previews are drawn with fixed colours rather than theme tokens, so each
   one looks like itself no matter which interface is currently switched on. */

function ModernPreview() {
  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: '#faf7f3', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ width: '27%', background: '#fff', borderRight: '1px solid #e8e0d6', padding: 8 }}>
        <div style={{ height: 8, width: '60%', background: '#c25510', borderRadius: 4, marginBottom: 10 }} />
        {[1, 0, 0, 0, 0].map((a, i) => (
          <div key={i} style={{ height: 9, margin: '4px 0', borderRadius: 6, background: a ? '#fbe6d6' : '#f1ece5' }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: 9 }}>
        <div style={{ height: 8, width: '45%', background: '#2b2218', borderRadius: 3, marginBottom: 8 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {['#fbe6d6', '#dcefe5', '#ece6f7'].map((c) => (
            <div key={c} style={{ flex: 1, height: 30, background: '#fff', border: '1px solid #e8e0d6', borderRadius: 8, boxShadow: '0 1px 3px rgb(60 40 20 / .08)', padding: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 4, background: c }} />
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #e8e0d6', borderRadius: 8, padding: 6 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ height: 7, margin: '5px 0', background: '#f1ece5', borderRadius: 3 }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function ClassicPreview() {
  return (
    <div className="relative h-full w-full overflow-hidden" style={{ background: '#ecf0f5', fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <div style={{ display: 'flex', height: 15, background: '#9e4a1a' }}>
        <div style={{ width: '27%', background: '#7d3a14' }} />
      </div>
      <div style={{ position: 'absolute', top: 15, bottom: 0, left: 0, width: '27%', background: '#222d32', padding: '5px 0' }}>
        {[1, 0, 0, 0, 0].map((a, i) => (
          <div key={i} style={{ height: 10, margin: '3px 0', background: a ? '#1b2428' : 'transparent', borderLeft: a ? '3px solid #e8743a' : '3px solid transparent' }}>
            <div style={{ height: 3, width: '55%', margin: '3.5px 0 0 7px', background: a ? '#fff' : '#6b7f88' }} />
          </div>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 15, bottom: 0, left: '27%', right: 0, padding: 7 }}>
        <div style={{ height: 6, width: '40%', background: '#333', marginBottom: 5 }} />
        <div style={{ borderBottom: '1px solid #ddd', marginBottom: 7 }} />
        <div style={{ display: 'flex', gap: 5, marginBottom: 7 }}>
          {['#c25510', '#2f7d5b', '#d9a441'].map((c) => (
            <div key={c} style={{ display: 'flex', flex: 1, height: 26, background: '#fff', border: '1px solid #ddd', boxShadow: '0 1px 1px rgb(0 0 0 / .1)' }}>
              <div style={{ width: 22, background: c }} />
            </div>
          ))}
        </div>
        <div style={{ background: '#fff', border: '1px solid #ddd', borderTop: '3px solid #ccc' }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ height: 8, background: i % 2 === 0 ? '#f7f7f7' : '#fff', borderBottom: '1px solid #e6e6e6' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const CHOICES: { value: UiStyle; name: string; blurb: string; traits: string[]; preview: React.ReactNode }[] = [
  {
    value: 'modern',
    name: 'Modern',
    blurb: 'The original design: soft rounded cards, a light sidebar, generous whitespace and tinted status badges.',
    traits: ['Rounded cards', 'Light sidebar', 'Soft shadows', 'Tinted badges'],
    preview: <ModernPreview />,
  },
  {
    value: 'classic',
    name: 'Classic',
    blurb: 'A Bootstrap-era admin look: coloured top bar, dark sidebar with a user panel, flat square panels and striped tables.',
    traits: ['Dark sidebar', 'Flat panels', 'Striped tables', 'Solid labels'],
    preview: <ClassicPreview />,
  },
]

export function InterfacePicker() {
  const style = useUiStyle((s) => s.style)
  const setStyle = useUiStyle((s) => s.setStyle)
  const { mode, setMode } = useTheme()

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Interface"
          description="Both interfaces show the same screens and the same data — only how they are drawn changes. The choice is remembered in this browser and applies at once."
        />
        <CardBody>
          <div role="radiogroup" aria-label="Interface" className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {CHOICES.map((c) => {
              const active = style === c.value
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setStyle(c.value)}
                  className={cn(
                    'group flex flex-col overflow-hidden rounded-xl border-2 bg-surface text-left transition-colors',
                    active ? 'border-primary' : 'border-border hover:border-border-strong',
                  )}
                >
                  <div className="h-[168px] border-b border-border">{c.preview}</div>
                  <div className="flex flex-1 flex-col gap-2.5 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[15px] font-semibold text-fg">{c.name}</span>
                      {active ? (
                        <Badge tone="primary" size="sm">
                          <Check className="size-3" /> In use
                        </Badge>
                      ) : (
                        <span className="text-[12px] text-fg-subtle group-hover:text-fg-muted">Click to switch</span>
                      )}
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-fg-muted">{c.blurb}</p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                      {c.traits.map((t) => (
                        <Badge key={t} tone="neutral" size="sm">{t}</Badge>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Colour scheme" description="Independent of the interface — either one can be light or dark." />
        <CardBody>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v)}
            options={[
              { value: 'light', label: 'Light', icon: <Sun /> },
              { value: 'dark', label: 'Dark', icon: <Moon /> },
              { value: 'system', label: 'Auto (follow the system)', icon: <Monitor /> },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  )
}
