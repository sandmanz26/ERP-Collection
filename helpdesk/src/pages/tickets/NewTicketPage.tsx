import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ImagePlus, Paperclip, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Segmented } from '@/components/ui/checkbox'
import { Icon } from '@/components/shared/icons'
import { PageHeader } from '@/components/shared/PageHeader'
import { useMe, useStore } from '@/store/useStore'
import { useLookups } from '@/hooks/useLookups'
import { policyFor } from '@/lib/sla'
import { PRIORITY } from '@/lib/labels'
import { cn } from '@/lib/utils'
import { fmtDuration } from '@/lib/format'
import type { Priority, Ticket, TicketKind } from '@/data/types'

const IMPACT: { priority: Priority; title: string; hint: string }[] = [
  { priority: 'p1', title: 'Safety risk, or a service is down for many people', hint: 'Fire, flooding, gas, smoke, a lift with someone inside, a whole floor without power or cooling' },
  { priority: 'p2', title: 'A team cannot work', hint: 'Several people are blocked, or a key facility such as a meeting room is unusable' },
  { priority: 'p3', title: 'It affects me, but I can work around it', hint: 'Uncomfortable, slow or annoying, with an alternative available' },
  { priority: 'p4', title: 'Low urgency', hint: 'A question, a nice-to-have, or a cosmetic problem' },
]

export function NewTicketPage() {
  const me = useMe()!
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const { category, space, building, user } = useLookups()
  const categories = useStore((s) => s.categories)
  const spaces = useStore((s) => s.spaces)
  const assets = useStore((s) => s.assets)
  const kb = useStore((s) => s.kb)
  const users = useStore((s) => s.users)
  const createTicket = useStore((s) => s.createTicket)
  const isStaff = me.role !== 'requester'

  const initialCat = sp.get('category') ?? undefined
  const [kind, setKind] = React.useState<TicketKind | 'all'>((sp.get('type') as TicketKind) || 'all')
  const [step, setStep] = React.useState<0 | 1 | 2>(initialCat ? 1 : 0)
  const [categoryId, setCategoryId] = React.useState<string | undefined>(initialCat)
  const [title, setTitle] = React.useState(sp.get('title') ?? '')
  const [desc, setDesc] = React.useState('')
  const [spaceId, setSpaceId] = React.useState<string | undefined>(sp.get('space') ?? (sp.get('asset') ? undefined : me.homeSpaceId))
  const [assetId, setAssetId] = React.useState<string | undefined>(sp.get('asset') ?? undefined)
  const [priority, setPriority] = React.useState<Priority | undefined>()
  const [files, setFiles] = React.useState<string[]>([])
  const [onBehalf, setOnBehalf] = React.useState<string | undefined>()
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [done, setDone] = React.useState<Ticket | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const cat = categoryId ? category.get(categoryId) : undefined
  const effPriority = priority ?? cat?.defaultPriority ?? 'p3'

  // QR deep link: an asset implies its space until the person picks another
  const effSpaceId = spaceId ?? (assetId ? assets.find((x) => x.id === assetId)?.spaceId : undefined)

  const visibleCats = categories.filter((c) => kind === 'all' || c.kind === kind)
  const domains = [
    { id: 'facilities', label: 'Building & facilities' },
    { id: 'it', label: 'IT & technology' },
    { id: 'security', label: 'Security & safety' },
    { id: 'workplace', label: 'Workplace services' },
  ] as const

  const deflect = React.useMemo(() => {
    const q = `${title}`.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
    if (!q.length) return []
    return kb
      .filter((a) => a.audience === 'everyone' || isStaff)
      .map((a) => ({ a, score: q.filter((w) => `${a.title} ${a.summary}`.toLowerCase().includes(w)).length + (a.categoryId === categoryId ? 1 : 0) }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
      .map((x) => x.a)
  }, [title, kb, categoryId, isStaff])

  const spaceOptions = React.useMemo(
    () =>
      [...spaces]
        .filter((s) => s.kind !== 'parking' || cat?.id === 'c_park')
        .sort((a, b) => a.buildingId.localeCompare(b.buildingId) || b.floor - a.floor || a.name.localeCompare(b.name))
        .map((s) => ({ value: s.id, label: s.name, group: `${building.get(s.buildingId)?.name} — ${s.floor < 0 ? `Basement ${Math.abs(s.floor)}` : `Floor ${s.floor}`}` })),
    [spaces, building, cat],
  )
  const assetOptions = React.useMemo(() => {
    const sameFloor = effSpaceId ? space.get(effSpaceId) : undefined
    return assets
      .filter((a) => a.status !== 'retired')
      .map((a) => ({ a, near: sameFloor && space.get(a.spaceId)?.buildingId === sameFloor.buildingId && space.get(a.spaceId)?.floor === sameFloor.floor }))
      .sort((x, y) => Number(!!y.near) - Number(!!x.near) || x.a.name.localeCompare(y.a.name))
      .map(({ a, near }) => ({ value: a.id, label: a.name, description: `${a.tag} · ${space.get(a.spaceId)?.name}`, group: near ? 'Near this location' : 'Elsewhere' }))
  }, [assets, effSpaceId, space])

  const validate = () => {
    const e: Record<string, string> = {}
    if (title.trim().length < 6) e.title = 'Give it a short, specific title (at least 6 characters).'
    if (desc.trim().length < 15) e.desc = 'Add a few details so we can send the right person first time.'
    if (!effSpaceId) e.space = 'Where is this? Pick the floor or room.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = () => {
    if (!cat) return
    const t = createTicket({
      title: title.trim(), description: desc.trim(), categoryId: cat.id, priority: effPriority, spaceId: effSpaceId, assetId,
      requesterId: onBehalf ?? me.id, channel: isStaff ? 'phone' : 'portal', attachments: files.length ? files : undefined,
    })
    setDone(t)
  }

  /* ------------------------------------------------ success */
  if (done) {
    const pol = policyFor(done.priority)
    return (
      <div className="mx-auto max-w-xl py-6 sm:py-12">
        <Card>
          <CardBody className="space-y-6 p-6 text-center sm:p-8">
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-success-soft text-success"><CheckCircle2 className="size-7" /></span>
            <div className="space-y-1.5">
              <h1 className="text-[22px] font-semibold tracking-[-0.025em]">We have your {done.kind === 'incident' ? 'report' : 'request'}</h1>
              <p className="text-[14px] text-fg-muted"><span className="tnum font-semibold text-fg">{done.number}</span> · {done.title}</p>
            </div>
            <ol className="space-y-3 rounded-xl bg-surface-sunken p-4 text-left text-[13.5px]">
              <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>Sent to <strong>{useStore.getState().teams.find((t) => t.id === done.teamId)?.name}</strong>.</span></li>
              <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>You will hear from us within <strong>{fmtDuration(pol.responseMin * 60_000)}{pol.calendar === 'business' ? ' of working time' : ''}</strong>.</span></li>
              <li className="flex gap-3"><Check className="mt-0.5 size-4 shrink-0 text-success" /><span>We will notify you on every update — no need to chase.</span></li>
            </ol>
            <div className="flex flex-col-reverse justify-center gap-2 sm:flex-row">
              <Button variant="secondary" onClick={() => nav(isStaff ? '/tickets' : '/requests')}>{isStaff ? 'Back to queue' : 'All my requests'}</Button>
              <Button variant="primary" onClick={() => nav(`/tickets/${done.id}`)}>View {done.number} <ArrowRight /></Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  const steps = ['What is it about?', 'Details', 'Review']

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={isStaff ? 'New ticket' : 'New request'}
        description={isStaff ? 'Log a ticket on behalf of someone, or from a call or walk-in.' : 'Tell us what is happening — we will route it to the right team.'}
      />
      <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn('grid size-6 shrink-0 place-items-center rounded-full text-[11.5px] font-bold', i < step ? 'bg-primary text-primary-fg' : i === step ? 'bg-primary-soft text-primary-soft-fg ring-2 ring-primary' : 'bg-neutral-soft text-fg-subtle')}>{i < step ? <Check className="size-3.5" /> : i + 1}</span>
            <span className={cn('hidden truncate text-[13px] sm:block', i === step ? 'font-semibold text-fg' : 'text-fg-muted')}>{s}</span>
            {i < 2 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[14px] font-medium">Choose the closest match</p>
            <Segmented value={kind} onChange={setKind} options={[{ value: 'all', label: 'Everything' }, { value: 'incident', label: 'Something is wrong' }, { value: 'request', label: 'I need something' }]} />
          </div>
          {domains.map((d) => {
            const list = visibleCats.filter((c) => c.domain === d.id)
            if (!list.length) return null
            return (
              <section key={d.id} aria-labelledby={`dom-${d.id}`}>
                <h2 id={`dom-${d.id}`} className="mb-2.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">{d.label}</h2>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {list.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => { setCategoryId(c.id); setPriority(undefined); setStep(1) }}
                      className={cn('group flex items-start gap-3 rounded-xl border bg-surface p-3.5 text-left shadow-card transition-all hover:border-primary/50 hover:shadow-pop', categoryId === c.id ? 'border-primary ring-2 ring-primary/20' : 'border-border')}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-soft-fg [&_svg]:size-[18px]"><Icon name={c.icon} /></span>
                      <span className="min-w-0 flex-1"><span className="block text-[14px] font-semibold">{c.name}</span><span className="block text-[12.5px] leading-snug text-fg-muted">{c.description}</span></span>
                      <ArrowRight className="mt-1 size-4 shrink-0 text-fg-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {step === 1 && cat && (
        <Card>
          <CardBody className="space-y-5 p-5 sm:p-6">
            <button onClick={() => setStep(0)} className="inline-flex items-center gap-2 rounded-lg bg-primary-soft px-2.5 py-1.5 text-[13px] font-medium text-primary-soft-fg hover:brightness-95">
              <Icon name={cat.icon} className="size-4" /> {cat.name} <span className="text-[11.5px] opacity-70">· change</span>
            </button>

            {isStaff && (
              <Field label="Requester" help="Who is this for? Notifications go to them.">
                <Select value={onBehalf ?? me.id} onChange={setOnBehalf} searchable options={users.filter((u) => u.role === 'requester').map((u) => ({ value: u.id, label: u.name, description: u.title }))} />
              </Field>
            )}

            <Field label="Title" required error={errors.title} hint={`${title.length}/90`}>
              <Input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 90))} placeholder={cat.kind === 'incident' ? 'e.g. Water dripping from ceiling in the pantry' : 'e.g. Laptop and accounts for a new joiner on 3 June'} invalid={!!errors.title} autoFocus />
            </Field>

            {deflect.length > 0 && (
              <aside className="rounded-xl border border-info/30 bg-info-soft/60 p-3.5" aria-label="Suggested articles">
                <p className="mb-2 flex items-center gap-2 text-[12.5px] font-semibold text-info-soft-fg"><BookOpen className="size-4" /> This might already be answered</p>
                <ul className="space-y-1.5">
                  {deflect.map((a) => (
                    <li key={a.id}><Link to={`/help/${a.id}`} target="_blank" className="text-[13.5px] text-fg underline-offset-2 hover:underline">{a.title}</Link></li>
                  ))}
                </ul>
              </aside>
            )}

            <Field label="What is happening?" required error={errors.desc} help="What you see, since when, and who is affected.">
              <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={5} placeholder="Describe the problem. Include anything you have already tried." invalid={!!errors.desc} />
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Location" required error={errors.space}>
                <Select value={effSpaceId} onChange={setSpaceId} options={spaceOptions} searchable placeholder="Floor or room…" invalid={!!errors.space} />
              </Field>
              <Field label="Equipment" hint="optional" help="Scan the QR sticker on equipment to fill this automatically.">
                <Select value={assetId} onChange={setAssetId} options={assetOptions} searchable clearable onClear={() => setAssetId(undefined)} placeholder="Choose if it relates to something specific" />
              </Field>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-[12.5px] font-medium text-fg-muted">How much does this affect you?{isStaff ? '' : ' We will confirm the final priority.'}</legend>
              <div className="grid gap-2">
                {IMPACT.map((o) => {
                  const on = effPriority === o.priority
                  return (
                    <label key={o.priority} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors', on ? 'border-primary bg-primary-soft/50' : 'border-border hover:border-border-strong')}>
                      <input type="radio" name="impact" checked={on} onChange={() => setPriority(o.priority)} className="mt-1 size-4 accent-[hsl(var(--primary))]" />
                      <span className="min-w-0 flex-1"><span className="block text-[13.5px] font-medium">{o.title}</span><span className="block text-[12px] text-fg-muted">{o.hint}</span></span>
                      <Badge tone={PRIORITY[o.priority].tone} size="sm">{PRIORITY[o.priority].label}</Badge>
                    </label>
                  )
                })}
              </div>
              {effPriority === 'p1' && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-[12.5px] text-danger-soft-fg">If someone is in danger right now, call Security on <strong>ext. 100</strong> first — then submit this so we can coordinate.</p>}
            </fieldset>

            <div className="space-y-2">
              <p className="text-[12.5px] font-medium text-fg-muted">Photos or files <span className="font-normal text-fg-subtle">· optional</span></p>
              <input ref={fileRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => { const n = Array.from(e.target.files ?? []).map((f) => f.name); setFiles((f) => [...f, ...n]); e.target.value = '' }} />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}><ImagePlus /> Add photo</Button>
                {files.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 rounded-md bg-neutral-soft px-2 py-1 text-[12px]"><Paperclip className="size-3" />{f}<button aria-label={`Remove ${f}`} onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}><X className="size-3" /></button></span>
                ))}
              </div>
            </div>
          </CardBody>
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
            <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft /> Back</Button>
            <Button variant="primary" onClick={() => validate() && setStep(2)}>Review <ArrowRight /></Button>
          </div>
        </Card>
      )}

      {step === 2 && cat && (
        <Card>
          <CardBody className="space-y-5 p-5 sm:p-6">
            <h2 className="text-[16px] font-semibold">Check and send</h2>
            <dl className="divide-y divide-border rounded-xl border border-border text-[13.5px]">
              {[
                ['Category', <span key="c" className="inline-flex items-center gap-2"><Icon name={cat.icon} className="size-4 text-primary" />{cat.name}</span>],
                ['Title', title],
                ['Details', <span key="d" className="whitespace-pre-wrap">{desc}</span>],
                ['Location', effSpaceId ? `${space.get(effSpaceId)?.name} · ${building.get(space.get(effSpaceId)!.buildingId)?.code}` : '—'],
                ['Equipment', assetId ? assets.find((a) => a.id === assetId)?.name : '—'],
                ['Priority', <Badge key="p" tone={PRIORITY[effPriority].tone} dot>{PRIORITY[effPriority].label}</Badge>],
                ...(isStaff ? [['Requester', user.get(onBehalf ?? me.id)?.name] as [string, React.ReactNode]] : []),
                ['Files', files.length ? files.join(', ') : 'None'],
              ].map(([k, v]) => (
                <div key={k as string} className="grid grid-cols-1 gap-1 px-4 py-2.5 sm:grid-cols-[130px_1fr] sm:gap-4"><dt className="text-fg-muted">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>
              ))}
            </dl>
          </CardBody>
          <div className="flex items-center justify-between gap-3 border-t border-border bg-surface-sunken/60 px-5 py-3.5">
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft /> Edit</Button>
            <Button variant="primary" size="lg" onClick={submit}>Submit {cat.kind === 'incident' ? 'report' : 'request'}</Button>
          </div>
        </Card>
      )}
    </div>
  )
}
