import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react'
import { AuthLayout, AuthNotice } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useAuth, type AuthResult } from '@/store/useAuth'
import { fmtDateTime } from '@/lib/format'

/** Sign-ins the demo can reproduce on demand, including the ones that fail. */
const DEMO_ACCOUNTS = [
  { email: 'elena.marchetti@meridianfreight.com', label: 'Administrator', tone: 'primary' as const },
  { email: 'marcus.bell@meridianfreight.com', label: 'Operations', tone: 'info' as const },
  { email: 'david.chen@meridianfreight.com', label: 'Finance', tone: 'accent' as const },
  { email: 'hana.suzuki@meridianfreight.com', label: 'Unverified', tone: 'warning' as const },
  { email: 'liam.okoro@meridianfreight.com', label: 'Locked', tone: 'danger' as const },
  { email: 'nadia.haddad@meridianfreight.com', label: 'Suspended', tone: 'danger' as const },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, verifyEmail, unlock, users, lastEmail } = useAuth()
  const [email, setEmail] = React.useState(lastEmail || DEMO_ACCOUNTS[0].email)
  const [password, setPassword] = React.useState('Meridian#2026')
  const [remember, setRemember] = React.useState(true)
  const [reveal, setReveal] = React.useState(false)
  const [result, setResult] = React.useState<AuthResult | null>(null)
  const [busy, setBusy] = React.useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const r = signIn(email, password)
    setResult(r)
    setBusy(false)
    if (r.ok) navigate('/', { replace: true })
  }

  const failedUser = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())

  /* Every failure gets a way forward rather than a dead end. */
  const remedyAction = (() => {
    if (!result || result.ok) return null
    if (result.failure === 'UNVERIFIED' || result.failure === 'INVITED') {
      return (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => {
            const v = verifyEmail(email)
            setResult(v.ok ? { ok: false, message: v.message, remedy: 'Sign in with your password now.' } : v)
          }}
        >
          Verify this address
        </Button>
      )
    }
    if (result.failure === 'LOCKED' && failedUser) {
      return (
        <Button
          size="xs"
          variant="secondary"
          onClick={() => {
            unlock(failedUser.id)
            setResult({ ok: false, message: 'Account released.', remedy: 'Try signing in again.' })
          }}
        >
          Release the lock (administrator)
        </Button>
      )
    }
    if (result.failure === 'WRONG_PASSWORD') {
      return (
        <Button size="xs" variant="secondary" asChild>
          <Link to="/forgot-password">Reset the password</Link>
        </Button>
      )
    }
    if (result.failure === 'UNKNOWN_EMAIL') {
      return (
        <Button size="xs" variant="secondary" asChild>
          <Link to="/register">Register instead</Link>
        </Button>
      )
    }
    return null
  })()

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your Meridian Freight work account. Sessions are per browser in this demo build."
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            No account yet?{' '}
            <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
              Register
            </Link>
          </span>
          <span className="text-fg-subtle">Demo password: Meridian#2026</span>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {result && !result.ok && (
          <AuthNotice
            tone={result.failure === 'SUSPENDED' || result.failure === 'LOCKED' ? 'danger' : 'warning'}
            title={result.message ?? 'Sign-in failed.'}
            detail={[
              result.remedy,
              result.attemptsLeft !== undefined
                ? `${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? '' : 's'} left before the account locks.`
                : undefined,
              result.unlocksAt ? `Unlocks ${fmtDateTime(result.unlocksAt)}.` : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
            action={remedyAction}
          />
        )}
        <Field label="Work email" required htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            invalid={result?.failure === 'UNKNOWN_EMAIL'}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@meridianfreight.com"
          />
        </Field>

        <Field
          label="Password"
          required
          htmlFor="password"
          hint={
            <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
              Forgot password?
            </Link>
          }
        >
          <Input
            id="password"
            type={reveal ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            invalid={result?.failure === 'WRONG_PASSWORD'}
            onChange={(e) => setPassword(e.target.value)}
            trailing={
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? 'Hide password' : 'Show password'}
                className="pointer-events-auto rounded p-0.5 text-fg-subtle transition-colors hover:text-fg"
              >
                {reveal ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>

        <Checkbox checked={remember} onChange={setRemember} label="Keep me signed in on this device" />

        <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
          <LogIn />
          Sign in
        </Button>
      </form>

      <div className="mt-7 rounded-lg border border-border bg-bg-muted/60 p-3.5">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-fg-muted">
          <ShieldAlert className="size-3.5" />
          Demo accounts — including the ones that fail
        </p>
        <p className="mt-1 text-[11.5px] leading-relaxed text-fg-subtle">
          Every account uses the same password. The last three exist so the unverified, locked and suspended paths can
          be seen without breaking anything.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email)
                setPassword('Meridian#2026')
                setResult(null)
              }}
              className="rounded-md border border-border-strong/70 bg-surface px-2 py-1 text-left transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
            >
              <span className="block text-[11.5px] font-medium leading-tight text-fg">{a.email.split('@')[0]}</span>
              <Badge tone={a.tone} size="sm" className="mt-1">
                {a.label}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  )
}
