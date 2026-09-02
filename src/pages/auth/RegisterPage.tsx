import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { AuthLayout, AuthNotice } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { AUTH_POLICY, ROLES, passwordProblems, passwordStrength } from '@/data/reference'
import { useAuth } from '@/store/useAuth'
import type { UserRole } from '@/data/types'

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuth((s) => s.register)
  const verifyEmail = useAuth((s) => s.verifyEmail)
  const [form, setForm] = React.useState({
    fullName: '', email: '', jobTitle: '', role: 'AREA_COORDINATOR' as UserRole, password: '', confirm: '',
  })
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState<{ message: string; remedy?: string } | null>(null)
  const [done, setDone] = React.useState(false)

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))
  const strength = passwordStrength(form.password)
  const problems = passwordProblems(form.password)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = register(form)
    if (result.ok) {
      setDone(true)
      setError(null)
    } else {
      setError({ message: result.message ?? 'Registration failed.', remedy: result.remedy })
    }
  }

  if (done) {
    return (
      <AuthLayout
        title="Account created"
        subtitle="One step left before the account can sign in."
        footer={
          <span>
            Already verified?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Go to sign in
            </Link>
          </span>
        }
      >
        <AuthNotice
          tone="success"
          message={`A verification link has been sent to ${form.email}.`}
          remedy="There is no mail server in this demo, so verify the address here instead."
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                verifyEmail(form.email)
                navigate('/login')
              }}
            >
              Verify and continue to sign in
            </Button>
          }
        />
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Register"
      subtitle={`Accounts are limited to @${AUTH_POLICY.allowedRegistrationDomains[0]} addresses. Anyone outside the company is invited by an administrator instead.`}
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <AuthNotice tone="error" message={error.message} remedy={error.remedy} />}

        <Field label="Full name" required>
          <Input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Dewi Anggraini" />
        </Field>

        <Field label="Company email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="nama@tatagemilang.co.id"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Job title">
            <Input value={form.jobTitle} onChange={(e) => set('jobTitle', e.target.value)} placeholder="Koordinator Area" />
          </Field>
          <Field label="Role" help="Determines which modules the account can work in once an administrator approves it.">
            <Select
              value={form.role}
              onChange={(v) => set('role', v)}
              options={ROLES.filter((r) => r.value !== 'DIRECTOR').map((r) => ({
                value: r.value, label: r.label, description: r.description,
              }))}
            />
          </Field>
        </div>

        <Field label="Password" required>
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            trailing={
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff /> : <Eye />}
              </button>
            }
          />
        </Field>

        {form.password && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1 flex-1 rounded-full',
                      i < strength.score
                        ? strength.tone === 'danger'
                          ? 'bg-danger'
                          : strength.tone === 'warning'
                            ? 'bg-warning'
                            : 'bg-success'
                        : 'bg-neutral-soft',
                    )}
                  />
                ))}
              </div>
              <span
                className={cn(
                  'text-[11.5px] font-semibold',
                  strength.tone === 'danger' && 'text-danger',
                  strength.tone === 'warning' && 'text-warning',
                  strength.tone === 'success' && 'text-success',
                )}
              >
                {strength.label}
              </span>
            </div>
            {problems.length > 0 && (
              <p className="text-[11.5px] text-fg-muted">Still needs: {problems.join(', ').toLowerCase()}.</p>
            )}
          </div>
        )}

        <Field
          label="Confirm password"
          required
          error={form.confirm && form.confirm !== form.password ? 'The two passwords do not match' : undefined}
        >
          <Input
            type={show ? 'text' : 'password'}
            autoComplete="new-password"
            value={form.confirm}
            onChange={(e) => set('confirm', e.target.value)}
            invalid={!!form.confirm && form.confirm !== form.password}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          <UserPlus /> Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
