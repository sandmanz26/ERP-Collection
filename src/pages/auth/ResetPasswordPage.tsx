import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { AuthLayout, AuthNotice, PasswordRules } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { passwordProblems } from '@/data/reference'
import { useAuth, type AuthResult } from '@/store/useAuth'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [token, setToken] = React.useState(params.get('token') ?? '')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [reveal, setReveal] = React.useState(false)
  const [touched, setTouched] = React.useState(false)
  const [result, setResult] = React.useState<AuthResult | null>(null)

  const problems = passwordProblems(password)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    setResult(resetPassword(token, password, confirm))
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="The link can only be used once. Setting a new password also clears any lock on the account."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {result && (
          <AuthNotice
            tone={result.ok ? 'success' : 'danger'}
            title={result.message ?? ''}
            detail={result.remedy}
            action={
              result.ok ? (
                <Button size="xs" variant="secondary" onClick={() => navigate('/login')}>
                  Go to sign in
                </Button>
              ) : /* only a bad link needs a new one — a weak password just needs a better password */
              /^That reset link/.test(result.message ?? '') ? (
                <Button size="xs" variant="secondary" asChild>
                  <Link to="/forgot-password">Request a new link</Link>
                </Button>
              ) : null
            }
          />
        )}

        <Field label="Reset link code" required htmlFor="token" help="Taken from the email. In this demo it is shown on the previous screen.">
          <Input id="token" value={token} onChange={(e) => setToken(e.target.value)} placeholder="MF-RESET-XXXXXX" />
        </Field>

        <Field label="New password" required htmlFor="newPassword">
          <Input
            id="newPassword"
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
          label="Confirm new password"
          required
          htmlFor="confirmNew"
          error={confirm && confirm !== password ? 'The two passwords do not match.' : undefined}
        >
          <Input
            id="confirmNew"
            type={reveal ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            invalid={!!confirm && confirm !== password}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          <KeyRound />
          Set the new password
        </Button>
      </form>
    </AuthLayout>
  )
}
