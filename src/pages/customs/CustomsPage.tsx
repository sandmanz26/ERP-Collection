import { FileCheck2, Landmark, ShieldAlert, Stamp } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { CUSTOMS_CHANNELS } from '@/data/reference'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge, type BadgeTone } from '@/components/ui/badge'
import { CustomsTable } from './CustomsTable'
import { filingReadiness, lartasHits } from '@/lib/analytics2'
import { fmtPercent } from '@/lib/format'

export function CustomsPage() {
  const { filings, projects, settings } = useErp()

  const pending = filings.filter((f) => f.status === 'DRAFT' || f.status === 'SUBMITTED' || f.status === 'UNDER_REVIEW')
  const blocked = filings.filter((f) => f.status === 'DRAFT' && !filingReadiness(f).canSubmit)
  const inspected = filings.filter((f) => f.channel === 'MERAH')
  const green = filings.filter((f) => f.channel === 'HIJAU')
  const withChannel = filings.filter((f) => f.channel !== 'PENDING')
  const greenRate = withChannel.length ? (green.length / withChannel.length) * 100 : 0

  const lartasJobs = projects.filter(
    (p) => p.status !== 'COMPLETED' && p.status !== 'CANCELLED' && lartasHits(p.hsCodes, settings.restrictedHsPrefixes).length > 0,
  )

  const byChannel = CUSTOMS_CHANNELS.map((c) => ({
    ...c,
    count: filings.filter((f) => f.channel === c.value).length,
  }))
  const channelMax = Math.max(...byChannel.map((c) => c.count), 1)

  return (
    <>
      <PageHeader
        title="Customs & Compliance"
        description="Every declaration, its supporting-document uploads and the lane Bea Cukai put it in. Since KEP-163/BC/2026 a PEB cannot be submitted until its mandatory documents are uploaded through CEISA 4.0 — and the exporter stays responsible for the data even when a PPJK files it."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Filings" value={filings.length} icon={<Stamp />} accent="primary" sub={`${pending.length} still in progress`} />
        <KpiCard label="Blocked on uploads" value={blocked.length} icon={<FileCheck2 />} accent={blocked.length ? 'danger' : 'success'} sub={blocked.length ? 'Missing a mandatory upload' : 'Every draft is ready to submit'} />
        <KpiCard label="Green lane rate" value={fmtPercent(greenRate, 0)} icon={<Landmark />} accent={greenRate >= 70 ? 'success' : 'warning'} sub={`${green.length} green of ${withChannel.length} answered · ${inspected.length} red`} />
        <KpiCard label="Restricted commodities" value={lartasJobs.length} icon={<ShieldAlert />} accent={lartasJobs.length ? 'warning' : 'success'} sub="Live jobs carrying LARTAS goods" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Response lanes" description="Where declarations land. Red means a physical inspection and three to five days of exposure." />
          <CardBody className="space-y-2.5">
            {byChannel.map((c) => (
              <div key={c.value} className="flex items-center gap-3">
                <span className="w-[140px] shrink-0">
                  <Badge tone={c.tone as BadgeTone} size="sm" dot>{c.label}</Badge>
                </span>
                <span className="relative h-5 flex-1 overflow-hidden rounded-md bg-surface-sunken">
                  <span
                    className={`absolute inset-y-0 left-0 rounded-md ${c.value === 'HIJAU' ? 'bg-success/80' : c.value === 'KUNING' ? 'bg-warning/80' : c.value === 'MERAH' ? 'bg-danger/80' : 'bg-neutral-soft'}`}
                    style={{ width: `${(c.count / channelMax) * 100}%` }}
                  />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[12px] text-fg-muted">{c.count}</span>
              </div>
            ))}
            <p className="pt-1 text-[11.5px] leading-relaxed text-fg-muted">
              A green-lane rate that drops is usually a data-quality problem on our side, not bad luck: mismatched weights,
              a value that disagrees with the invoice, or a late supporting upload.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="LARTAS exposure" description="Jobs whose HS codes fall under Indonesian export restriction and need a permit." />
          <CardBody className="space-y-2">
            {lartasJobs.length === 0 && <p className="py-6 text-center text-[12.5px] text-fg-subtle">No restricted commodities in the current book.</p>}
            {lartasJobs.map((p) => {
              const hits = lartasHits(p.hsCodes, settings.restrictedHsPrefixes)
              const filing = filings.find((f) => f.projectId === p.id && f.type === 'PEB')
              const hasPermit = filing?.supportingDocs.some((d) => d.type === 'EXPORT_PERMIT' && d.uploaded)
              return (
                <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-sunken px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-fg">
                      <span className="mr-1.5 font-mono text-[11px] text-fg-muted">{p.code}</span>
                      {p.commodity}
                    </p>
                    <p className="truncate font-mono text-[11px] text-fg-muted">HS {hits.join(', ')}</p>
                  </div>
                  <Badge tone={hasPermit ? 'success' : 'warning'} size="sm">
                    {hasPermit ? 'Permit on file' : 'Permit missing'}
                  </Badge>
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      <CustomsTable />
    </>
  )
}
