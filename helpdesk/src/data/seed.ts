import { addDays, addMinutes, setHours, setMinutes, startOfDay } from 'date-fns'
import { BUSINESS_HOURS, dueDates, policyFor } from '@/lib/sla'
import { ASSETS } from './assets'
import { KB } from './kb'
import {
  ANNOUNCEMENTS, ASSET_CATEGORIES, BUILDINGS, CANNED, CATEGORIES, CONTRACTS, SPACES, TEAMS, USERS, VENDORS,
} from './reference'
import type {
  Activity, Booking, Notification, PmSchedule, Priority, Ticket, TicketStatus, Visitor, WorkOrder,
} from './types'

/* deterministic RNG so every fresh load tells the same story */
function mulberry32(a: number) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20260610)
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)]
const between = (a: number, b: number) => a + rnd() * (b - a)
const chance = (p: number) => rnd() < p
const weighted = <T,>(items: [T, number][]): T => {
  const total = items.reduce((a, [, w]) => a + w, 0)
  let r = rnd() * total
  for (const [v, w] of items) if ((r -= w) <= 0) return v
  return items[items.length - 1][0]
}

let seq = 0
const id = (p: string) => `${p}_${(++seq).toString(36)}${Math.floor(rnd() * 1e5).toString(36)}`

const NOW = new Date()
const minsAgo = (m: number) => addMinutes(NOW, -m)
const iso = (d: Date) => d.toISOString()

const requesters = USERS.filter((u) => u.role === 'requester' && u.id !== 'u_anisa')
const agentsByTeam = (teamId: string) => USERS.filter((u) => u.teamId === teamId && u.role === 'agent')
const manager = USERS.find((u) => u.id === 'u_dimas')!

/* ---------------------------------------------------------------- ticket templates */

interface Tpl { cat: string; titles: string[]; desc: string; assetCat?: string; spaceKinds?: string[]; tags?: string[] }

const TPL: Tpl[] = [
  { cat: 'c_hvac', titles: ['AC too cold near my desk', 'Air conditioning not cooling', 'AC unit dripping water', 'Loud rattling noise from the ceiling vent', 'Room feels stuffy — no airflow'], desc: 'The air conditioning in this area has been uncomfortable since this morning. Several people nearby feel the same.', assetCat: 'ac_hvac', spaceKinds: ['office', 'meeting'], tags: ['comfort'] },
  { cat: 'c_elec', titles: ['Light flickering in the corridor', 'Power socket not working at my desk', 'Ceiling lights out in meeting room', 'Burning smell from floor socket', 'Emergency exit sign not lit'], desc: 'Noticed this earlier today. It is affecting how we use the space.', assetCat: 'ac_elec', spaceKinds: ['office', 'meeting', 'common'], tags: ['electrical'] },
  { cat: 'c_plumb', titles: ['Leak under the pantry sink', 'Toilet not flushing', 'Tap running constantly', 'Blocked drain in restroom', 'No hot water in pantry'], desc: 'Water is affecting the floor. Please send someone as soon as possible.', assetCat: 'ac_plumb', spaceKinds: ['pantry', 'restroom'], tags: ['water'] },
  { cat: 'c_lift', titles: ['Lift taking very long to arrive', 'Lift door closes too fast', 'Strange noise inside lift', 'Lift skipped my floor'], desc: 'Happens repeatedly during peak hours around 08:30 and 12:00.', assetCat: 'ac_lift', spaceKinds: ['lobby'], tags: ['lift'] },
  { cat: 'c_clean', titles: ['Spill needs cleaning in lobby', 'Restroom out of hand soap', 'Bins overflowing on this floor', 'Request deep clean after event'], desc: 'Please arrange a cleaner when possible.', spaceKinds: ['common', 'restroom', 'pantry', 'office'], tags: ['cleaning'] },
  { cat: 'c_pest', titles: ['Ants in the pantry', 'Cockroach spotted near the café', 'Mouse droppings found in storage'], desc: 'Seen several times over the last two days.', spaceKinds: ['pantry'], tags: ['pest'] },
  { cat: 'c_furn', titles: ['Chair armrest broken', 'Need a monitor riser', 'Window blind stuck', 'Locker key lost'], desc: 'Requesting a replacement or repair.', spaceKinds: ['office'], tags: ['furniture'] },
  { cat: 'c_door', titles: ['Door does not close properly', 'Door lock is sticking', 'Turnstile rejecting valid cards'], desc: 'The door either stays open or does not latch.', assetCat: 'ac_sec', spaceKinds: ['office', 'lobby'], tags: ['access'] },
  { cat: 'c_it_hw', titles: ['Laptop will not boot', 'External monitor flickers', 'Keyboard keys unresponsive', 'Laptop battery drains in an hour', 'Docking station not charging'], desc: 'Tried restarting already. It is slowing down my work.', spaceKinds: ['office'], tags: ['hardware'] },
  { cat: 'c_it_net', titles: ['Wi-Fi keeps dropping', 'No network at my desk LAN port', 'VPN fails with error 809', 'Slow internet in the afternoon'], desc: 'It disconnects every few minutes, especially during calls.', assetCat: 'ac_it', spaceKinds: ['office', 'meeting'], tags: ['network'] },
  { cat: 'c_it_sw', titles: ['Locked out of my account', 'Need access to the finance dashboard', 'Licence for design tool expired', 'MFA codes not arriving'], desc: 'I need this to finish my work today.', spaceKinds: ['office'], tags: ['account'] },
  { cat: 'c_it_av', titles: ['Display not detecting HDMI', 'No sound in video calls', 'Camera shows black screen', 'Wireless presenter not pairing'], desc: 'We have an external client meeting booked in this room.', assetCat: 'ac_it', spaceKinds: ['meeting'], tags: ['av'] },
  { cat: 'c_it_print', titles: ['Printer jammed', 'Printer says toner low', 'Cannot scan to email'], desc: 'Display shows an error and nothing prints.', assetCat: 'ac_it', spaceKinds: ['office'], tags: ['printing'] },
  { cat: 'c_it_new', titles: ['Laptop and accounts for new joiner', 'Equipment for intern starting Monday', 'Second monitor request'], desc: 'Please prepare standard kit and access.', spaceKinds: ['office'], tags: ['onboarding'] },
  { cat: 'c_card', titles: ['Lost my access card', 'Card not opening floor door', 'Need access to Annex building', 'Replacement card request'], desc: 'Please block the old card and issue a new one.', spaceKinds: ['lobby'], tags: ['access'] },
  { cat: 'c_safety', titles: ['Wet floor with no warning sign', 'Loose handrail on stairwell', 'Blocked fire exit with boxes', 'Trip hazard — cable across walkway'], desc: 'Someone could get hurt. Please check urgently.', spaceKinds: ['common', 'office'], tags: ['safety'] },
  { cat: 'c_lost', titles: ['Lost umbrella in lobby', 'Found a wallet near lifts', 'Left laptop charger in meeting room'], desc: 'Describing the item in the comments.', spaceKinds: ['meeting', 'lobby'], tags: ['lost'] },
  { cat: 'c_move', titles: ['Move my team of 6 to the window side', 'Desk change after reorg', 'Reserve project area for sprint'], desc: 'Planned for next week, with manager approval attached.', spaceKinds: ['office'], tags: ['move'] },
  { cat: 'c_cater', titles: ['Catering for client workshop', 'Pantry out of coffee capsules', 'Lunch for 20 for all-hands'], desc: 'Please confirm the menu and budget.', spaceKinds: ['pantry', 'meeting'], tags: ['catering'] },
  { cat: 'c_parcel', titles: ['Parcel at reception not collected', 'Arrange courier pickup', 'Missing delivery from yesterday'], desc: 'Tracking number in the comments.', spaceKinds: ['lobby'], tags: ['parcel'] },
  { cat: 'c_park', titles: ['Parking permit for new car', 'Motorbike slot request', 'Permit scanner rejected my plate'], desc: 'Attaching STNK photo.', spaceKinds: ['parking'], tags: ['parking'] },
]

const AGENT_REPLIES = [
  'Thanks for reporting this — I have picked it up and will update you shortly.',
  'We are looking into it now. Could you confirm the exact location so the technician goes to the right place?',
  'A technician is on the way to you.',
  'We have found the cause. Parts are being arranged and I will update you once we have a time.',
  'The vendor has been booked and will visit within the contract window.',
]
const RESOLUTIONS = [
  'Replaced the faulty component and tested — working normally.',
  'Reset the unit and cleaned the filters. Monitored for 30 minutes with no repeat.',
  'Configuration corrected. Please let us know if it comes back.',
  'Vendor completed the repair and signed off the work order.',
  'Issue could not be reproduced after inspection; adjusted settings as a precaution.',
  'Cleaned and restocked. Added to the weekly round to prevent a repeat.',
]
const CSAT_NOTES: Record<number, string[]> = {
  5: ['Fast and friendly, thank you!', 'Fixed within the hour.', 'Great communication throughout.'],
  4: ['Good, though it took a follow-up.', 'Solved, a little slower than hoped.'],
  3: ['Fixed but I had to chase twice.', 'OK.'],
  2: ['Came back after a week.', 'Not fully fixed.'],
  1: ['Took far too long.'],
}

/* ---------------------------------------------------------------- ticket factory */

/** Wall-clock add, then nudge out of nights/weekends for business-hours teams so history reads naturally. */
function wall(from: Date, minutes: number, calendar: '24x7' | 'business') {
  let d = addMinutes(from, minutes)
  if (calendar === '24x7') return d
  for (let g = 0; g < 10; g++) {
    const mins = d.getHours() * 60 + d.getMinutes()
    const working = BUSINESS_HOURS.days.includes(d.getDay())
    if (working && mins >= BUSINESS_HOURS.startMin && mins < BUSINESS_HOURS.endMin) return d
    const next = new Date(d)
    if (!working || mins >= BUSINESS_HOURS.endMin) next.setDate(next.getDate() + 1)
    next.setHours(8, Math.floor(rnd() * 40), 0, 0)
    d = next
  }
  return d
}

interface Spec {
  tpl: Tpl
  title?: string
  createdAt: Date
  priority?: Priority
  status: TicketStatus
  requesterId: string
  assigneeId?: string
  spaceId?: string
  assetId?: string
  pendingReason?: Ticket['pendingReason']
  description?: string
  channel?: Ticket['channel']
  /** minutes after creation that the ticket was resolved (when status resolved/closed) */
  resolveAfterMin?: number
  extra?: Activity[]
  csat?: number | null
}

const allSpaces = SPACES
function spaceFor(tpl: Tpl, assetSpace?: string) {
  if (assetSpace) return assetSpace
  const pool = allSpaces.filter((s) => (tpl.spaceKinds ?? ['office']).includes(s.kind) && s.floor >= 1)
  return pick(pool.length ? pool : allSpaces).id
}

function build(spec: Spec): Ticket {
  const cat = CATEGORIES.find((c) => c.id === spec.tpl.cat)!
  const priority = spec.priority ?? cat.defaultPriority
  const created = spec.createdAt
  const dues = dueDates(created, priority)
  const policy = policyFor(priority)
  const requester = USERS.find((u) => u.id === spec.requesterId)!
  const team = TEAMS.find((t) => t.id === cat.teamId)!

  let assetId = spec.assetId
  if (!assetId && spec.tpl.assetCat && chance(0.55)) {
    const pool = ASSETS.filter((a) => a.categoryId === spec.tpl.assetCat)
    if (pool.length) assetId = pick(pool).id
  }
  const asset = ASSETS.find((a) => a.id === assetId)
  const assetSpace = asset ? SPACES.find((x) => x.id === asset.spaceId) : undefined
  const spaceId = spec.spaceId ?? spaceFor(spec.tpl, assetSpace && assetSpace.kind !== 'technical' ? asset?.spaceId : undefined)

  const activity: Activity[] = [
    { id: id('ac'), at: iso(created), actorId: requester.id, type: 'created', body: spec.description ?? spec.tpl.desc },
  ]
  const assignee =
    spec.assigneeId ?? (spec.status === 'new' ? undefined : pick(agentsByTeam(team.id).length ? agentsByTeam(team.id) : [manager]).id)

  let t = created
  let firstResponseAt: Date | undefined
  let pausedMs = 0
  let pausedAt: Date | undefined
  let resolvedAt: Date | undefined
  let closedAt: Date | undefined
  let current: TicketStatus = 'new'

  const log = (type: Activity['type'], at: Date, actorId: string | null, extra: Partial<Activity> = {}) =>
    activity.push({ id: id('ac'), at: iso(at), actorId, type, ...extra })

  if (spec.status !== 'new' && assignee) {
    const lag = priority === 'p1' ? between(2, 10) : between(3, policy.responseMin * 0.85)
    t = wall(created, lag, policy.calendar)
    if (t > NOW) t = NOW
    log('assign', t, 'u_rina', { to: assignee, body: `Routed to ${team.name}` })
    current = 'assigned'
    firstResponseAt = chance(0.9) ? t : wall(t, between(policy.responseMin * 0.9, policy.responseMin * 1.4), policy.calendar)
    if (firstResponseAt > NOW) firstResponseAt = new Date(NOW.getTime() - 60_000)
    log('comment', firstResponseAt, assignee, { body: pick(AGENT_REPLIES) })
  }

  const needsProgress = ['in_progress', 'pending', 'resolved', 'closed'].includes(spec.status)
  if (needsProgress && assignee) {
    t = new Date(Math.min(NOW.getTime() - 30_000, addMinutes(firstResponseAt ?? t, between(10, 60)).getTime()))
    log('status', t, assignee, { from: current, to: 'in_progress' })
    current = 'in_progress'
  }

  if (spec.status === 'pending' && assignee) {
    t = new Date(Math.min(NOW.getTime() - 20_000, addMinutes(t, between(20, 120)).getTime()))
    pausedAt = t
    log('status', t, assignee, { from: 'in_progress', to: 'pending', body: `Waiting on ${spec.pendingReason ?? 'requester'}` })
    current = 'pending'
  }

  if ((spec.status === 'resolved' || spec.status === 'closed') && assignee) {
    // a pause in the middle for some tickets
    if (chance(0.25)) {
      const ps = addMinutes(t, between(10, 40))
      const pe = addMinutes(ps, between(60, 300))
      pausedMs += pe.getTime() - ps.getTime()
      log('status', ps, assignee, { from: 'in_progress', to: 'pending', body: 'Waiting on requester' })
      log('comment', addMinutes(ps, 15), requester.id, { body: 'Replied with the details you asked for.' })
      log('status', pe, assignee, { from: 'pending', to: 'in_progress' })
      t = pe
    }
    const work = (spec.resolveAfterMin ?? policy.resolveMin * between(0.2, 1.35))
    let r = wall(created, work, policy.calendar)
    if (r <= t) r = addMinutes(t, 15)
    if (r > NOW) r = new Date(NOW.getTime() - 120_000)
    resolvedAt = r
    log('status', r, assignee, { from: 'in_progress', to: 'resolved', body: pick(RESOLUTIONS) })
    current = 'resolved'
    if (spec.status === 'closed') {
      closedAt = new Date(Math.min(NOW.getTime(), addDays(r, between(1, 3)).getTime()))
      log('status', closedAt, null, { from: 'resolved', to: 'closed', body: 'Closed automatically after 3 working days' })
      current = 'closed'
    }
  }

  if (spec.status === 'cancelled') {
    t = addMinutes(created, between(20, 600))
    log('status', t, requester.id, { from: 'new', to: 'cancelled', body: 'Sorted it out myself — please cancel.' })
    current = 'cancelled'
  }

  if (spec.extra) activity.push(...spec.extra)
  activity.sort((a, b) => a.at.localeCompare(b.at))

  const updatedAt = activity[activity.length - 1].at
  let csat: Ticket['csat']
  if (spec.status === 'closed' && spec.csat !== null && chance(0.7)) {
    const score = spec.csat ?? weighted([[5, 52], [4, 28], [3, 11], [2, 5], [1, 4]])
    csat = { score, comment: chance(0.5) ? pick(CSAT_NOTES[score]) : undefined, at: iso(addMinutes(new Date(resolvedAt ?? created), between(30, 2000))) }
  }

  const tags = [...(spec.tpl.tags ?? [])]
  if (priority === 'p1') tags.push('major-incident')
  if (requester.vip) tags.push('vip')

  return {
    id: id('tk'),
    number: '',
    title: spec.title ?? pick(spec.tpl.titles),
    description: spec.description ?? spec.tpl.desc,
    kind: cat.kind,
    categoryId: cat.id,
    priority,
    status: current,
    pendingReason: current === 'pending' ? spec.pendingReason ?? 'requester' : undefined,
    requesterId: requester.id,
    assigneeId: assignee,
    teamId: team.id,
    spaceId,
    assetId,
    channel: spec.channel ?? weighted<Ticket['channel']>([['portal', 55], ['email', 15], ['qr', 14], ['phone', 10], ['walk_in', 6]]),
    createdAt: iso(created),
    updatedAt,
    firstResponseAt: firstResponseAt ? iso(firstResponseAt) : undefined,
    resolvedAt: resolvedAt ? iso(resolvedAt) : undefined,
    closedAt: closedAt ? iso(closedAt) : undefined,
    pausedAt: pausedAt ? iso(pausedAt) : undefined,
    pausedMs,
    ...dues,
    tags,
    workOrderIds: [],
    csat,
    resolutionNote: resolvedAt ? activity.filter((a) => a.type === 'status' && a.to === 'resolved').at(-1)?.body : undefined,
    activity,
  }
}

/* ---------------------------------------------------------------- build the book */

function ticketSpecs(): Spec[] {
  const specs: Spec[] = []
  const tplOf = (cat: string, i = 0) => TPL.filter((t) => t.cat === cat)[i] ?? TPL.find((t) => t.cat === cat)!

  /* a few hand-written stories the demo can lean on */
  specs.push(
    { tpl: tplOf('c_hvac'), title: 'Chiller 2 tripped — floors 6–9 have no cooling', description: 'Chiller 2 alarmed and shut down at 08:40. Floors 6 to 9 are warming quickly, the finance close team is on site. Chiller 1 is running at full load but cannot carry the building.', createdAt: minsAgo(200), priority: 'p1', status: 'in_progress', requesterId: 'u_bayu', assigneeId: 'u_budi', assetId: 'a_chiller2', spaceId: 'sp_roof_chiller', channel: 'phone' },
    { tpl: tplOf('c_plumb'), title: 'Water dripping from ceiling in Floor 5 pantry', description: 'Water is coming through the ceiling tile above the sink and pooling on the floor. Caught it in a bin for now. The tile looks wet and soft.', createdAt: minsAgo(11), priority: 'p2', status: 'new', requesterId: 'u_galih', spaceId: 'sp_f5_pantry', channel: 'qr' },
    { tpl: tplOf('c_lift'), title: 'Lift 2 out of service since this morning', description: 'Lift 2 shows an “Out of service” sign on every floor. The remaining lifts are queuing heavily at 08:30 and 12:00.', createdAt: minsAgo(60 * 5), priority: 'p2', status: 'pending', pendingReason: 'vendor', requesterId: 'u_citra', assigneeId: 'u_dimas', assetId: 'a_lift2', spaceId: 'sp_roof_lift', channel: 'email' },
    { tpl: tplOf('c_it_net'), title: 'Wi-Fi dropping across Floor 3 Commercial', description: 'The sales team loses video calls every few minutes. Started on Monday after the Wi-Fi controller update. Wired connections are fine.', createdAt: minsAgo(60 * 50), priority: 'p2', status: 'in_progress', requesterId: 'u_irfan', assigneeId: 'u_fajar', assetId: 'a_ap_f3', spaceId: 'sp_f3_open', channel: 'portal' },
    { tpl: tplOf('c_it_av'), title: 'Bromo display not detecting HDMI', description: 'The display in Bromo shows “No signal” when we connect any laptop. The hybrid camera works. Client workshop booked there at 14:00 today.', createdAt: minsAgo(95), priority: 'p3', status: 'assigned', requesterId: 'u_dewi', assigneeId: 'u_yoga', assetId: 'a_disp_bromo', spaceId: 'sp_f5_bromo', channel: 'qr' },
    { tpl: tplOf('c_elec'), title: 'Burning smell from floor box — Floor 6 east', description: 'There is a faint burning smell near the floor box by the window on the east side. We have unplugged everything from it.', createdAt: minsAgo(35), priority: 'p1', status: 'assigned', requesterId: 'u_jihan', assigneeId: 'u_agus', spaceId: 'sp_f6_open', channel: 'phone' },
    { tpl: tplOf('c_door'), title: 'Floor 6 east door not latching', description: 'Door is propped open by a chair because it will not latch. Security have noticed it on CCTV.', createdAt: minsAgo(60 * 28), priority: 'p3', status: 'in_progress', requesterId: 'u_farah', assigneeId: 'u_maya', assetId: 'a_door_f6', spaceId: 'sp_f6_open', channel: 'portal' },
    { tpl: tplOf('c_cater'), title: 'Catering for client workshop in Bromo', description: 'Workshop for 18 people, 14:00–17:00 on Thursday. Coffee, tea, light snacks. Two vegetarian, one halal-only.', createdAt: minsAgo(60 * 20), priority: 'p4', status: 'pending', pendingReason: 'approval', requesterId: 'u_dewi', assigneeId: 'u_eko', spaceId: 'sp_f5_bromo', channel: 'portal' },
    { tpl: tplOf('c_hvac'), title: 'AHU L5 noisy and warm on west side', description: 'Persistent humming and the west side stays above 27 °C in the afternoon. It has been like this for about two weeks.', createdAt: minsAgo(60 * 24 * 9), priority: 'p3', status: 'pending', pendingReason: 'parts', requesterId: 'u_hana', assigneeId: 'u_budi', assetId: 'a_ahu_f5', spaceId: 'sp_f5_open', channel: 'portal' },
    { tpl: tplOf('c_it_print'), title: 'Printer L6 printing with grey streaks', description: 'Every page has a vertical grey line on the left. Toner replaced last week.', createdAt: minsAgo(60 * 24 * 6), priority: 'p4', status: 'in_progress', requesterId: 'u_bayu', assigneeId: 'u_yoga', assetId: 'a_print_f6', spaceId: 'sp_f6_open', channel: 'portal' },
  )

  /* Anisa's own story — the requester persona sees these */
  specs.push(
    { tpl: tplOf('c_hvac'), title: 'AC too cold near my desk (Floor 5, row C)', description: 'It is freezing at the C row desks, I have been wearing a jacket all week. The thermostat is on 24 °C and Auto.', createdAt: minsAgo(60 * 22), priority: 'p3', status: 'in_progress', requesterId: 'u_anisa', assigneeId: 'u_budi', spaceId: 'sp_f5_open', channel: 'portal' },
    { tpl: tplOf('c_it_hw'), title: 'Laptop battery swollen — trackpad lifting', description: 'The trackpad is pushing up and the case no longer sits flat. I have switched it off and unplugged it.', createdAt: minsAgo(60 * 30), priority: 'p2', status: 'resolved', requesterId: 'u_anisa', assigneeId: 'u_yoga', spaceId: 'sp_f5_open', channel: 'portal' },
    { tpl: tplOf('c_furn'), title: 'Monitor riser for standing desk', description: 'I would like a riser so the monitor sits at eye level.', createdAt: minsAgo(60 * 50), priority: 'p4', status: 'pending', pendingReason: 'requester', requesterId: 'u_anisa', assigneeId: 'u_eko', spaceId: 'sp_f5_open', channel: 'portal', extra: [{ id: id('ac'), at: iso(minsAgo(60 * 20)), actorId: 'u_eko', type: 'comment', body: 'Hi Anisa — do you want the fixed 10 cm riser or the adjustable arm? Adjustable needs a clamp-friendly desk edge.' }] },
    { tpl: tplOf('c_card'), title: 'Card not opening Floor 6 door', description: 'I was added to the Finance project team and need to reach Floor 6 on weekdays.', createdAt: minsAgo(60 * 24 * 12), status: 'closed', requesterId: 'u_anisa', assigneeId: 'u_maya', spaceId: 'sp_hq_lobby', csat: 5 },
    { tpl: tplOf('c_it_av'), title: 'No sound in Toba on video calls', description: 'Others cannot hear me and I cannot hear them.', createdAt: minsAgo(60 * 24 * 21), status: 'closed', requesterId: 'u_anisa', assigneeId: 'u_yoga', spaceId: 'sp_f5_toba', csat: 4 },
    { tpl: tplOf('c_it_sw'), title: 'Design tool licence expired', description: 'My licence ended yesterday.', createdAt: minsAgo(60 * 24 * 35), status: 'closed', requesterId: 'u_anisa', assigneeId: 'u_yoga', spaceId: 'sp_f5_open', csat: 5 },
  )

  /* long tail of history */
  const weights: [string, number][] = [
    ['c_hvac', 16], ['c_elec', 8], ['c_plumb', 7], ['c_lift', 3], ['c_clean', 6], ['c_pest', 2], ['c_furn', 4], ['c_door', 3],
    ['c_it_hw', 10], ['c_it_net', 6], ['c_it_sw', 8], ['c_it_av', 5], ['c_it_print', 4], ['c_it_new', 3], ['c_card', 6],
    ['c_safety', 2], ['c_lost', 2], ['c_move', 3], ['c_cater', 4], ['c_parcel', 3], ['c_park', 3],
  ]
  for (let day = 0; day < 92; day++) {
    const dow = addDays(NOW, -day).getDay()
    const base = dow === 0 || dow === 6 ? 0.25 : day < 21 ? 3.6 : 2.4
    const n = Math.max(0, Math.round(base + between(-1.2, 1.4)))
    for (let k = 0; k < n; k++) {
      const cat = weighted(weights)
      const tpl = pick(TPL.filter((t) => t.cat === cat))
      const hour = between(8, 17)
      const created = new Date(NOW.getTime() - day * 86_400_000)
      created.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), 0, 0)
      if (created > NOW) continue
      const ageDays = (NOW.getTime() - created.getTime()) / 86_400_000
      const status = ageDays < 1
        ? weighted<TicketStatus>([['new', 14], ['assigned', 20], ['in_progress', 38], ['pending', 10], ['resolved', 18]])
        : ageDays < 4
        ? weighted<TicketStatus>([['assigned', 8], ['in_progress', 22], ['pending', 10], ['resolved', 30], ['closed', 28], ['cancelled', 2]])
        : ageDays < 8
        ? weighted<TicketStatus>([['in_progress', 3], ['pending', 3], ['resolved', 12], ['closed', 80], ['cancelled', 2]])
        : weighted<TicketStatus>([['closed', 96], ['cancelled', 4]])
      const def = CATEGORIES.find((c) => c.id === cat)!.defaultPriority
      const order: Priority[] = ['p1', 'p2', 'p3', 'p4']
      const idx = order.indexOf(def)
      const p = weighted<number>([[idx, 62], [Math.max(0, idx - 1), 22], [Math.min(3, idx + 1), 14], [0, 2]])
      specs.push({
        tpl, createdAt: created, priority: order[p], status,
        requesterId: pick(requesters).id,
        pendingReason: status === 'pending' ? pick(['requester', 'vendor', 'parts'] as const) : undefined,
      })
    }
  }
  return specs
}

function buildAll() {
  const specs = ticketSpecs().sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  const tickets = specs.map(build)
  tickets.forEach((t, i) => { t.number = `HD-${1000 + i + 1}` })
  return tickets
}

/* ---------------------------------------------------------------- PM, work orders */

const PM_DEFS: { id: string; name: string; asset: string; freq: PmSchedule['frequency']; dueIn: number; last: number | null; teamId: string; vendor?: string; est: number; list: string[] }[] = [
  { id: 'pm_chiller', name: 'Chiller quarterly service', asset: 'a_chiller1', freq: 'quarterly', dueIn: 21, last: 70, teamId: 'tm_fac', vendor: 'v_cool', est: 360, list: ['Check refrigerant pressure and oil level', 'Inspect compressor current draw', 'Clean condenser tubes', 'Verify safety cutouts', 'Log supply/return temperatures'] },
  { id: 'pm_chiller2', name: 'Chiller quarterly service', asset: 'a_chiller2', freq: 'quarterly', dueIn: -3, last: 94, teamId: 'tm_fac', vendor: 'v_cool', est: 360, list: ['Check refrigerant pressure and oil level', 'Inspect compressor current draw', 'Clean condenser tubes', 'Verify safety cutouts', 'Log supply/return temperatures'] },
  { id: 'pm_ct', name: 'Cooling tower inspection & water treatment', asset: 'a_ct1', freq: 'monthly', dueIn: 6, last: 24, teamId: 'tm_fac', est: 120, list: ['Check basin level and float valve', 'Inspect fill and drift eliminators', 'Dose biocide and test conductivity', 'Grease fan bearings'] },
  { id: 'pm_ahu3', name: 'AHU filter change & belt check', asset: 'a_ahu_f3', freq: 'monthly', dueIn: 2, last: 28, teamId: 'tm_fac', est: 90, list: ['Replace pre-filters', 'Check belt tension and wear', 'Clean drain pan', 'Record airflow'] },
  { id: 'pm_ahu5', name: 'AHU filter change & belt check', asset: 'a_ahu_f5', freq: 'monthly', dueIn: -9, last: 40, teamId: 'tm_fac', est: 90, list: ['Replace pre-filters', 'Check belt tension and wear', 'Clean drain pan', 'Record airflow'] },
  { id: 'pm_genset', name: 'Genset monthly load test', asset: 'a_genset', freq: 'monthly', dueIn: 9, last: 21, teamId: 'tm_fac', vendor: 'v_volt', est: 150, list: ['Check fuel, oil and coolant levels', 'Start and run on load for 30 min', 'Record voltage, frequency and temperatures', 'Test ATS transfer'] },
  { id: 'pm_ups', name: 'UPS battery & bypass check', asset: 'a_ups1', freq: 'semiannual', dueIn: 40, last: 140, teamId: 'tm_fac', vendor: 'v_volt', est: 240, list: ['Measure battery cell voltages', 'Thermal scan of connections', 'Test transfer to bypass', 'Check fans and filters'] },
  { id: 'pm_lift1', name: 'Lift monthly service — Lift 1', asset: 'a_lift1', freq: 'monthly', dueIn: 16, last: 14, teamId: 'tm_fac', vendor: 'v_vertex', est: 120, list: ['Inspect door operator and sills', 'Test emergency brake and intercom', 'Check ropes and sheave', 'Lubricate guide rails'] },
  { id: 'pm_lift3', name: 'Lift monthly service — Lift 3', asset: 'a_lift3', freq: 'monthly', dueIn: 4, last: 26, teamId: 'tm_fac', vendor: 'v_vertex', est: 120, list: ['Inspect door operator and sills', 'Test emergency brake and intercom', 'Check ropes and sheave', 'Lubricate guide rails'] },
  { id: 'pm_firepump', name: 'Fire pump weekly run test', asset: 'a_pump_fire', freq: 'weekly', dueIn: 1, last: 6, teamId: 'tm_fac', vendor: 'v_safe', est: 45, list: ['Run diesel pump for 15 minutes', 'Check fuel level and battery', 'Check discharge pressure', 'Log run hours'] },
  { id: 'pm_fap', name: 'Fire alarm panel & detector test', asset: 'a_fap', freq: 'quarterly', dueIn: 33, last: 58, teamId: 'tm_sec', vendor: 'v_safe', est: 300, list: ['Test 20% of detectors per round', 'Verify sounders and strobes', 'Check panel battery', 'Confirm signal to monitoring centre'] },
  { id: 'pm_apar', name: 'Fire extinguisher inspection', asset: 'a_apar', freq: 'annual', dueIn: 45, last: 320, teamId: 'tm_sec', vendor: 'v_safe', est: 240, list: ['Check pressure gauges', 'Inspect seals and hoses', 'Replace anything past expiry', 'Update tags'] },
  { id: 'pm_booster', name: 'Water booster pump service', asset: 'a_booster', freq: 'quarterly', dueIn: 12, last: 78, teamId: 'tm_fac', vendor: 'v_aqua', est: 150, list: ['Check pressure vessel pre-charge', 'Inspect seals for leaks', 'Test duty/standby changeover'] },
  { id: 'pm_swc', name: 'Core switch health check', asset: 'a_swc', freq: 'quarterly', dueIn: 19, last: 71, teamId: 'tm_it', vendor: 'v_net', est: 120, list: ['Review logs and error counters', 'Verify config backup', 'Check fan and PSU status'] },
  { id: 'pm_nvr', name: 'CCTV coverage & storage check', asset: 'a_nvr', freq: 'monthly', dueIn: -1, last: 31, teamId: 'tm_sec', est: 90, list: ['Verify all cameras recording', 'Check retention days', 'Clean outdoor dome lenses', 'Test export'] },
]


function buildPm() {
  const pms: PmSchedule[] = PM_DEFS.map((p) => ({
    id: p.id, name: p.name, assetId: p.asset, frequency: p.freq,
    nextDueAt: iso(setMinutes(setHours(addDays(NOW, p.dueIn), 9), 0)),
    lastDoneAt: p.last == null ? undefined : iso(addDays(NOW, -p.last)),
    checklist: p.list, teamId: p.teamId, vendorId: p.vendor, active: true, estMinutes: p.est,
  }))
  return pms
}

function woFromTicket(t: Ticket, n: number): WorkOrder | null {
  const cat = CATEGORIES.find((c) => c.id === t.categoryId)!
  if (cat.domain !== 'facilities' && cat.id !== 'c_door') return null
  if (!t.assigneeId || t.status === 'new' || t.status === 'cancelled') return null
  if (!chance(0.55) && t.priority !== 'p1') return null
  const done = t.status === 'resolved' || t.status === 'closed'
  const created = new Date(new Date(t.firstResponseAt ?? t.createdAt).getTime() + 5 * 60_000)
  const started = addMinutes(created, between(10, 90))
  const completed = done ? new Date(t.resolvedAt!) : undefined
  const status: WorkOrder['status'] = done ? 'completed' : t.status === 'pending' ? 'on_hold' : t.status === 'in_progress' ? 'in_progress' : 'open'
  const wo: WorkOrder = {
    id: id('wo'), number: `WO-${3000 + n}`, title: t.title, type: 'corrective', status, priority: t.priority,
    assetId: t.assetId, spaceId: t.spaceId, ticketId: t.id, assigneeId: t.assigneeId,
    vendorId: t.pendingReason === 'vendor' ? ASSETS.find((a) => a.id === t.assetId)?.vendorId : undefined,
    createdAt: iso(created), scheduledFor: iso(started), dueAt: t.dueResolveAt,
    startedAt: status === 'open' ? undefined : iso(started), completedAt: completed ? iso(completed) : undefined,
    checklist: [
      { id: id('ck'), text: 'Isolate and make area safe', done: done || status === 'in_progress' },
      { id: id('ck'), text: 'Diagnose root cause', done: done || status === 'in_progress' },
      { id: id('ck'), text: 'Repair or replace', done },
      { id: id('ck'), text: 'Test and confirm with requester', done },
    ],
    timeLogs: status === 'open' ? [] : [{ id: id('tl'), userId: t.assigneeId, minutes: Math.round(between(25, 180)), at: iso(started), note: 'On-site diagnosis and repair' }],
    materials: done && chance(0.5) ? [{ id: id('mt'), name: pick(['Contactor 25A', 'Drain hose 1/2"', 'Fan capacitor 35µF', 'Thermostat sensor', 'Door closer', 'LED panel 600×600', 'Ball valve 3/4"']), qty: Math.ceil(between(1, 3)), unitCost: Math.round(between(35, 650)) * 1000 }] : [],
    completionNote: done ? t.resolutionNote : undefined,
  }
  t.workOrderIds.push(wo.id)
  t.activity.push({ id: id('ac'), at: wo.createdAt, actorId: t.assigneeId, type: 'workorder', body: `Created ${wo.number}`, to: wo.id })
  t.activity.sort((a, b) => a.at.localeCompare(b.at))
  return wo
}

function buildWorkOrders(tickets: Ticket[], pms: PmSchedule[]) {
  const out: WorkOrder[] = []
  let n = 0
  tickets.forEach((t) => {
    const wo = woFromTicket(t, n + 1)
    if (wo) { out.push(wo); n++ }
  })
  /* preventive: one done last time, plus one planned/overdue now */
  pms.forEach((pm) => {
    const asset = ASSETS.find((a) => a.id === pm.assetId)!
    const def = PM_DEFS.find((d) => d.id === pm.id)!
    const mk = (status: WorkOrder['status'], when: Date): WorkOrder => {
      const done = status === 'completed'
      const assignee = pm.vendorId ? undefined : pick(agentsByTeam(pm.teamId).concat(pm.teamId === 'tm_fac' ? [USERS.find((u) => u.id === 'u_budi')!] : [])).id
      n++
      return {
        id: id('wo'), number: `WO-${3000 + n}`, title: pm.name + (pm.name.includes(asset.name) ? '' : ` — ${asset.name}`), type: 'preventive', status,
        priority: asset.criticality === 'critical' ? 'p2' : 'p3', assetId: asset.id, spaceId: asset.spaceId, pmId: pm.id,
        assigneeId: assignee, vendorId: pm.vendorId, createdAt: iso(addDays(when, -7)), scheduledFor: iso(when), dueAt: iso(addDays(when, 2)),
        startedAt: done || status === 'in_progress' ? iso(when) : undefined, completedAt: done ? iso(addMinutes(when, pm.estMinutes + (chance(0.22) ? 60 * 24 * 4 : 0))) : undefined,
        checklist: pm.checklist.map((text, i) => ({ id: id('ck'), text, done: done || (status === 'in_progress' && i < 2) })),
        timeLogs: done ? [{ id: id('tl'), userId: assignee ?? 'u_budi', minutes: pm.estMinutes, at: iso(when), note: 'Routine service' }] : [],
        materials: [], vendorCost: pm.vendorId && done ? Math.round(between(2, 18)) * 1_000_000 : undefined,
        completionNote: done ? 'All checks completed — no abnormal findings.' : undefined,
      }
    }
    if (def.last != null) out.push(mk('completed', addDays(NOW, -def.last)))
    const dueDate = new Date(pm.nextDueAt)
    const daysTo = (dueDate.getTime() - NOW.getTime()) / 86_400_000
    if (daysTo < 14) out.push(mk(daysTo < -5 ? 'open' : daysTo < 0 ? 'scheduled' : daysTo < 3 ? 'in_progress' : 'scheduled', dueDate))
  })
  /* a few inspections */
  const rounds = [
    ['Weekly safety walk — Floors 1–6', 'u_maya', 'tm_sec', ['Fire exits clear', 'Extinguishers in place and in date', 'Emergency lighting works', 'First-aid kit stocked']],
    ['Restroom & pantry hygiene round — L3–L6', 'u_wayan', 'tm_hk', ['Soap and paper stocked', 'Bins emptied', 'Taps and flushes working', 'No odour or standing water']],
  ] as const
  rounds.forEach(([title, who, , list], i) => {
    for (let w = 3; w >= 0; w--) {
      n++
      const when = addDays(NOW, -w * 7 - i)
      out.push({
        id: id('wo'), number: `WO-${3000 + n}`, title, type: 'inspection', status: w === 0 ? 'scheduled' : 'completed', priority: 'p4',
        assigneeId: who, createdAt: iso(addDays(when, -2)), scheduledFor: iso(when), dueAt: iso(addDays(when, 1)),
        completedAt: w === 0 ? undefined : iso(addMinutes(when, 75)), startedAt: w === 0 ? undefined : iso(when),
        checklist: list.map((text, k) => ({ id: id('ck'), text, done: w !== 0, note: w === 2 && k === 1 ? 'Two units low on charge — flagged' : undefined })),
        timeLogs: w === 0 ? [] : [{ id: id('tl'), userId: who, minutes: 70, at: iso(when) }], materials: [],
      })
    }
  })
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/* ---------------------------------------------------------------- bookings, visitors */

const MEETING_TITLES = ['Weekly sync', 'Sprint planning', 'Client workshop', 'Design review', '1:1', 'Finance close', 'Board prep', 'Interview panel', 'Vendor negotiation', 'Product demo', 'All-hands rehearsal', 'Retrospective', 'Training session', 'Budget review']

function buildBookings(): Booking[] {
  const rooms = SPACES.filter((s) => s.bookable)
  const out: Booking[] = []
  const users = USERS.filter((u) => u.role === 'requester' && u.id !== 'u_anisa')
  for (let day = -10; day <= 7; day++) {
    const date = addDays(startOfDay(NOW), day)
    if ([0, 6].includes(date.getDay())) continue
    for (const room of rooms) {
      let cursor = Math.round((8.5 + between(0, 1.5)) * 2) / 2
      const heavy = room.capacity >= 8 ? 0.85 : 0.6
      while (cursor < 17) {
        let advance = pick([0.5, 1])
        if (chance(heavy)) {
          const dur = pick([0.5, 1, 1, 1.5, 2])
          advance = dur + pick([0, 0.5, 0.5, 1])
          const start = new Date(date); start.setHours(Math.floor(cursor), Math.round((cursor % 1) * 60), 0, 0)
          const end = addMinutes(start, dur * 60)
          out.push({
            id: id('bk'), spaceId: room.id, userId: pick(users).id, title: pick(MEETING_TITLES), start: iso(start), end: iso(end),
            attendees: Math.max(2, Math.min(room.capacity, Math.round(between(2, room.capacity)))),
            status: day < 0 && chance(0.06) ? 'cancelled' : 'confirmed', catering: room.capacity >= 14 && chance(0.4),
          })
        }
        cursor += advance
      }
    }
  }
  /* Anisa's bookings, placed in rooms that happen to be free */
  const ensure = (roomId: string, dayOffset: number, hour: number, dur: number, title: string, attendees: number, userId = 'u_anisa') => {
    const date = addDays(startOfDay(NOW), dayOffset)
    const start = new Date(date); start.setHours(hour, 0, 0, 0)
    const end = addMinutes(start, dur * 60)
    for (let i = out.length - 1; i >= 0; i--) {
      if (out[i].spaceId === roomId && new Date(out[i].start) < end && new Date(out[i].end) > start) out.splice(i, 1)
    }
    out.push({ id: id('bk'), spaceId: roomId, userId, title, start: iso(start), end: iso(end), attendees, status: 'confirmed' })
  }
  ensure('sp_f5_toba', 0, 15, 1, 'Design critique', 6)
  ensure('sp_f5_bromo', 1, 10, 2, 'Onboarding workshop', 14)
  ensure('sp_f4_komodo', 3, 11, 1, 'Research readout', 5)
  ensure('sp_f6_raja', 0, 14, 2, 'Facilities quarterly review', 10, 'u_rina')
  ensure('sp_f3_prambanan', 2, 9, 1, 'Vendor contract renewals', 6, 'u_rina')
  ensure('sp_f2_bunaken', 0, 15, 1, 'Fire drill planning', 4, 'u_budi')
  return out
}

const COMPANIES = ['Astra Mitra', 'Biru Samudra', 'Kencana Logistik', 'PT Sinar Dunia', 'Lumbung Digital', 'Garuda Konsultan', 'Pelita Energi', 'Northgate Partners', 'Hartanto & Co', 'Mahakarya Studio']
const PURPOSES = ['Client meeting', 'Interview', 'Vendor presentation', 'Audit', 'Equipment delivery', 'Contractor site visit', 'Partner workshop']
const VNAMES = ['Anton Wijaya', 'Maria Santoso', 'Rudi Hermawan', 'Sinta Dewi', 'Yusuf Rahman', 'Tika Handayani', 'Pak Darmawan', 'Linda Chen', 'Oscar Lim', 'Nadia Kusuma', 'Bagus Setiawan', 'Kartika Sari', 'Tommy Gunawan', 'Evi Susanti']

function buildVisitors(): Visitor[] {
  const out: Visitor[] = []
  const at = (dayOffset: number, h: number, m = 0) => { const d = addDays(startOfDay(NOW), dayOffset); d.setHours(h, m, 0, 0); return d }
  const mk = (i: number, expected: Date, status: Visitor['status']): Visitor => {
    const hosts = USERS.filter((u) => u.role !== 'agent')
    const checkedIn = ['checked_in', 'checked_out'].includes(status) ? addMinutes(expected, Math.round(between(-8, 10))) : undefined
    const nm = VNAMES[i % VNAMES.length]
    return {
      id: id('vs'), name: nm, company: COMPANIES[i % COMPANIES.length], email: `${nm.split(' ')[0].toLowerCase()}@${COMPANIES[i % COMPANIES.length].toLowerCase().replace(/[^a-z]/g, '')}.example`,
      hostId: pick(hosts).id, purpose: pick(PURPOSES), expectedAt: iso(expected), status,
      checkedInAt: checkedIn ? iso(checkedIn) : undefined,
      checkedOutAt: status === 'checked_out' && checkedIn ? iso(addMinutes(checkedIn, Math.round(between(40, 150)))) : undefined,
      passCode: String(100000 + Math.floor(rnd() * 899999)), ndaSigned: chance(0.6), vehicle: chance(0.3) ? `B ${1000 + Math.floor(rnd() * 8999)} ${pick(['XYZ', 'KLM', 'RTA', 'PQD'])}` : undefined,
    }
  }
  let i = 0
  const nowH = NOW.getHours()
  out.push(mk(i++, at(0, Math.max(8, nowH - 3)), 'checked_out'))
  out.push(mk(i++, at(0, Math.max(8, nowH - 1), 30), 'checked_in'))
  out.push(mk(i++, at(0, Math.max(8, nowH - 1)), 'checked_in'))
  out.push(mk(i++, at(0, Math.min(17, nowH + 1)), 'expected'))
  out.push(mk(i++, at(0, Math.min(17, nowH + 2), 30), 'expected'))
  out.push(mk(i++, at(0, Math.min(17, nowH + 3)), 'expected'))
  out.push(mk(i++, at(1, 9, 30), 'expected'))
  out.push(mk(i++, at(1, 11), 'expected'))
  out.push(mk(i++, at(1, 14), 'expected'))
  out.push(mk(i++, at(2, 10), 'expected'))
  out.push(mk(i++, at(-1, 10), 'checked_out'))
  out.push(mk(i++, at(-1, 13), 'checked_out'))
  out.push(mk(i++, at(-2, 15), 'no_show'))
  out.push(mk(i++, at(-3, 9), 'checked_out'))
  out[3].hostId = 'u_anisa'
  out[6].hostId = 'u_anisa'
  return out
}

/* ---------------------------------------------------------------- notifications */

function buildNotifications(tickets: Ticket[]): Notification[] {
  const n: Notification[] = []
  const mine = tickets.filter((t) => t.requesterId === 'u_anisa')
  const resolved = mine.find((t) => t.status === 'resolved')
  const pending = mine.find((t) => t.status === 'pending')
  const inprog = mine.find((t) => t.status === 'in_progress')
  if (resolved) n.push({ id: id('nt'), userId: 'u_anisa', text: `${resolved.number} was resolved — please confirm it is fixed`, at: resolved.resolvedAt!, read: false, to: `/tickets/${resolved.id}`, tone: 'success' })
  if (pending) n.push({ id: id('nt'), userId: 'u_anisa', text: `${pending.number}: Eko asked you a question`, at: pending.updatedAt, read: false, to: `/tickets/${pending.id}`, tone: 'warning' })
  if (inprog) n.push({ id: id('nt'), userId: 'u_anisa', text: `${inprog.number} is now being worked on by Budi Santoso`, at: inprog.updatedAt, read: true, to: `/tickets/${inprog.id}`, tone: 'info' })
  n.push({ id: id('nt'), userId: 'u_anisa', text: 'Your visitor Maria Santoso is on the way', at: iso(minsAgo(14)), read: false, to: '/visitors', tone: 'info' })

  const open = tickets.filter((t) => t.status !== 'closed' && t.status !== 'resolved' && t.status !== 'cancelled')
  const budi = open.filter((t) => t.assigneeId === 'u_budi')
  budi.slice(0, 3).forEach((t, i) => n.push({ id: id('nt'), userId: 'u_budi', text: i === 0 ? `${t.number} SLA is about to breach` : `${t.number} was assigned to you`, at: iso(minsAgo(10 + i * 40)), read: i > 1, to: `/tickets/${t.id}`, tone: i === 0 ? 'danger' : 'info' }))
  const hero = open.find((t) => t.priority === 'p1')
  if (hero) n.push({ id: id('nt'), userId: 'u_rina', text: `Major incident: ${hero.title}`, at: hero.createdAt, read: false, to: `/tickets/${hero.id}`, tone: 'danger' })
  n.push({ id: id('nt'), userId: 'u_rina', text: 'Housekeeping contract expired 4 days ago', at: iso(minsAgo(60 * 20)), read: false, to: '/vendors', tone: 'warning' })
  n.push({ id: id('nt'), userId: 'u_rina', text: 'Lift contract renews in 21 days', at: iso(minsAgo(60 * 30)), read: true, to: '/vendors', tone: 'info' })
  return n
}

export function seedData() {
  seq = 0
  const tickets = buildAll()
  const pms = buildPm()
  const workOrders = buildWorkOrders(tickets, pms)
  return {
    users: USERS,
    teams: TEAMS,
    buildings: BUILDINGS,
    spaces: SPACES,
    categories: CATEGORIES,
    assetCategories: ASSET_CATEGORIES,
    assets: ASSETS,
    vendors: VENDORS,
    contracts: CONTRACTS,
    canned: CANNED,
    announcements: ANNOUNCEMENTS,
    kb: KB,
    tickets,
    workOrders,
    pmSchedules: pms,
    bookings: buildBookings(),
    visitors: buildVisitors(),
    notifications: buildNotifications(tickets),
  }
}
