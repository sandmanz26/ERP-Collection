import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { AuthLayout, AuthNotice, PasswordRules } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { AUTH_POLICY, USER_ROLES, passwordProblems } from '@/data/reference'
import { useAuth, type AuthResult } from '@/store/useAuth'
import type { UserRole } from '@/data/types'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, verifyEmail } = useAuth()
  const [fullName, setFullName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [jobTitle, setJobTitle] = React.useState('')
  const [role, setRole] = React.useState<UserRole>('OPERATIONS')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [accepted, setAccepted] = React.useState(false)
  const [reveal, setReveal] = React.useState(false)
  const [touched, setTouched] = React.useState(false)
  const [result, setResult] = React.useState<AuthResult | null>(null)

  const problems = passwordProblems(password)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!accepted) {
      setResult({ ok: false, message: 'Accept the standard trading conditions before creating an account.' })
      return
    }
    setResult(register({ fullName, email, jobTitle, role, password, confirm }))
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle={`Registration is open to ${AUTH_POLICY.allowedRegistrationDomains[0]} addresses. Everyone else joins by invitation.`}
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {result && (
          <AuthNotice
            tone={result.ok ? 'success' : 'warning'}
            title={result.message ?? (result.ok ? 'Account created.' : 'Could not create the account.')}
            detail={
              result.ok
                ? 'A verification link would be emailed here. This build has no mail server, so verify it directly.'
                : result.remedy
            }
            action={
              result.ok ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      verifyEmail(email)
                      navigate('/login')
                    }}
                  >
                    Verify and go to sign in
                  </Button>
                  <Button size="xs" variant="ghost" asChild>
                    <Link to="/login">Sign in later</Link>
                  </Button>
                </div>
              ) : result.message?.startsWith('An account already') ? (
                <Button size="xs" variant="secondary" asChild>
                  <Link to="/login">Go to sign in</Link>
                </Button>
              ) : null
            }
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required htmlFor="fullName">
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Amira Yusuf" autoComplete="name" />
          </Field>
          <Field label="Job title" htmlFor="jobTitle">
            <Input id="jobTitle" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Export Documentation Officer" />
          </Field>
        </div>

        <Field label="Work email" required htmlFor="regEmail" help="Only company domains may self-register; anyone else needs an invitation.">
          <Input
            id="regEmail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`you@${AUTH_POLICY.allowedRegistrationDomains[0]}`}
          />
        </Field>

        <Field label="Team" required help="Decides which modules open by default. An administrator can change it later.">
          <Select
            value={role}
            onChange={setRole}
            options={USER_ROLES.map((r) => ({ value: r.value, label: r.label, description: r.hint }))}
          />
        </Field>

        <Field label="Password" required htmlFor="regPassword">
          <Input
            id="regPassword"
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            value={password}
            invalid={touched && problems.length > 0}
            onChange={(e) => {
              setPassword(e.target.value)
              setTouched(true)
            }}
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
        <PasswordRules problems={problems} touched={touched} />

        <Field
          label="Confirm password"
          required
          htmlFor="confirm"
          error={confirm && confirm !== password ? 'The two passwords do not match.' : undefined}
        >
          <Input
            id="confirm"
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            invalid={!!confirm && confirm !== password}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <Checkbox
          checked={accepted}
          onChange={setAccepted}
          label="I accept the ALFI Standard Trading Conditions and the workspace data policy"
        />

        <Button type="submit" variant="primary" size="lg" className="w-full">
          <UserPlus />
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
