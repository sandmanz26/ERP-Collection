# Meridian Freight — Export Operations Suite

A front-end for an Indonesian sea-freight forwarder: the kind of business that books space with a
carrier, stuffs a factory's cargo into containers, clears it through Bea Cukai and gets it onto a
vessel bound for Rotterdam, Yokohama or Savannah — and then has to prove it made money doing so.

This is a **front-end only** build. All data lives in the browser (Zustand + `localStorage`), seeded
with a realistic operating book of 14 jobs, 8 customers, 23 containers and their stuffings, 261
documents, 18 catalogue services, 16 logged incidents, a bucketed charge sheet and a posted general
ledger. There is no backend and
no API layer.

Sign in with any of the seeded accounts — `elena.marchetti@meridianfreight.com` and the rest — using
`Meridian#2026`. Three accounts deliberately fail (unverified, locked, suspended) so those paths can
be walked without breaking anything.

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
| Furniture on timber crates ships to Australia untreated and is turned back at the border | Service triggers read off the cargo — wooden packaging makes ISPM-15 fumigation mandatory, an Australian destination adds seasonal BMSB treatment, and a missing or refused one blocks the gate |
| A rollover, a red-lane hold or a reefer deviation lives in an email thread and is never claimed | Incident register with liability, cost impact against recovery, claim reference, dated action log and a mandatory root cause before closing |
| A B/L is marked issued while the description does not match the L/C | Per-document-type field standards, with approval and issuance blocked while a mandatory field is empty |
| Our own PPJK licence lapses and every filing under it is challengeable | Company record with licence and liability-cover expiry raising exceptions 60 days out |
| A crew is booked to stuff a container after the terminal's own gate-in cut-off | Every stuffing slot is checked against the cut-off before it can be saved, and a late slot blocks the stage gate |
| The tally comes up short and nobody notices until the consignee devans | Planned against stuffed packages on every stuffing, with the shortfall raised as a critical exception and the amendment it forces spelled out |
| Cash advanced to an operator at the port never comes back with receipts | Field costs carry their own advance and settlement, and an advance older than seven days is chased on the job sheet |
| A disbursement gets marked up and turns a pass-through into revenue the customer never agreed to | Reimbursements are a separate cost bucket, and anything billed above cost is flagged before the job closes |

Every number on the Control Tower is derived from the jobs, containers, documents and charges in
the store — nothing is a hand-typed dashboard figure.

---

## Modules

**Commercial** — Quotations & pipeline · Customers · Country offices · Service packages · Partners & vendors
**Operations** — Projects · Tracking · Containers · Stuffing · Documents · Customs · Warehouse & CFS · Additional services · Incidents & claims · Charges
**Finance** — General ledger · Chart of accounts · Invoices & bills · Financial reports · Job profitability
**Insight** — Operations analytics · Settings & audit

**The operator's view.** Signing in as an operator replaces the twenty-three-item suite with eight:
their own jobs, and the four phases a shipment passes through — take it on (*menerima project*), run
it (*execute project*), paper it (*pengaturan dokumen*), close it out (*penutup*). Every job says what
it needs next and what it costs to leave it. Anyone else can switch into the view from the account
menu, because a supervisor needs to see what their operators see.

Two product requirements documents sit in `docs/`: [`PRD.md`](docs/PRD.md) covers the whole suite,
the research behind it and the data model; [`PRD-Operator.md`](docs/PRD-Operator.md) covers the
operator workspace in plain language, with the user flow and user journey.

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

### Stuffing (sub-menu of a project)
The event where a job stops being paperwork. Each stuffing carries the **stuffing date** and shift,
where it happens (shipper factory, our CFS, a depot, a third-party warehouse or the port yard) with
the address a driver could find, the **port of loading** and terminal, the depot the empty came from
and when it was released, the truck and driver, the named supervisor, tally clerk and labour count,
the seal and when it was fitted, and the photograph and tally-sheet references.

It is a record separate from the container because a container can be re-stuffed after a rejection,
and because the yard works by date, not by job. The **yard schedule** is therefore the primary view:
work still to do, bucketed by day, with anything scheduled for a date already past marked as still
open.

Three checks run on every slot:

- **Against the cut-off.** A stuffing booked at or after the terminal's gate-in cut-off cannot make
  the sailing, so it is refused as a plan and blocks the stage gate from the stuffing stage onwards.
- **Against the packing list.** Planned packages and CBM are compared to what the tally actually
  counted. A shortfall is critical, and the system says what it forces: the invoice, packing list
  and B/L all have to be amended to what really shipped.
- **Against the evidence.** A unit marked sealed with no seal number will be turned away at the
  gate; one with no tally sheet or photographs has no defence when a shortage is claimed.

Sealing a stuffing writes the seal, date and location back onto the container, so the two records
cannot drift apart.

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

### Cost buckets and the job sheet
Every charge is classified by **how it is funded and settled**, not by what it is for — the
distinction an Indonesian forwarding desk actually works to:

- **Master cost** *(biaya master)* — contracted centrally. The vendor invoices us and finance pays
  on terms: carrier freight, THC, trucking, agency.
- **Field cost** *(biaya lapangan)* — cash spent at the port out of an operator's float: labour,
  lift on/off, seals, small handling. It carries its own **advance and settlement**, so the system
  knows what went out, what came back with receipts, and what is still in somebody's pocket.
- **Reimbursement** *(reimbursemen)* — paid on the customer's behalf and re-billed at cost. It
  carries no margin, so pricing it like a service quietly inflates the quoted rate.

The **job sheet** is the recap operations hands finance before a job closes: billed, cost by bucket,
gross margin, and the field cash still out. Before it can be signed off it lists what finance would
otherwise send back — advances unsettled past seven days with the name of who holds them,
reimbursements billed above cost, and billable lines still sitting in draft.

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

### Additional services
The catalogue of work that sits around the freight: fumigation and heat treatment, phytosanitary
handling, export crating, vacuum barrier bagging, lashing, loading supervision, pre-shipment
inspection, marine insurance, DG declaration, reefer monitoring, COO legalisation, courier, buffer
storage, escorted oversize moves, and the ISF, ENS and BMSB filings a destination demands.

Each entry declares **the conditions that put it on a job** — and those conditions are read off the
job itself: packaging unit, HS chapter, container type, declared value, DG flag and destination.
Wooden crates make ISPM-15 fumigation *mandatory*; a US destination makes an ISF filing mandatory;
high value makes loading supervision *suggested*. A job's Services tab shows the triggers that
fired, what has been bought and at what status, and what is still outstanding with mandatory first.
A completed service pushes onto the charge sheet in one action, so nothing is done for free.

A mandatory service that is missing, declined or failed **blocks the stage gate** from the cargo
plan onwards and raises a critical exception — and the client's refusal stays on the record, because
that is the evidence when the container is turned back.

### Incidents and claims
Sixteen incident types across carrier, customs, cargo and commercial: rollover, vessel omission,
cancelled booking, short shipment, gate rejection, customs hold, document discrepancy,
misdeclaration, damage, shortage, temperature deviation, return to origin, demurrage, detention,
customer cancellation and payment default. Choosing a type shows its **playbook** — what a competent
desk does first.

Each incident records what it cost, what is recoverable and from whom, what has actually come back,
the claim reference, a dated action log, and a **root cause that is required before it can be
closed**. High and critical open incidents surface on the Control Tower. Recovery rate, net loss and
cost by liable party are reported, so the pattern is visible rather than just the individual case.

### Document standards
A document is not finished because a file exists; it is finished when it carries what the party
checking it will look for. Each governed type declares its field standard — a commercial invoice
needs the Incoterm with its named place, the HS code per line, arithmetic that foots and the country
of origin; a VGM certificate needs the method, the weighing place and a **named** authorised person,
because SOLAS says so. The register shows completeness per document, sorts by actual risk, and
**refuses to let a document be marked approved, issued or surrendered while a mandatory field is
empty**.

### The forwarder's own record
Everything else describes the customer; this describes us. Legal entity, tax and business
registration, the licences we trade under (freight forwarding, PPJK, NVOCC, AEO, IATA, bonded
warehouse, FIATA and ALFI membership) with issuer, scope and expiry, the branches and the ports each
covers, bank accounts per invoicing currency, and the freight liability cover with the standard
trading conditions that cap it. A licence inside 60 days of expiry raises an exception; a lapsed one
or expired cover raises a critical — trading uninsured is not a filing detail.

### Access and accounts
Sign in, registration limited to company domains, and a two-step password reset. The negative paths
are the point: unknown email, wrong password with the attempts counted down, a lockout after five
failures that an administrator can release, unverified and suspended accounts, expired and reused
reset links, duplicate registration and weak passwords — each refused with a remedy rather than a
dead end. A reset request gives the same answer whether or not the address is registered.

> **This is a demo, not a security control.** There is no backend, so the seeded user list holds
> clear-text passwords and every check runs in the browser. A real deployment authenticates
> server-side, stores only a hash, and never lets a credential reach the client. The source says so
> where it matters.

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

**A guided tour on first arrival.** Landing on Projects, a project, or the operator workspace for
the first time dims the page and walks a spotlight over the parts that carry meaning — what a job
row is, what the stage badge counts, why the next cut-off is the most expensive number on screen.
Each card says what the thing is *and why it matters*, not where to click. It runs once per tour,
remembers that it has been seen, leaves on Esc or Skip, and can be replayed from the profile menu
("Show me around this page", "Replay every tour"). Steps whose target is not on screen are dropped
rather than pointing at nothing.

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

`src/lib/shipping.ts`, `src/lib/analytics.ts`, `src/lib/analytics2.ts`, `src/lib/services.ts` and
`src/lib/stuffing.ts` hold the domain logic —
check-digit validation, utilisation, load-plan suggestion, stage gating, document compliance, the
exception engine, job costing, the finance reports, quote pricing and win/loss, milestone
punctuality, warehouse dwell, customs readiness, LARTAS screening, partner scoring, service-trigger
detection, document-standard checking, incident exposure, licence alerts, stuffing checks, the yard
schedule and the job sheet, plus the KPI set.
They are pure functions and are the first place to look when wiring this to a real backend.

## Demo data

**The paperwork carries real contents.** Every governed document's fields are computed from the job
itself, so the set reconciles the way a real one does: the packing list's gross weight is the sum of
what is actually in the containers, the B/L quotes the same figure, the VGM adds the tare to it, the
invoice value matches the FOB value on the PEB, and the packing list quotes the invoice number the
invoice actually carries. Documents are numbered in the series their issuer would really use — the
shipper's own `JMF/INV/26/0841`, the carrier's B/L number, the customs registration number — because
a system-generated id on the face of a commercial invoice fools nobody. Each job is consigned to a
real buyer in its destination country, with that buyer's address and EORI/ABN/TRN number, so an
invoice has a seller and a buyer rather than the same company twice.

The workspace is seeded on first load and persisted. **Appearance → Reset demo data** in the top bar
restores it. Deliberate faults are baked in so the guards have something to catch: a rejected
phytosanitary certificate, two over-planned containers, a customer over their credit limit with a
blocked job, a disputed demurrage charge, an unbalanced-ready draft journal entry, a container
number with a bad ISO 6346 check digit, a PEB blocked on a missing CEISA 4.0 upload, one in
*jalur kuning* and one that drew *jalur merah*, a quotation lost on credit terms, a suspended
trucker with three claims, two agency contracts weeks from expiry, consignment stock at day 96 of a
120-day return window, a shipper who refused mandatory fumigation on a furniture job, a failed BMSB
treatment blocking an Australian sailing, a scatter of issued documents short of their own field standard, a
lapsed IATA accreditation, a PPJK registration three weeks from expiry, two stuffings that came up
short against the packing list, and slots booked past the terminal's own gate-in cut-off.
