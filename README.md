# Nusantara Freight — Export Operations Suite

A front-end for an Indonesian sea-freight forwarder: the kind of business that books space with a
carrier, stuffs a factory's cargo into containers, clears it through Bea Cukai and gets it onto a
vessel bound for Rotterdam, Yokohama or Savannah — and then has to prove it made money doing so.

This is a **front-end only** build. All data lives in the browser (Zustand + `localStorage`), seeded
with a realistic operating book of 14 jobs, 8 customers, 23 containers, 205 documents, a charge
sheet and a posted general ledger. There is no backend and no API layer.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

---

## Why it is shaped this way

A forwarding ERP that is only CRUD is worse than a spreadsheet, because a spreadsheet at least
does not pretend to be authoritative. The parts of this job that actually cost money are:

| What goes wrong | Where the system catches it |
| --- | --- |
| An SI, VGM or gate-in cut-off is missed and the box rolls to the next sailing | Cut-off calendar on every job, a live countdown in the exception queue, and a stage gate that will not let the job advance |
| A container is planned over its payload and is refused at the terminal gate | ISO container specs with live volume/payload validation while cargo is keyed in |
| A container sails half empty and the freight is paid for air | Utilisation status per unit plus an "optimal mix" suggestion for the job's total volume |
| A document is rejected or a destination rule is missed and the cargo is stuck at the POD | Document completeness meter, mandatory-document gating, and per-country rules (AQIS, ISF 10+2, EORI, Form D/E/AK/JIEPA) |
| An unbudgeted demurrage turns a 20% quote into a 4% job | Buy/sell margin per charge line, per job, and per trade lane |
| A client over their credit limit gets another booking | Credit check as a blocking task at the inquiry gate |
| Consignment stock ages out at the destination showroom | Sell-through tracking, settlement-cycle ageing and unsold-return windows |

Every number on the Control Tower is derived from the jobs, containers, documents and charges in
the store — nothing is a hand-typed dashboard figure.

---

## Domain model

### Customers and country offices
One customer, many country offices. A customer carries commercial identity (tax ID, credit limit,
payment terms, risk rating, default Incoterm); each **country office** carries the operational
identity for one market — city, default sea port (UN/LOCODE), customs/EORI number, VAT number,
roles (shipper, consignee, notify, agent) and its own contacts. A single customer routinely acts as
client, shipper *and* consignee across a job, and the job records each role separately.

### Service packages
The priced product on a lane. A package holds an origin/destination pair, mode, service scope,
validity window, free time, transit days and a **rate card**: each line has a charge code, a basis
(per container / CBM / kg / revenue tonne / B/L / shipment / document / % of value), a **buy** rate
and a **sell** rate, so the margin is known before the job is quoted. Inclusions and exclusions are
explicit, because "was destination THC included?" is where disputes come from. Applying a package
to a job copies its mandatory lines onto the job's charge sheet; the job then owns what was actually
charged, so a negotiated exception never rewrites the tariff.

### Projects (export jobs)
The job is the unit of work and the unit of profit. It carries parties, route, Incoterm, freight
term (prepaid/collect), payment term, B/L type and status, carrier/vessel/voyage, the cut-off
calendar, and Indonesian customs identity (PEB number, NPE date, COO form and number).

Job types: full export, **consignment**, partial/LCL, project cargo, triangular and cross-trade.

**The eight-stage stepper** — each stage has a checklist, and blocking tasks stop the job advancing:

1. **Inquiry & Quotation** — price from a package, credit-check the client, get written acceptance
2. **Carrier Booking** — secure space, record the cut-off calendar every later alert derives from
3. **Cargo & Container Plan** — allocate cargo, validate volume and payload against the ISO spec
4. **Documentation & Customs** — SI, invoice, packing list, PEB via CEISA, COO, draft B/L approval
5. **Stuffing & Gate-in** — stuff, seal, submit VGM (SOLAS: no VGM, no loading), NPE, gate in
6. **Departure & Transit** — loaded on board, B/L issued and released per instruction
7. **Arrival & Delivery** — arrival notice, B/L surrender or telex, delivery order, POD
8. **Billing & Settlement** — approve charges, invoice, match vendor bills, close the job costing

The gate engine also layers on rules the checklist cannot express: a client over their credit limit,
an overloaded container, a rejected mandatory document, a gate-in cut-off already in the past.

### Containers (sub-menu of a project)
Per unit: type (20GP/40GP/40HC/45HC/20RF/40RH/20OT/40FR/LCL), container number validated with the
**ISO 6346 check digit**, seal, depot, stuffing and gate-in dates, reefer set point, IMDG class and
UN number for dangerous goods, and VGM (tare + cargo gross, method SM1/SM2, submission date).

Cargo lines carry description, HS code, marks and numbers, package unit, quantity, dimensions and
gross/net weight. CBM and gross weight are computed live and checked against the container's
capacity and maximum payload, with the limiting factor (volume or weight) called out and a concrete
remedy — "move 13,020 kg to another unit, or step up to a larger container type".

### Documents (sub-menu of a project)
The full register — SI, commercial invoice, packing list, PEB, NPE, VGM certificate, draft/house/
master B/L, COO/SKA, insurance certificate, phytosanitary, fumigation, MSDS, L/C, consignment
agreement, arrival notice, delivery order, POD. Each carries a status lifecycle, version, mandatory
flag, issuing authority and expiry. Completeness is measured against the mandatory set, and
destination-country rules add their own requirements on top.

### Charges (sub-menu of a project)
Buy and sell per line, with basis, quantity, currency and FX rate to IDR, Indonesian VAT (PPN 11%)
and withholding (PPh 23 2%), vendor, freight term, billable flag and an approval lifecycle
(draft → pending approval → approved → invoiced → paid, or disputed). Margin is computed per line
and rolled up per job.

### Finance
Indonesian-shaped chart of accounts (freight revenue split by mode, cost of service separate from
operating expense, dedicated PPN input/output, PPh 23 payable and consignment settlement accounts),
a double-entry general ledger with balance validation before posting, AR/AP with ageing buckets,
trial balance, income statement, balance sheet, and per-job / per-lane profitability.

### Consignment
Handled as a first-class job type rather than a note in a remarks field: agreement number, title
retention, settlement cycle, commission, minimum guaranteed units, unsold-return window, units
shipped vs. reported sold, and settled amount. The forwarder bills the logistics package
immediately while the goods settle on the reporting cycle, and the exception engine chases an
overdue sales report or a missed minimum guarantee.

---

## Interface

**Theme** — a maritime navy system with a full light and dark palette plus a system-follow option.
All colour is defined as HSL tokens in `src/index.css`; no component hard-codes a colour.

**Every dropdown is a custom listbox.** No native `<select>` anywhere. `Select` supports search,
grouping, descriptions, icons, clear, type-ahead and full keyboard navigation (↑ ↓ Home End Enter
Esc); `MultiSelect` and a hand-built `DatePicker` follow the same conventions.

**One DataTable drives every module**, and it ships with:

- row checkboxes, select-all-on-page, select-all-in-view, and a bulk action bar
- **tri-state column sorting** (asc → desc → off) with type-aware comparators
- a **sticky action column** on the right and a sticky header, with a pinned identity column on the left
- **import and export on every menu** — CSV export of the filtered view, the selection or everything, JSON export, and a **re-importable file** whose columns match the importer exactly, so export → import round-trips cleanly on all nine modules
- a three-step import wizard: drop a file, map columns (auto-guessed, with a downloadable template), then review — rows with errors are listed with a reason and skipped, never guessed
- **confirmation on every delete**, escalating with the blast radius: a plain confirm for one record, an itemised list for a few, cascade warnings ("12 projects reference these customers"), and a typed `DELETE` keyword for large or cascading deletions
- column visibility, density toggle, faceted filters, search, pagination and per-table footer totals

Other pieces: a ⌘K command palette indexing every job, container, customer and package; a live
exception feed in the top bar; and a collapsible sidebar (⌘\).

---

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Radix primitives (dialog, popover, dropdown,
tooltip) with hand-built components on top · Zustand with `localStorage` persistence · lucide-react ·
Inter and JetBrains Mono, bundled locally.

```
src/
├─ components/
│  ├─ ui/            custom primitives — button, select, checkbox, dialog, confirm, toast, date-picker…
│  ├─ data-table/    the shared table, its column contract and the import wizard
│  ├─ layout/        app shell, navigation, command palette
│  └─ shared/        page header, KPI card, stepper, status badges, utilisation bar
├─ data/             domain types, reference data (ports, carriers, Incoterms, charge codes, doc rules), seed
├─ lib/              formatting, CSV, shipping maths (ISO 6346, CBM, VGM, load planning), analytics
├─ pages/            one folder per module
└─ store/            Zustand store
```

`src/lib/shipping.ts` and `src/lib/analytics.ts` hold the domain logic — check-digit validation,
utilisation, load-plan suggestion, stage gating, document compliance, the exception engine, job
costing and the finance reports. They are pure functions and are the first place to look when
wiring this to a real backend.

## Demo data

The workspace is seeded on first load and persisted. **Appearance → Reset demo data** in the top bar
restores it. Deliberate faults are baked in so the guards have something to catch: a rejected
phytosanitary certificate, two over-planned containers, a customer over their credit limit with a
blocked job, a disputed demurrage charge, an unbalanced-ready draft journal entry and a container
number with a bad ISO 6346 check digit.
