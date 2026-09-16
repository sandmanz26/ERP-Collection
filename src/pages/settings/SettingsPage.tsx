import * as React from 'react'
import { Building2, History, Settings as SettingsIcon, ShieldCheck, Users } from 'lucide-react'
import { PageHeader, KpiCard } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs } from '@/components/ui/tabs'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { cn } from '@/lib/utils'
import { fmtDate, fmtDateTime, fmtNumber, relativeDays, titleCase } from '@/lib/format'
import { useErp } from '@/store/useErp'
import { useAuth } from '@/store/useAuth'
import { ACCOUNT_STATUSES, roleLabel } from '@/data/reference'

export function SettingsPage() {
  const store = useErp()
  const auth = useAuth()
  const toast = useToast()
  const [view, setView] = React.useState<'company' | 'thresholds' | 'people' | 'audit'>('company')
  const [draft, setDraft] = React.useState(store.settings)

  React.useEffect(() => setDraft(store.settings), [store.settings])

  const expiring = store.company.licences.filter((l) => (relativeDays(l.expiresAt) ?? 999) < store.settings.certificateWarningDays)

  return (
    <div className="min-h-0">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm">Insight</Badge>}
        title="Settings & audit"
        description="The company's own licences, the thresholds the system enforces, the people who can sign in, and a record of what has been changed in this browser."
        actions={
          <Tabs
            variant="pill"
            value={view}
            onChange={setView}
            items={[
              { value: 'company', label: 'Company' },
              { value: 'thresholds', label: 'Thresholds' },
              { value: 'people', label: 'People', count: auth.users.length },
              { value: 'audit', label: 'Activity', count: store.activity.length },
            ]}
          />
        }
      />

      {view === 'company' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Founded" value={String(store.company.foundedYear)} sub={`${store.company.workshopCount} workshops · ${store.company.headcount} people`} icon={<Building2 />} accent="primary" />
            <KpiCard label="Licences" value={String(store.company.licences.length)} sub="registrations and certifications" accent="accent" />
            <KpiCard
              label="Expiring soon"
              value={String(expiring.length)}
              sub={expiring.map((l) => l.kind.replace(/_/g, ' ').toLowerCase()).join(', ') || 'nothing inside the warning window'}
              icon={<ShieldCheck />}
              accent={expiring.length ? 'danger' : 'success'}
            />
            <KpiCard label="Bank accounts" value={String(store.company.bankAccounts.length)} sub={store.company.bankAccounts.map((b) => b.currency).join(', ')} accent="accent" />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <CardHeader icon={<Building2 />} title={store.company.legalName} description={`Trading as ${store.company.tradingName}`} />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="Tax id">{store.company.taxId}</MetaRow>
                <MetaRow label="Registration">{store.company.registrationNo}</MetaRow>
                <MetaRow label="Exporter id">{store.company.exporterId}</MetaRow>
                <MetaRow label="Address">{store.company.addressLine}</MetaRow>
                <MetaRow label="City">{store.company.city}, {store.company.province}</MetaRow>
                <MetaRow label="Phone">{store.company.phone}</MetaRow>
                <MetaRow label="Email">{store.company.email}</MetaRow>
                <MetaRow label="Website">{store.company.website}</MetaRow>
              </CardBody>
              <CardBody className="border-t border-border">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Bank accounts</p>
                <div className="space-y-2">
                  {store.company.bankAccounts.map((b) => (
                    <div key={b.id} className="rounded-lg border border-border bg-surface-sunken px-3 py-2">
                      <p className="text-[12.5px] font-medium text-fg">
                        {b.bankName} <Badge size="sm" tone="neutral">{b.currency}</Badge>
                        {b.primary && <Badge size="sm" tone="primary" className="ml-1">primary</Badge>}
                      </p>
                      <p className="tnum text-[11.5px] text-fg-muted">{b.accountNo}{b.swift ? ` · SWIFT ${b.swift}` : ''}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                icon={<ShieldCheck />}
                title="Licences and certifications"
                description="Our own paperwork. A lapse here is worse than a supplier's: every export filed under an expired licence is challengeable."
              />
              <div className="divide-y divide-border">
                {store.company.licences
                  .slice()
                  .sort((a, b) => (relativeDays(a.expiresAt) ?? 0) - (relativeDays(b.expiresAt) ?? 0))
                  .map((l) => {
                    const left = relativeDays(l.expiresAt) ?? 0
                    return (
                      <div key={l.id} className={cn('px-5 py-3.5', left < store.settings.certificateWarningDays && 'bg-warning-soft/25')}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-fg">{titleCase(l.kind)}</p>
                            <p className="tnum truncate text-[11.5px] text-fg-muted">{l.reference} · {l.issuer}</p>
                          </div>
                          <Badge size="sm" tone={left < 0 ? 'danger' : left < 60 ? 'warning' : 'success'}>
                            {left < 0 ? 'expired' : `${left}d`}
                          </Badge>
                        </div>
                        <p className="mt-1 text-[11.5px] text-fg-subtle">
                          Issued {fmtDate(l.issuedAt)} · expires {fmtDate(l.expiresAt)}
                        </p>
                        {l.note && <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">{l.note}</p>}
                      </div>
                    )
                  })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {view === 'thresholds' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader icon={<SettingsIcon />} title="What the system enforces" description="Change one and the exception list changes with it — nothing here is decoration." />
            <CardBody className="space-y-5">
              <Field label="Target margin" help="The margin an estimator is expected to build into a budget before it goes for approval.">
                <Input value={String(draft.targetMarginPct)} onChange={(e) => setDraft({ ...draft, targetMarginPct: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">%</span>} />
              </Field>
              <Field label="Purchase order approval threshold" help="Above this, an order needs a director's signature rather than the purchasing manager's.">
                <Input value={String(draft.poApprovalThresholdIdr)} onChange={(e) => setDraft({ ...draft, poApprovalThresholdIdr: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">IDR</span>} />
              </Field>
              <Field label="Supplier invoice tolerance" help="How far a supplier invoice may exceed what was received before finance stops it as a variance.">
                <Input value={String(draft.billVarianceTolerancePct)} onChange={(e) => setDraft({ ...draft, billVarianceTolerancePct: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">%</span>} />
              </Field>
              <Field label="Over-receipt tolerance" help="How much more than the ordered quantity the warehouse will still book in.">
                <Input value={String(draft.defaultOverReceiptTolerancePct)} onChange={(e) => setDraft({ ...draft, defaultOverReceiptTolerancePct: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">%</span>} />
              </Field>
              <Field label="Default wastage" help="The allowance the estimator starts from, before adjusting per category.">
                <Input value={String(draft.wastageDefaultPct)} onChange={(e) => setDraft({ ...draft, wastageDefaultPct: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">%</span>} />
              </Field>
              <Field label="Certificate warning window" help="How far ahead a lapsing SVLK, FSC or licence starts raising an exception.">
                <Input value={String(draft.certificateWarningDays)} onChange={(e) => setDraft({ ...draft, certificateWarningDays: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">days</span>} />
              </Field>
              <Field label="Slow-moving threshold" help="Stock untouched for longer than this is called out as money standing still.">
                <Input value={String(draft.slowMovingDays)} onChange={(e) => setDraft({ ...draft, slowMovingDays: Number(e.target.value) || 0 })} trailing={<span className="text-[12px] text-fg-subtle">days</span>} />
              </Field>
              <Button
                variant="primary"
                onClick={() => {
                  store.updateSettings(draft)
                  toast.push({ tone: 'success', title: 'Thresholds saved', description: 'The exception list has been re-evaluated against them.' })
                }}
              >
                Save thresholds
              </Button>
            </CardBody>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader title="Exchange rates" description="The rates orders are converted at. An order keeps the rate it was taken on." />
              <CardBody className="divide-y divide-border py-0">
                {Object.entries(store.settings.fxRates).map(([code, rate]) => (
                  <MetaRow key={code} label={code}>{fmtNumber(rate)} IDR</MetaRow>
                ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Container capacity" description="Usable volume, not internal volume — nothing stacks perfectly." />
              <CardBody className="divide-y divide-border py-0">
                {Object.entries(store.settings.containerCbm)
                  .filter(([, v]) => v > 0)
                  .map(([size, cbm]) => (
                    <MetaRow key={size} label={size}>{cbm} m³</MetaRow>
                  ))}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Document numbering" description="The patterns codes are generated from." />
              <CardBody className="divide-y divide-border py-0">
                {Object.entries(store.settings.numbering).map(([key, pattern]) => (
                  <MetaRow key={key} label={titleCase(key)}>
                    <span className="tnum">{pattern}</span>
                  </MetaRow>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {view === 'people' && (
        <Card>
          <CardHeader icon={<Users />} title="Accounts" description="Sign-in is demonstrated against this list. Three accounts deliberately fail so the unverified, locked and suspended paths can be walked." />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full min-w-[820px] text-[12.5px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="px-5 py-2.5 font-medium">Name</th>
                  <th className="px-5 py-2.5 font-medium">Email</th>
                  <th className="px-5 py-2.5 font-medium">Role</th>
                  <th className="px-5 py-2.5 font-medium">Department</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5 font-medium">Last signed in</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auth.users.map((u) => (
                  <tr key={u.id} className="hover:bg-bg-muted/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">{u.fullName}</p>
                      <p className="text-[11.5px] text-fg-muted">{u.jobTitle}</p>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">{u.email}</td>
                    <td className="px-5 py-3">
                      <Badge size="sm" tone="neutral">{roleLabel(u.role)}</Badge>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">{u.department}</td>
                    <td className="px-5 py-3">
                      <StatusBadge value={u.status} size="sm" />
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {ACCOUNT_STATUSES.find((s) => s.value === u.status)?.hint}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-fg-muted">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}</td>
                    <td className="px-5 py-3 text-right">
                      {u.status === 'LOCKED' && (
                        <Button size="xs" onClick={() => auth.unlock(u.id)}>Unlock</Button>
                      )}
                      {u.status === 'PENDING_VERIFICATION' && (
                        <Button size="xs" onClick={() => auth.verifyEmail(u.email)}>Verify</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'audit' && (
        <Card>
          <CardHeader
            icon={<History />}
            title="Activity"
            description="What has been changed in this browser's copy of the data. There is no backend, so this is the whole audit trail."
            actions={
              store.activity.length > 0 ? (
                <Button size="sm" variant="ghost" onClick={() => store.clearActivity()}>Clear</Button>
              ) : null
            }
          />
          <div className="divide-y divide-border">
            {store.activity.length === 0 && (
              <EmptyState
                title="Nothing has been changed yet"
                description="Approve a budget, book in a delivery or post a stock count and it will appear here."
              />
            )}
            {store.activity.map((a) => (
              <div key={a.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] text-fg">
                    <span className="font-medium">{titleCase(a.action)}</span> · {a.entity} — {a.detail}
                  </p>
                  <p className="text-[11.5px] text-fg-muted">{a.actor}</p>
                </div>
                <span className="shrink-0 text-[11.5px] text-fg-subtle">{fmtDateTime(a.at)}</span>
              </div>
            ))}
          </div>
          <CardBody className="border-t border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12.5px] leading-relaxed text-fg-muted">
                Everything lives in this browser. Resetting puts the seeded operating book back exactly as it shipped —{' '}
                {store.projects.length} orders, {store.budgets.length} budgets, {store.orders.length} purchase orders,{' '}
                {store.receipts.length} deliveries, {fmtNumber(store.movements.length)} stock movements and{' '}
                {store.journal.length} journal entries, across {store.items.length} items and {store.warehouses.length}{' '}
                warehouses.
              </p>
              <Button
                variant="outlineDanger"
                onClick={() => {
                  store.resetDemoData()
                  toast.push({ tone: 'success', title: 'Demo data reset', description: 'The seeded book is back as it shipped.' })
                }}
              >
                Reset demo data
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
