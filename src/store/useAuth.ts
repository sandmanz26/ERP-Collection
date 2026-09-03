import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PasswordResetToken, UserAccount, UserStatus } from '@/data/types'
import { AUTH_POLICY, passwordProblems } from '@/data/reference'
import { resetTokens as seedTokens, users as seedUsers } from '@/data/seed-org'

/**
 * DEMO AUTHENTICATION.
 *
 * There is no backend in this build, so the whole sign-in flow runs against a
 * seeded user list held in the browser. It exists to exercise the *interface* —
 * lockouts, unverified accounts, expired reset links — not to protect anything.
 * A real deployment authenticates on the server, stores only a hash, and never
 * lets a credential reach the client.
 */

export type AuthFailure =
  | 'UNKNOWN_EMAIL'
  | 'WRONG_PASSWORD'
  | 'LOCKED'
  | 'SUSPENDED'
  | 'UNVERIFIED'
  | 'INVITED'

export interface AuthResult {
  ok: boolean
  failure?: AuthFailure
  message?: string
  /** What the person can actually do about it. */
  remedy?: string
  attemptsLeft?: number
  unlocksAt?: string
}

interface AuthState {
  users: UserAccount[]
  tokens: PasswordResetToken[]
  currentUserId: string | null
  lastEmail: string

  signIn: (email: string, password: string) => AuthResult
  signOut: () => void
  register: (input: {
    fullName: string; email: string; jobTitle: string; roleId: string; password: string; confirm: string
  }) => AuthResult
  verifyEmail: (email: string) => AuthResult
  requestReset: (email: string) => AuthResult & { token?: string }
  resetPassword: (token: string, password: string, confirm: string) => AuthResult
  unlock: (userId: string) => void
  resetAuthDemo: () => void

  /* ---- account administration, gated by the users.* privileges ---- */
  upsertUser: (user: UserAccount) => void
  removeUsers: (ids: string[]) => void
  setUserStatus: (id: string, status: UserStatus) => void
  /** Issues a temporary password and forces a change at next sign-in. */
  forcePasswordReset: (id: string) => string
}

const now = () => new Date().toISOString()
const norm = (e: string) => e.trim().toLowerCase()

const seedState = () => ({
  users: structuredClone(seedUsers),
  tokens: structuredClone(seedTokens),
  currentUserId: null as string | null,
  lastEmail: '',
})

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      ...seedState(),

      signIn: (email, password) => {
        const key = norm(email)
        const user = get().users.find((u) => norm(u.email) === key)
        set({ lastEmail: email })

        if (!user) {
          return {
            ok: false,
            failure: 'UNKNOWN_EMAIL',
            message: 'No account uses that email address.',
            remedy: 'Check the spelling, or register if this is your first sign-in.',
          }
        }

        /* A lock that has aged out clears itself before anything else is checked. */
        if (user.status === 'LOCKED' && user.lockedUntil && new Date(user.lockedUntil) <= new Date()) {
          set((s) => ({
            users: s.users.map((u) =>
              u.id === user.id ? { ...u, status: 'ACTIVE', failedAttempts: 0, lockedUntil: undefined } : u,
            ),
          }))
          user.status = 'ACTIVE'
          user.failedAttempts = 0
        }

        if (user.status === 'SUSPENDED') {
          return {
            ok: false,
            failure: 'SUSPENDED',
            message: 'This account has been suspended.',
            remedy: 'An administrator disabled it. Contact the operations manager to have it restored.',
          }
        }
        if (user.status === 'LOCKED') {
          return {
            ok: false,
            failure: 'LOCKED',
            message: `Locked after ${AUTH_POLICY.maxFailedAttempts} failed attempts.`,
            remedy: 'It unlocks automatically, or an administrator can release it now.',
            unlocksAt: user.lockedUntil,
          }
        }
        if (user.status === 'PENDING_VERIFICATION') {
          return {
            ok: false,
            failure: 'UNVERIFIED',
            message: 'This email address has not been verified yet.',
            remedy: 'Open the verification link sent when the account was created. In this demo you can verify it from the sign-in screen.',
          }
        }
        if (user.status === 'INVITED') {
          return {
            ok: false,
            failure: 'INVITED',
            message: 'This invitation has not been accepted.',
            remedy: 'Set a password through the invitation link before signing in.',
          }
        }

        if (user.password !== password) {
          const attempts = user.failedAttempts + 1
          const locked = attempts >= AUTH_POLICY.maxFailedAttempts
          const lockedUntil = locked ? new Date(Date.now() + AUTH_POLICY.lockMinutes * 60_000).toISOString() : undefined
          set((s) => ({
            users: s.users.map((u) =>
              u.id === user.id ? { ...u, failedAttempts: attempts, status: locked ? 'LOCKED' : u.status, lockedUntil } : u,
            ),
          }))
          if (locked) {
            return {
              ok: false,
              failure: 'LOCKED',
              message: `Account locked after ${AUTH_POLICY.maxFailedAttempts} failed attempts.`,
              remedy: `Try again in ${AUTH_POLICY.lockMinutes} minutes, or ask an administrator to release it.`,
              unlocksAt: lockedUntil,
            }
          }
          return {
            ok: false,
            failure: 'WRONG_PASSWORD',
            message: 'That password is not correct.',
            remedy: 'Reset it from “Forgot password” if you are not sure.',
            attemptsLeft: AUTH_POLICY.maxFailedAttempts - attempts,
          }
        }

        set((s) => ({
          currentUserId: user.id,
          users: s.users.map((u) =>
            u.id === user.id ? { ...u, failedAttempts: 0, lockedUntil: undefined, lastLoginAt: now() } : u,
          ),
        }))
        return { ok: true }
      },

      signOut: () => set({ currentUserId: null }),

      register: ({ fullName, email, jobTitle, roleId, password, confirm }) => {
        const key = norm(email)
        if (!fullName.trim()) return { ok: false, message: 'Enter your full name.' }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key)) return { ok: false, message: 'That does not look like an email address.' }
        if (get().users.some((u) => norm(u.email) === key)) {
          return {
            ok: false,
            message: 'An account already uses that email address.',
            remedy: 'Sign in instead, or reset the password if you have lost it.',
          }
        }
        const domain = key.split('@')[1]
        if (!AUTH_POLICY.allowedRegistrationDomains.includes(domain)) {
          return {
            ok: false,
            message: `Registration is limited to @${AUTH_POLICY.allowedRegistrationDomains.join(' and @')}.`,
            remedy: 'Ask an administrator to invite you if you work from another domain.',
          }
        }
        const problems = passwordProblems(password)
        if (problems.length) return { ok: false, message: `Password needs: ${problems.join(', ').toLowerCase()}.` }
        if (password !== confirm) return { ok: false, message: 'The two passwords do not match.' }

        const user: UserAccount = {
          id: `usr_${Math.random().toString(36).slice(2, 9)}`,
          email: key,
          password,
          fullName: fullName.trim(),
          jobTitle: jobTitle.trim() || 'Team member',
          status: 'PENDING_VERIFICATION',
          roleIds: roleId ? [roleId] : [],
          grantedPermissions: [],
          revokedPermissions: [],
          branchScope: [],
          failedAttempts: 0,
          mustChangePassword: false,
          twoFactorEnabled: false,
          createdAt: now(),
        }
        set((s) => ({ users: [user, ...s.users], lastEmail: key }))
        return { ok: true, message: 'Account created. Verify the email address to sign in.' }
      },

      verifyEmail: (email) => {
        const key = norm(email)
        const user = get().users.find((u) => norm(u.email) === key)
        if (!user) return { ok: false, failure: 'UNKNOWN_EMAIL', message: 'No account uses that email address.' }
        if (user.status !== 'PENDING_VERIFICATION' && user.status !== 'INVITED') {
          return { ok: false, message: 'That account does not need verifying.' }
        }
        set((s) => ({ users: s.users.map((u) => (u.id === user.id ? { ...u, status: 'ACTIVE' } : u)) }))
        return { ok: true, message: 'Email verified. You can sign in now.' }
      },

      requestReset: (email) => {
        const key = norm(email)
        const user = get().users.find((u) => norm(u.email) === key)
        /* Deliberately the same answer either way — a reset form must not reveal
           which addresses have accounts. The demo token comes back only when the
           account is real, because there is no inbox to send it to. */
        const generic = { ok: true, message: 'If that address has an account, a reset link is on its way.' }
        if (!user) return generic
        if (user.status === 'SUSPENDED') {
          return {
            ok: false,
            failure: 'SUSPENDED' as const,
            message: 'This account is suspended and cannot be reset.',
            remedy: 'An administrator has to restore it first.',
          }
        }
        const token = `TG-RESET-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
        const record: PasswordResetToken = {
          token,
          email: key,
          issuedAt: now(),
          expiresAt: new Date(Date.now() + AUTH_POLICY.resetTokenMinutes * 60_000).toISOString(),
          used: false,
        }
        set((s) => ({ tokens: [record, ...s.tokens.filter((t) => t.email !== key || t.used)] }))
        return { ...generic, token }
      },

      resetPassword: (token, password, confirm) => {
        const record = get().tokens.find((t) => t.token.trim().toUpperCase() === token.trim().toUpperCase())
        if (!record) return { ok: false, message: 'That reset link is not valid.', remedy: 'Request a new one from “Forgot password”.' }
        if (record.used) return { ok: false, message: 'That reset link has already been used.', remedy: 'Request a fresh link.' }
        if (new Date(record.expiresAt) <= new Date()) {
          return {
            ok: false,
            message: `That reset link expired. Links are valid for ${AUTH_POLICY.resetTokenMinutes} minutes.`,
            remedy: 'Request a new one from “Forgot password”.',
          }
        }
        const problems = passwordProblems(password)
        if (problems.length) return { ok: false, message: `Password needs: ${problems.join(', ').toLowerCase()}.` }
        if (password !== confirm) return { ok: false, message: 'The two passwords do not match.' }

        set((s) => ({
          tokens: s.tokens.map((t) => (t.token === record.token ? { ...t, used: true } : t)),
          users: s.users.map((u) =>
            norm(u.email) === record.email
              ? {
                  ...u,
                  password,
                  failedAttempts: 0,
                  lockedUntil: undefined,
                  mustChangePassword: false,
                  status: u.status === 'LOCKED' ? 'ACTIVE' : u.status,
                }
              : u,
          ),
        }))
        return { ok: true, message: 'Password changed. Sign in with the new one.' }
      },

      unlock: (userId) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === userId ? { ...u, status: 'ACTIVE', failedAttempts: 0, lockedUntil: undefined } : u,
          ),
        })),

      resetAuthDemo: () => set({ ...seedState() }),

      upsertUser: (user) =>
        set((s) => ({
          users: s.users.some((u) => u.id === user.id)
            ? s.users.map((u) => (u.id === user.id ? user : u))
            : [user, ...s.users],
        })),

      removeUsers: (ids) =>
        set((s) => ({
          users: s.users.filter((u) => !ids.includes(u.id)),
          /* Signing out an account that has just been deleted beats leaving a
             session pointing at a user that no longer exists. */
          currentUserId: ids.includes(s.currentUserId ?? '') ? null : s.currentUserId,
        })),

      setUserStatus: (id, status) =>
        set((s) => ({
          users: s.users.map((u) =>
            u.id === id
              ? { ...u, status, failedAttempts: status === 'ACTIVE' ? 0 : u.failedAttempts, lockedUntil: undefined }
              : u,
          ),
        })),

      forcePasswordReset: (id) => {
        const temporary = `Tg-${Math.random().toString(36).slice(2, 8)}!${new Date().getFullYear()}`
        set((s) => ({
          users: s.users.map((u) => (u.id === id ? { ...u, password: temporary, mustChangePassword: true, failedAttempts: 0 } : u)),
        }))
        return temporary
      },
    }),
    { name: 'tata-gemilang-auth', version: 2 },
  ),
)

export const useCurrentUser = () => {
  const id = useAuth((s) => s.currentUserId)
  const users = useAuth((s) => s.users)
  return users.find((u) => u.id === id) ?? null
}
