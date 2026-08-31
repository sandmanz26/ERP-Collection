import * as React from 'react'
import {
  Banknote, Coins, Cog, Download, Hash, History, RotateCcw, ShieldCheck, Target, Trash2,
} from 'lucide-react'
import type { AppSettings, NumberingSeries } from '@/data/types'
import { useErp } from '@/store/useErp'
import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/checkbox'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, Separator } from '@/components/ui/misc'
import { ConfirmDelete } from '@/components/ui/confirm'
import { exportCsv } from '@/lib/csv'
import { fmtCurrency, fmtDateTime, titleCase } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { defaultSettings } from '@/data/seed2'

export function SettingsPage() {
  const toast = useToast()
  const { settings, activity, updateSettings, clearActivity, resetDemoData } = useErp()
  const [tab, setTab] = React.useState<'company' | 'finance' | 'numbering' | 'targets' | 'audit'>('company')
  const [clearOpen, setClearOpen] = React.useState(false)

  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => updateSettings({ [k]: v } as Partial<AppSettings>)

  const patchSeries = (key: string, patch: Partial<NumberingSeries>) =>
    set('numbering', settings.numbering.map((n) => (n.key === key ? { ...n, ...patch } : n)))

  const preview = (n: NumberingSeries) =>
    `${n.prefix}-${n.includeYear ? `${new Date().getFullYear()}-` : ''}${String(n.nextNumber).padStart(n.padding, '0')}`

  return (
    <>
      <PageHeader
        title="Settings & Audit"
        description="The knobs the rest of the system reads: exchange rates used for ledger translation, tax rates, document numbering, approval thresholds and KPI targets — plus a record of every change made in this workspace."
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              updateSettings(structuredClone(defaultSettings))
              toast.push({ tone: 'success', title: 'Settings restored to defaults' })
            }}
          >
            <RotateCcw /> Restore defaults
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        variant="pill"
        className="mb-4"
        items={[
          { value: 'company', label: 'Company', icon: <Cog /> },
          { value: 'finance', label: 'Currency & tax', icon: <Coins /> },
          { value: 'numbering', label: 'Numbering', icon: <Hash />, count: settings.numbering.length },
          { value: 'targets', label: 'KPI targets', icon: <Target /> },
          { value: 'audit', label: 'Audit trail', icon: <History />, count: activity.length },
        ]}
      />

      {tab === 'company' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader icon={<Cog />} title="Legal entity" description="Printed on quotations, invoices and customs declarations." />
            <CardBody className="grid gap-4">
              <Field label="Company name">
                <Input value={settings.companyName} onChange={(e) => set('companyName', e.target.value)} />
              </Field>
              <Field label="Tax ID (NPWP)">
                <Input value={settings.companyTaxId} onChange={(e) => set('companyTaxId', e.target.value)} className="font-mono" />
              </Field>
              <Field label="Base currency" help="Every report is presented in this currency after translation.">
                <Input value={settings.baseCurrency} disabled />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<ShieldCheck />} title="Approval thresholds" description="Above these values a second approver is required before a line can be locked." />
            <CardBody className="grid gap-4">
              <Field label="Charge approval threshold" hint="IDR" help="Sell-side lines above this need a supervisor.">
                <Input type="number" value={settings.chargeApprovalThreshold} onChange={(e) => set('chargeApprovalThreshold', Number(e.target.value))} className="tnum" />
              </Field>
              <Field label="Vendor bill approval threshold" hint="IDR">
                <Input type="number" value={settings.billApprovalThreshold} onChange={(e) => set('billApprovalThreshold', Number(e.target.value))} className="tnum" />
              </Field>
              <Separator />
              <div className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3 text-[12px] leading-relaxed text-fg-muted">
                Currently a charge above{' '}
                <span className="font-semibold text-fg">{fmtCurrency(settings.chargeApprovalThreshold, 'IDR')}</span> or a bill
                above <span className="font-semibold text-fg">{fmtCurrency(settings.billApprovalThreshold, 'IDR')}</span> is
                flagged for a second pair of eyes.
              </div>
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader icon={<ShieldCheck />} title="Restricted commodities (LARTAS)" description="HS prefixes that require an export permit before the documentation gate opens." />
            <CardBody>
              <Field label="HS prefixes" help="Comma separated. A job whose HS codes start with any of these raises a compliance exception.">
                <Input
                  value={settings.restrictedHsPrefixes.join(', ')}
                  onChange={(e) => set('restrictedHsPrefixes', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  className="font-mono"
                />
              </Field>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {settings.restrictedHsPrefixes.map((p) => (
                  <Badge key={p} tone="warning" size="md">{p}</Badge>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'finance' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader icon={<Banknote />} title="Exchange rates" description="Used to translate charge lines into the ledger. One unit of the currency in IDR." />
            <CardBody className="grid gap-3 sm:grid-cols-2">
              {Object.entries(settings.fxRates).map(([code, rate]) => (
                <Field key={code} label={code} hint={code === 'IDR' ? 'base' : undefined}>
                  <Input
                    type="number"
                    value={rate}
                    disabled={code === 'IDR'}
                    onChange={(e) => set('fxRates', { ...settings.fxRates, [code]: Number(e.target.value) })}
                    className="tnum"
                  />
                </Field>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader icon={<Coins />} title="Tax rates" description="Indonesian VAT and withholding applied on charge lines." />
            <CardBody className="grid gap-4">
              <Field label="VAT — PPN (%)" help="Applied to taxable charge lines on the sell side.">
                <Input type="number" value={settings.vatRate} onChange={(e) => set('vatRate', Number(e.target.value))} className="tnum" />
              </Field>
              <Field label="Withholding — PPh 23 (%)" help="Applied to service lines such as trucking and customs handling.">
                <Input type="number" value={settings.whtRate} onChange={(e) => set('whtRate', Number(e.target.value))} className="tnum" />
              </Field>
              <Separator />
              <div className="rounded-lg border border-border bg-surface-sunken px-3.5 py-3 text-[12px] leading-relaxed text-fg-muted">
                An IDR 100,000,000 taxable line currently carries{' '}
                <span className="font-semibold text-fg">{fmtCurrency((100_000_000 * settings.vatRate) / 100, 'IDR')}</span> of
                output VAT and{' '}
                <span className="font-semibold text-fg">{fmtCurrency((100_000_000 * settings.whtRate) / 100, 'IDR')}</span> of
                withholding where PPh 23 applies.
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {tab === 'numbering' && (
        <Card>
          <CardHeader icon={<Hash />} title="Document numbering" description="Prefix, year segment and padding per document type. The preview shows the next number that will be issued." />
          <div className="scrollbar-thin overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="bg-surface-sunken text-[10.5px] uppercase tracking-[0.06em] text-fg-subtle">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Document</th>
                  <th className="px-4 py-2 text-left font-semibold">Prefix</th>
                  <th className="px-4 py-2 text-center font-semibold">Year</th>
                  <th className="px-4 py-2 text-right font-semibold">Padding</th>
                  <th className="px-4 py-2 text-right font-semibold">Next</th>
                  <th className="px-4 py-2 text-left font-semibold">Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {settings.numbering.map((n) => (
                  <tr key={n.key}>
                    <td className="px-4 py-2 font-medium text-fg">{n.label}</td>
                    <td className="px-4 py-2">
                      <Input value={n.prefix} onChange={(e) => patchSeries(n.key, { prefix: e.target.value })} className="h-8 w-28 font-mono text-[12.5px]" />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <Switch checked={n.includeYear} onChange={(v) => patchSeries(n.key, { includeYear: v })} size="sm" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input type="number" value={n.padding} onChange={(e) => patchSeries(n.key, { padding: Number(e.target.value) })} className="tnum h-8 w-20 text-right text-[12.5px]" />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Input type="number" value={n.nextNumber} onChange={(e) => patchSeries(n.key, { nextNumber: Number(e.target.value) })} className="tnum h-8 w-24 text-right text-[12.5px]" />
                    </td>
                    <td className="px-4 py-2">
                      <span className="rounded bg-surface-sunken px-2 py-1 font-mono text-[12px] text-fg">{preview(n)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'targets' && (
        <Card>
          <CardHeader icon={<Target />} title="KPI targets" description="The operations analytics scorecard measures variance against these." />
          <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Milestone punctuality (%)" help="Share of events landing on or before plan.">
              <Input type="number" value={settings.kpiTargets.onTimePct} onChange={(e) => set('kpiTargets', { ...settings.kpiTargets, onTimePct: Number(e.target.value) })} className="tnum" />
            </Field>
            <Field label="Quote win rate (%)">
              <Input type="number" value={settings.kpiTargets.winRatePct} onChange={(e) => set('kpiTargets', { ...settings.kpiTargets, winRatePct: Number(e.target.value) })} className="tnum" />
            </Field>
            <Field label="Gross margin (%)">
              <Input type="number" value={settings.kpiTargets.grossMarginPct} onChange={(e) => set('kpiTargets', { ...settings.kpiTargets, grossMarginPct: Number(e.target.value) })} className="tnum" />
            </Field>
            <Field label="Days sales outstanding" help="Lower is better.">
              <Input type="number" value={settings.kpiTargets.dsoDays} onChange={(e) => set('kpiTargets', { ...settings.kpiTargets, dsoDays: Number(e.target.value) })} className="tnum" />
            </Field>
            <Field label="Container utilisation (%)">
              <Input type="number" value={settings.kpiTargets.utilisationPct} onChange={(e) => set('kpiTargets', { ...settings.kpiTargets, utilisationPct: Number(e.target.value) })} className="tnum" />
            </Field>
            <Field label="Document accuracy (%)">
              <Input type="number" value={settings.kpiTargets.docAccuracyPct} onChange={(e) => set('kpiTargets', { ...settings.kpiTargets, docAccuracyPct: Number(e.target.value) })} className="tnum" />
            </Field>
          </CardBody>
        </Card>
      )}

      {tab === 'audit' && (
        <Card>
          <CardHeader
            icon={<History />}
            title="Audit trail"
            description="Every create, update, delete and import made in this workspace, newest first."
            actions={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!activity.length}
                  onClick={() => {
                    exportCsv(
                      'audit-trail',
                      activity.map((a) => ({ at: a.at, actor: a.actor, action: a.action, entity: a.entity, detail: a.detail })),
                      [
                        { key: 'at', header: 'Timestamp' }, { key: 'actor', header: 'Actor' },
                        { key: 'action', header: 'Action' }, { key: 'entity', header: 'Entity' },
                        { key: 'detail', header: 'Detail' },
                      ],
                    )
                    toast.push({ tone: 'success', title: 'Audit trail exported' })
                  }}
                >
                  <Download /> Export
                </Button>
                <Button variant="dangerGhost" size="sm" disabled={!activity.length} onClick={() => setClearOpen(true)}>
                  <Trash2 /> Clear
                </Button>
              </>
            }
          />
          {activity.length === 0 ? (
            <EmptyState
              icon={<History />}
              title="Nothing recorded yet"
              description="Create, edit, import or delete something and it will appear here with who did it and when."
            />
          ) : (
            <div className="scrollbar-thin max-h-[560px] divide-y divide-border overflow-y-auto">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-2.5">
                  <Badge
                    tone={a.action === 'delete' ? 'danger' : a.action === 'import' ? 'accent' : a.action === 'convert' ? 'purple' : 'neutral'}
                    size="sm"
                    className="mt-0.5 w-[68px] justify-center"
                  >
                    {titleCase(a.action)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] text-fg">
                      <span className="font-medium">{a.entity}</span>
                      <span className="text-fg-muted"> — {a.detail}</span>
                    </p>
                    <p className="tnum mt-0.5 text-[11px] text-fg-subtle">{fmtDateTime(a.at)} · {a.actor}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="mt-4 border-danger/25">
        <CardHeader
          icon={<RotateCcw />}
          title="Demo workspace"
          description="This build keeps everything in the browser. Resetting restores the seeded dataset, including the deliberate faults that make the guards worth watching."
          className="bg-danger-soft/25"
        />
        <CardBody>
          <Button
            variant="outlineDanger"
            onClick={() => {
              resetDemoData()
              toast.push({ tone: 'success', title: 'Workspace reset', description: 'All modules restored to the seeded dataset.' })
            }}
          >
            <RotateCcw /> Reset all demo data
          </Button>
        </CardBody>
      </Card>

      <ConfirmDelete
        open={clearOpen}
        onOpenChange={setClearOpen}
        entityLabel="audit entry"
        items={[`${activity.length} entries`]}
        destructiveNote="An audit trail exists to be kept. Export it before clearing."
        requireTypedConfirmation
        onConfirm={() => {
          clearActivity()
          toast.push({ tone: 'success', title: 'Audit trail cleared' })
        }}
      />
    </>
  )
}
