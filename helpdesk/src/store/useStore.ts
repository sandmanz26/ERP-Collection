import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addMinutes } from 'date-fns'
import { seedData } from '@/data/seed'
import type {
  Activity, Asset, Booking, Category, Channel, Impact, Notification, PendingReason, PmFrequency, PmSchedule, Priority, Space, Task, TaskStatus, Ticket, TicketStatus, User, Vendor,
} from '@/data/types'
import { dueDates } from '@/lib/sla'
import { nextDue } from '@/lib/pm'
import { quote } from '@/lib/rental'
import { uid } from '@/lib/utils'
import { fmtSmart } from '@/lib/format'

type Data = ReturnType<typeof seedData>

export interface NewTicketInput {
  title: string
  description: string
  categoryId: string
  priority: Priority
  spaceId?: string
  assetId?: string
  channel?: Channel
  requesterId?: string
  reporterName?: string
  reporterPhone?: string
  impact?: Impact
  hazard?: boolean
  attachments?: string[]
}

export interface BookingInput {
  spaceId: string
  renterType: 'internal' | 'external'
  renterName: string
  company?: string
  phone?: string
  title: string
  start: string
  end: string
  attendees: number
  addonIds: string[]
  note?: string
  /** staff can approve on the spot */
  autoApprove?: boolean
}

type BookingResult = { ok: true; booking: Booking } | { ok: false; error: string }

export interface AssetImportRow {
  name: string; category?: string; location?: string; manufacturer?: string; model?: string; serial?: string; criticality?: string; installed?: string; cost?: number; notes?: string
}

type Collections = { spaces: Space; categories: Category; users: User; vendors: Vendor }

interface Actions {
  signIn: (userId: string) => void
  signOut: () => void
  resetDemo: () => void

  createTicket: (input: NewTicketInput) => Ticket
  comment: (ticketId: string, body: string, internal?: boolean) => void
  setStatus: (ticketId: string, status: TicketStatus, opts?: { reason?: PendingReason; note?: string; etaAt?: string }) => void
  assign: (ticketId: string, assigneeId: string | undefined, etaAt?: string) => void
  setEta: (ticketId: string, etaAt: string | undefined, reason?: string) => void
  setPriority: (ticketId: string, priority: Priority) => void
  patchTicket: (ticketId: string, patch: Partial<Pick<Ticket, 'categoryId' | 'spaceId' | 'assetId' | 'tags' | 'title'>>) => void
  confirmDone: (ticketId: string, rating?: { score: number; comment?: string }) => void
  reopen: (ticketId: string, reason: string) => void
  bulk: (ids: string[], patch: { status?: TicketStatus; assigneeId?: string; priority?: Priority; etaAt?: string }) => void

  createTask: (input: Partial<Task> & { title: string }) => Task
  patchTask: (id: string, patch: Partial<Task>) => void
  toggleCheck: (taskId: string, itemId: string) => void
  noteCheck: (taskId: string, itemId: string, note: string) => void
  logTime: (taskId: string, minutes: number, note?: string) => void
  addMaterial: (taskId: string, name: string, qty: number, unitCost: number) => void
  setTaskStatus: (taskId: string, status: TaskStatus, note?: string) => void

  createSchedule: (s: Omit<PmSchedule, 'id' | 'active'>) => PmSchedule
  updateSchedule: (id: string, patch: Partial<PmSchedule>) => void
  removeSchedule: (id: string) => void
  generatePm: (pmId: string) => Task | undefined
  /** one-step "sudah dikerjakan": records a finished task and rolls the schedule forward */
  completeSchedule: (pmId: string, note?: string) => Task | undefined

  createAsset: (a: Omit<Asset, 'id' | 'tag'>) => Asset
  updateAsset: (id: string, patch: Partial<Asset>) => void
  importAssets: (rows: AssetImportRow[]) => { added: number; skipped: number }

  requestBooking: (b: BookingInput) => BookingResult
  decideBooking: (id: string, approve: boolean, reason?: string) => void
  cancelBooking: (id: string) => void
  createBlock: (spaceId: string, start: string, end: string, title: string) => BookingResult

  upsert: <K extends keyof Collections>(collection: K, item: Collections[K]) => void
  remove: (collection: keyof Collections, id: string) => void
  addCanned: (title: string, body: string) => void
  removeCanned: (id: string) => void

  markRead: (id: string) => void
  markAllRead: (userId: string) => void
}

export type Store = Data & { session: { userId: string | null } } & Actions

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

      const mutateTicket = (id: string, fn: (t: Ticket) => Ticket, extra: Notification[] = []) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === id ? { ...fn(t), updatedAt: now() } : t)),
          notifications: extra.length ? [...extra, ...s.notifications] : s.notifications,
        }))

      const checkConflict = (spaceId: string, start: number, end: number, ignore?: string) =>
        get().bookings.find((x) => x.id !== ignore && x.spaceId === spaceId && (x.status === 'approved' || x.status === 'pending') && new Date(x.start).getTime() < end && new Date(x.end).getTime() > start)

      return {
        ...seedData(),
        session: { userId: null },

        signIn: (userId) => set({ session: { userId } }),
        signOut: () => set({ session: { userId: null } }),
        resetDemo: () => set({ ...seedData() }),

        /* ------------------------------------------------ tiket */
        createTicket: (input) => {
          const s = get()
          const cat = s.categories.find((c) => c.id === input.categoryId)!
          const requesterId = input.requesterId ?? me()
          const created = new Date()
          const maxNo = s.tickets.reduce((m, t) => Math.max(m, parseInt(t.number.slice(3), 10) || 0), 1000)
          const t: Ticket = {
            id: uid('tk'), number: `TK-${maxNo + 1}`, title: input.title, description: input.description, categoryId: cat.id, priority: input.priority, status: 'new',
            requesterId, reporterName: input.reporterName, reporterPhone: input.reporterPhone, teamId: cat.teamId, spaceId: input.spaceId, assetId: input.assetId,
            channel: input.channel ?? 'portal', impact: input.impact, hazard: input.hazard, createdAt: created.toISOString(), updatedAt: created.toISOString(), pausedMs: 0,
            ...dueDates(created, input.priority), tags: input.hazard ? ['berbahaya'] : [], taskIds: [], attachments: input.attachments,
            activity: [
              act({ actorId: requesterId, type: 'created', body: input.description }),
              act({ actorId: null, type: 'system', body: `Diteruskan ke tim ${s.teams.find((x) => x.id === cat.teamId)?.name}` }),
            ],
          }
          const teamUsers = s.users.filter((u) => u.teamId === cat.teamId || u.role === 'manager').map((u) => u.id)
          const urgent = input.priority === 'p1' || input.hazard
          set((st) => ({
            tickets: [t, ...st.tickets],
            notifications: [...notify(teamUsers, `${urgent ? 'DARURAT — ' : ''}Tiket baru ${t.number}: ${t.title}`, `/tiket/${t.id}`, urgent ? 'danger' : 'info'), ...st.notifications],
          }))
          return t
        },

        comment: (ticketId, body, internal = false) => {
          const actor = userOf(me())!
          const t = get().tickets.find((x) => x.id === ticketId)!
          const isStaff = actor.role !== 'requester'
          let status = t.status
          let pausedAt = t.pausedAt
          let pausedMs = t.pausedMs
          const extra: Activity[] = []
          if (!isStaff && !internal) {
            if (t.status === 'pending' && t.pendingReason === 'requester') {
              status = 'in_progress'
              if (pausedAt) pausedMs += Date.now() - new Date(pausedAt).getTime()
              pausedAt = undefined
              extra.push(act({ actorId: null, type: 'status', from: 'pending', to: 'in_progress', body: 'Pelapor membalas — pekerjaan dilanjutkan' }))
            } else if (t.status === 'done') {
              status = 'in_progress'
              extra.push(act({ actorId: null, type: 'status', from: 'done', to: 'in_progress', body: 'Dibuka kembali karena pelapor membalas' }))
            }
          }
          const notes = isStaff && !internal ? notify([t.requesterId], `${actor.name} membalas ${t.number}`, `/tiket/${t.id}`) : !isStaff && t.assigneeId ? notify([t.assigneeId], `${actor.name} membalas ${t.number}`, `/tiket/${t.id}`) : []
          mutateTicket(ticketId, (x) => ({
            ...x, status, pausedAt, pausedMs, pendingReason: status === 'pending' ? x.pendingReason : undefined,
            resolvedAt: status === 'in_progress' ? undefined : x.resolvedAt,
            firstResponseAt: !x.firstResponseAt && isStaff && !internal ? now() : x.firstResponseAt,
            unreadForRequester: isStaff && !internal ? true : x.unreadForRequester,
            activity: [...x.activity, act({ actorId: actor.id, type: internal ? 'note' : 'comment', body }), ...extra],
          }), notes)
        },

        setStatus: (ticketId, status, opts = {}) => {
          const actor = me()
          const t = get().tickets.find((x) => x.id === ticketId)!
          if (t.status === status && status !== 'pending') return
          let pausedAt = t.pausedAt
          let pausedMs = t.pausedMs
          if (status === 'pending' && !pausedAt) pausedAt = now()
          if (status !== 'pending' && pausedAt) { pausedMs += Date.now() - new Date(pausedAt).getTime(); pausedAt = undefined }
          const body = opts.note ?? (status === 'pending' ? PENDING[opts.reason ?? 'parts'] : undefined)
          const notes = status === 'done' || status === 'pending' ? notify([t.requesterId], status === 'done' ? `${t.number} sudah selesai — mohon konfirmasi` : `${t.number}: ${PENDING[opts.reason ?? 'parts'].toLowerCase()}`, `/tiket/${t.id}`, status === 'done' ? 'success' : 'warning') : []
          mutateTicket(ticketId, (x) => ({
            ...x, status, pendingReason: status === 'pending' ? opts.reason ?? 'parts' : undefined, pausedAt, pausedMs,
            assigneeId: x.assigneeId ?? (status === 'in_progress' ? actor : undefined),
            etaAt: status === 'done' || status === 'cancelled' ? undefined : opts.etaAt ?? x.etaAt,
            resolvedAt: status === 'done' ? now() : status === 'cancelled' ? x.resolvedAt : undefined,
            confirmedAt: status === 'done' ? undefined : x.confirmedAt,
            resolutionNote: status === 'done' ? opts.note ?? x.resolutionNote : x.resolutionNote,
            firstResponseAt: x.firstResponseAt ?? (status === 'in_progress' ? now() : undefined),
            unreadForRequester: status === 'done' || status === 'pending' ? true : x.unreadForRequester,
            activity: [...x.activity, act({ actorId: actor, type: 'status', from: x.status, to: status, body }), ...(opts.etaAt ? [act({ actorId: actor, type: 'eta', to: opts.etaAt, body: 'Estimasi selesai ditetapkan' })] : [])],
          }), notes)
        },

        assign: (ticketId, assigneeId, etaAt) => {
          const actor = me()
          const to = userOf(assigneeId)
          const t = get().tickets.find((x) => x.id === ticketId)!
          mutateTicket(ticketId, (x) => ({
            ...x, assigneeId, etaAt: etaAt ?? x.etaAt, status: x.status === 'new' && assigneeId ? 'assigned' : !assigneeId && x.status === 'assigned' ? 'new' : x.status,
            activity: [...x.activity, act({ actorId: actor, type: 'assign', to: assigneeId, from: x.assigneeId, body: assigneeId ? `Ditugaskan ke ${to?.name}` : 'Penugasan dicabut' }), ...(etaAt ? [act({ actorId: actor, type: 'eta', to: etaAt, body: 'Estimasi selesai ditetapkan' })] : [])],
          }), [
            ...(assigneeId && assigneeId !== actor ? notify([assigneeId], `${t.number} ditugaskan ke Anda`, `/tiket/${t.id}`) : []),
            ...(assigneeId && !t.assigneeId ? notify([t.requesterId], `${t.number} sudah ditangani ${to?.name}${etaAt ? ` · estimasi ${fmtSmart(etaAt)}` : ''}`, `/tiket/${t.id}`, 'info') : []),
          ])
        },

        setEta: (ticketId, etaAt, reason) => {
          const t = get().tickets.find((x) => x.id === ticketId)!
          const changed = !!t.etaAt && t.etaAt !== etaAt
          mutateTicket(ticketId, (x) => ({
            ...x, etaAt, unreadForRequester: true,
            activity: [...x.activity, act({ actorId: me(), type: 'eta', from: x.etaAt, to: etaAt, body: etaAt ? (changed ? `Estimasi selesai diubah${reason ? ` — ${reason}` : ''}` : 'Estimasi selesai ditetapkan') : 'Estimasi selesai dihapus' })],
          }), etaAt ? notify([t.requesterId], `${t.number}: estimasi selesai ${fmtSmart(etaAt)}${changed ? ' (diperbarui)' : ''}`, `/tiket/${t.id}`, changed ? 'warning' : 'info') : [])
        },

        setPriority: (ticketId, priority) => {
          const t = get().tickets.find((x) => x.id === ticketId)!
          if (t.priority === priority) return
          mutateTicket(ticketId, (x) => ({ ...x, priority, ...dueDates(new Date(x.createdAt), priority), activity: [...x.activity, act({ actorId: me(), type: 'priority', from: x.priority, to: priority })] }))
        },

        patchTicket: (ticketId, patch) => mutateTicket(ticketId, (x) => ({ ...x, ...patch })),

        confirmDone: (ticketId, rating) =>
          mutateTicket(ticketId, (x) => ({
            ...x, confirmedAt: now(), rating: rating ? { score: rating.score, comment: rating.comment, at: now() } : x.rating,
            activity: [...x.activity, act({ actorId: me(), type: 'status', from: 'done', to: 'done', body: 'Pelapor mengonfirmasi sudah beres' }), ...(rating ? [act({ actorId: me(), type: 'rating', body: rating.comment, to: String(rating.score) })] : [])],
          })),

        reopen: (ticketId, reason) => {
          const t = get().tickets.find((x) => x.id === ticketId)!
          mutateTicket(ticketId, (x) => ({
            ...x, status: 'in_progress', resolvedAt: undefined, confirmedAt: undefined,
            activity: [...x.activity, act({ actorId: me(), type: 'status', from: x.status, to: 'in_progress', body: `Dibuka kembali: ${reason}` })],
          }), t.assigneeId ? notify([t.assigneeId], `${t.number} dibuka kembali oleh pelapor`, `/tiket/${t.id}`, 'warning') : [])
        },

        bulk: (ids, patch) => ids.forEach((id) => {
          if (patch.assigneeId !== undefined) get().assign(id, patch.assigneeId || undefined, patch.etaAt)
          else if (patch.etaAt) get().setEta(id, patch.etaAt)
          if (patch.priority) get().setPriority(id, patch.priority)
          if (patch.status) get().setStatus(id, patch.status)
        }),

        /* ------------------------------------------------ tugas maintenance */
        createTask: (input) => {
          const s = get()
          const maxNo = s.tasks.reduce((m, w) => Math.max(m, parseInt(w.number.slice(3), 10) || 0), 3000)
          const ticket = input.ticketId ? s.tickets.find((t) => t.id === input.ticketId) : undefined
          const task: Task = {
            id: uid('tg'), number: `MT-${maxNo + 1}`, type: 'corrective', status: 'open', priority: ticket?.priority ?? 'p3', createdAt: now(),
            dueAt: ticket?.etaAt ?? ticket?.dueResolveAt ?? addMinutes(new Date(), 60 * 24).toISOString(),
            checklist: ['Amankan area dan isolasi sumber energi', 'Cari penyebab', 'Perbaiki atau ganti', 'Uji dan konfirmasi'].map((text) => ({ id: uid('ck'), text, done: false })),
            timeLogs: [], materials: [], assetId: ticket?.assetId, spaceId: ticket?.spaceId, assigneeId: ticket?.assigneeId, ...input,
          }
          set((st) => ({
            tasks: [task, ...st.tasks],
            tickets: ticket ? st.tickets.map((t) => (t.id === ticket.id ? { ...t, taskIds: [...t.taskIds, task.id], updatedAt: now(), activity: [...t.activity, act({ actorId: me(), type: 'task', body: `Membuat tugas ${task.number}`, to: task.id })] } : t)) : st.tickets,
          }))
          return task
        },

        patchTask: (id, patch) => set((s) => ({ tasks: s.tasks.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

        toggleCheck: (taskId, itemId) =>
          set((s) => ({
            tasks: s.tasks.map((w) => {
              if (w.id !== taskId) return w
              const status: TaskStatus = w.status === 'open' || w.status === 'scheduled' ? 'in_progress' : w.status
              return { ...w, checklist: w.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)), status, startedAt: w.startedAt ?? now() }
            }),
          })),

        noteCheck: (taskId, itemId, note) => set((s) => ({ tasks: s.tasks.map((w) => (w.id === taskId ? { ...w, checklist: w.checklist.map((c) => (c.id === itemId ? { ...c, note } : c)) } : w)) })),
        logTime: (taskId, minutes, note) => set((s) => ({ tasks: s.tasks.map((w) => (w.id === taskId ? { ...w, timeLogs: [...w.timeLogs, { id: uid('tl'), userId: me(), minutes, at: now(), note }] } : w)) })),
        addMaterial: (taskId, name, qty, unitCost) => set((s) => ({ tasks: s.tasks.map((w) => (w.id === taskId ? { ...w, materials: [...w.materials, { id: uid('mt'), name, qty, unitCost }] } : w)) })),

        setTaskStatus: (taskId, status, note) => {
          const w = get().tasks.find((x) => x.id === taskId)!
          set((s) => ({
            tasks: s.tasks.map((x) => x.id === taskId ? {
              ...x, status, startedAt: status === 'in_progress' ? x.startedAt ?? now() : x.startedAt, completedAt: status === 'completed' ? now() : undefined,
              completionNote: status === 'completed' ? note ?? x.completionNote : x.completionNote, checklist: status === 'completed' ? x.checklist.map((c) => ({ ...c, done: true })) : x.checklist,
            } : x),
          }))
          if (status === 'completed') {
            if (w.pmId) set((s) => ({
              pmSchedules: s.pmSchedules.map((p) => (p.id === w.pmId ? { ...p, lastDoneAt: now(), nextDueAt: nextDue(new Date(), p.frequency).toISOString() } : p)),
              assets: s.assets.map((a) => (a.id === w.assetId ? { ...a, lastServiceAt: now() } : a)),
            }))
            if (w.ticketId) set((s) => ({ tickets: s.tickets.map((t) => (t.id === w.ticketId && t.status !== 'done' ? { ...t, updatedAt: now(), activity: [...t.activity, act({ actorId: me(), type: 'task', body: `${w.number} selesai — tiket siap ditutup` })] } : t)) }))
          }
        },

        /* ------------------------------------------------ jadwal */
        createSchedule: (input) => {
          const p: PmSchedule = { ...input, id: uid('pm'), active: true }
          set((s) => ({ pmSchedules: [...s.pmSchedules, p] }))
          return p
        },
        updateSchedule: (id, patch) => set((s) => ({ pmSchedules: s.pmSchedules.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
        removeSchedule: (id) => set((s) => ({ pmSchedules: s.pmSchedules.filter((p) => p.id !== id) })),

        generatePm: (pmId) => {
          const s = get()
          const pm = s.pmSchedules.find((p) => p.id === pmId)
          if (!pm) return undefined
          const asset = pm.assetId ? s.assets.find((a) => a.id === pm.assetId) : undefined
          const existing = s.tasks.find((w) => w.pmId === pmId && w.status !== 'completed' && w.status !== 'cancelled')
          if (existing) return existing
          return get().createTask({
            title: pm.name, type: 'preventive', priority: asset?.criticality === 'critical' ? 'p2' : 'p3', pmId, assetId: pm.assetId, spaceId: pm.spaceId ?? asset?.spaceId,
            assigneeId: pm.assigneeId, vendorId: pm.vendorId, status: 'scheduled', scheduledFor: pm.nextDueAt, dueAt: pm.nextDueAt,
            checklist: pm.checklist.map((text) => ({ id: uid('ck'), text, done: false })),
          })
        },

        completeSchedule: (pmId, note) => {
          const t = get().generatePm(pmId)
          if (!t) return undefined
          get().setTaskStatus(t.id, 'completed', note || 'Sudah dikerjakan sesuai checklist.')
          return get().tasks.find((x) => x.id === t.id)
        },

        /* ------------------------------------------------ aset */
        createAsset: (a) => {
          const n = get().assets.length + 101
          const asset: Asset = { ...a, id: uid('a'), tag: `AST-${String(n).padStart(4, '0')}` }
          set((s) => ({ assets: [asset, ...s.assets] }))
          return asset
        },
        updateAsset: (id, patch) => set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

        importAssets: (rows) => {
          const s = get()
          let added = 0, skipped = 0
          const crit = (v?: string) => (['low', 'medium', 'high', 'critical'].includes((v ?? '').toLowerCase()) ? (v!.toLowerCase() as Asset['criticality']) : (({ rendah: 'low', sedang: 'medium', tinggi: 'high', kritis: 'critical' } as Record<string, Asset['criticality']>)[(v ?? '').toLowerCase()] ?? 'medium'))
          const list: Asset[] = []
          rows.forEach((r, i) => {
            if (!r.name?.trim()) { skipped++; return }
            if (s.assets.some((a) => a.name.toLowerCase() === r.name.trim().toLowerCase())) { skipped++; return }
            const cat = s.assetCategories.find((c) => c.name.toLowerCase() === (r.category ?? '').toLowerCase()) ?? s.assetCategories[0]
            const space = s.spaces.find((x) => x.name.toLowerCase() === (r.location ?? '').toLowerCase()) ?? s.spaces[0]
            list.push({
              id: uid('a'), tag: `AST-${String(s.assets.length + 101 + i).padStart(4, '0')}`, name: r.name.trim(), categoryId: cat.id, spaceId: space.id, manufacturer: r.manufacturer ?? '', model: r.model ?? '', serial: r.serial ?? '',
              status: 'operational', criticality: crit(r.criticality), installedAt: r.installed && !Number.isNaN(Date.parse(r.installed)) ? new Date(r.installed).toISOString() : now(), purchaseCost: r.cost ?? 0, notes: r.notes,
            })
            added++
          })
          set((st) => ({ assets: [...list, ...st.assets] }))
          return { added, skipped }
        },

        /* ------------------------------------------------ penyewaan */
        requestBooking: (b) => {
          const s = get()
          const space = s.spaces.find((x) => x.id === b.spaceId)
          if (!space?.rental) return { ok: false, error: 'Fasilitas ini tidak bisa disewa.' }
          const start = new Date(b.start), end = new Date(b.end)
          if (end <= start) return { ok: false, error: 'Jam selesai harus setelah jam mulai.' }
          const r = space.rental
          if (start.getHours() + start.getMinutes() / 60 < r.openHour || end.getHours() + end.getMinutes() / 60 > r.closeHour || start.toDateString() !== end.toDateString()) return { ok: false, error: `${space.name} dibuka pukul ${String(r.openHour).padStart(2, '0')}:00–${String(r.closeHour).padStart(2, '0')}:00.` }
          if (b.attendees > space.capacity) return { ok: false, error: `Kapasitas ${space.name} maksimal ${space.capacity} orang.` }
          if (start.getTime() < Date.now() - 5 * 60_000) return { ok: false, error: 'Waktu sudah lewat.' }
          const clash = checkConflict(b.spaceId, start.getTime(), end.getTime())
          if (clash) return { ok: false, error: `Bentrok dengan "${clash.title}" (${fmtSmart(clash.start)}–${new Date(clash.end).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}).` }
          const actor = userOf(me())!
          const needs = r.needsApproval || b.renterType === 'external'
          const approved = !needs || (b.autoApprove && actor.role !== 'requester')
          const maxNo = s.bookings.reduce((m, x) => Math.max(m, parseInt(x.number.slice(4), 10) || 0), 0)
          const booking: Booking = {
            id: uid('bk'), number: `RSV-${String(maxNo + 1).padStart(4, '0')}`, spaceId: b.spaceId, kind: 'booking', userId: actor.id, renterType: b.renterType, renterName: b.renterName, company: b.company, phone: b.phone,
            title: b.title, start: b.start, end: b.end, attendees: b.attendees, addonIds: b.addonIds, fee: quote(space, b.renterType, start, end, b.addonIds, b.attendees, s.addons).total,
            status: approved ? 'approved' : 'pending', note: b.note, createdAt: now(), decidedBy: approved && needs ? actor.id : undefined, decidedAt: approved && needs ? now() : undefined,
          }
          set((st) => ({
            bookings: [...st.bookings, booking],
            notifications: !approved ? [...notify(st.users.filter((u) => u.id === 'u_eko' || u.role === 'manager').map((u) => u.id), `Pengajuan baru ${booking.number}: ${booking.title} (${space.name})`, '/reservasi?tab=daftar', 'warning'), ...st.notifications] : st.notifications,
          }))
          return { ok: true, booking }
        },

        decideBooking: (id, approve, reason) => {
          const b = get().bookings.find((x) => x.id === id)
          if (!b) return
          if (approve) {
            const clash = checkConflict(b.spaceId, new Date(b.start).getTime(), new Date(b.end).getTime(), id)
            if (clash && clash.status === 'approved') return
          }
          set((s) => ({
            bookings: s.bookings.map((x) => (x.id === id ? { ...x, status: approve ? 'approved' : 'rejected', decidedBy: me(), decidedAt: now(), rejectReason: approve ? undefined : reason } : x)),
            notifications: [...notify([b.userId], `Pengajuan ${b.number} (${b.title}) ${approve ? 'disetujui' : 'ditolak'}${!approve && reason ? ` — ${reason}` : ''}`, '/reservasi', approve ? 'success' : 'danger'), ...s.notifications],
          }))
        },

        cancelBooking: (id) => set((s) => ({ bookings: s.bookings.map((b) => (b.id === id ? { ...b, status: 'cancelled' } : b)) })),

        createBlock: (spaceId, start, end, title) => {
          const clash = checkConflict(spaceId, new Date(start).getTime(), new Date(end).getTime())
          if (clash) return { ok: false, error: `Bentrok dengan "${clash.title}".` }
          const s = get()
          const maxNo = s.bookings.reduce((m, x) => Math.max(m, parseInt(x.number.slice(4), 10) || 0), 0)
          const booking: Booking = { id: uid('bk'), number: `RSV-${String(maxNo + 1).padStart(4, '0')}`, spaceId, kind: 'block', userId: me(), renterType: 'internal', renterName: 'Maintenance', title, start, end, attendees: 0, addonIds: [], fee: 0, status: 'approved', createdAt: now() }
          set((st) => ({ bookings: [...st.bookings, booking] }))
          return { ok: true, booking }
        },

        /* ------------------------------------------------ master data */
        upsert: (collection, item) => set((s) => {
          const list = s[collection] as { id: string }[]
          const exists = list.some((x) => x.id === item.id)
          return { [collection]: exists ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item] } as Partial<Store>
        }),
        remove: (collection, id) => set((s) => ({ [collection]: (s[collection] as { id: string }[]).filter((x) => x.id !== id) } as Partial<Store>)),
        addCanned: (title, body) => set((s) => ({ canned: [...s.canned, { id: uid('cr'), title, body }] })),
        removeCanned: (id) => set((s) => ({ canned: s.canned.filter((c) => c.id !== id) })),

        markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        markAllRead: (userId) => set((s) => ({ notifications: s.notifications.map((n) => (n.userId === userId ? { ...n, read: true } : n)) })),
      }
    },
    {
      name: 'atrium-demo-v2',
      version: 2,
      partialize: (s) => {
        const data: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(s)) if (typeof v !== 'function') data[k] = v
        return data as Partial<Store>
      },
    },
  ),
)

const PENDING: Record<PendingReason, string> = {
  parts: 'Menunggu sparepart', vendor: 'Menunggu vendor', approval: 'Menunggu persetujuan', production: 'Menunggu area dikosongkan', requester: 'Menunggu pelapor',
}

export function useMe(): User | undefined {
  return useStore((s) => s.users.find((u) => u.id === s.session.userId))
}

export type { PmFrequency }
