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
| A client over their credit limit gets another booking | Credit check as a blocking task at the inquiry and quotation gates |
| Consignment stock ages out at the destination showroom | Sell-through tracking, settlement-cycle ageing and unsold-return windows |
| A quote is lost and nobody records why | Mandatory loss reason, competitor and value on every rejection, ranked on the pipeline page |
| A won quote is re-keyed into a job and the pricing drifts | One-click conversion carrying parties, route, terms and every non-optional line onto the charge sheet |
| A PEB is submitted without its CEISA 4.0 uploads and stalls at customs | Filing record with a mandatory-upload checklist that blocks submission, plus the response lane (hijau / kuning / merah) |
| A restricted commodity ships without an export permit | LARTAS screening on the job's HS codes, raising a compliance exception |
| A shipper asks for on-time evidence and there is only prose | IFTSTA-shaped milestones with planned vs. actual, variance and the source of each event |
| An overseas agent underperforms and nobody notices until the claim | Partner scorecards derived from on-time, document accuracy, responsiveness and open disputes |
| Cargo sits in the CFS and the storage is never billed | Dwell computed from receipt, chargeable days from free time, and a one-click push to the job's charge sheet |

Every number on the Control Tower is derived from the jobs, containers, documents and charges in
the store — nothing is a hand-typed dashboard figure.

---

## Modules

**Commercial** — Quotations & pipeline · Customers · Country offices · Service packages · Partners & vendors
**Operations** — Projects · Tracking · Containers · Documents · Customs · Warehouse & CFS · Charges
**Finance** — General ledger · Chart of accounts · Invoices & bills · Financial reports · Job profitability
**Insight** — Operations analytics · Settings & audit

A product requirements document covering the research behind these, the gap analysis and the data
model is in [`docs/PRD.md`](docs/PRD.md).

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

### Quotations and the sales pipeline
The front half of the job. A quotation carries its own number series, lane, equipment list, validity
window and rate lines with buy and sell per line. It can be **priced from a service package** in one
action, **revised** into v2 or v3 (the earlier version is superseded and kept), and decided — a
rejection **requires** a loss reason, and may record the competitor. Accepting one **converts it to a
job**, carrying parties, route, Incoterm, terms, currency and every non-optional line onto the
charge sheet; nothing is re-keyed and the two records stay linked in both directions. The pipeline
is reported open, weighted by probability, and by win rate — with losses ranked by the value walked
away, because price is rarely the whole story.

### Partners and vendors
Carriers, overseas agents, truckers, depots, customs brokers, warehouses, surveyors, insurers and
fumigators — each with a contract and expiry, payment terms, service and lane coverage, contacts,
an AP position and a **scorecard** (on-time, document accuracy, responsiveness, open disputes,
jobs handled) rolled into a single grade. Charge lines nominate a partner rather than typing a
name, so spend and AP are derived; a partner referenced by a charge cannot be deleted, only
suspended, and a suspended partner cannot be selected on new work. Contract and insurance expiry
raise exceptions before they lapse.

### Milestone tracking
A fixed journey set modelled on the UN/EDIFACT **IFTSTA** transport status message — booking
confirmed, empty released, cargo received, stuffed, VGM submitted, customs cleared, gate-in, loaded,
departed, transhipped, arrived, discharged, released, gated out, delivered, empty returned. Each
milestone carries a planned date **generated from the job's own schedule**, an actual, a location,
and a **source** (`CARRIER_EDI`, `PORTAL`, `AGENT`, `MANUAL`) — because a manually keyed "delivered"
is a claim, not evidence. Variance drives on-time performance per job, per event type and company
wide. The importer accepts exactly the shape a carrier IFTSTA feed would land in.

### Warehouse and CFS
Receipts record what was taken into store: warehouse, bin, customer, optional job link, packages,
volume, weight, marks and PO. **Dwell** is computed from receipt to release, **chargeable days**
from dwell less free time, and the storage charge from chargeable days × volume × rate — then pushed
to the linked job's charge sheet in one action. Stock is reported by site, by ageing bucket and by
customer, and a partial release reduces what is on hand.

### Customs and compliance
Since **KEP-163/BC/2026, effective 3 August 2026**, PEB supporting documents must be uploaded
through **CEISA 4.0**, and the exporter stays responsible for the data even when a PPJK files it.
A filing therefore has its own lifecycle: registration number, CEISA reference, the filer (in-house
or a broker partner), the exporter of record, the declared value reconciled against the job, a
**mandatory-upload checklist that blocks submission**, and the **response lane** — *hijau* released,
*kuning* a document check, *merah* a physical inspection with three to five days of demurrage
exposure. HS codes are screened against the LARTAS restricted list, and a hit demands an export
permit before the documentation gate opens.

### Operations analytics
The KPI set the trade actually renews contracts on: milestone punctuality, delivered-by-ETA, quote
win rate, gross margin, revenue and cost per shipment, DSO, container utilisation, warehouse dwell
and document accuracy — each against a configurable target. Alongside them, the margin distribution
(because the average hides the loss-makers), the container-fill distribution, and customer
profitability ranked with revenue concentration.

### Settings and audit
Exchange rates used for ledger translation, PPN and PPh 23 rates, per-document numbering series with
a live preview, approval thresholds, KPI targets and the LARTAS prefix list — plus an audit trail of
every create, update, delete, import and conversion, exportable as CSV.

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
- **import and export on every menu** — CSV export of the filtered view, the selection or everything, JSON export, and a **re-importable file** whose columns match the importer exactly, so export → import round-trips cleanly on all fourteen modules
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
├─ data/             domain types, reference data (ports, carriers, Incoterms, charge codes, milestones,
│                    customs lanes, doc rules), and the seeded workspace
├─ lib/              formatting, CSV, shipping maths (ISO 6346, CBM, VGM, load planning), analytics
├─ pages/            one folder per module
└─ store/            Zustand store
```

`src/lib/shipping.ts`, `src/lib/analytics.ts` and `src/lib/analytics2.ts` hold the domain logic —
check-digit validation, utilisation, load-plan suggestion, stage gating, document compliance, the
exception engine, job costing, the finance reports, quote pricing and win/loss, milestone
punctuality, warehouse dwell, customs readiness, LARTAS screening, partner scoring and the KPI set.
They are pure functions and are the first place to look when wiring this to a real backend.

## Demo data

The workspace is seeded on first load and persisted. **Appearance → Reset demo data** in the top bar
restores it. Deliberate faults are baked in so the guards have something to catch: a rejected
phytosanitary certificate, two over-planned containers, a customer over their credit limit with a
blocked job, a disputed demurrage charge, an unbalanced-ready draft journal entry, a container
number with a bad ISO 6346 check digit, a PEB blocked on a missing CEISA 4.0 upload, one in
*jalur kuning* and one that drew *jalur merah*, a quotation lost on credit terms, a suspended
trucker with three claims, two agency contracts weeks from expiry, and consignment stock at day 96
of a 120-day return window.
