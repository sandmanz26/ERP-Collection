import * as React from 'react'
import { Award, Package, Pencil, Plus, Trash2, Users } from 'lucide-react'
import type { Position } from '@/data/types'
import { POSITION_GRADES, SERVICE_TYPES, serviceLabel } from '@/data/reference'
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
import { PositionForm } from './PositionForm'
import { useCan } from '@/lib/access'
import { fmtCurrency } from '@/lib/format'
import { uid } from '@/lib/utils'
import { isStaffedProject } from '@/lib/domain'

export function PositionsPage() {
  const toast = useToast()
  const can = useCan()
  const { positions, projects, removePositions, importPositions } = useErp()
  const [formOpen, setFormOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Position | null>(null)
  const [deleting, setDeleting] = React.useState<Position | null>(null)
  const [service, setService] = React.useState<string[]>([])
  const [grade, setGrade] = React.useState<string[]>([])
  const [status, setStatus] = React.useState<string[]>([])

  const costOf = (p: Position) => Math.round(((p.baseSalary + p.allowance) * 1.19) / 1000) * 1000
  const deployedOf = (p: Position) =>
    projects
      .filter(isStaffedProject)
      .flatMap((prj) => prj.requirements)
      .filter((r) => r.positionId === p.id)
      .reduce((a, r) => a + r.deployed, 0)
  const requiredOf = (p: Position) =>
    projects
      .filter(isStaffedProject)
      .flatMap((prj) => prj.requirements)
      .filter((r) => r.positionId === p.id)
      .reduce((a, r) => a + r.headcount, 0)

  const columns: Column<Position>[] = [
    {
      key: 'code', header: 'Code', width: 'w-[128px]', pinned: true, sortable: true,
      sortValue: (r) => r.code, exportValue: (r) => r.code,
      cell: (r) => <span className="font-mono text-[12px] font-medium text-fg-muted">{r.code}</span>,
    },
    {
      key: 'name', header: 'Position', width: 'w-[250px] max-w-[250px]', sortable: true,
      sortValue: (r) => r.name, exportValue: (r) => r.name,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-fg">{r.name}</p>
          <p className="truncate text-[11.5px] text-fg-muted">{r.description}</p>
        </div>
      ),
    },
    {
      key: 'service', header: 'Service line', width: 'w-[160px]', sortable: true,
      sortValue: (r) => r.serviceType, exportValue: (r) => serviceLabel(r.serviceType),
      cell: (r) => <Badge tone="outline" size="sm">{serviceLabel(r.serviceType)}</Badge>,
    },
    {
      key: 'grade', header: 'Grade', width: 'w-[118px]', sortable: true,
      sortValue: (r) => ({ CHIEF: 0, SUPERVISOR: 1, LEADER: 2, SENIOR: 3, REGULAR: 4 })[r.grade],
      exportValue: (r) => r.grade,
      cell: (r) => <span className="text-[12.5px] text-fg-muted">{POSITION_GRADES.find((g) => g.value === r.grade)?.label}</span>,
    },
    {
      key: 'certs', header: 'Certifications', width: 'w-[190px] max-w-[190px]', sortable: true, defaultHidden: true,
      sortValue: (r) => r.certifications.length, exportValue: (r) => r.certifications.join(' | '),
      cell: (r) =>
        r.certifications.length === 0 ? (
          <span className="text-[12px] text-fg-subtle">None required</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {r.certifications.slice(0, 2).map((c) => (
              <Badge key={c} tone="neutral" size="sm">{c}</Badge>
            ))}
            {r.certifications.length > 2 && <Badge tone="neutral" size="sm">+{r.certifications.length - 2}</Badge>}
          </div>
        ),
    },
    {
      key: 'deployed', header: 'On site', width: 'w-[120px]', align: 'right', sortable: true,
      sortValue: deployedOf, exportValue: deployedOf,
      headerHint: 'Deployed against contracted, across running projects',
      cell: (r) => {
        const req = requiredOf(r)
        const dep = deployedOf(r)
        if (req === 0) return <span className="text-[12.5px] text-fg-subtle">—</span>
        return (
          <span className="tnum text-[12.5px] text-fg">
            {dep}
            <span className="text-fg-subtle"> / {req}</span>
          </span>
        )
      },
    },
    {
      key: 'salary', header: 'Salary + allowance', width: 'w-[168px]', align: 'right', sortable: true,
      sortValue: (r) => r.baseSalary + r.allowance, exportValue: (r) => r.baseSalary + r.allowance,
      cell: (r) => (
        <div className="text-right">
          <p className="tnum text-[12.5px] text-fg">{fmtCurrency(r.baseSalary + r.allowance, 'IDR', { compact: true })}</p>
          <p className="tnum text-[11px] text-fg-subtle">cost {fmtCurrency(costOf(r), 'IDR', { compact: true })}</p>
        </div>
      ),
    },
    {
      key: 'bill', header: 'Default bill rate', width: 'w-[156px]', align: 'right', sortable: true,
      sortValue: (r) => r.defaultBillRate, exportValue: (r) => r.defaultBillRate,
      cell: (r) => <span className="tnum text-[12.5px] font-medium text-fg">{fmtCurrency(r.defaultBillRate, 'IDR', { compact: true })}</span>,
    },
    {
      key: 'margin', header: 'Margin', width: 'w-[120px]', align: 'right', sortable: true,
      sortValue: (r) => (r.defaultBillRate - costOf(r)) / r.defaultBillRate,
      exportValue: (r) => r.defaultBillRate - costOf(r),
      cell: (r) => {
        const m = r.defaultBillRate - costOf(r)
        const pct = (m / r.defaultBillRate) * 100
        return (
          <div className="text-right">
            <p className={`tnum text-[12.5px] font-medium ${m > 0 ? 'text-success' : 'text-danger'}`}>
              {fmtCurrency(m, 'IDR', { compact: true })}
            </p>
            <p className="tnum text-[11px] text-fg-subtle">{pct.toFixed(1)}%</p>
          </div>
        )
      },
    },
    {
      key: 'issue', header: 'Standard issue', width: 'w-[140px]', align: 'right', sortable: true,
      sortValue: (r) => r.standardIssue.length,
      exportValue: (r) => r.standardIssue.map((s) => `${s.sku}×${s.qtyPerPerson}`).join(' | '),
      cell: (r) => (
        <Tooltip content={r.standardIssue.length ? r.standardIssue.map((s) => `${s.sku} × ${s.qtyPerPerson}`).join('\n') : 'Nothing issued'}>
          <span className="tnum inline-flex items-center gap-1.5 text-[12.5px] text-fg-muted">
            <Package className="size-3.5" />
            {r.standardIssue.length} item{r.standardIssue.length === 1 ? '' : 's'}
          </span>
        </Tooltip>
      ),
    },
    {
      key: 'status', header: 'Status', width: 'w-[110px]', sortable: true,
      sortValue: (r) => r.status, exportValue: (r) => r.status,
      cell: (r) => <StatusBadge value={r.status} size="sm" />,
    },
  ]

  const totalDeployed = positions.reduce((a, p) => a + deployedOf(p), 0)

  return (
    <>
      <PageHeader
        title="Positions"
        description="The master of what can be deployed: certification, cost, list rate and the kit each person is issued."
        actions={
          can('positions.create') ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              <Plus /> New position
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Positions" value={positions.length} icon={<Users />} accent="primary" sub={`${positions.filter((p) => p.status === 'ACTIVE').length} active`} />
        <KpiCard
          label="Service lines"
          value={new Set(positions.map((p) => p.serviceType)).size}
          icon={<Award />}
          accent="accent"
          sub={SERVICE_TYPES.filter((s) => positions.some((p) => p.serviceType === s.value)).slice(0, 3).map((s) => s.label).join(', ')}
        />
        <KpiCard label="People on site" value={totalDeployed.toLocaleString('en-US')} icon={<Users />} accent="success" sub="across running projects" />
        <KpiCard
          label="Certification-gated"
          value={positions.filter((p) => p.certifications.length > 0).length}
          icon={<Award />}
          accent="warning"
          sub="positions that cannot be filled without a certificate"
        />
      </div>

      <DataTable
        data={positions}
        columns={columns}
        getId={(r) => r.id}
        getLabel={(r) => `${r.code} — ${r.name}`}
        entityLabel="position"
        storageKey="positions"
        allowExport={can('positions.export')}
        exportName="tata-gemilang-positions"
        searchText={(r) => [r.code, r.name, r.description, serviceLabel(r.serviceType), r.grade, ...r.certifications].join(' ')}
        initialSort={{ key: 'code', dir: 'asc' }}
        onRowClick={
          can('positions.edit')
            ? (r) => {
                setEditing(r)
                setFormOpen(true)
              }
            : undefined
        }
        filters={[
          {
            key: 'service', label: 'Service line', values: service, onChange: setService,
            options: SERVICE_TYPES.map((s) => ({ value: s.value, label: s.label })),
            match: (r, v) => v.includes(r.serviceType),
          },
          {
            key: 'grade', label: 'Grade', values: grade, onChange: setGrade,
            options: POSITION_GRADES.map((g) => ({ value: g.value, label: g.label })),
            match: (r, v) => v.includes(r.grade),
          },
          {
            key: 'status', label: 'Status', values: status, onChange: setStatus,
            options: [
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ],
            match: (r, v) => v.includes(r.status),
          },
        ]}
        onDelete={can('positions.delete') ? (ids) => {
          removePositions(ids)
          toast.push({ tone: 'success', title: `${ids.length} position${ids.length === 1 ? '' : 's'} deleted` })
        } : undefined}
        cascadeWarning={(rows) => {
          const lines = projects.flatMap((p) => p.requirements).filter((r) => rows.some((x) => x.id === r.positionId))
          return lines.length ? [`${lines.length} manpower lines across the project book use these positions and will lose their rate reference`] : []
        }}
        importFields={can('positions.import') ? [
          { key: 'code', label: 'Position code', required: true, hint: 'e.g. POS-SEC-006' },
          { key: 'name', label: 'Position name', required: true },
          { key: 'serviceType', label: 'Service line', hint: 'SECURITY / CLEANING / DRIVER …' },
          { key: 'grade', label: 'Grade', hint: 'CHIEF / SUPERVISOR / LEADER / SENIOR / REGULAR' },
          { key: 'description', label: 'Description' },
          { key: 'certifications', label: 'Certifications', hint: 'separated by |' },
          { key: 'minEducation', label: 'Minimum education' },
          { key: 'minExperienceYears', label: 'Minimum experience (years)' },
          { key: 'baseSalary', label: 'Base salary' },
          { key: 'allowance', label: 'Allowance' },
          { key: 'defaultBillRate', label: 'Default bill rate' },
        ] : undefined}
        importSample={{
          code: 'POS-SEC-006', name: 'Security Patroli Motor', serviceType: 'SECURITY', grade: 'REGULAR',
          description: 'Patroli keliling area luar dengan sepeda motor.', certifications: 'Gada Pratama|SIM A',
          minEducation: 'SMA / sederajat', minExperienceYears: '2', baseSalary: '5600000', allowance: '900000',
          defaultBillRate: '9200000',
        }}
        toImportRow={(r) => ({
          code: r.code, name: r.name, serviceType: r.serviceType, grade: r.grade, description: r.description,
          certifications: r.certifications.join('|'), minEducation: r.minEducation,
          minExperienceYears: r.minExperienceYears, baseSalary: r.baseSalary, allowance: r.allowance,
          defaultBillRate: r.defaultBillRate,
        })}
        onImport={can('positions.import') ? (rows) => {
          const mapped: Position[] = rows.map((row) => {
            const existing = positions.find((p) => p.code === row.code)
            return {
              ...(existing ?? {}),
              id: existing?.id ?? uid('pos'),
              code: row.code,
              name: row.name,
              serviceType: (SERVICE_TYPES.some((s) => s.value === row.serviceType) ? row.serviceType : 'SECURITY') as Position['serviceType'],
              grade: (POSITION_GRADES.some((g) => g.value === row.grade) ? row.grade : 'REGULAR') as Position['grade'],
              description: row.description ?? '',
              certifications: row.certifications ? row.certifications.split('|').map((c) => c.trim()).filter(Boolean) : [],
              minEducation: row.minEducation || 'SMA / sederajat',
              minExperienceYears: Number(row.minExperienceYears) || 0,
              baseSalary: Number(row.baseSalary) || 5_000_000,
              allowance: Number(row.allowance) || 0,
              defaultBillRate: Number(row.defaultBillRate) || 8_000_000,
              standardIssue: existing?.standardIssue ?? [],
              status: existing?.status ?? 'ACTIVE',
            } as Position
          })
          importPositions(mapped)
          toast.push({ tone: 'success', title: `${mapped.length} position${mapped.length === 1 ? '' : 's'} imported` })
        } : undefined}
        rowActions={(r) => (
          <>
            {can('positions.edit') && (
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
            {can('positions.delete') && (
              <Tooltip content="Delete">
              <Button variant="ghost" size="iconXs" className="text-danger hover:bg-danger-soft" onClick={() => setDeleting(r)}>
                <Trash2 />
              </Button>
            </Tooltip>
            )}
          </>
        )}
        emptyTitle="No positions yet"
        emptyDescription="Create the roles your projects deploy, or import them from a rate card."
      />

      <PositionForm open={formOpen} onOpenChange={setFormOpen} initial={editing} />

      <ConfirmDelete
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        entityLabel="position"
        items={deleting ? [`${deleting.code} — ${deleting.name}`] : []}
        cascade={
          deleting
            ? (() => {
                const lines = projects.flatMap((p) => p.requirements).filter((r) => r.positionId === deleting.id)
                return lines.length ? [`${lines.length} manpower lines reference this position`] : []
              })()
            : []
        }
        onConfirm={() => {
          if (deleting) {
            removePositions([deleting.id])
            toast.push({ tone: 'success', title: 'Position deleted', description: deleting.code })
          }
          setDeleting(null)
        }}
      />
    </>
  )
}
