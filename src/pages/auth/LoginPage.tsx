import * as React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { AuthLayout, AuthNotice } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/store/useAuth'
import type { AuthResult } from '@/store/useAuth'
import { fmtDateTime } from '@/lib/format'

/** The seeded accounts, including the three that deliberately fail. */
const DEMO = [
  { email: 'hendra.wijayanto@tatagemilang.co.id', label: 'Super Administrator', note: 'every module' },
  { email: 'siti.rahmawati@tatagemilang.co.id', label: 'Operation Manager', note: 'no inventory edits' },
  { email: 'lina.marlina@tatagemilang.co.id', label: 'Warehouse Admin', note: 'deletes revoked' },
  { email: 'ratna.wulandari@tatagemilang.co.id', label: 'Site Supervisor', note: 'custom role, no clients' },
  { email: 'budi.santoso@tatagemilang.co.id', label: 'Unverified', note: 'email never verified' },
  { email: 'rina.kusuma@tatagemilang.co.id', label: 'Locked', note: 'five failed attempts' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, verifyEmail, unlock, users, lastEmail } = useAuth()
  const [email, setEmail] = React.useState(lastEmail || 'siti.rahmawati@tatagemilang.co.id')
  const [password, setPassword] = React.useState('Gemilang#2026')
  const [show, setShow] = React.useState(false)
  const [remember, setRemember] = React.useState(true)
  const [result, setResult] = React.useState<AuthResult | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)

  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setNotice(null)
    const outcome = signIn(email, password)
    setResult(outcome)
    if (outcome.ok) navigate(from, { replace: true })
  }

  const account = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use a Tata Gemilang account — every seeded one uses the password Gemilang#2026. Each lands on a different set of modules, because the role decides what opens."
      footer={
        <span>
          No account yet?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register with a company email
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {result && !result.ok && (
          <AuthNotice
            tone="error"
            message={result.message ?? 'Sign-in failed.'}
            remedy={
              result.failure === 'LOCKED' && result.unlocksAt
                ? `${result.remedy} It unlocks at ${fmtDateTime(result.unlocksAt)}.`
                : result.remedy
            }
            action={
              result.failure === 'UNVERIFIED' ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const done = verifyEmail(email)
                    setResult(null)
                    setNotice(done.message ?? null)
                  }}
                >
                  Verify this address now
                </Button>
              ) : result.failure === 'LOCKED' && account ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    unlock(account.id)
                    setResult(null)
                    setNotice('Account released. Sign in again.')
                  }}
                >
                  Release the lock (administrator)
                </Button>
              ) : undefined
            }
          />
        )}
        {result && !result.ok && result.attemptsLeft !== undefined && result.attemptsLeft > 0 && (
          <p className="text-[12px] text-fg-muted">
            {result.attemptsLeft} attempt{result.attemptsLeft === 1 ? '' : 's'} left before the account locks.
          </p>
        )}
        {notice && <AuthNotice tone="success" message={notice} />}

        <Field label="Email address" required htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@tatagemilang.co.id"
            invalid={result?.failure === 'UNKNOWN_EMAIL'}
          />
        </Field>

        <Field
          label="Password"
          required
          htmlFor="password"
          hint={
            <Link to="/forgot-password" className="font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          }
        >
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            invalid={result?.failure === 'WRONG_PASSWORD'}
            trailing={
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>

        <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in on this device" />

        <Button type="submit" variant="primary" size="lg" className="w-full">
          <LogIn /> Sign in
        </Button>
      </form>

      <div className="mt-7 rounded-xl border border-border bg-surface-sunken p-3.5">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Demo accounts</p>
        <div className="mt-2 space-y-1">
          {DEMO.map((d) => (
            <button
              key={d.email}
              onClick={() => {
                setEmail(d.email)
                setPassword('Gemilang#2026')
                setResult(null)
                setNotice(null)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-fg">{d.label}</span>
                <span className="block truncate text-[11px] text-fg-subtle">{d.email}</span>
              </span>
              <span className="shrink-0 text-[11px] text-fg-subtle">{d.note}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
