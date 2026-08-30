import { Container as ContainerIcon, FileStack, Receipt, ShieldAlert, TrendingUp, Boxes, FileCheck2, CircleDollarSign } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { ContainersTable } from '@/pages/projects/tabs/ContainersTable'
import { DocumentsTable } from '@/pages/projects/tabs/DocumentsTable'
import { ChargesTable } from '@/pages/projects/tabs/ChargesTable'
import { itemCbm, itemGrossKg, utilisation } from '@/lib/shipping'
import { jobFinancials } from '@/lib/analytics'
import { fmtCurrency, fmtNumber, fmtPercent } from '@/lib/format'

export function ContainersPage() {
  const { containers } = useErp()
  const cbm = containers.reduce((a, c) => a + c.items.reduce((s, i) => s + itemCbm(i), 0), 0)
  const kg = containers.reduce((a, c) => a + c.items.reduce((s, i) => s + itemGrossKg(i), 0), 0)
  const overloaded = containers.filter((c) => utilisation(c.type, c.items, c.tareKg).status === 'OVERLOADED')
  const noVgm = containers.filter((c) => c.type !== 'LCL' && !c.vgmSubmittedAt)
  const teu = containers.reduce((a, c) => a + (c.type.startsWith('40') || c.type.startsWith('45') ? 2 : c.type === 'LCL' ? 0 : 1), 0)

  return (
    <>
      <PageHeader
        title="Containers"
        description="Every unit across every job, with live volume and payload checks. This is where a planner finds the boxes that are over the limit, half empty, or still missing a verified gross mass."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Units" value={containers.length} icon={<ContainerIcon />} accent="primary" sub={`${teu} TEU equivalent`} />
        <KpiCard label="Volume planned" value={`${fmtNumber(cbm, 1)} m³`} icon={<Boxes />} accent="accent" sub={`${fmtNumber(kg / 1000, 1)} tonnes gross`} />
        <KpiCard label="Over capacity" value={overloaded.length} icon={<ShieldAlert />} accent={overloaded.length ? 'danger' : 'success'} sub={overloaded.length ? 'Terminal will refuse the gate-in' : 'All within specification'} />
        <KpiCard label="VGM outstanding" value={noVgm.length} icon={<FileCheck2 />} accent={noVgm.length ? 'warning' : 'success'} sub="SOLAS blocks loading without it" />
      </div>
      <ContainersTable />
    </>
  )
}

export function DocumentsPage() {
  const { documents } = useErp()
  const mandatory = documents.filter((d) => d.mandatory)
  const outstanding = mandatory.filter((d) => ['REQUIRED', 'DRAFT', 'PENDING_REVIEW'].includes(d.status))
  const rejected = documents.filter((d) => d.status === 'REJECTED')
  const pct = mandatory.length ? ((mandatory.length - outstanding.length) / mandatory.length) * 100 : 100

  return (
    <>
      <PageHeader
        title="Documents"
        description="The document register for every job. Mandatory documents gate their stage, destination rules add their own requirements, and anything rejected surfaces here before customs finds it."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Documents" value={documents.length} icon={<FileStack />} accent="primary" sub={`${mandatory.length} mandatory`} />
        <KpiCard label="Completeness" value={fmtPercent(pct, 0)} icon={<FileCheck2 />} accent={pct === 100 ? 'success' : 'warning'} sub="Mandatory documents approved" />
        <KpiCard label="Outstanding" value={outstanding.length} icon={<ShieldAlert />} accent={outstanding.length ? 'warning' : 'success'} sub="Blocking their stage" />
        <KpiCard label="Rejected" value={rejected.length} icon={<ShieldAlert />} accent={rejected.length ? 'danger' : 'success'} sub={rejected.length ? 'Re-issue required' : 'None rejected'} />
      </div>
      <DocumentsTable />
    </>
  )
}

export function ChargesPage() {
  const { charges } = useErp()
  const fin = jobFinancials(charges)

  return (
    <>
      <PageHeader
        title="Charges"
        description="Every buy and sell line across the book. Margin is computed per line so an unbudgeted demurrage or a rate that slipped below cost is visible before the invoice goes out."
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Revenue" value={fmtCurrency(fin.revenue, 'IDR', { compact: true })} icon={<Receipt />} accent="primary" sub={`${charges.length} charge lines`} />
        <KpiCard label="Cost" value={fmtCurrency(fin.cost, 'IDR', { compact: true })} icon={<CircleDollarSign />} accent="accent" sub="Vendor side" />
        <KpiCard label="Gross margin" value={fmtCurrency(fin.margin, 'IDR', { compact: true })} icon={<TrendingUp />} accent={fin.marginPct >= 20 ? 'success' : 'warning'} sub={fmtPercent(fin.marginPct)} />
        <KpiCard label="Disputed" value={fmtCurrency(fin.disputed, 'IDR', { compact: true })} icon={<ShieldAlert />} accent={fin.disputed ? 'danger' : 'success'} sub={fin.disputed ? 'Ageing into write-offs' : 'Nothing in dispute'} />
      </div>
      <ChargesTable />
    </>
  )
}
