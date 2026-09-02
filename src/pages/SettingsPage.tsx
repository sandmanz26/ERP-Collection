import * as React from 'react'
import { Building2, KeyRound, RotateCcw, ScrollText, ShieldCheck, Users } from 'lucide-react'
import { useErp } from '@/store/useErp'
import { useAuth, useCurrentUser } from '@/store/useAuth'
import { PageHeader } from '@/components/shared/PageHeader'
import { MetaRow, StatusBadge } from '@/components/shared/status'
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { AUTH_POLICY, roleLabel } from '@/data/reference'
import { fmtDateTime } from '@/lib/format'

export function SettingsPage() {
  const toast = useToast()
  const { company, updateCompany, activity, resetDemoData } = useErp()
  const { users, unlock, resetAuthDemo } = useAuth()
  const me = useCurrentUser()
  const [tab, setTab] = React.useState<'company' | 'accounts' | 'activity'>('company')
  const [draft, setDraft] = React.useState(company)

  React.useEffect(() => setDraft(company), [company])
  const dirty = JSON.stringify(draft) !== JSON.stringify(company)

  return (
    <>
      <PageHeader
        title="Settings"
        description="The company record printed on every contract, the accounts that can sign in, and what has been changed in this browser."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              resetDemoData()
              resetAuthDemo()
              toast.push({ tone: 'success', title: 'Demo data restored', description: 'Every module and every account is back to the seeded dataset.' })
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'company', label: 'Company profile', icon: <Building2 /> },
          { value: 'accounts', label: 'Accounts', icon: <Users />, count: users.length },
          { value: 'activity', label: 'Activity', icon: <ScrollText />, count: activity.length },
        ]}
      />

      {tab === 'company' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Company profile" icon={<Building2 />} description="Used on contracts, invoices and the sign-in screen." />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Legal name" className="sm:col-span-2">
                <Input value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} />
              </Field>
              <Field label="Brand name">
                <Input value={draft.brandName} onChange={(e) => setDraft({ ...draft, brandName: e.target.value })} />
              </Field>
              <Field label="Registration number">
                <Input value={draft.registrationNo} onChange={(e) => setDraft({ ...draft, registrationNo: e.target.value })} className="font-mono" />
              </Field>
              <Field label="NPWP">
                <Input value={draft.npwp} onChange={(e) => setDraft({ ...draft, npwp: e.target.value })} className="font-mono" />
              </Field>
              <Field label="Security service licence">
                <Input value={draft.licenceNo} onChange={(e) => setDraft({ ...draft, licenceNo: e.target.value })} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <Input value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
              </Field>
              <Field label="City">
                <Input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
              </Field>
              <Field label="Province">
                <Input value={draft.province} onChange={(e) => setDraft({ ...draft, province: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </Field>
              <Field label="Website">
                <Input value={draft.website} onChange={(e) => setDraft({ ...draft, website: e.target.value })} />
              </Field>
              <Field label="Director">
                <Input value={draft.director} onChange={(e) => setDraft({ ...draft, director: e.target.value })} />
              </Field>
            </CardBody>
            <CardFooter>
              <span className="text-[12px] text-fg-muted">{dirty ? 'Unsaved changes' : 'Saved'}</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={!dirty} onClick={() => setDraft(company)}>
                  Discard
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!dirty}
                  onClick={() => {
                    updateCompany(draft)
                    toast.push({ tone: 'success', title: 'Company profile saved' })
                  }}
                >
                  Save profile
                </Button>
              </div>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader title="Your account" icon={<ShieldCheck />} />
            <CardBody className="divide-y divide-border py-1">
              <MetaRow label="Name">{me?.fullName ?? '—'}</MetaRow>
              <MetaRow label="Email">{me?.email ?? '—'}</MetaRow>
              <MetaRow label="Job title">{me?.jobTitle ?? '—'}</MetaRow>
              <MetaRow label="Role">{me ? roleLabel(me.role) : '—'}</MetaRow>
              <MetaRow label="Branch">{me?.branchCode ?? '—'}</MetaRow>
              <MetaRow label="Two-factor">{me?.twoFactorEnabled ? 'Enabled' : 'Not enabled'}</MetaRow>
              <MetaRow label="Last sign-in">{me?.lastLoginAt ? fmtDateTime(me.lastLoginAt) : '—'}</MetaRow>
            </CardBody>
            <CardFooter className="justify-start">
              <p className="text-[11.5px] leading-relaxed text-fg-muted">
                Sign-in policy: at least {AUTH_POLICY.minPasswordLength} characters, locked for {AUTH_POLICY.lockMinutes} minutes
                after {AUTH_POLICY.maxFailedAttempts} failed attempts, reset links valid {AUTH_POLICY.resetTokenMinutes} minutes.
              </p>
            </CardFooter>
          </Card>
        </div>
      )}

      {tab === 'accounts' && (
        <Card>
          <CardHeader
            title="Accounts"
            icon={<Users />}
            description="Sign-in is demonstrated against this list; there is no server behind it."
            actions={<Badge tone="outline" size="md">{users.filter((u) => u.status === 'ACTIVE').length} active</Badge>}
          />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-[13px]">
              <thead>
                <tr>
                  {['Name', 'Email', 'Role', 'Branch', 'Status', 'Last sign-in', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.id === me?.id ? 'bg-primary-soft/40' : undefined}>
                    <td className="border-b border-border px-3 py-2.5">
                      <p className="font-medium text-fg">{u.fullName}</p>
                      <p className="text-[11.5px] text-fg-muted">{u.jobTitle}</p>
                    </td>
                    <td className="border-b border-border px-3 py-2.5 text-[12.5px] text-fg-muted">{u.email}</td>
                    <td className="border-b border-border px-3 py-2.5">
                      <Badge tone="outline" size="sm">{roleLabel(u.role)}</Badge>
                    </td>
                    <td className="border-b border-border px-3 py-2.5 text-[12.5px] text-fg-muted">{u.branchCode ?? '—'}</td>
                    <td className="border-b border-border px-3 py-2.5">
                      <StatusBadge value={u.status} size="sm" />
                    </td>
                    <td className="tnum whitespace-nowrap border-b border-border px-3 py-2.5 text-[12px] text-fg-muted">
                      {u.lastLoginAt ? fmtDateTime(u.lastLoginAt) : 'never'}
                    </td>
                    <td className="border-b border-border px-3 py-2.5 text-right">
                      {u.status === 'LOCKED' && (
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => {
                            unlock(u.id)
                            toast.push({ tone: 'success', title: 'Account released', description: u.email })
                          }}
                        >
                          <KeyRound /> Release
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CardFooter className="justify-start">
            <p className="text-[11.5px] leading-relaxed text-fg-muted">
              Every seeded account uses the password <span className="font-mono text-fg">Gemilang#2026</span>. Three of them fail
              on purpose — unverified, locked and suspended — so those paths can be walked from the sign-in screen.
            </p>
          </CardFooter>
        </Card>
      )}

      {tab === 'activity' && (
        <Card>
          <CardHeader title="Activity" icon={<ScrollText />} description="Every create, update, delete and import made in this browser." />
          {activity.length === 0 ? (
            <EmptyState icon={<ScrollText />} title="Nothing logged yet" description="Create or edit a record and it appears here." />
          ) : (
            <div className="scrollbar-thin max-h-[560px] overflow-y-auto">
              <table className="w-full border-separate border-spacing-0 text-[13px]">
                <thead>
                  <tr>
                    {['When', 'Action', 'Entity', 'Detail', 'By'].map((h) => (
                      <th key={h} className="sticky top-0 whitespace-nowrap border-b border-border bg-surface-sunken px-3 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.055em] text-fg-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.map((a) => (
                    <tr key={a.id}>
                      <td className="tnum whitespace-nowrap border-b border-border px-3 py-2 text-[12px] text-fg-muted">{fmtDateTime(a.at)}</td>
                      <td className="border-b border-border px-3 py-2">
                        <Badge tone={a.action === 'Deleted' ? 'danger' : a.action === 'Created' ? 'success' : 'neutral'} size="sm">
                          {a.action}
                        </Badge>
                      </td>
                      <td className="border-b border-border px-3 py-2 text-[12.5px] text-fg">{a.entity}</td>
                      <td className="border-b border-border px-3 py-2 text-[12.5px] text-fg-muted">{a.detail}</td>
                      <td className="border-b border-border px-3 py-2 text-[12px] text-fg-muted">{a.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  )
}
