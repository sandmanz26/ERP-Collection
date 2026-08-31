import * as React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { AuthLayout, AuthNotice } from './AuthLayout'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { AUTH_POLICY } from '@/data/reference'
import { useAuth } from '@/store/useAuth'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { requestReset } = useAuth()
  const [email, setEmail] = React.useState('')
  const [sent, setSent] = React.useState<{ ok: boolean; message?: string; remedy?: string; token?: string } | null>(null)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setSent(requestReset(email))
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={`We send a single-use link that stays valid for ${AUTH_POLICY.resetTokenMinutes} minutes.`}
      footer={
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={submit} className="space-y-4" noValidate>
        {sent && (
          <AuthNotice
            tone={sent.ok ? 'info' : 'danger'}
            title={sent.message ?? ''}
            detail={
              sent.ok
                ? 'The same answer is given whether or not the address has an account — a reset form should never confirm who is registered.'
                : sent.remedy
            }
            action={
              sent.token ? (
                <div className="space-y-2">
                  <p className="text-[11.5px] leading-relaxed opacity-85">
                    No mail server in this build, so here is the link that would have been emailed:
                  </p>
                  <code className="tnum block truncate rounded border border-border-strong/60 bg-surface px-2 py-1 text-[11.5px] text-fg">
                    {sent.token}
                  </code>
                  <Button size="xs" variant="secondary" onClick={() => navigate(`/reset-password?token=${sent.token}`)}>
                    Open the reset link
                  </Button>
                </div>
              ) : null
            }
          />
        )}

        <Field label="Work email" required htmlFor="resetEmail">
          <Input
            id="resetEmail"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@meridianfreight.com"
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          <MailCheck />
          Send the reset link
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-border bg-bg-muted/60 p-3.5">
        <p className="text-[12px] font-semibold text-fg-muted">Links that will not work</p>
        <ul className="mt-1.5 space-y-1 text-[11.5px] leading-relaxed text-fg-subtle">
          <li>
            <code className="text-fg">MF-RESET-EXPIRED-01</code> — issued two days ago, past its window.
          </li>
          <li>
            <code className="text-fg">MF-RESET-USED-02</code> — already redeemed once.
          </li>
        </ul>
        <p className="mt-2 text-[11.5px] text-fg-subtle">
          Paste either into the{' '}
          <Link to="/reset-password" className="text-primary underline-offset-4 hover:underline">
            reset form
          </Link>{' '}
          to see how each is refused.
        </p>
      </div>
    </AuthLayout>
  )
}
