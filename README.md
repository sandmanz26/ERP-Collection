# PT Tata Gemilang — Outsourcing Management System

A front-end for an Indonesian outsourcing company: the kind of business that puts security officers
and cleaning crews inside other companies' buildings, on fixed-term contracts, and has to prove every
month that the posts it is being paid for actually had someone standing in them.

This is a **front-end only** build. There is no backend and no API layer. All data lives in the
browser (Zustand + `localStorage`), seeded with a realistic operating book: 12 clients, 18 buildings,
18 projects carrying 136 manpower lines, 17 positions, 6 warehouses, 58 master items, 137 warehouse
stock lines, and 12 accounts across 10 roles built from a catalogue of 58 privileges.

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
inventory without deletes, or `ratna.wulandari@` for a custom site-supervisor role with no commercial
access at all.

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

### 6. User management — users, roles, privileges

Access is enforced, not decorated. The role an account holds decides which menu entries exist, which
routes open, and which buttons render; a page that is not permitted refuses with the name of the
privilege it wanted rather than a blank screen.

```
effective privileges = union(active roles) + granted − revoked
```

Three layers, each with one job:

| Layer | Where it lives | Rule |
| --- | --- | --- |
| **Privilege** | In code (`data/permissions.ts`) — 58 of them, `<module>.<action>` | Never created by a user. Adding one is a code change, because each corresponds to a control the interface shows or hides. |
| **Role** | Data — 8 system roles, 2 custom | Only ever *grants*. An inactive role grants nothing, so an engagement can be switched off without unpicking who held it. |
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
| Master items | 58 across 9 categories, one deliberately discontinued |
| Stock lines | 137, including expired, expiring, quarantined and empty bins |
| Accounts | 12 — active, invited, unverified, locked and suspended; two carry privilege overrides |
| Roles | 10 — 8 system, 2 custom, one of them deliberately switched off |
| Privileges | 58 across 13 modules, 11 of them high risk |

The gaps are deliberate: an unfilled night shift at the hospital, a gondola cleaner whose certificate
lapsed, a contract 38 days from its end with no auto-renewal, one fall-protection harness short of what the
façade crew is contracted to need, a batch of masks past its date, a bin of raincoats emptied just
before the rainy season. A demo where everything is green demonstrates
nothing.

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
- **Server-side enforcement.** Privileges are enforced throughout this front end — menus, routes and
  controls all obey them — but a front end can only ever hide a control. Real enforcement belongs on
  the server, where the same privilege keys would gate the API. Treat this module as the interface
  for an access model, not as the access model itself.
