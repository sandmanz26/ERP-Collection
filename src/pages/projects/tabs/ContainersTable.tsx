import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { Boxes, ExternalLink, Package, Pencil, Plus, ShieldCheck, Trash2, Wand2 } from 'lucide-react'
import type { Container, Project } from '@/data/types'
import { CONTAINER_SPECS, itemCbm, itemGrossKg, suggestLoadPlan, utilisation } from '@/lib/shipping'
import { CONTAINER_TYPES } from '@/data/reference'
import { useErp } from '@/store/useErp'
import { DataTable } from '@/components/data-table/DataTable'
import type { Column } from '@/components/data-table/types'
import { StatusBadge } from '@/components/shared/status'
import { UtilisationBar } from '@/components/shared/UtilisationBar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip } from '@/components/ui/tooltip'
import { ConfirmDelete } from '@/components/ui/confirm'
import { ContainerForm } from '../ContainerForm'
import { fmtDate, fmtNumber, titleCase } from '@/lib/format'
import { uid } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'

export function ContainersTable({ project, scoped }: { project?: Project; scoped?: boolean }) {
  const nav = useNavigate()
  const toast = useToast()
  const { containers, projects, removeContainers, importContainers, upsertContainer } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Container | null>(null)
  const [deleting, setDeleting] = React.useState<Container | null>(null)
  const [status, setStatus] = React.useState<string[]>([])
  const [type, setType] = React.useState<string[]>([])

  const data = scoped && project ? containers.filter((c) => c.projectId === project.id) : containers
  const projectOf = (c: Container) => projects.find((p) => p.id === c.projectId)

  const totalCbm = data.reduce((a, c) => a + c.items.reduce((s, i) => s + itemCbm(i), 0), 0)
  const totalKg = data.reduce((a, c) => a + c.items.reduce((s, i) => s + itemGrossKg(i), 0), 0)
  const suggestion = suggestLoadPlan(totalCbm, totalKg)

  const columns: Column<Container>[] = [
    {
      key: 'seq', header: 'Unit', width: 'w-[132px]', pinned: true, sortable: true,
      sortValue: (r) => `${r.projectId}-${String(r.seq).padStart(3, '0')}`,
      exportValue: (r) => r.containerNo ?? `#${r.seq}`,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-mono text-[12px] font-medium text-fg">{r.containerNo ?? `Unit #${r.seq}`}</p>
          <p className="truncate text-[10.5px] text-fg-subtle">
            {r.sealNo ? `Seal ${r.sealNo}` : 'not sealed'}
          </p>
        </div>
      ),
    },
    ...(!scoped
      ? [
          {
            key: 'project', header: 'Job', width: 'min-w-[190px]', sortable: true,
            sortValue: (r: Container) => projectOf(r)?.code ?? '',
            exportValue: (r: Container) => projectOf(r)?.code ?? '',
            cell: (r: Container) => {
              const p = projectOf(r)
              return (
                <div className="min-w-0">
                  <p className="truncate font-mono text-[11.5px] text-fg">{p?.code}</p>
                  <p className="truncate text-[11px] text-fg-muted">{p?.name}</p>
                </div>
              )
            },
          } as Column<Container>,
        ]
      : []),
    {
      key: 'type', header: 'Type', width: 'w-[112px]', sortable: true,
      sortValue: (r) => r.type, exportValue: (r) => r.type,
      cell: (r) => (
        <Tooltip content={CONTAINER_SPECS[r.type].label}>
          <Badge tone={r.type.includes('R') && r.type !== '40FR' ? 'info' : 'outline'} size="sm">{r.type}</Badge>
        </Tooltip>
      ),
    },
    {
      key: 'items', header: 'Cargo lines', width: 'w-[124px]', align: 'right', sortable: true,
      sortValue: (r) => r.items.length, exportValue: (r) => r.items.length,
      cell: (r) => (
        <span className="tnum inline-flex items-center gap-1 text-[12.5px] text-fg-muted">
          <Package className="size-3.5 text-fg-subtle" />
          {r.items.length}
          <span className="text-fg-subtle">·</span>
          {fmtNumber(r.items.reduce((a, i) => a + i.quantity, 0))} pkg
        </span>
      ),
    },
    {
      key: 'cbm', header: 'Volume', width: 'w-[110px]', align: 'right', sortable: true,
      sortValue: (r) => r.items.reduce((a, i) => a + itemCbm(i), 0),
      exportValue: (r) => r.items.reduce((a, i) => a + itemCbm(i), 0).toFixed(3),
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{fmtNumber(r.items.reduce((a, i) => a + itemCbm(i), 0), 2)} m³</span>,
    },
    {
      key: 'kg', header: 'Gross weight', width: 'w-[126px]', align: 'right', sortable: true,
      sortValue: (r) => r.items.reduce((a, i) => a + itemGrossKg(i), 0),
      exportValue: (r) => Math.round(r.items.reduce((a, i) => a + itemGrossKg(i), 0)),
      cell: (r) => <span className="tnum text-[12.5px] text-fg">{fmtNumber(r.items.reduce((a, i) => a + itemGrossKg(i), 0))} kg</span>,
    },
    {
      key: 'utilisation', header: 'Utilisation', width: 'w-[156px]', sortable: true,
      sortValue: (r) => {
        const u = utilisation(r.type, r.items, r.tareKg)
        return Math.max(u.volumePct, u.weightPct)
      },
      exportValue: (r) => {
        const u = utilisation(r.type, r.items, r.tareKg)
        return `${Math.max(u.volumePct, u.weightPct).toFixed(0)}%`
      },
      cell: (r) => <UtilisationBar u={utilisation(r.type, r.items, r.tareKg)} compact />,
    },
    {
      key: 'vgm', header: 'VGM', width: 'w-[128px]', sortable: true,
      sortValue: (r) => (r.vgmSubmittedAt ? 1 : 0), exportValue: (r) => (r.vgmKg ? `${r.vgmKg} kg` : ''),
      cell: (r) =>
        r.vgmSubmittedAt ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-success">
            <ShieldCheck className="size-3.5" />
            <span className="tnum">{fmtNumber(r.vgmKg ?? 0)} kg</span>
          </span>
        ) : r.type === 'LCL' ? (
          <span className="text-[12px] text-fg-subtle">n/a</span>
        ) : (
          <span className="text-[12px] font-medium text-warning">Not submitted</span>
        ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[138px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
    {
      key: 'stuffing', header: 'Stuffed', width: 'w-[112px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.stuffingDate ?? '', exportValue: (r) => r.stuffingDate ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.stuffingDate)}</span>,
    },
    {
      key: 'gateIn', header: 'Gate-in', width: 'w-[112px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.gateInDate ?? '', exportValue: (r) => r.gateInDate ?? '',
      cell: (r) => <span className="tnum text-[12px] text-fg-muted">{fmtDate(r.gateInDate)}</span>,
    },
    {
      key: 'depot', header: 'Depot', width: 'min-w-[160px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.depot ?? '', exportValue: (r) => r.depot ?? '',
      cell: (r) => <span className="text-[12px] text-fg-muted">{r.depot ?? '—'}</span>,
    },
  ]

  return (
    <>
      {scoped && project && data.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface-sunken px-4 py-3">
          <div className="flex items-center gap-2 text-[12.5px]">
            <Boxes className="size-4 text-fg-muted" />
            <span className="text-fg-muted">Job total</span>
            <span className="tnum font-semibold text-fg">{fmtNumber(totalCbm, 2)} m³</span>
            <span className="text-fg-subtle">·</span>
            <span className="tnum font-semibold text-fg">{fmtNumber(totalKg)} kg</span>
          </div>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <div className="flex items-center gap-2 text-[12.5px]">
            <Wand2 className="size-4 text-fg-muted" />
            <span className="text-fg-muted">Optimal mix for this volume</span>
            <span className="font-semibold text-fg">
              {suggestion.map((s) => `${s.count} × ${s.type}`).join(' + ') || '—'}
            </span>
            <span className="text-fg-subtle">
              (currently {data.length} unit{data.length === 1 ? '' : 's'})
            </span>
          </div>
        </div>
      )}

      <DataTable
        data={data}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${projectOf(r)?.code ?? ''} ${r.containerNo ?? `unit #${r.seq}`}`}
        entityLabel="container"
        storageKey={scoped ? 'project-containers' : 'containers'}
        exportName={scoped && project ? `containers-${project.code}` : 'containers'}
        initialSort={{ key: 'seq', dir: 'asc' }}
        searchText={(r) => [r.containerNo, r.sealNo, r.type, r.status, r.depot, projectOf(r)?.code, ...r.items.map((i) => i.description)].join(' ')}
        onRowClick={(r) => { setEditing(r); setFormOpen(true) }}
        rowTone={(r) => (utilisation(r.type, r.items, r.tareKg).status === 'OVERLOADED' ? 'bg-danger-soft/25' : undefined)}
        filters={[
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: ['PLANNED', 'BOOKED', 'AT_DEPOT', 'STUFFING', 'STUFFED', 'GATE_IN', 'LOADED', 'IN_TRANSIT', 'DISCHARGED', 'DELIVERED', 'RETURNED'].map((v) => ({ value: v, label: titleCase(v) })),
            match: (r, v) => v.includes(r.status),
          },
          {
            key: 'type', label: 'Type', values: type, onChange: setType,
            options: CONTAINER_TYPES.map((v) => ({ value: v, label: v })),
            match: (r, v) => v.includes(r.type),
          },
        ]}
        toolbarRight={
          project && (
            <Button variant="primary" size="md" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> Add container
            </Button>
          )
        }
        onDelete={(ids) => {
          removeContainers(ids)
          toast.push({ tone: 'success', title: `${ids.length} containers removed` })
        }}
        cascadeWarning={(rows) => {
          const lines = rows.reduce((a, r) => a + r.items.length, 0)
          return lines ? [`${lines} cargo lines will be removed with them`] : []
        }}
        bulkActions={(rows, clear) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              rows.forEach((r) =>
                upsertContainer({
                  ...r,
                  vgmSubmittedAt: new Date().toISOString(),
                  vgmMethod: 'SM2',
                  vgmKg: Math.round(utilisation(r.type, r.items, r.tareKg).vgmKg),
                }),
              )
              toast.push({ tone: 'success', title: `VGM submitted for ${rows.length} units`, description: 'Method SM2 — calculated from tare plus cargo gross.' })
              clear()
            }}
          >
            <ShieldCheck /> Submit VGM
          </Button>
        )}
        importFields={[
          { key: 'projectCode', label: 'Project code', required: !scoped, hint: scoped ? `defaults to ${project?.code}` : 'Job this unit belongs to' },
          { key: 'containerNo', label: 'Container number', hint: 'ISO 6346, validated on save' },
          { key: 'type', label: 'Container type', required: true, hint: '20GP / 40HC / 40RH …' },
          { key: 'sealNo', label: 'Seal number' },
          { key: 'status', label: 'Status' },
          { key: 'itemDescription', label: 'Cargo description' },
          { key: 'quantity', label: 'Quantity' },
          { key: 'lengthCm', label: 'Length (cm)' },
          { key: 'widthCm', label: 'Width (cm)' },
          { key: 'heightCm', label: 'Height (cm)' },
          { key: 'grossWeightKg', label: 'Gross weight per unit (kg)' },
          { key: 'hsCode', label: 'HS code' },
        ]}
        importSample={{
          projectCode: project?.code ?? 'PRJ-2026-0041', containerNo: 'MSKU6636215', type: '40HC', sealNo: 'ID447281',
          status: 'PLANNED', itemDescription: 'Teak dining table, knock-down', quantity: '48', lengthCm: '190',
          widthCm: '100', heightCm: '28', grossWeightKg: '62', hsCode: '9403.60',
        }}
        toImportRow={(r) => {
          const first = r.items[0]
          return {
            projectCode: projectOf(r)?.code ?? '', containerNo: r.containerNo ?? '', type: r.type,
            sealNo: r.sealNo ?? '', status: r.status, itemDescription: first?.description ?? '',
            quantity: first?.quantity ?? '', lengthCm: first?.lengthCm ?? '', widthCm: first?.widthCm ?? '',
            heightCm: first?.heightCm ?? '', grossWeightKg: first?.grossWeightKg ?? '', hsCode: first?.hsCode ?? '',
          }
        }}
        onImport={(rows) => {
          const built: Container[] = []
          rows.forEach((r) => {
            const proj = scoped && project ? project : projects.find((p) => p.code === r.projectCode)
            if (!proj) return
            const key = `${proj.id}|${r.containerNo || `new${built.length}`}`
            let box = built.find((b) => `${b.projectId}|${b.containerNo ?? ''}` === key)
            if (!box) {
              box = {
                id: uid('ctn'), projectId: proj.id,
                seq: containers.filter((c) => c.projectId === proj.id).length + built.filter((b) => b.projectId === proj.id).length + 1,
                containerNo: r.containerNo || undefined,
                type: (CONTAINER_TYPES.includes(r.type as never) ? r.type : '40HC') as Container['type'],
                sealNo: r.sealNo || undefined,
                status: (r.status || 'PLANNED') as Container['status'],
                tareKg: CONTAINER_SPECS[(r.type as Container['type']) ?? '40HC']?.tareKg,
                items: [],
              }
              built.push(box)
            }
            if (r.itemDescription) {
              box.items.push({
                id: uid('itm'), containerId: box.id, description: r.itemDescription, hsCode: r.hsCode || undefined,
                packageUnit: 'CARTON', quantity: Number(r.quantity) || 1,
                lengthCm: Number(r.lengthCm) || 0, widthCm: Number(r.widthCm) || 0, heightCm: Number(r.heightCm) || 0,
                grossWeightKg: Number(r.grossWeightKg) || 0, netWeightKg: (Number(r.grossWeightKg) || 0) * 0.92,
                stackable: true,
              })
            }
          })
          importContainers(built)
          toast.push({
            tone: built.length ? 'success' : 'warning',
            title: built.length ? `${built.length} containers imported` : 'Nothing imported',
            description: built.length ? undefined : 'No rows matched an existing project code.',
          })
        }}
        rowActions={(r) => (
          <>
            {!scoped && (
              <Tooltip content="Open job">
                <Button variant="ghost" size="iconXs" onClick={() => nav(`/projects/${r.projectId}?tab=containers`)}>
                  <ExternalLink />
                </Button>
              </Tooltip>
            )}
            <Tooltip content="Edit load plan">
              <Button variant="ghost" size="iconXs" onClick={() => { setEditing(r); setFormOpen(true) }}>
                <Pencil />
              </Button>
            </Tooltip>
            <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
          </>
        )}
        emptyTitle="No containers planned"
        emptyDescription="Add a unit and allocate cargo to it — the volume and payload checks run as you type."
        emptyAction={
          project && (
            <Button variant="primary" size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}>
              <Plus /> Add container
            </Button>
          )
        }
        footerSummary={(rows) => (
          <span className="tnum">
            {fmtNumber(rows.reduce((a, r) => a + r.items.reduce((s, i) => s + itemCbm(i), 0), 0), 2)} m³ ·{' '}
            {fmtNumber(rows.reduce((a, r) => a + r.items.reduce((s, i) => s + itemGrossKg(i), 0), 0))} kg
          </span>
        )}
      />

      {(project || editing) && (
        <ContainerForm
          open={formOpen}
          onOpenChange={setFormOpen}
          project={project ?? projects.find((p) => p.id === editing?.projectId)!}
          initial={editing}
        />
      )}

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="container"
        items={deleting ? [deleting.containerNo ?? `Unit #${deleting.seq}`] : []}
        cascade={deleting?.items.length ? [`${deleting.items.length} cargo lines`] : []}
        onConfirm={() => {
          if (deleting) {
            removeContainers([deleting.id])
            toast.push({ tone: 'success', title: 'Container removed' })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
