import * as React from 'react'
import { Building2, History, RotateCcw, Settings as SettingsIcon, ShieldCheck, Users } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Because, MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/field'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Separator } from '@/components/ui/misc'
import { Tooltip } from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/toast'
import { useMfg } from '@/store/useMfg'
import { useAuth } from '@/store/useAuth'
import { ACCOUNT_STATUSES, LICENCE_WARNING_DAYS, roleLabel } from '@/data/reference'
import { fmtDate, fmtDateTime, fmtNumber, fmtPercent, relativeLabel } from '@/lib/format'
import { daysBetween, TODAY } from '@/data/clock'

export function SettingsPage() {
  const s = useMfg()
  const toast = useToast()
  const users = useAuth((x) => x.users)
  const [tab, setTab] = React.useState<'company' | 'rates' | 'users' | 'audit'>('company')

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow={<Badge tone="primary" size="sm"><SettingsIcon className="size-3" /> Insight</Badge>}
        title="Settings & audit"
        description="The parameters every rule in the system reads from, the licences that make the imports lawful, and the trail of what has been done in this browser."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              s.reseed()
              toast.push({ tone: 'success', title: 'Demo data restored', description: 'Every module is back to the seeded operating book.' })
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        variant="pill"
        items={[
          { value: 'company', label: 'Company & licences' },
          { value: 'rates', label: 'Rates & tolerances' },
          { value: 'users', label: 'Users', count: users.length },
          { value: 'audit', label: 'Audit trail', count: s.activity.length },
        ]}
      />

      {tab === 'company' && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Card>
            <CardHeader icon={<Building2 />} title="Company" />
            <CardBody className="divide-y divide-border py-0">
              <MetaRow label="Legal name">{s.company.legalName}</MetaRow>
              <MetaRow label="Trading as">{s.company.brandName}</MetaRow>
              <MetaRow label="NPWP">{s.company.taxId}</MetaRow>
              <MetaRow label="Address"><span className="text-right">{s.company.address}</span></MetaRow>
              <MetaRow label="City">{s.company.city}</MetaRow>
              <MetaRow label="Phone">{s.company.phone}</MetaRow>
              <MetaRow label="Email">{s.company.email}</MetaRow>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              icon={<ShieldCheck />}
              title="Licences & certifications"
              description={`Anything inside ${LICENCE_WARNING_DAYS} days of expiry raises an exception, because every one of these takes longer to renew than anybody plans for.`}
            />
            <CardBody className="p-0">
              <div className="divide-y divide-border">
                {s.company.licences.map((l) => {
                  const days = l.expiresAt ? daysBetween(TODAY, l.expiresAt) : null
                  const warn = days !== null && days <= LICENCE_WARNING_DAYS
                  return (
                    <div key={l.id} className={`px-4 py-3 ${warn ? 'bg-warning-soft/25' : ''}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[12.5px] font-semibold text-fg">{l.kind.replace(/_/g, ' ')}</p>
                          <p className="truncate font-mono text-[11.5px] text-fg-muted">{l.number}</p>
                          <p className="text-[11px] text-fg-subtle">{l.authority}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="tnum text-[12px] text-fg-muted">issued {fmtDate(l.issuedAt)}</p>
                          {l.expiresAt ? (
                            <p className={`tnum text-[12.5px] font-medium ${warn ? 'text-danger' : 'text-fg'}`}>
                              expires {fmtDate(l.expiresAt)} · {relativeLabel(l.expiresAt)}
                            </p>
                          ) : (
                            <p className="text-[12px] text-fg-subtle">no expiry</p>
                          )}
                        </div>
                      </div>
                      {l.note && <Because className="mt-1">{l.note}</Because>}
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'rates' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader title="Tax & import" description="What the landed-cost engine and the customs screens read from." />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="PPN rate (%)">
                  <Input
                    type="number"
                    value={s.settings.vatRate}
                    onChange={(e) => s.updateSettings({ vatRate: Number(e.target.value) })}
                  />
                </Field>
                <Field label="PPh 22 rate (%)" hint={s.settings.hasApi ? 'With an API-P' : 'Without an API — 7.5%'}>
                  <Input
                    type="number"
                    step="0.1"
                    value={s.settings.pph22Rate}
                    onChange={(e) => s.updateSettings({ pph22Rate: Number(e.target.value) })}
                  />
                </Field>
              </div>
              <Because>
                Holding an API-P is worth five points of PPh 22 on every consignment. It is a prepayment rather than a cost, so
                it never enters inventory — but it is five points of working capital tied up on every container either way.
              </Because>
              <Separator />
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-fg-subtle">Exchange rates</p>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                    <th className="pb-1 font-medium">Currency</th>
                    <th className="pb-1 text-right font-medium">Settlement</th>
                    <th className="pb-1 text-right font-medium">NDPBM</th>
                    <th className="pb-1 text-right font-medium">Gap</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(s.settings.fxRates)
                    .filter((c) => c !== 'IDR')
                    .map((c) => {
                      const spot = s.settings.fxRates[c]
                      const nd = s.settings.ndpbmRates[c] ?? spot
                      return (
                        <tr key={c} className="border-t border-border/70">
                          <td className="py-1.5 text-[12.5px] font-medium text-fg">{c}</td>
                          <td className="py-1.5 text-right"><span className="tnum text-[12px]">{fmtNumber(spot)}</span></td>
                          <td className="py-1.5 text-right"><span className="tnum text-[12px] text-fg-muted">{fmtNumber(nd)}</span></td>
                          <td className="py-1.5 text-right">
                            <span className={`tnum text-[12px] ${spot > nd ? 'text-danger' : 'text-success'}`}>
                              {spot > nd ? '+' : ''}{fmtNumber(spot - nd)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
              <Because>
                Duty is computed on the Minister of Finance rate; the supplier is paid at the market one. The gap is a real
                variance on every consignment, and it is invisible in any system that keeps a single rate.
              </Because>
            </CardBody>
          </Card>

          <div className="flex flex-col gap-5">
            <Card>
              <CardHeader title="Planning tolerances" />
              <CardBody className="space-y-4">
                <Field label="MRP horizon (days)">
                  <Input type="number" value={s.settings.mrpHorizonDays} onChange={(e) => s.updateSettings({ mrpHorizonDays: Number(e.target.value) })} />
                </Field>
                <Field label="Cost variance tolerance (%)" hint="Beyond this a work order raises an exception rather than waiting for month end">
                  <Input
                    type="number"
                    value={s.settings.costVarianceTolerance * 100}
                    onChange={(e) => s.updateSettings({ costVarianceTolerance: Number(e.target.value) / 100 })}
                  />
                </Field>
                <Field label="Permit warning (days)" hint="How early an expiring permit starts shouting">
                  <Input type="number" value={s.settings.permitWarningDays} onChange={(e) => s.updateSettings({ permitWarningDays: Number(e.target.value) })} />
                </Field>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Targets" description="What the analytics page measures against." />
              <CardBody className="divide-y divide-border py-0">
                <MetaRow label="On-time delivery">{fmtPercent(s.settings.kpiTargets.onTimeDeliveryPercent, 0)}</MetaRow>
                <MetaRow label="First-pass yield">{fmtPercent(s.settings.kpiTargets.firstPassYieldPercent, 0)}</MetaRow>
                <MetaRow label="Scrap rate">{fmtPercent(s.settings.kpiTargets.scrapRatePercent, 0)}</MetaRow>
                <MetaRow label="Material yield">{fmtPercent(s.settings.kpiTargets.materialYieldPercent, 0)}</MetaRow>
                <MetaRow label="Work-centre utilisation">{fmtPercent(s.settings.kpiTargets.workCentreUtilisationPercent, 0)}</MetaRow>
                <MetaRow label="Import lead time">{s.settings.kpiTargets.importLeadDays} days</MetaRow>
                <MetaRow label="Gross margin">{fmtPercent(s.settings.kpiTargets.grossMarginPercent, 0)}</MetaRow>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Numbering" />
              <CardBody className="space-y-1.5">
                {s.settings.numbering.map((n) => (
                  <div key={n.key} className="flex items-center justify-between gap-3 border-b border-border pb-1.5 last:border-0">
                    <span className="text-[12.5px] text-fg">{n.label}</span>
                    <span className="font-mono text-[12px] text-fg-muted">
                      {n.prefix}-{n.withYear ? `${new Date().getFullYear()}-` : ''}{String(n.nextNumber).padStart(n.padding, '0')}
                    </span>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <Card>
          <CardHeader icon={<Users />} title="User accounts" description="Seeded accounts, including three that deliberately fail so those paths can be walked. Everyone signs in with Wanakarya#2026." />
          <CardBody className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-[0.06em] text-fg-subtle">
                  <th className="py-2 pl-4 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Status</th>
                  <th className="py-2 pr-4 text-right font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/70 last:border-0">
                    <td className="py-2 pl-4">
                      <p className="text-[12.5px] font-medium text-fg">{u.fullName}</p>
                      <p className="text-[11px] text-fg-muted">{u.jobTitle}</p>
                    </td>
                    <td className="px-2 py-2"><Badge tone="outline" size="sm">{roleLabel(u.role)}</Badge></td>
                    <td className="px-2 py-2"><span className="font-mono text-[11.5px] text-fg-muted">{u.email}</span></td>
                    <td className="px-2 py-2">
                      <Tooltip content={ACCOUNT_STATUSES.find((x) => x.value === u.status)?.hint ?? ''}>
                        <span><StatusBadge value={u.status} size="sm" /></span>
                      </Tooltip>
                    </td>
                    <td className="py-2 pr-4 text-right">
                      <span className="tnum text-[12px] text-fg-muted">{u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader icon={<History />} title="Activity" description="What has been done in this browser since the book was seeded." />
          <CardBody className="p-0">
            {s.activity.length === 0 && (
              <EmptyState
                icon={<History />}
                title="Nothing recorded yet"
                description="Release a work order, advance a shipment or close a kiln batch, and it will appear here."
              />
            )}
            <div className="divide-y divide-border">
              {s.activity.map((a) => (
                <div key={a.id} className="flex flex-wrap items-baseline justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-[12.5px] text-fg">
                      <span className="font-medium">{a.action}</span> · {a.entity} — {a.detail}
                    </p>
                  </div>
                  <span className="tnum shrink-0 text-[11.5px] text-fg-muted">{a.actor} · {fmtDateTime(a.at)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}
