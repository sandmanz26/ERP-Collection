import * as React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Building2, ClipboardList, Mail, MapPin, Pencil, Phone, Plus, Receipt, Users,
} from 'lucide-react'
import { useErp } from '@/store/useErp'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { FulfilmentBar } from '@/components/shared/FulfilmentBar'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Separator } from '@/components/ui/misc'
import { buildingTypeLabel, operatingHoursLabel } from '@/data/reference'
import { fmtCurrency, fmtDate, fmtNumber } from '@/lib/format'
import { contractValue, fulfilment, isLiveProject, isStaffedProject, monthlyMargin, monthlyValue, periodState } from '@/lib/domain'
import { ClientForm } from './ClientForm'
import { BuildingForm } from './BuildingForm'
import { useCan } from '@/lib/access'

export function ClientDetailPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const { clients, buildings, projects } = useErp()
  const can = useCan()
  const [tab, setTab] = React.useState<'overview' | 'buildings' | 'projects'>('overview')
  const [editOpen, setEditOpen] = React.useState(false)
  const [buildingOpen, setBuildingOpen] = React.useState(false)

  const client = clients.find((c) => c.id === id)

  if (!client) {
    return (
      <EmptyState
        icon={<Users />}
        title="This client is no longer in the register"
        description="It may have been deleted. Open the client list to find another."
        action={
          <Button variant="primary" size="sm" onClick={() => nav('/clients')}>
            Back to clients
          </Button>
        }
      />
    )
  }

  const clientBuildings = buildings.filter((b) => b.clientId === client.id)
  const clientProjects = projects.filter((p) => p.clientId === client.id)
  const live = clientProjects.filter(isLiveProject)
  const totals = clientProjects.filter(isStaffedProject).reduce(
    (acc, p) => {
      const f = fulfilment(p)
      return { required: acc.required + f.required, deployed: acc.deployed + f.deployed, monthly: acc.monthly + monthlyValue(p) }
    },
    { required: 0, deployed: 0, monthly: 0 },
  )
  const margin = live.reduce((a, p) => a + monthlyMargin(p).margin, 0)

  return (
    <>
      <PageHeader
        eyebrow={
          <Link to="/clients" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-fg-muted hover:text-fg">
            <ArrowLeft className="size-3.5" /> Clients
          </Link>
        }
        title={client.brandName || client.legalName}
        description={`${client.legalName} · ${client.industry}`}
        meta={
          <>
            <StatusBadge value={client.status} />
            <StatusBadge value={client.tier} />
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-fg-muted">
              <MapPin className="size-3.5" /> {client.city}, {client.province}
            </span>
            <span className="font-mono text-[12px] text-fg-subtle">{client.code}</span>
            <span className="text-[12.5px] text-fg-muted">Client since {fmtDate(client.clientSince)}</span>
          </>
        }
        actions={
          <>
            {can('buildings.create') && (
              <Button variant="secondary" onClick={() => setBuildingOpen(true)}>
                <Plus /> Add building
              </Button>
            )}
            {can('clients.edit') && (
              <Button variant="primary" onClick={() => setEditOpen(true)}>
                <Pencil /> Edit client
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Buildings" value={clientBuildings.length} icon={<Building2 />} accent="primary" sub={`${clientProjects.length} projects signed`} />
        <KpiCard
          label="Fulfilment"
          value={totals.required ? `${Math.round((totals.deployed / totals.required) * 100)}%` : '—'}
          icon={<Users />}
          accent={totals.deployed >= totals.required ? 'success' : 'warning'}
          sub={`${totals.deployed} of ${totals.required} posts filled`}
        />
        <KpiCard label="Monthly value" value={fmtCurrency(totals.monthly, 'IDR', { compact: true })} icon={<Receipt />} accent="accent" sub={`Net ${client.paymentTermDays} · invoice day ${client.invoiceDay}`} />
        <KpiCard
          label="Monthly margin"
          value={fmtCurrency(margin, 'IDR', { compact: true })}
          icon={<Receipt />}
          accent="purple"
          sub={totals.monthly ? `${Math.round((margin / totals.monthly) * 100)}% of billed value` : 'No running contract'}
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'buildings', label: 'Buildings', count: clientBuildings.length },
          { value: 'projects', label: 'Projects', count: clientProjects.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader title="Company" icon={<Building2 />} />
            <CardBody className="divide-y divide-border py-1">
              <MetaRow label="Legal name">{client.legalName}</MetaRow>
              <MetaRow label="NPWP">
                <span className="font-mono">{client.npwp || '—'}</span>
              </MetaRow>
              <MetaRow label="Industry">{client.industry}</MetaRow>
              <MetaRow label="Address">
                <span className="block max-w-[220px] text-right">{client.address || '—'}</span>
              </MetaRow>
              <MetaRow label="City">{client.city}, {client.province}</MetaRow>
              <MetaRow label="Phone">{client.phone || '—'}</MetaRow>
              <MetaRow label="Email">{client.email || '—'}</MetaRow>
              <MetaRow label="Account manager">{client.accountManager}</MetaRow>
            </CardBody>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader title="Commercial terms" icon={<Receipt />} description="Defaults inherited by every new project." />
            <CardBody className="divide-y divide-border py-1">
              <MetaRow label="Payment term">Net {client.paymentTermDays} days</MetaRow>
              <MetaRow label="Invoice day">Day {client.invoiceDay} of the month</MetaRow>
              <MetaRow label="Credit limit">{fmtCurrency(client.creditLimit, 'IDR', { compact: true })}</MetaRow>
              <MetaRow label="PPN">{client.ppnApplicable ? 'Applies' : 'Not applied'}</MetaRow>
              <MetaRow label="PPh 23">{client.pph23Withheld ? 'Withheld by client' : 'Not withheld'}</MetaRow>
              <MetaRow label="Contracted value">
                {fmtCurrency(live.reduce((a, p) => a + contractValue(p), 0), 'IDR', { compact: true })}
              </MetaRow>
            </CardBody>
          </Card>

          <Card className="lg:col-span-1">
            <CardHeader
              title="Contacts"
              icon={<Users />}
              description={client.contacts.length ? undefined : 'No contact recorded yet.'}
            />
            <CardBody className="space-y-3">
              {client.contacts.map((contact) => (
                <div key={contact.id} className="rounded-lg border border-border bg-surface-sunken px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-fg">{contact.name}</p>
                    {contact.isPrimary && <Badge tone="primary" size="sm">Primary</Badge>}
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-fg-muted">{contact.position}</p>
                  <div className="mt-2 space-y-1">
                    {contact.email && (
                      <p className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
                        <Mail className="size-3" /> {contact.email}
                      </p>
                    )}
                    {contact.phone && (
                      <p className="flex items-center gap-1.5 text-[11.5px] text-fg-muted">
                        <Phone className="size-3" /> {contact.phone}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {client.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Notes</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-muted">{client.notes}</p>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'buildings' && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clientBuildings.length === 0 && (
            <Card className="md:col-span-2 xl:col-span-3">
              <EmptyState
                icon={<Building2 />}
                title="No buildings yet"
                description="A project needs a building. Add the first site this client operates."
                action={
                  can('buildings.create') ? (
                    <Button variant="primary" size="sm" onClick={() => setBuildingOpen(true)}>
                      <Plus /> Add building
                    </Button>
                  ) : undefined
                }
              />
            </Card>
          )}
          {clientBuildings.map((b) => {
            const project = projects.find((p) => p.buildingId === b.id && isLiveProject(p))
            return (
              <Card key={b.id}>
                <CardHeader
                  title={b.name}
                  description={`${buildingTypeLabel(b.type)} · ${b.city}`}
                  icon={<Building2 />}
                  actions={<StatusBadge value={b.status} size="sm" />}
                />
                <CardBody className="space-y-2.5">
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-fg-muted">
                    <span className="tnum">{fmtNumber(b.areaSqm)} m²</span>
                    <span className="tnum">{b.floors} floors</span>
                    <span>{operatingHoursLabel(b.operatingHours)}</span>
                  </div>
                  <Separator />
                  {project ? (
                    <div>
                      <Link to={`/projects/${project.id}`} className="text-[12.5px] font-medium text-primary hover:underline">
                        {project.code} — {project.name}
                      </Link>
                      <div className="mt-2 flex items-center gap-3">
                        <FulfilmentBar deployed={fulfilment(project).deployed} required={fulfilment(project).required} width="w-full" />
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-fg-subtle">No running project on this building.</p>
                  )}
                  <p className="text-[11.5px] text-fg-subtle">
                    Site contact: {b.picName} · {b.picPhone}
                  </p>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'projects' && (
        <Card>
          <CardHeader title="Projects" icon={<ClipboardList />} description="One row per contract; each serves exactly one building." />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Code', 'Project', 'Building', 'Period', 'Status', 'Fulfilment', 'Monthly value'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientProjects.map((p) => {
                  const f = fulfilment(p)
                  const building = buildings.find((b) => b.id === p.buildingId)
                  return (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-bg-muted/70" onClick={() => nav(`/projects/${p.id}`)}>
                      <td className="border-b border-border px-3 py-2.5 font-mono text-[12px] text-fg-muted">{p.code}</td>
                      <td className="border-b border-border px-3 py-2.5 font-medium text-fg">{p.name}</td>
                      <td className="border-b border-border px-3 py-2.5 text-fg-muted">{building?.name ?? '—'}</td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-[12px] text-fg-muted">
                        {fmtDate(p.periodStart, 'short')} – {fmtDate(p.periodEnd)}
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge value={p.status} size="sm" />
                          {isLiveProject(p) && periodState(p) === 'ENDING_SOON' && <StatusBadge value="ENDING_SOON" size="sm" />}
                        </div>
                      </td>
                      <td className="border-b border-border px-3 py-2.5">
                        <FulfilmentBar deployed={f.deployed} required={f.required} width="w-[118px]" />
                      </td>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-right font-medium text-fg">
                        {fmtCurrency(monthlyValue(p), 'IDR', { compact: true })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {clientProjects.length === 0 && (
            <EmptyState icon={<ClipboardList />} title="No projects yet" description="Create a project against one of this client's buildings." />
          )}
        </Card>
      )}

      <ClientForm open={editOpen} onOpenChange={setEditOpen} initial={client} />
      <BuildingForm open={buildingOpen} onOpenChange={setBuildingOpen} defaultClientId={client.id} />
    </>
  )
}
