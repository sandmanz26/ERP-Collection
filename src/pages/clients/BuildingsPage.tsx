import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, Clock, Layers, Pencil, Plus, Trash2, Unlink } from 'lucide-react'
import type { Building } from '@/data/types'
import { BUILDING_TYPES, OPERATING_HOURS, buildingTypeLabel, operatingHoursLabel, shiftPatternLabel } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { KpiCard, PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/status'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { useToast } from '@/components/ui/toast'
import { BuildingForm } from './BuildingForm'
import { useCan } from '@/lib/access'
import { fmtNumber } from '@/lib/format'
import { uid } from '@/lib/utils'
import { isLiveProject } from '@/lib/domain'

export function BuildingsPage() {
  const nav = useNavigate()
  const toast = useToast()
  const can = useCan()
  const { buildings, clients, projects, removeBuildings, importBuildings } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Building | null>(null)
  const [deleting, setDeleting] = React.useState<Building | null>(null)
  const [type, setType] = React.useState<string[]>([])
  const [client, setClient] = React.useState<string[]>([])
  const [hours, setHours] = React.useState<string[]>([])
  const [coverage, setCoverage] = React.useState<string[]>([])

  const clientOf = (b: Building) => clients.find((c) => c.id === b.clientId)
  const projectOf = (b: Building) => projects.find((p) => p.buildingId === b.id && isLiveProject(p))
  const unassigned = buildings.filter((b) => b.status === 'ACTIVE' && !projectOf(b))

  const columns: Column<Building>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[104px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Building', width: 'w-[230px] max-w-[230px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{buildingTypeLabel(r.type)} · {r.city}</p>
        </div>
      ),
    },
    {
      key: 'client', header: 'Client', width: 'w-[170px] max-w-[170px]', sortable: true,
      sortValue: (r) => clientOf(r)?.legalName ?? '', exportValue: (r) => clientOf(r)?.legalName ?? '',
      cell: (r) => {
        const c = clientOf(r)
        if (!c) return <span className="text-[12.5px] text-danger">Client removed</span>
        return (
          <Link to={`/clients/${c.id}`} onClick={(e) => e.stopPropagation()} className="text-[12.5px] font-medium text-primary hover:underline">
            {c.brandName || c.legalName}
          </Link>
        )
      },
    },
    {
      key: 'project', header: 'Current project', width: 'w-[190px] max-w-[190px]', sortable: true,
      sortValue: (r) => projectOf(r)?.code ?? 'zzz', exportValue: (r) => projectOf(r)?.code ?? 'unassigned',
      headerHint: 'A building carries at most one running project',
      cell: (r) => {
        const p = projectOf(r)
        if (!p) {
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-subtle">
              <Unlink className="size-3.5" /> No running project
            </span>
          )
        }
        return (
          <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="min-w-0">
            <span className="block truncate text-[12.5px] font-medium text-primary hover:underline">{p.code}</span>
            <span className="block truncate text-[11px] text-fg-muted">{p.name}</span>
          </Link>
        )
      },
    },
    {
      key: 'size', header: 'Size', width: 'w-[128px]', align: 'right', sortable: true,
      sortValue: (r) => r.areaSqm, exportValue: (r) => r.areaSqm,
      cell: (r) => (
        <div className="text-right">
          <p className="tnum text-[12.5px] text-fg">{fmtNumber(r.areaSqm)} m²</p>
          <p className="tnum text-[11px] text-fg-subtle">{r.floors} floor{r.floors === 1 ? '' : 's'}</p>
        </div>
      ),
    },
    {
      key: 'hours', header: 'Coverage', width: 'w-[152px]', sortable: true,
      sortValue: (r) => r.operatingHours, exportValue: (r) => `${r.operatingHours} / ${r.shiftPattern}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="text-[12.5px] text-fg">{operatingHoursLabel(r.operatingHours)}</p>
          <p className="text-[11px] text-fg-subtle">{shiftPatternLabel(r.shiftPattern)}</p>
        </div>
      ),
    },
    {
      key: 'pic', header: 'Site contact', width: 'w-[178px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.picName, exportValue: (r) => `${r.picName} ${r.picPhone}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate text-[12.5px] text-fg">{r.picName}</p>
          <p className="truncate text-[11px] text-fg-subtle">{r.picPhone}</p>
        </div>
      ),
    },
    {
      key: 'province', header: 'Province', width: 'w-[148px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.province, exportValue: (r) => r.province,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{r.province}</span>,
    },
    {
      key: 'status', header: 'Status', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  return (
    <>
      <PageHeader
        title="Buildings"
        description="Every site a project can be attached to. One project serves one building — a client with three towers signs three projects."
        actions={
          can('buildings.create') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New building
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Buildings" value={buildings.length} icon={<Building2 />} accent="primary" sub={`${buildings.filter((b) => b.status === 'ACTIVE').length} active`} />
        <KpiCard
          label="Without a project"
          value={unassigned.length}
          icon={<Unlink />}
          accent={unassigned.length ? 'warning' : 'success'}
          sub={unassigned.length ? unassigned.slice(0, 2).map((b) => b.code).join(', ') + (unassigned.length > 2 ? '…' : '') : 'Every active building is covered'}
        />
        <KpiCard label="Covered 24/7" value={buildings.filter((b) => b.operatingHours === 'H24').length} icon={<Clock />} accent="accent" sub="three-shift sites" />
        <KpiCard
          label="Floor area served"
          value={`${fmtNumber(Math.round(buildings.reduce((a, b) => a + b.areaSqm, 0) / 1000))}k m²`}
          icon={<Layers />}
          accent="purple"
          sub={`across ${new Set(buildings.map((b) => b.city)).size} cities`}
        />
      </div>

      <DataTable
        data={buildings}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="building"
        storageKey="buildings"
        allowExport={can('buildings.export')}
        exportName="tata-gemilang-buildings"
        searchText={(r) => [r.code, r.name, r.city, r.province, r.address, r.picName, clientOf(r)?.legalName, clientOf(r)?.brandName].filter(Boolean).join(' ')}
        initialSort={{ key: 'code', dir: 'asc' }}
        rowTone={(r) => (r.status === 'INACTIVE' ? 'bg-bg-muted/60' : undefined)}
        filters={[
          {
            key: 'client', label: 'Client', values: client, onChange: setClient,
            options: clients.map((c) => ({ value: c.id, label: c.brandName || c.legalName })),
            match: (r, v) => v.includes(r.clientId),
          },
          {
            key: 'type', label: 'Type', values: type, onChange: setType,
            options: BUILDING_TYPES.map((t) => ({ value: t.value, label: t.label })),
            match: (r, v) => v.includes(r.type),
          },
          {
            key: 'hours', label: 'Operating hours', values: hours, onChange: setHours,
            options: OPERATING_HOURS.map((o) => ({ value: o.value, label: o.label })),
            match: (r, v) => v.includes(r.operatingHours),
          },
          {
            key: 'coverage', label: 'Project attached', values: coverage, onChange: setCoverage,
            options: [
              { value: 'YES', label: 'Has a running project' },
              { value: 'NO', label: 'Not covered' },
            ],
            match: (r, v) => (projectOf(r) ? v.includes('YES') : v.includes('NO')),
          },
        ]}
        onDelete={can('buildings.delete') ? (ids) => {
          removeBuildings(ids)
          toast.push({ tone: 'success', title: `${ids.length} building${ids.length === 1 ? '' : 's'} deleted` })
        } : undefined}
        cascadeWarning={(rows) => {
          const linked = projects.filter((p) => rows.some((r) => r.id === p.buildingId))
          return linked.length
            ? [`${linked.length} project${linked.length === 1 ? '' : 's'} point at these buildings and will lose their site: ${linked.slice(0, 4).map((p) => p.code).join(', ')}`]
            : []
        }}
        importFields={can('buildings.import') ? [
          { key: 'code', label: 'Building code', required: true, hint: 'e.g. BLD-0019' },
          { key: 'clientCode', label: 'Client code', required: true, hint: 'must match an existing client, e.g. CLT-0002' },
          { key: 'name', label: 'Building name', required: true },
          { key: 'type', label: 'Type', hint: 'OFFICE_TOWER / FACTORY / MALL / HOSPITAL …' },
          { key: 'address', label: 'Address' },
          { key: 'city', label: 'City', required: true },
          { key: 'province', label: 'Province' },
          { key: 'floors', label: 'Floors' },
          { key: 'areaSqm', label: 'Gross area (m²)' },
          { key: 'operatingHours', label: 'Operating hours', hint: 'H24 / EXTENDED / OFFICE_HOURS' },
          { key: 'shiftPattern', label: 'Shift pattern', hint: 'THREE_SHIFT / TWO_SHIFT / NON_SHIFT' },
          { key: 'picName', label: 'Site contact' },
          { key: 'picPhone', label: 'Contact phone' },
        ] : undefined}
        importSample={{
          code: 'BLD-0019', clientCode: 'CLT-0002', name: 'Kantor Cabang Prima Bintaro', type: 'BANK_BRANCH',
          address: 'Jl. Bintaro Utama No. 5', city: 'Tangerang Selatan', province: 'Banten', floors: '2',
          areaSqm: '1400', operatingHours: 'EXTENDED', shiftPattern: 'TWO_SHIFT', picName: 'Tommy Iskandar',
          picPhone: '+62 812 3388 7766',
        }}
        toImportRow={(r) => ({
          code: r.code, clientCode: clientOf(r)?.code ?? '', name: r.name, type: r.type, address: r.address,
          city: r.city, province: r.province, floors: r.floors, areaSqm: r.areaSqm,
          operatingHours: r.operatingHours, shiftPattern: r.shiftPattern, picName: r.picName, picPhone: r.picPhone,
        })}
        onImport={can('buildings.import') ? (rows) => {
          const usable = rows.filter((row) => clients.some((c) => c.code === row.clientCode))
          const skipped = rows.length - usable.length
          const mapped: Building[] = usable.map((row) => {
            const existing = buildings.find((b) => b.code === row.code)
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('bld'),
              code: row.code,
              clientId: clients.find((c) => c.code === row.clientCode)!.id,
              name: row.name,
              type: (BUILDING_TYPES.some((t) => t.value === row.type) ? row.type : 'OFFICE_TOWER') as Building['type'],
              address: row.address ?? '',
              city: row.city,
              province: row.province || 'DKI Jakarta',
              floors: Number(row.floors) || 1,
              areaSqm: Number(row.areaSqm) || 0,
              operatingHours: (['H24', 'EXTENDED', 'OFFICE_HOURS'].includes(row.operatingHours) ? row.operatingHours : 'OFFICE_HOURS') as Building['operatingHours'],
              shiftPattern: (['THREE_SHIFT', 'TWO_SHIFT', 'NON_SHIFT'].includes(row.shiftPattern) ? row.shiftPattern : 'NON_SHIFT') as Building['shiftPattern'],
              picName: row.picName ?? '',
              picPhone: row.picPhone ?? '',
              status: existing?.status ?? 'ACTIVE',
              createdAt: existing?.createdAt ?? new Date().toISOString(),
            } as Building
          })
          importBuildings(mapped)
          toast.push({
            tone: skipped ? 'warning' : 'success',
            title: `${mapped.length} building${mapped.length === 1 ? '' : 's'} imported`,
            description: skipped ? `${skipped} row${skipped === 1 ? '' : 's'} skipped — the client code did not match any client.` : 'Rows whose code already existed were updated in place.',
          })
        } : undefined}
        rowActions={(r) => (
          <>
            <Tooltip content="Open client">
              <Button variant="ghost" size="iconXs" onClick={() => nav(`/clients/${r.clientId}`)}>
                <Building2 />
              </Button>
            </Tooltip>
            {can('buildings.edit') && (
              <Tooltip content="Edit">
              <Button
                variant="ghost"
                size="iconXs"
                onClick={() => {
                  setEditing(r)
                  setFormOpen(true)
                }}
              >
                <Pencil />
              </Button>
            </Tooltip>
            )}
            {can('buildings.delete') && (
              <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
            )}
          </>
        )}
        footerSummary={(rows) => (
          <span className="tnum">{fmtNumber(rows.reduce((a, r) => a + r.areaSqm, 0))} m² in this view</span>
        )}
        toolbarLeft={
          unassigned.length > 0 ? (
            <Badge tone="warning" size="md">
              {unassigned.length} without a project
            </Badge>
          ) : undefined
        }
        emptyTitle="No buildings yet"
        emptyDescription="Add the sites your clients operate before creating projects against them."
      />

      <BuildingForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="building"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={deleting && projects.some((p) => p.buildingId === deleting.id) ? ['A project points at this building and will lose its site'] : []}
        onConfirm={() => {
          if (deleting) {
            removeBuildings([deleting.id])
            toast.push({ tone: 'success', title: 'Building deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
