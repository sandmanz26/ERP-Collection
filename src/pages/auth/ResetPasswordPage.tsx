import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { AuthLayout, AuthNotice } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { passwordProblems, passwordStrength } from '@/data/reference'
import { useAuth } from '@/store/useAuth'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const resetPassword = useAuth((s) => s.resetPassword)
  const [token, setToken] = React.useState(params.get('token') ?? '')
  const [password, setPassword] = React.useState('')
  const [confirm, setConfirm] = React.useState('')
  const [show, setShow] = React.useState(false)
  const [error, setError] = React.useState<{ message: string; remedy?: string } | null>(null)
  const [done, setDone] = React.useState(false)

  const strength = passwordStrength(password)
  const problems = passwordProblems(password)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = resetPassword(token, password, confirm)
    if (result.ok) {
      setDone(true)
      setError(null)
    } else {
      setError({ message: result.message ?? 'Reset failed.', remedy: result.remedy })
    }
  }

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Paste the reset link code and choose a password you have not used here before."
      footer={
        <span>
          Link expired?{' '}
          <Link to="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new one
          </Link>
        </span>
      }
    >
      {done ? (
        <AuthNotice
          tone="success"
          message="Password changed."
          remedy="The reset link has been used and cannot be used again."
          action={
            <Button size="sm" variant="primary" onClick={() => navigate('/login')}>
              Continue to sign in
            </Button>
          }
        />
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <AuthNotice tone="error" message={error.message} remedy={error.remedy} />}

          <Field label="Reset code" required help="Sent by email in a real deployment; shown on screen in this demo.">
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="TG-RESET-XXXXXX" className="font-mono" />
          </Field>

          <Field label="New password" required>
            <Input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              trailing={
                <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff /> : <Eye />}
                </button>
              }
            />
          </Field>

          {password && (
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
                <span className="text-[11.5px] font-semibold text-fg-muted">{strength.label}</span>
              </div>
              {problems.length > 0 && (
                <p className="text-[11.5px] text-fg-muted">Still needs: {problems.join(', ').toLowerCase()}.</p>
              )}
            </div>
          )}

          <Field
            label="Confirm new password"
            required
            error={confirm && confirm !== password ? 'The two passwords do not match' : undefined}
          >
            <Input
              type={show ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              invalid={!!confirm && confirm !== password}
            />
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full">
            <ShieldCheck /> Change password
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
