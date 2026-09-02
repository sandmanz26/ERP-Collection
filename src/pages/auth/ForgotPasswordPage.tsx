import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound } from 'lucide-react'
import { AuthLayout, AuthNotice } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AUTH_POLICY } from '@/data/reference'
import { useAuth } from '@/store/useAuth'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const requestReset = useAuth((s) => s.requestReset)
  const lastEmail = useAuth((s) => s.lastEmail)
  const [email, setEmail] = React.useState(lastEmail)
  const [sent, setSent] = React.useState<{ message: string; token?: string } | null>(null)
  const [error, setError] = React.useState<{ message: string; remedy?: string } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = requestReset(email)
    if (result.ok) {
      setSent({ message: result.message ?? 'Request received.', token: result.token })
      setError(null)
    } else {
      setError({ message: result.message ?? 'Request failed.', remedy: result.remedy })
      setSent(null)
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle={`Enter the address on the account. A reset link stays valid for ${AUTH_POLICY.resetTokenMinutes} minutes.`}
      footer={
        <span>
          Remembered it?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {error && <AuthNotice tone="error" message={error.message} remedy={error.remedy} />}
        {sent && (
          <AuthNotice
            tone="success"
            message={sent.message}
            remedy={
              sent.token
                ? 'There is no mail server in this demo, so the link is shown here instead.'
                : 'If the address is registered, the link is on its way.'
            }
            action={
              sent.token ? (
                <div className="space-y-2">
                  <code className="block rounded-lg border border-success/30 bg-surface px-2.5 py-1.5 font-mono text-[12.5px] text-fg">
                    {sent.token}
                  </code>
                  <Button size="sm" variant="primary" onClick={() => navigate(`/reset-password?token=${sent.token}`)}>
                    Open the reset form
                  </Button>
                </div>
              ) : undefined
            }
          />
        )}

        <Field label="Email address" required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nama@tatagemilang.co.id"
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          <KeyRound /> Send reset link
        </Button>
      </form>

      <p className="mt-6 text-[12px] leading-relaxed text-fg-subtle">
        The answer is the same whether or not the address has an account — a reset form that says “no such user” tells an
        attacker which addresses are worth attacking.
      </p>
    </AuthLayout>
  )
}
