import * as React from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, BookOpen, Eye, Plus, Search, ThumbsDown, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { Select } from '@/components/ui/select'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shared/PageHeader'
import { Icon } from '@/components/shared/icons'
import { useLookups } from '@/hooks/useLookups'
import { useMe, useStore } from '@/store/useStore'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { KbArticle } from '@/data/types'

export function HelpPage() {
  const me = useMe()!
  const staff = me.role !== 'requester'
  const [sp, setSp] = useSearchParams()
  const kb = useStore((s) => s.kb)
  const categories = useStore((s) => s.categories)
  const save = useStore((s) => s.saveKb)
  const toast = useToast()
  const { category } = useLookups()
  const q = sp.get('q') ?? ''
  const cat = sp.get('cat') ?? undefined
  const [edit, setEdit] = React.useState(false)
  const [draft, setDraft] = React.useState({ title: '', summary: '', body: '', categoryId: 'c_it_sw', audience: 'everyone' as KbArticle['audience'] })

  const visible = kb.filter((a) => staff || a.audience === 'everyone')
  const list = visible.filter((a) => (!cat || a.categoryId === cat) && (!q || `${a.title} ${a.summary} ${a.body.join(' ')}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => b.views - a.views)
  const used = categories.filter((c) => visible.some((a) => a.categoryId === c.id))
  const set = (k: string, v?: string) => { const n = new URLSearchParams(sp); v ? n.set(k, v) : n.delete(k); setSp(n, { replace: true }) }

  return (
    <div className="space-y-5">
      <PageHeader title={staff ? 'Knowledge base' : 'Help articles'} description="Short, step-by-step answers. Most things can be fixed here in under two minutes." actions={staff && <Button variant="primary" onClick={() => setEdit(true)}><Plus /> New article</Button>} />
      <div className="max-w-xl"><Input leading={<Search className="size-4 text-fg-subtle" />} value={q} onChange={(e) => set('q', e.target.value || undefined)} placeholder="Search articles…" aria-label="Search articles" className="h-11" /></div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by topic">
        <button onClick={() => set('cat')} aria-pressed={!cat} className={cn('h-8 rounded-full border px-3 text-[12.5px] font-medium', !cat ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong')}>All topics</button>
        {used.map((c) => <button key={c.id} onClick={() => set('cat', c.id)} aria-pressed={cat === c.id} className={cn('inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium', cat === c.id ? 'border-primary bg-primary-soft text-primary-soft-fg' : 'border-border bg-surface text-fg-muted hover:border-border-strong')}><Icon name={c.icon} className="size-3.5" />{c.name}</button>)}
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon={<BookOpen />} title="No articles found" description="Not finding it? Raise a request and we will help — and may write the answer up for the next person." action={<Button variant="primary" asChild><Link to={`/new?title=${encodeURIComponent(q)}`}>Raise a request</Link></Button>} /></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <Link key={a.id} to={`/help/${a.id}`} className="group flex flex-col rounded-xl border border-border bg-surface p-4 shadow-card transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-pop">
              <div className="mb-2 flex items-center gap-2 text-[12px] text-fg-subtle"><Icon name={category.get(a.categoryId)?.icon ?? ''} className="size-3.5" />{category.get(a.categoryId)?.name}{a.audience === 'staff' && <Badge tone="purple" size="sm">Staff only</Badge>}</div>
              <h3 className="text-[14.5px] font-semibold leading-snug group-hover:text-primary">{a.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-fg-muted">{a.summary}</p>
              <div className="mt-3 flex items-center gap-3 text-[12px] text-fg-subtle"><span className="inline-flex items-center gap-1"><Eye className="size-3.5" />{a.views.toLocaleString()}</span><span className="inline-flex items-center gap-1"><ThumbsUp className="size-3.5" />{Math.round((a.helpful / Math.max(1, a.helpful + a.notHelpful)) * 100)}%</span><span className="ml-auto">Updated {fmtDate(a.updatedAt)}</span></div>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={edit} onOpenChange={setEdit}>
        <DialogContent size="lg" title="New article" description="Use “## ” for a heading and “- ” for bullets. Blank lines separate paragraphs." footer={<><Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button><Button variant="primary" disabled={draft.title.trim().length < 5 || draft.body.trim().length < 20} onClick={() => { save({ title: draft.title.trim(), summary: draft.summary.trim() || draft.title.trim(), categoryId: draft.categoryId, audience: draft.audience, body: draft.body.split(/\n+/).filter(Boolean) }); setEdit(false); setDraft({ ...draft, title: '', summary: '', body: '' }); toast.push({ tone: 'success', title: 'Article published' }) }}>Publish</Button></>}>
          <div className="space-y-4 p-5">
            <Field label="Title" required><Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus /></Field>
            <Field label="One-line summary"><Input value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Topic"><Select value={draft.categoryId} onChange={(v) => setDraft({ ...draft, categoryId: v })} searchable options={categories.map((c) => ({ value: c.id, label: c.name }))} /></Field>
              <Field label="Audience"><Select value={draft.audience} onChange={(v) => setDraft({ ...draft, audience: v })} options={[{ value: 'everyone', label: 'Everyone' }, { value: 'staff', label: 'Staff only' }]} /></Field>
            </div>
            <Field label="Body" required><Textarea rows={9} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} /></Field>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function inline(s: string) {
  const parts = s.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return parts.map((p, i) => p.startsWith('**') ? <strong key={i} className="font-semibold text-fg">{p.slice(2, -2)}</strong> : p.startsWith('`') ? <code key={i} className="rounded bg-neutral-soft px-1.5 py-0.5 font-mono text-[12.5px]">{p.slice(1, -1)}</code> : p.startsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : p)
}

export function ArticlePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const a = useStore((s) => s.kb.find((x) => x.id === id))
  const vote = useStore((s) => s.kbVote)
  const view = useStore((s) => s.kbView)
  const kb = useStore((s) => s.kb)
  const { category, user } = useLookups()
  const [voted, setVoted] = React.useState<boolean | null>(null)
  React.useEffect(() => { if (id) view(id) }, [id, view])
  if (!a) return <EmptyState icon={<BookOpen />} title="Article not found" action={<Button variant="secondary" onClick={() => nav('/help')}><ArrowLeft /> Back to help</Button>} className="py-24" />
  const related = kb.filter((x) => x.id !== a.id && x.categoryId === a.categoryId && x.audience === 'everyone').slice(0, 3)
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []
  const flush = () => { if (bullets.length) { blocks.push(<ul key={`u${blocks.length}`} className="list-disc space-y-1.5 pl-5 marker:text-primary">{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>); bullets = [] } }
  a.body.forEach((line, i) => {
    if (line.startsWith('- ')) return bullets.push(line.slice(2))
    flush()
    blocks.push(line.startsWith('## ') ? <h2 key={i} className="pt-3 text-[17px] font-semibold tracking-[-0.01em]">{line.slice(3)}</h2> : <p key={i}>{inline(line)}</p>)
  })
  flush()
  const cat = category.get(a.categoryId)
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/help" className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg"><ArrowLeft className="size-4" /> All articles</Link>
      <header className="space-y-3">
        <div className="flex items-center gap-2 text-[12.5px] text-fg-muted"><Icon name={cat?.icon ?? ''} className="size-4 text-primary" />{cat?.name}{a.audience === 'staff' && <Badge tone="purple" size="sm">Staff only</Badge>}</div>
        <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em]">{a.title}</h1>
        <p className="text-[15px] text-fg-muted">{a.summary}</p>
        <p className="text-[12px] text-fg-subtle">Updated {fmtDate(a.updatedAt)} · by {user.get(a.authorId)?.name} · {a.views.toLocaleString()} views</p>
      </header>
      <Card><CardBody className="space-y-3.5 p-6 text-[14.5px] leading-[1.7] text-fg-muted">{blocks}</CardBody></Card>
      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          {voted === null ? <><p className="text-[14px] font-medium">Did this solve it?</p><div className="flex gap-2"><Button variant="secondary" onClick={() => { vote(a.id, true); setVoted(true) }}><ThumbsUp /> Yes</Button><Button variant="secondary" onClick={() => { vote(a.id, false); setVoted(false) }}><ThumbsDown /> No</Button></div></> : voted ? <p className="text-[14px] font-medium text-success">Great — thanks for the feedback.</p> : <><p className="text-[14px]">Sorry about that. Let us help directly.</p><Button variant="primary" asChild><Link to={`/new?title=${encodeURIComponent(a.title)}&category=${a.categoryId}`}>Raise a request</Link></Button></>}
        </CardBody>
      </Card>
      {related.length > 0 && <section><h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Related</h2><div className="grid grid-cols-1 gap-2 sm:grid-cols-3">{related.map((r) => <Link key={r.id} to={`/help/${r.id}`} className="rounded-xl border border-border bg-surface p-3 text-[13.5px] font-medium shadow-card hover:border-primary/40">{r.title}</Link>)}</div></section>}
    </div>
  )
}
