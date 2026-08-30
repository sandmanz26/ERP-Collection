import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Anchor, ExternalLink, Globe2, Landmark, Users } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { COUNTRIES, countryFlag } from '@/data/reference'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { titleCase } from '@/lib/format'
import type { CountryOffice, Customer } from '@/data/types'

type Row = CountryOffice & { customer: Customer }

export function OfficesPage() {
  const nav = useNavigate()
  const toast = useToast()
  const { customers, upsertCustomer } = useErp()
  const [countryFilter, setCountryFilter] = React.useState<string[]>([])
  const [roleFilter, setRoleFilter] = React.useState<string[]>([])
  const [regionFilter, setRegionFilter] = React.useState<string[]>([])

  const rows: Row[] = customers.flatMap((c) => c.offices.map((o) => ({ ...o, customer: c })))
  const countries = new Set(rows.map((r) => r.countryCode))
  const regions = new Set(rows.map((r) => COUNTRIES.find((c) => c.code === r.countryCode)?.region).filter(Boolean))

  const columns: Column<Row>[] = [
    {
      key: 'country', header: 'Country', width: 'w-[190px]', pinned: true, sortable: true,
      sortValue: (r) => r.country, exportValue: (r) => r.country,
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="text-[16px]">{countryFlag(r.countryCode)}</span>
          <span>
            <span className="block text-[13px] font-medium text-fg">{r.country}</span>
            <span className="block text-[11px] text-fg-muted">{COUNTRIES.find((c) => c.code === r.countryCode)?.region}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'name', header: 'Office', width: 'min-w-[210px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.city}</p>
        </div>
      ),
    },
    {
      key: 'customer', header: 'Customer', width: 'min-w-[190px]', sortable: true,
      sortValue: (r) => r.customer.legalName, exportValue: (r) => r.customer.code,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] font-medium text-fg">{r.customer.tradeName || r.customer.legalName}</p>
          <p className="truncate font-mono text-[11px] text-fg-muted">{r.customer.code}</p>
        </div>
      ),
    },
    {
      key: 'roles', header: 'Roles', width: 'w-[190px]', sortable: true,
      sortValue: (r) => r.roles.join(','), exportValue: (r) => r.roles.join(' / '),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.roles.map((x) => (
            <Badge key={x} tone="outline" size="sm">{titleCase(x)}</Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'port', header: 'Default port', width: 'w-[170px]', sortable: true,
      sortValue: (r) => r.portName ?? '', exportValue: (r) => r.portCode ?? '',
      cell: (r) =>
        r.portName ? (
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-fg">
            <Anchor className="size-3.5 text-fg-subtle" />
            {r.portName}
            <span className="font-mono text-[11px] text-fg-subtle">{r.portCode}</span>
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
    },
    {
      key: 'customsId', header: 'Customs / EORI', width: 'w-[170px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.customsId ?? '', exportValue: (r) => r.customsId ?? '',
      cell: (r) => <span className="font-mono text-[11.5px] text-fg-muted">{r.customsId ?? '—'}</span>,
    },
    {
      key: 'contacts', header: 'Contacts', width: 'w-[190px]', sortable: true,
      sortValue: (r) => r.contacts.length, exportValue: (r) => r.contacts.map((c) => `${c.name} <${c.email}>`).join('; '),
      cell: (r) =>
        r.contacts.length ? (
          <div className="min-w-0">
            <p className="truncate text-[12.5px] text-fg">{r.contacts[0].name}</p>
            <p className="truncate text-[11px] text-fg-muted">
              {r.contacts[0].email}
              {r.contacts.length > 1 && ` +${r.contacts.length - 1}`}
            </p>
          </div>
        ) : (
          <span className="text-[12px] text-warning">No contact on file</span>
        ),
    },
    {
      key: 'flags', header: 'Flags', width: 'w-[150px]', sortable: false,
      exportValue: (r) => [r.isHeadquarter && 'HQ', r.isBillingOffice && 'Billing', !r.active && 'Inactive'].filter(Boolean).join(' '),
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.isHeadquarter && <Badge tone="primary" size="sm">HQ</Badge>}
          {r.isBillingOffice && <Badge tone="accent" size="sm">Billing</Badge>}
          {!r.active && <Badge tone="neutral" size="sm">Inactive</Badge>}
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title="Country Offices"
        description="Every customer office worldwide, flattened into one register. This is the view used when picking a shipper, consignee or notify party on a job — and the fastest way to spot offices missing a customs ID or a contact."
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Offices" value={rows.length} icon={<Globe2 />} accent="primary" sub={`across ${customers.length} customers`} />
        <KpiCard label="Countries" value={countries.size} icon={<Landmark />} accent="accent" sub={`${regions.size} trade regions`} />
        <KpiCard label="Consignee offices" value={rows.filter((r) => r.roles.includes('CONSIGNEE')).length} icon={<Anchor />} accent="success" sub="Can receive cargo" />
        <KpiCard
          label="Missing contact"
          value={rows.filter((r) => r.contacts.length === 0).length}
          icon={<Users />}
          accent={rows.some((r) => !r.contacts.length) ? 'warning' : 'success'}
          sub="Arrival notices cannot be sent"
        />
      </div>

      <DataTable
        data={rows}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.customer.code} — ${r.name} (${r.country})`}
        entityLabel="office"
        storageKey="offices"
        exportName="country-offices"
        initialSort={{ key: 'country', dir: 'asc' }}
        searchText={(r) => [r.name, r.city, r.country, r.portName, r.customsId, r.customer.legalName, r.customer.code].join(' ')}
        onRowClick={(r) => nav(`/customers/${r.customer.id}`)}
        rowTone={(r) => (!r.active ? 'opacity-60' : undefined)}
        filters={[
          {
            key: 'country', label: 'Country', values: countryFilter, onChange: setCountryFilter,
            options: Array.from(countries).map((c) => ({ value: c, label: `${countryFlag(c)}  ${COUNTRIES.find((x) => x.code === c)?.name ?? c}` })),
            match: (r, v) => v.includes(r.countryCode),
          },
          {
            key: 'region', label: 'Region', values: regionFilter, onChange: setRegionFilter,
            options: Array.from(regions).map((r) => ({ value: r as string, label: r as string })),
            match: (r, v) => v.includes(COUNTRIES.find((c) => c.code === r.countryCode)?.region ?? ''),
          },
          {
            key: 'role', label: 'Role', values: roleFilter, onChange: setRoleFilter,
            options: ['CLIENT', 'SHIPPER', 'CONSIGNEE', 'NOTIFY', 'AGENT'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => r.roles.some((x) => v.includes(x)),
          },
        ]}
        onDelete={(ids) => {
          const affected = customers.filter((c) => c.offices.some((o) => ids.includes(o.id)))
          affected.forEach((c) => upsertCustomer({ ...c, offices: c.offices.filter((o) => !ids.includes(o.id)) }))
          toast.push({ tone: 'success', title: `${ids.length} offices removed` })
        }}
        cascadeWarning={(sel) => {
          const orphaned = customers.filter((c) => c.offices.every((o) => sel.some((s) => s.id === o.id)))
          return orphaned.length ? [`${orphaned.map((c) => c.code).join(', ')} would be left with no office at all`] : []
        }}
        importFields={[
          { key: 'customerCode', label: 'Customer code', required: true, hint: 'Office is attached to this customer' },
          { key: 'name', label: 'Office name', required: true },
          { key: 'countryCode', label: 'Country code', required: true, hint: 'ISO-2, e.g. NL' },
          { key: 'city', label: 'City', required: true },
          { key: 'addressLine', label: 'Address' },
          { key: 'portCode', label: 'Default port code', hint: 'UN/LOCODE, e.g. NLRTM' },
          { key: 'customsId', label: 'Customs / EORI' },
          { key: 'roles', label: 'Roles', hint: 'Pipe separated, e.g. CONSIGNEE|NOTIFY' },
          { key: 'contactName', label: 'Primary contact name' },
          { key: 'contactEmail', label: 'Primary contact email' },
        ]}
        importSample={{
          customerCode: 'CUS-0001', name: 'Antwerp Depot', countryCode: 'BE', city: 'Antwerp',
          addressLine: 'Noorderlaan 100', portCode: 'BEANR', customsId: 'BE0123456789',
          roles: 'CONSIGNEE|NOTIFY', contactName: 'Jan Peeters', contactEmail: 'jan@example.be',
        }}
        toImportRow={(r) => ({
          customerCode: r.customer.code, name: r.name, countryCode: r.countryCode, city: r.city,
          addressLine: r.addressLine, portCode: r.portCode ?? '', customsId: r.customsId ?? '',
          roles: r.roles.join('|'), contactName: r.contacts[0]?.name ?? '', contactEmail: r.contacts[0]?.email ?? '',
        })}
        onImport={(csvRows) => {
          let applied = 0
          const byCustomer = new Map<string, typeof csvRows>()
          csvRows.forEach((r) => {
            const list = byCustomer.get(r.customerCode) ?? []
            list.push(r)
            byCustomer.set(r.customerCode, list)
          })
          byCustomer.forEach((list, code) => {
            const cust = customers.find((c) => c.code === code)
            if (!cust) return
            const newOffices = list.map((r, i) => ({
              id: `off_imp_${Date.now()}_${i}`,
              customerId: cust.id,
              name: r.name,
              countryCode: r.countryCode.toUpperCase(),
              country: COUNTRIES.find((c) => c.code === r.countryCode.toUpperCase())?.name ?? r.countryCode,
              city: r.city,
              addressLine: r.addressLine || '',
              portCode: r.portCode || undefined,
              customsId: r.customsId || undefined,
              roles: (r.roles ? r.roles.split('|') : ['CONSIGNEE']) as CountryOffice['roles'],
              isHeadquarter: false,
              isBillingOffice: false,
              active: true,
              contacts: r.contactName
                ? [{ id: `c_imp_${Date.now()}_${i}`, name: r.contactName, email: r.contactEmail, isPrimary: true }]
                : [],
            })) as CountryOffice[]
            applied += newOffices.length
            upsertCustomer({ ...cust, offices: [...cust.offices, ...newOffices] })
          })
          toast.push({
            tone: applied ? 'success' : 'warning',
            title: applied ? `${applied} offices imported` : 'Nothing imported',
            description: applied ? undefined : 'No rows matched an existing customer code.',
          })
        }}
        rowActions={(r) => (
          <Tooltip content="Open customer">
            <Button variant="ghost" size="iconXs" onClick={() => nav(`/customers/${r.customer.id}`)}>
              <ExternalLink />
            </Button>
          </Tooltip>
        )}
      />
    </>
  )
}
