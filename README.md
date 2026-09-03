# PT Tata Gemilang — Outsourcing Management System

A front-end for an Indonesian outsourcing company: the kind of business that puts security officers
and cleaning crews inside other companies' buildings, on fixed-term contracts, and has to prove every
month that the posts it is being paid for actually had someone standing in them.

This is a **front-end only** build. There is no backend and no API layer. All data lives in the
browser (Zustand + `localStorage`), seeded with a realistic operating book: 12 clients, 18 buildings,
18 projects carrying 136 manpower lines, 17 positions, 6 warehouses, 70 master items, 155 warehouse
stock lines, 12 divisions, 10 suppliers with 107 purchase prices behind them, four monthly material
request sessions, and 17 accounts across 12 roles built from a catalogue of 78 privileges.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
npm run lint
```

Sign in with any seeded account — `siti.rahmawati@tatagemilang.co.id` and the rest — using
`Gemilang#2026`. Three accounts fail on purpose (unverified, locked, suspended) so those paths can be
walked without breaking anything, and **each account opens a different suite**, because the role
decides which pages exist: sign in as `hendra.wijayanto@` for everything, `lina.marlina@` for
inventory without deletes, `rizal.maulana@` for procurement, `yanti.kurniasih@` for a division head
who can only file their own request, or `ratna.wulandari@` for a custom site-supervisor role with no
commercial access at all.

---

## The one number this system exists for

An outsourcing contract is a promise of *people on site*. Everything else — the client record, the
building, the rate card, the warehouse — exists to keep that promise or to prove it was kept. So one
figure is carried, identically, through the whole suite:

> **deployed ÷ contracted headcount**, per line, per shift, per project, per client, per service line.

It is the same component (`FulfilmentBar`) in all of them, with the same colours: green at 100%, amber
from 90%, red below. A gap of two people on the night shift at a hospital is not a rounding error, and
the interface never lets it read like one.

The second figure, one layer down, is **what the warehouse can cover**: every position carries a
standard issue (two sets of PDL, one pair of boots, a torch), so a project's contracted headcount
implies a quantity of stock. The project record checks that implied demand against what is actually
available and says, plainly, what is short.

---

## Modules

### 1. Authentication
Sign in, register, forgot password, reset password. Demo-only: the user list lives in the browser, so
the flow exercises the *interface* — lockout after five attempts, unverified accounts, suspended
accounts, expired and already-used reset links, password strength — not real security. A real
deployment authenticates on the server and never lets a credential reach the client.

Registration is limited to `@tatagemilang.co.id`; anyone else is invited by an administrator. The
reset form answers identically whether or not the address has an account, because a form that says
"no such user" tells an attacker which addresses are worth attacking.

### 2. Clients
The companies that sign and pay. Commercial terms (payment term, invoice day, PPN, PPh 23, credit
limit) are held once on the client and inherited by every new project. Contacts are held here, with
one marked primary. The client record shows its buildings, its projects, its fulfilment and its
monthly margin on one page.

### 3. Buildings
Every site a project can be attached to. A building belongs to one client and carries its own
operating hours (24/7, extended, office hours), shift pattern, floor area, site contact and access
rules — the things that decide how many shifts a project on it has to cover. The register shows which
project currently serves each building, and flags the ones with no project at all.

### 4. Projects
One contract, one client, **one building**, one period.

- **Period** — start and end date, with a progress bar, days remaining, renewal mode and notice days.
- **Manpower requirement** — one line per position and shift: how many people are needed, how many are
  deployed, days per week, hours per shift, bill rate and cost rate per person. The lines drive the
  contract value, the margin and the fulfilment figure.
- **One building per project** — enforced in the form, not by convention: the building list only shows
  the selected client's buildings, and any building already carrying a live project is disabled with
  the code of the project that holds it. A client with three towers signs three projects.

The project record adds a coverage-by-shift breakdown (where the gap actually sits) and an inventory
demand tab (what its headcount will draw from the warehouse, checked against availability).

**Deployments** flattens every manpower line in the company into one register, sorted by gap, so the
recruiter can see which position is costing the most empty posts across all sites.

**Positions** is the master behind those lines: service line, grade, required certifications
(Gada Pratama, K3 Umum, Sertifikat Gondola…), minimum education and experience, salary, allowance,
default bill rate, and the standard issue each person receives.

### 5. Inventory
Three sub-modules, in the order the data depends on them:

| Sub-module | What one row is | Rule |
| --- | --- | --- |
| **Warehouses** | A place stock is held — central, regional, or a site store inside a client building | — |
| **Item Master** | The definition of a thing, held once | SKU, name, category, sub-category, UoM, brand, variant, barcode, standard cost, min/max, reorder point and quantity, batch/expiry/hazard handling, supplier, lead time, service lines, status, audit fields |
| **Warehouse Stock** | One item, in one warehouse, in one bin | Points at exactly **one** master item; a warehouse holds many rows |

The master holds no quantities and the stock line holds no definitions — that separation is the point
of the module. A stock line may override the master's minimum where a warehouse runs to its own plan;
the central warehouse runs to the company-wide floor, a regional store to its own smaller one.

Availability is on hand **less** what a project has already reserved. Stock health is judged on what
is physically in the bin, because a reorder decision is about the shelf, not about the paperwork.

### 6. Procurement — divisions, suppliers, MR sessions, purchase requests

The month has a shape, and the module is that shape:

```
MR session (one per month)
  └── one request per division            filed and submitted by the division head
        └── lines: item + qty + purpose + optional estimated price
              │
              │  LOCK  — purchasing, once every request is submitted or returned
              ▼
      purchase request (draft)            one line per ITEM, not per division
        └── line.sources[]                each division's quantity kept, never lost
              └── supplier assignment  →  that supplier's last purchase price appears
```

**Divisions** are the cost centres that may ask for something: a code, a head, a cost centre, a
branch. A division that has ever filed a request cannot be deleted, because deleting it would
orphan the history the recap is built from.

**Suppliers** carry the categories they are approved for, payment terms, lead time, minimum order,
rating, on-time rate and a status — and, behind them, **107 rows of purchase history**. That history
is the point: a supplier is not a name, it is what it charged and when.

**MR session.** One per period; the form refuses a second session for the same month, because a
division that could file into two of them would split its own demand. A session runs
`DRAFT → OPEN → CLOSED → LOCKED`, and the register shows how many divisions have filed against how
many could, what the lines add up to, and how many items the merge will produce.

**The division head's page** (`/mr/my`) shows one thing: this division's request in the session that
is open right now. **Only items the warehouse already holds can be requested** — 69 of the 70 master
items qualify — with the available quantity shown against each. The estimated unit price is optional;
where it is left out the item's standard cost stands in, marked as such so nobody mistakes it for a
quote. Once submitted, the form is read-only until purchasing sends it back with a reason.

**Locking** is the one irreversible step, and the dialog says exactly what it will do before it does
it: how many requests merge into how many lines, how many of those lines combine more than one
division, which drafts and returned requests are being left out. It refuses while any request is
still in draft — locking would silently drop it — so purchasing must either wait for the division to
submit or return the request, which makes the exclusion deliberate and recorded.

**The purchase request** is the recap. Division A asking for 50 pens and division B for 30 becomes one
line of 80 that can still be read back to both: every line keeps `sources[]`, so the register shows
the merged quantity and the detail page shows `GA · 50` and `HRD · 30` beside it. Assign a supplier and
**its last purchase price for that item appears immediately**, dated, with the purchase order it came
from; the history dialog shows every purchase of the item from anyone. What a line is worth is stated
along with *on what authority*, in descending order of trust:

| Basis | Meaning |
| --- | --- |
| `Agreed` | A price negotiated on this request |
| `Last buy` | The most recent purchase of this item **from the assigned supplier** |
| `Last buy (other supplier)` | No history with this supplier; the most recent purchase from anyone |
| `Division estimate` | Nobody has bought it; the highest estimate a division gave |
| `Standard cost` | Nothing but the item master to go on |

Draft and assigned are derived, not chosen: a request becomes `ASSIGNED` when every line has a
supplier and falls back to `DRAFT` the moment one loses it. Approval is refused while any line is
unassigned, and freezes suppliers and prices. Three views of the same recap — by line, **by supplier**
(how the order is actually placed, with a warning when a bucket sits below that supplier's minimum
order), and **by division** (who is carrying what share of the value, and which request it came from).

Both the seeded purchase requests and the Lock button build their lines with the same
`buildPrLines()`, so the mock data and the running application cannot drift apart.

### 7. User management — users, roles, privileges

Access is enforced, not decorated. The role an account holds decides which menu entries exist, which
routes open, and which buttons render; a page that is not permitted refuses with the name of the
privilege it wanted rather than a blank screen.

```
effective privileges = union(active roles) + granted − revoked
```

Three layers, each with one job:

| Layer | Where it lives | Rule |
| --- | --- | --- |
| **Privilege** | In code (`data/permissions.ts`) — 78 of them, `<module>.<action>` | Never created by a user. Adding one is a code change, because each corresponds to a control the interface shows or hides. |
| **Role** | Data — 10 system roles, 2 custom | Only ever *grants*. An inactive role grants nothing, so an engagement can be switched off without unpicking who held it. |
| **Override** | On the account | Grants an exception, or revokes something a role gives. **Revoked always wins**, and the user record shows which layer every privilege came from. |

- **Users** — accounts, their roles, their overrides, effective privilege count, branch data scope,
  and the account actions: invite, edit, release a lock, suspend, restore, issue a temporary
  password, delete.
- **Roles** — a privilege matrix of module × action. Column headers toggle an action everywhere,
  high-risk boxes are red, and the editor states how many accounts the change will affect before it is
  saved.
- **Privileges** — the catalogue as a read-only matrix: every privilege, its risk, which roles grant
  it and how many active accounts end up holding it. This is where "why can that person do this"
  gets answered.

The guard rails exist because the alternative is a system nobody can get back into:

- An account cannot delete or suspend itself.
- No edit may leave the company with **no active account able to administer users and roles** — the
  check runs on user edits, on account deletion and on role edits, and refuses with the reason.
- System roles cannot be deleted, and Super Administrator cannot be edited at all.
- A role still held by an account cannot be deleted; reassign first.
- Self-registration cannot request a role that hands out privileges.
- A privilege change is written to the activity log as *what changed* — `+3 (stock.edit, …) −1` —
  rather than as "role updated", because that is what an auditor comes looking for.

---

## The table standard

Every register in the suite is the same component, so a coordinator learns one table and knows all of
them:

- **Sortable columns** — click to sort ascending, again for descending, again to clear. Sorting is by
  a declared value, not by rendered text, so money, dates and percentages sort as numbers.
- **Search** across every meaningful field of the row, not just its name.
- **Filters** — multi-select, per column, shown in a row above the table with an active count and a
  reset.
- **Import** — CSV with header mapping, per-field validation, a preview of what will change, and a
  downloadable sample file. Rows whose code already exists are updated in place rather than duplicated.
- **Export** — CSV or JSON, for the filtered view, the selection, or everything; plus a re-importable
  file shaped exactly like the importer expects, so export → edit → import round-trips.
- **Total row count**, always: `1–25 of 136`, and `(filtered from 137)` when a filter is on.
- Column show/hide with a stored preference, compact/comfortable density, page size, bulk selection,
  bulk delete with a cascade warning that names what else it will affect.

---

## What the seeded book contains

| | |
| --- | --- |
| Clients | 12 — active, prospect, on hold, one churned |
| Buildings | 18 across 8 cities — factories, towers, a hospital, a mall, a campus, a data centre |
| Projects | 18 — 13 active, 1 pending approval, 1 draft, 1 suspended, 1 completed, 1 terminated |
| Manpower lines | 136, for 769 contracted posts — 685 of them on active contracts, 642 filled |
| Positions | 17 across 9 service lines |
| Warehouses | 6 — one central, four regional, one site store |
| Master items | 70 across 9 categories, one deliberately discontinued |
| Stock lines | 155, including expired, expiring, quarantined and empty bins |
| Divisions | 12 cost centres, one of them inactive |
| Suppliers | 10 — active, on hold, one blacklisted — with 107 rows of purchase history |
| MR sessions | 4 — September open now, August/July/June locked |
| Division requests | 32 carrying 116 lines — submitted, draft, returned, approved |
| Purchase requests | 3 — a draft mid-negotiation, one approved, one ordered — 72 merged lines |
| Accounts | 17 — active, invited, unverified, locked and suspended; several carry privilege overrides |
| Roles | 12 — 10 system, 2 custom, one of them deliberately switched off |
| Privileges | 78 across 17 modules, 15 of them high risk |

The gaps are deliberate: an unfilled night shift at the hospital, a gondola cleaner whose certificate
lapsed, a contract 38 days from its end with no auto-renewal, one fall-protection harness short of what the
façade crew is contracted to need, a batch of masks past its date, a bin of raincoats emptied just
before the rainy season, two divisions that never filed this month and one whose request was sent
back. A demo where everything is green demonstrates nothing.

All companies, people, addresses and figures are fictional.

---

## Design

Light mode only, Tailwind, one blue primary. The token set lives at the top of `src/index.css` and
nothing outside it invents a colour. Amber marks a shortfall, red a breach, green a filled post; those
four status colours are reserved for state and never reused for decoration.

Navigation and labels are English; the operating vocabulary stays Indonesian — `Pagi`, `Siang`,
`Malam`, `Danru`, `Seragam Security PDL` — because that is what is said on the radio and printed on
the delivery note.

---

## Project layout

```
src/
  components/
    data-table/     DataTable + CSV importer — the table standard, one implementation
    layout/         AppShell, navigation, ⌘K command palette, route guards
    shared/         PageHeader, KpiCard, FulfilmentBar, status badges
    ui/             Buttons, inputs, selects, dialogs, toasts, menus, date picker
  data/
    types.ts        The domain model, with the relationships written into the types
    permissions.ts  The privilege catalogue — code-defined, never user-created
    reference.ts    Catalogues, labels, the authentication policy
    seed-*.ts       The seeded book, split by module
  lib/
    access.ts       Effective privileges, their sources, and the lock-out guard rails
    domain.ts       Everything the modules compute rather than store
    procurement.ts  The MR → PR arithmetic: the merge, the lock guard, the price basis
    csv.ts          CSV parse/serialise for import and export
    format.ts       Money, dates, numbers, Indonesian casing rules
  pages/            One folder per module
  store/            useErp (the data), useAuth (the session)
```

## Deliberately out of scope

This build covers the modules that were asked for first. The obvious next layers — and the reason they
are not here — are:

- **HR and personnel records.** Deployment is tracked as a *number* per line, not as named employees.
  Real fulfilment tracking needs a personnel master with certificates and their expiry dates.
- **Attendance and payroll.** The system knows what a contract owes; it does not know who turned up.
- **Billing.** Contract values and margins are computed, but no invoice is raised.
- **Stock movements.** Quantities can be edited, but there is no receipt, issue, transfer or
  stock-take document behind the change — only an activity log.
- **Purchase orders and goods receipt.** A purchase request can be approved and marked as ordered,
  but no order document is issued to a supplier and nothing books the delivery back into a warehouse.
  Approving a request does not move stock; the two modules meet at the item master and stop there.
- **Server-side enforcement.** Privileges are enforced throughout this front end — menus, routes and
  controls all obey them — but a front end can only ever hide a control. Real enforcement belongs on
  the server, where the same privilege keys would gate the API. Treat this module as the interface
  for an access model, not as the access model itself.
