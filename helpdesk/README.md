# Atrium — Help Desk & Building Management

A front-end-only prototype for a company help desk joined to building management. Everything is mock data held in the browser (Zustand + `localStorage`) — there is no backend. It is built to be clicked through like the real thing: tickets move through a lifecycle, SLA clocks run and pause, work orders roll up cost, rooms cannot be double-booked.

```bash
cd helpdesk
npm install
npm run dev      # http://localhost:5173
npm run build
```

Sign in as any of three personas (or any of the 21 seeded people). Switch persona from the avatar menu at any time. **Reset demo data** lives in the same menu.

| Persona | Sees | Try this |
|---|---|---|
| **Anisa Putri** — Employee | Portal: search-first home, My requests, Book a room, Visitors, Help articles | Raise “Plumbing — leak”, then confirm + rate a *Resolved* ticket (HD-1194) |
| **Budi Santoso** — Agent | Queue, work orders, assets, preventive maintenance, spaces | Open the P1 chiller incident; run a work order checklist; log time and parts |
| **Rina Kusuma** — Manager | All of the above + vendors & contracts, reports, settings | Operations overview, SLA by priority, contract expiry, maintenance spend |

## Product decisions worth knowing

**Two products in one shell, shaped by role.** Employees get a calm, search-first portal; staff get a dense work surface. Same data, same routes, different defaults — the sidebar, the home page and the ticket page all change with role. Staff-only routes bounce employees home rather than showing a dead end.

**Tickets and work orders are separate on purpose** (ITSM + CMMS practice). A ticket is the *conversation and SLA* with a requester; a work order is the *job* — checklist, time, parts, vendor, cost — against an asset. One ticket can spawn many work orders; preventive jobs have no ticket at all. Completing a work order flags its ticket as ready to resolve; completing a preventive one schedules the next.

**SLA is real, not decorative.**
- Targets per priority with a 24×7 calendar for Critical and business hours (Mon–Fri 08:00–17:00 WIB) for the rest — `src/lib/sla.ts`.
- The clock **pauses** while a ticket is *Pending* (waiting on requester / vendor / parts / approval) and resumes when they reply or the agent resumes.
- States shown with words *and* icons, never colour alone: on track · at risk (<30 min or >75% used) · breached · paused · met · missed.
- Default queue order is “what will breach first”.
- Reported times (first response, time-to-resolve) count only working hours, so a Friday-evening ticket does not make Monday look slow.

**Reduce tickets before they exist.** The request form suggests knowledge-base articles as you type a title, the home search shows answers before offering “raise a request”, and every article ends in “Did this solve it? → No → raise a request” pre-filled.

**Asks the employee a human question, not a field.** Priority is chosen by *impact* (“a team cannot work”, “safety risk”) rather than a P1–P4 dropdown; staff see the resulting priority and the SLA it implies. A Critical choice shows a call-Security-first banner.

**Don't make people chase.** Status shows a four-step progress bar, “waiting on you” items float to the top of the home page, a reply from the requester on a pending ticket resumes the clock, and a reply on a resolved ticket reopens it. Resolved tickets ask “is this fixed?” with a one-click yes + optional 5-star rating.

**Physical-world hooks.** Each asset has a printable QR label; scanning opens the request form with the asset and its floor filled in (use *Simulate a scan* in the asset's QR dialog). Rooms show a day grid with live free-time, conflicts are prevented (including gaps that are not long enough for the chosen length), and visitors get a QR pass, a pass code, host notification on check-in and a printable badge.

**Safe operations.** Destructive or irreversible steps ask for a reason (cancel, reopen, resolve), bulk actions work from a sticky toolbar, filters are URL-addressable where it matters (`/tickets?view=unassigned`), and everything can be reached from the ⌘K palette.

## Information architecture

```
Employee                         Staff (agent / manager)
────────                         ───────────────────────
/             Home               /               Dashboard (agent: my day · manager: operations overview)
/new          New request        /tickets        Queue (views, filters, sort, bulk, export)
/requests     My requests        /tickets/:id    Conversation · SLA · assign · priority · work orders
/tickets/:id  Request detail     /work-orders    List / board · /work-orders/:id · /work-orders/new
/rooms        Book a room        /assets         Register · /assets/:id history, cost, QR, status
/visitors     Invite & passes    /maintenance    PM schedule + 4-week calendar, generate jobs
/help         Articles           /spaces         Stacking view: floors → rooms → open tickets
                                 /rooms          Booking grid (all bookings visible)
                                 /visitors       Reception: check-in / check-out
                                 /help           Knowledge base (+ staff-only articles, authoring)
                                 /vendors        Contracts, expiry, vendor scorecards      (manager)
                                 /reports        SLA, volume, CSAT, spend, repeat assets   (manager)
                                 /settings       SLA, routing, teams, canned replies       (manager)
```

## What is mock data

`src/data/seed.ts` generates ~207 tickets over 90 days (with realistic status ageing, pauses, first-response lag and CSAT), 41 assets, ~86 work orders, 15 preventive schedules, ~540 room bookings, 14 visitors, 15 articles and notifications. A seeded RNG keeps the story identical on every load, while timestamps are relative to *now* so SLA timers are live. A handful of hand-written stories (a P1 chiller trip, a leak, a stuck lift awaiting a vendor, an expired housekeeping contract) make the demo legible.

Simulated: email delivery, QR scanning, printing, file uploads (names only), SSO.

## Code map

```
src/data/        types, reference data, assets, KB, seed generator
src/store/       one persisted Zustand store with all domain actions
src/lib/         sla.ts (clock, calendars), metrics.ts, pm.ts, labels, format
src/components/  ui/ (design-system primitives), layout/, shared/, charts/
src/pages/       auth, dashboard, tickets, work, assets, workplace, help, manage
```

The store exposes domain actions (`createTicket`, `setStatus`, `comment`, `createBooking`, …) and no component mutates state directly, so swapping the store for an API client later is a mechanical change.

## Next steps toward production

1. API + Postgres behind the same action names; server-side SLA timers and business-hours calendars with holidays.
2. SSO (OIDC), real role/permission checks and an audit log.
3. Email-to-ticket and Teams/WhatsApp notifications; attachments in object storage.
4. IoT/BMS alarms creating tickets automatically; meter readings for energy.
5. Locale (ID/EN), time zones per building, accessibility audit with assistive-tech testing.
