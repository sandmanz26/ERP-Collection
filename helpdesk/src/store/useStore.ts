import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addMinutes } from 'date-fns'
import { seedData } from '@/data/seed'
import type {
  Activity, Asset, Booking, Channel, KbArticle, Notification, PendingReason, Priority, Role, Ticket, TicketStatus, User, Visitor, WorkOrder,
  WorkOrderStatus,
} from '@/data/types'
import { dueDates } from '@/lib/sla'
import { nextDue } from '@/lib/pm'
import { uid } from '@/lib/utils'

type Data = ReturnType<typeof seedData>

interface Session {
  userId: string | null
}

export interface NewTicketInput {
  title: string
  description: string
  categoryId: string
  priority: Priority
  spaceId?: string
  assetId?: string
  channel?: Channel
  requesterId?: string
  tags?: string[]
  attachments?: string[]
}

interface Actions {
  signIn: (userId: string) => void
  signOut: () => void
  resetDemo: () => void

  createTicket: (input: NewTicketInput) => Ticket
  comment: (ticketId: string, body: string, internal?: boolean) => void
  setStatus: (ticketId: string, status: TicketStatus, opts?: { reason?: PendingReason; note?: string }) => void
  assign: (ticketId: string, assigneeId: string | undefined) => void
  setPriority: (ticketId: string, priority: Priority) => void
  patchTicket: (ticketId: string, patch: Partial<Pick<Ticket, 'categoryId' | 'spaceId' | 'assetId' | 'tags' | 'title'>>) => void
  confirmResolved: (ticketId: string, rating?: { score: number; comment?: string }) => void
  rate: (ticketId: string, score: number, comment?: string) => void
  reopen: (ticketId: string, reason: string) => void
  bulk: (ids: string[], patch: { status?: TicketStatus; assigneeId?: string; priority?: Priority }) => void

  createWorkOrder: (input: Partial<WorkOrder> & { title: string }) => WorkOrder
  patchWorkOrder: (id: string, patch: Partial<WorkOrder>) => void
  toggleCheck: (woId: string, itemId: string) => void
  noteCheck: (woId: string, itemId: string, note: string) => void
  logTime: (woId: string, minutes: number, note?: string) => void
  addMaterial: (woId: string, name: string, qty: number, unitCost: number) => void
  setWoStatus: (woId: string, status: WorkOrderStatus, note?: string) => void
  generatePm: (pmId: string) => WorkOrder | undefined

  patchAsset: (id: string, patch: Partial<Asset>) => void

  createBooking: (b: Omit<Booking, 'id' | 'status'>) => { ok: true; booking: Booking } | { ok: false; error: string }
  cancelBooking: (id: string) => void

  createVisitor: (v: Omit<Visitor, 'id' | 'status' | 'passCode'>) => Visitor
  setVisitorStatus: (id: string, status: Visitor['status']) => void

  kbVote: (id: string, helpful: boolean) => void
  kbView: (id: string) => void
  saveKb: (a: Partial<KbArticle> & { title: string }) => void

  addCanned: (title: string, body: string) => void
  removeCanned: (id: string) => void
  markRead: (id: string) => void
  markAllRead: (userId: string) => void
}

export type Store = Data & { session: Session } & Actions

const now = () => new Date().toISOString()
const act = (a: Omit<Activity, 'id' | 'at'> & { at?: string }): Activity => ({ id: uid('ac'), at: a.at ?? now(), ...a })

function notify(userIds: string[], text: string, to?: string, tone: Notification['tone'] = 'info'): Notification[] {
  return Array.from(new Set(userIds)).map((userId) => ({ id: uid('nt'), userId, text, at: now(), read: false, to, tone }))
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const me = () => get().session.userId ?? 'u_rina'
      const userOf = (id?: string | null) => get().users.find((u) => u.id === id)

      const mutateTicket = (id: string, fn: (t: Ticket) => Ticket, extraNotes: Notification[] = []) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === id ? { ...fn(t), updatedAt: now() } : t)),
          notifications: extraNotes.length ? [...extraNotes, ...s.notifications] : s.notifications,
        }))

      return {
        ...seedData(),
        session: { userId: null },

        signIn: (userId) => set({ session: { userId } }),
        signOut: () => set({ session: { userId: null } }),
        resetDemo: () => set({ ...seedData() }),

        /* ------------------------------------------------ tickets */
        createTicket: (input) => {
          const s = get()
          const cat = s.categories.find((c) => c.id === input.categoryId)!
          const requesterId = input.requesterId ?? me()
          const created = new Date()
          const maxNo = s.tickets.reduce((m, t) => Math.max(m, parseInt(t.number.slice(3), 10) || 0), 1000)
          const t: Ticket = {
            id: uid('tk'),
            number: `HD-${maxNo + 1}`,
            title: input.title,
            description: input.description,
            kind: cat.kind,
            categoryId: cat.id,
            priority: input.priority,
            status: 'new',
            requesterId,
            teamId: cat.teamId,
            spaceId: input.spaceId,
            assetId: input.assetId,
            channel: input.channel ?? 'portal',
            createdAt: created.toISOString(),
            updatedAt: created.toISOString(),
            pausedMs: 0,
            ...dueDates(created, input.priority),
            tags: input.tags ?? [],
            workOrderIds: [],
            attachments: input.attachments,
            activity: [
              act({ actorId: requesterId, type: 'created', body: input.description }),
              act({ actorId: null, type: 'system', body: `Routed to ${s.teams.find((x) => x.id === cat.teamId)?.name}` }),
            ],
          }
          const teamUsers = s.users.filter((u) => u.teamId === cat.teamId || u.role === 'manager').map((u) => u.id)
          set((st) => ({
            tickets: [t, ...st.tickets],
            notifications: [...notify(teamUsers, `New ${input.priority === 'p1' ? 'critical ' : ''}ticket ${t.number}: ${t.title}`, `/tickets/${t.id}`, input.priority === 'p1' ? 'danger' : 'info'), ...st.notifications],
          }))
          return t
        },

        comment: (ticketId, body, internal = false) => {
          const actor = userOf(me())!
          const t = get().tickets.find((x) => x.id === ticketId)!
          const isStaff = actor.role !== 'requester'
          const nowIso = now()
          let status = t.status
          let pausedAt = t.pausedAt
          let pausedMs = t.pausedMs
          const extra: Activity[] = []
          if (!isStaff && !internal) {
            if (t.status === 'pending' && t.pendingReason === 'requester') {
              status = 'in_progress'
              if (pausedAt) pausedMs += Date.now() - new Date(pausedAt).getTime()
              pausedAt = undefined
              extra.push(act({ actorId: null, type: 'status', from: 'pending', to: 'in_progress', body: 'Requester replied — SLA clock resumed' }))
            } else if (t.status === 'resolved') {
              status = 'in_progress'
              extra.push(act({ actorId: null, type: 'status', from: 'resolved', to: 'in_progress', body: 'Reopened by requester reply' }))
            }
          }
          const notes = isStaff && !internal ? notify([t.requesterId], `${actor.name} replied on ${t.number}`, `/tickets/${t.id}`) : !isStaff && t.assigneeId ? notify([t.assigneeId], `${actor.name} replied on ${t.number}`, `/tickets/${t.id}`) : []
          mutateTicket(
            ticketId,
            (x) => ({
              ...x,
              status,
              pausedAt,
              pausedMs,
              pendingReason: status === 'pending' ? x.pendingReason : undefined,
              firstResponseAt: !x.firstResponseAt && isStaff && !internal ? nowIso : x.firstResponseAt,
              unreadForRequester: isStaff && !internal ? true : x.unreadForRequester,
              activity: [...x.activity, act({ actorId: actor.id, type: internal ? 'note' : 'comment', body }), ...extra],
            }),
            notes,
          )
        },

        setStatus: (ticketId, status, opts = {}) => {
          const actor = me()
          const t = get().tickets.find((x) => x.id === ticketId)!
          if (t.status === status && status !== 'pending') return
          const nowMs = Date.now()
          let pausedAt = t.pausedAt
          let pausedMs = t.pausedMs
          if (status === 'pending' && !pausedAt) pausedAt = now()
          if (status !== 'pending' && pausedAt) {
            pausedMs += nowMs - new Date(pausedAt).getTime()
            pausedAt = undefined
          }
          const label: Record<PendingReason, string> = { requester: 'requester', vendor: 'vendor', parts: 'parts', approval: 'approval' }
          const body = opts.note ?? (status === 'pending' ? `Waiting on ${label[opts.reason ?? 'requester']}` : undefined)
          const notes =
            status === 'resolved' || status === 'pending'
              ? notify([t.requesterId], status === 'resolved' ? `${t.number} was resolved — please confirm` : `${t.number} is waiting on ${label[opts.reason ?? 'requester']}`, `/tickets/${t.id}`, status === 'resolved' ? 'success' : 'warning')
              : []
          mutateTicket(
            ticketId,
            (x) => ({
              ...x,
              status,
              pendingReason: status === 'pending' ? opts.reason ?? 'requester' : undefined,
              pausedAt,
              pausedMs,
              assigneeId: x.assigneeId ?? (status === 'in_progress' ? actor : undefined),
              resolvedAt: status === 'resolved' ? now() : status === 'in_progress' || status === 'assigned' ? undefined : x.resolvedAt,
              closedAt: status === 'closed' ? now() : undefined,
              resolutionNote: status === 'resolved' ? opts.note ?? x.resolutionNote : x.resolutionNote,
              firstResponseAt: x.firstResponseAt ?? (status === 'in_progress' ? now() : undefined),
              unreadForRequester: status === 'resolved' || status === 'pending' ? true : x.unreadForRequester,
              activity: [...x.activity, act({ actorId: actor, type: 'status', from: x.status, to: status, body })],
            }),
            notes,
          )
        },

        assign: (ticketId, assigneeId) => {
          const actor = me()
          const to = userOf(assigneeId)
          const t = get().tickets.find((x) => x.id === ticketId)!
          mutateTicket(
            ticketId,
            (x) => ({
              ...x,
              assigneeId,
              status: x.status === 'new' && assigneeId ? 'assigned' : x.status,
              activity: [...x.activity, act({ actorId: actor, type: 'assign', to: assigneeId, from: x.assigneeId, body: assigneeId ? `Assigned to ${to?.name}` : 'Unassigned' })],
            }),
            assigneeId && assigneeId !== actor ? notify([assigneeId], `${t.number} was assigned to you`, `/tickets/${t.id}`) : [],
          )
        },

        setPriority: (ticketId, priority) => {
          const t = get().tickets.find((x) => x.id === ticketId)!
          if (t.priority === priority) return
          mutateTicket(ticketId, (x) => ({
            ...x,
            priority,
            ...dueDates(new Date(x.createdAt), priority),
            activity: [...x.activity, act({ actorId: me(), type: 'priority', from: x.priority, to: priority })],
          }))
        },

        patchTicket: (ticketId, patch) => mutateTicket(ticketId, (x) => ({ ...x, ...patch })),

        confirmResolved: (ticketId, rating) => {
          mutateTicket(ticketId, (x) => ({
            ...x,
            status: 'closed',
            closedAt: now(),
            csat: rating ? { score: rating.score, comment: rating.comment, at: now() } : x.csat,
            activity: [
              ...x.activity,
              act({ actorId: me(), type: 'status', from: 'resolved', to: 'closed', body: 'Requester confirmed the fix' }),
              ...(rating ? [act({ actorId: me(), type: 'csat', body: rating.comment, to: String(rating.score) })] : []),
            ],
          }))
        },

        rate: (ticketId, score, comment) =>
          mutateTicket(ticketId, (x) => ({
            ...x,
            csat: { score, comment, at: now() },
            activity: [...x.activity, act({ actorId: me(), type: 'csat', body: comment, to: String(score) })],
          })),

        reopen: (ticketId, reason) => {
          const t = get().tickets.find((x) => x.id === ticketId)!
          mutateTicket(
            ticketId,
            (x) => ({
              ...x,
              status: 'in_progress',
              resolvedAt: undefined,
              closedAt: undefined,
              activity: [...x.activity, act({ actorId: me(), type: 'status', from: x.status, to: 'in_progress', body: `Reopened: ${reason}` })],
            }),
            t.assigneeId ? notify([t.assigneeId], `${t.number} was reopened by the requester`, `/tickets/${t.id}`, 'warning') : [],
          )
        },

        bulk: (ids, patch) => {
          ids.forEach((id) => {
            if (patch.assigneeId !== undefined) get().assign(id, patch.assigneeId || undefined)
            if (patch.priority) get().setPriority(id, patch.priority)
            if (patch.status) get().setStatus(id, patch.status)
          })
        },

        /* ------------------------------------------------ work orders */
        createWorkOrder: (input) => {
          const s = get()
          const maxNo = s.workOrders.reduce((m, w) => Math.max(m, parseInt(w.number.slice(3), 10) || 0), 3000)
          const ticket = input.ticketId ? s.tickets.find((t) => t.id === input.ticketId) : undefined
          const wo: WorkOrder = {
            id: uid('wo'),
            number: `WO-${maxNo + 1}`,
            type: 'corrective',
            status: 'open',
            priority: ticket?.priority ?? 'p3',
            createdAt: now(),
            dueAt: ticket?.dueResolveAt ?? addMinutes(new Date(), 60 * 24).toISOString(),
            checklist: [
              { id: uid('ck'), text: 'Isolate and make area safe', done: false },
              { id: uid('ck'), text: 'Diagnose root cause', done: false },
              { id: uid('ck'), text: 'Repair or replace', done: false },
              { id: uid('ck'), text: 'Test and confirm with requester', done: false },
            ],
            timeLogs: [],
            materials: [],
            assetId: ticket?.assetId,
            spaceId: ticket?.spaceId,
            assigneeId: ticket?.assigneeId,
            ...input,
          }
          set((st) => ({
            workOrders: [wo, ...st.workOrders],
            tickets: ticket
              ? st.tickets.map((t) =>
                  t.id === ticket.id
                    ? { ...t, workOrderIds: [...t.workOrderIds, wo.id], updatedAt: now(), activity: [...t.activity, act({ actorId: me(), type: 'workorder', body: `Created ${wo.number}`, to: wo.id })] }
                    : t,
                )
              : st.tickets,
          }))
          return wo
        },

        patchWorkOrder: (id, patch) => set((s) => ({ workOrders: s.workOrders.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

        toggleCheck: (woId, itemId) =>
          set((s) => ({
            workOrders: s.workOrders.map((w) => {
              if (w.id !== woId) return w
              const checklist = w.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c))
              const status: WorkOrderStatus = w.status === 'open' || w.status === 'scheduled' ? 'in_progress' : w.status
              return { ...w, checklist, status, startedAt: w.startedAt ?? now() }
            }),
          })),

        noteCheck: (woId, itemId, note) =>
          set((s) => ({ workOrders: s.workOrders.map((w) => (w.id === woId ? { ...w, checklist: w.checklist.map((c) => (c.id === itemId ? { ...c, note } : c)) } : w)) })),

        logTime: (woId, minutes, note) =>
          set((s) => ({
            workOrders: s.workOrders.map((w) => (w.id === woId ? { ...w, timeLogs: [...w.timeLogs, { id: uid('tl'), userId: me(), minutes, at: now(), note }] } : w)),
          })),

        addMaterial: (woId, name, qty, unitCost) =>
          set((s) => ({ workOrders: s.workOrders.map((w) => (w.id === woId ? { ...w, materials: [...w.materials, { id: uid('mt'), name, qty, unitCost }] } : w)) })),

        setWoStatus: (woId, status, note) => {
          const w = get().workOrders.find((x) => x.id === woId)!
          set((s) => ({
            workOrders: s.workOrders.map((x) =>
              x.id === woId
                ? {
                    ...x,
                    status,
                    startedAt: status === 'in_progress' ? x.startedAt ?? now() : x.startedAt,
                    completedAt: status === 'completed' ? now() : undefined,
                    completionNote: status === 'completed' ? note ?? x.completionNote : x.completionNote,
                    checklist: status === 'completed' ? x.checklist.map((c) => ({ ...c, done: true })) : x.checklist,
                  }
                : x,
            ),
          }))
          if (status === 'completed') {
            if (w.pmId) {
              const pm = get().pmSchedules.find((p) => p.id === w.pmId)
              if (pm)
                set((s) => ({
                  pmSchedules: s.pmSchedules.map((p) => (p.id === pm.id ? { ...p, lastDoneAt: now(), nextDueAt: nextDue(new Date(), p.frequency).toISOString() } : p)),
                  assets: s.assets.map((a) => (a.id === w.assetId ? { ...a, lastServiceAt: now() } : a)),
                }))
            }
            if (w.ticketId) {
              const t = get().tickets.find((x) => x.id === w.ticketId)
              if (t && t.status !== 'resolved' && t.status !== 'closed')
                set((s) => ({ tickets: s.tickets.map((x) => (x.id === t.id ? { ...x, updatedAt: now(), activity: [...x.activity, act({ actorId: me(), type: 'workorder', body: `${w.number} completed — ready to resolve` })] } : x)) }))
            }
          }
        },

        generatePm: (pmId) => {
          const s = get()
          const pm = s.pmSchedules.find((p) => p.id === pmId)
          if (!pm) return undefined
          const asset = s.assets.find((a) => a.id === pm.assetId)
          const existing = s.workOrders.find((w) => w.pmId === pmId && w.status !== 'completed' && w.status !== 'cancelled')
          if (existing) return existing
          return get().createWorkOrder({
            title: pm.name,
            type: 'preventive',
            priority: asset?.criticality === 'critical' ? 'p2' : 'p3',
            pmId,
            assetId: pm.assetId,
            spaceId: asset?.spaceId,
            vendorId: pm.vendorId,
            status: 'scheduled',
            scheduledFor: pm.nextDueAt,
            dueAt: pm.nextDueAt,
            checklist: pm.checklist.map((text) => ({ id: uid('ck'), text, done: false })),
          })
        },

        patchAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

        /* ------------------------------------------------ workplace */
        createBooking: (b) => {
          const s = get()
          const start = new Date(b.start).getTime()
          const end = new Date(b.end).getTime()
          if (end <= start) return { ok: false, error: 'End time must be after the start time.' }
          const clash = s.bookings.find((x) => x.spaceId === b.spaceId && x.status === 'confirmed' && new Date(x.start).getTime() < end && new Date(x.end).getTime() > start)
          if (clash) return { ok: false, error: 'That slot was just taken — pick another time.' }
          const booking: Booking = { ...b, id: uid('bk'), status: 'confirmed' }
          set((st) => ({ bookings: [...st.bookings, booking] }))
          return { ok: true, booking }
        },
        cancelBooking: (id) => set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)) })),

        createVisitor: (v) => {
          const visitor: Visitor = { ...v, id: uid('vs'), status: 'expected', passCode: String(100000 + Math.floor(Math.random() * 899999)) }
          set((s) => ({ visitors: [visitor, ...s.visitors] }))
          return visitor
        },
        setVisitorStatus: (id, status) => {
          const v = get().visitors.find((x) => x.id === id)
          set((s) => ({
            visitors: s.visitors.map((x) =>
              x.id === id
                ? { ...x, status, checkedInAt: status === 'checked_in' ? now() : x.checkedInAt, checkedOutAt: status === 'checked_out' ? now() : x.checkedOutAt }
                : x,
            ),
            notifications: status === 'checked_in' && v ? [...notify([v.hostId], `${v.name} from ${v.company} has arrived at reception`, '/visitors', 'success'), ...s.notifications] : s.notifications,
          }))
        },

        kbVote: (id, helpful) => set((s) => ({ kb: s.kb.map((a) => (a.id === id ? { ...a, helpful: a.helpful + (helpful ? 1 : 0), notHelpful: a.notHelpful + (helpful ? 0 : 1) } : a)) })),
        kbView: (id) => set((s) => ({ kb: s.kb.map((a) => (a.id === id ? { ...a, views: a.views + 1 } : a)) })),
        saveKb: (a) =>
          set((s) => {
            if (a.id) return { kb: s.kb.map((x) => (x.id === a.id ? { ...x, ...a, updatedAt: now() } : x)) }
            const art: KbArticle = {
              id: uid('kb'), categoryId: 'c_it_sw', summary: '', body: [], views: 0, helpful: 0, notHelpful: 0, updatedAt: now(), authorId: me(), audience: 'everyone', ...a,
            }
            return { kb: [art, ...s.kb] }
          }),

        addCanned: (title, body) => set((s) => ({ canned: [...s.canned, { id: uid('cr'), title, body }] })),
        removeCanned: (id) => set((s) => ({ canned: s.canned.filter((c) => c.id !== id) })),
        markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllRead: (userId) => set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })),
      }
    },
    {
      name: 'atrium-demo-v1',
      version: 1,
      partialize: (s) => {
        const data: Partial<Store> = {}
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') (data as Record<string, unknown>)[k] = v
        return data
      },
    },
  ),
)

export function useMe(): User | undefined {
  return useStore((s) => s.users.find((u) => u.id === s.session.userId))
}

export type { Role }
