# Product Requirements Document
## Nusantara Freight — Export Operations Suite

| | |
| --- | --- |
| **Version** | 2.0 |
| **Date** | 30 August 2026 |
| **Status** | Approved for build — Phase 2 |
| **Product** | ERP / TMS for an Indonesian sea- and air-freight forwarder (NVOCC + PPJK) |
| **Scope of this document** | Front-end product definition. Persistence, auth and integrations are specified as contracts only. |

---

## 1. Background

A freight forwarder does not own ships. It sells *certainty* — that a factory's cargo will be
priced correctly, loaded before the cut-off, documented so customs releases it, delivered, and
invoiced at a margin that survives contact with reality. Every one of those five promises is a
place where money leaks, and none of them is a CRUD screen.

The industry reference points are CargoWise (enterprise, single global database, deep customs) and
Magaya (mid-market, modular: shipping, warehousing, rate management, tracking, customs compliance,
analytics, CRM). Both organise the product around one spine that the 2026 buyer's guides describe
identically:

> **Enquiry → RFQ → Rate → Quotation → Booking → Shipment → Documentation → Invoice → Payment →
> Profitability**, without entering the same information twice.

Phase 1 of this product built the **middle** of that spine — Booking through Profitability. It is
strong where it exists: an eight-stage job workflow with blocking gates, ISO-6346 and payload
validation on containers, a document register with destination-country compliance, buy/sell margin
per charge line, and a double-entry ledger.

It is missing both **ends**. There is no way to win the job (no CRM, no quotation, no rate search,
no win/loss analysis), no way to manage the people who actually perform it (vendors, carriers,
overseas agents are free-text strings), no structured event history to prove on-time performance,
no warehouse, no customs filing record, and no analytics beyond finance.

Phase 2 closes those gaps.

---

## 2. Goals and non-goals

### 2.1 Goals

| # | Goal | Success measure |
| --- | --- | --- |
| G1 | Close the quote-to-cash loop so a won quotation becomes a job with zero re-keying | A quotation converts to a job carrying parties, route, terms and all charge lines in one action |
| G2 | Make win/loss visible, by lane, salesperson and reason | Win rate and loss reasons are reportable without exporting to a spreadsheet |
| G3 | Turn vendors from strings into managed counterparties with measurable performance | Every charge line references a partner record; partner scorecards are derived from job outcomes |
| G4 | Prove service quality with structured milestones rather than prose | On-time performance is computed from planned vs. actual milestone timestamps |
| G5 | Support the warehouse leg — CFS consolidation and consignment stock | Storage charges are derived from free time and dwell, not typed in |
| G6 | Record customs filings to the standard Indonesian regulation demands | PEB filings track CEISA 4.0 supporting-document upload, response channel and PPJK responsibility |
| G7 | Give the operations manager the KPI set the trade actually uses | On-time %, quote win rate, cost per shipment, DSO, dwell, margin per shipment on one page |
| G8 | Make the system's own behaviour auditable and configurable | FX rates, tax rates, numbering, approval thresholds are settings; every mutation is in an audit trail |

### 2.2 Non-goals for this phase

- Real backend, authentication or multi-tenancy. State is browser-local by design.
- Live carrier API / EDI connections. Milestone sources are modelled (`CARRIER_EDI`, `PORTAL`,
  `AGENT`, `MANUAL`) and the ingestion contract is specified, but nothing is wired.
- Actual CEISA 4.0 / INSW / Coretax submission. Filings are recorded, not transmitted.
- Payroll, fixed assets, procurement-to-pay beyond vendor bills.
- Air waybill stock control, dangerous-goods declaration generation, or a customer-facing portal.

---

## 3. Users

| Persona | What they do all day | What they need from this product |
| --- | --- | --- |
| **Sales / Commercial (Rina)** | Answers RFQs, chases lanes, negotiates against an incumbent | Quote fast from a rate card, version the revisions, see what was lost and why |
| **Operations / Documentation (Ahmad)** | Books space, files SI and PEB, watches cut-offs | One screen per job with what is blocking it and what closes today |
| **Load planner (Yoga)** | Decides what goes in which box | Live volume/payload validation and a load-plan suggestion |
| **Finance (Dewi)** | Invoices, chases AR, closes the month | Job costing that ties to the ledger; ageing that ties to the invoice |
| **Warehouse supervisor (Bagus)** | Receives, stores, releases cargo at the CFS | Warehouse receipts, stock on hand, dwell and storage charges |
| **Managing director (Siti)** | Decides where to invest and who to fire | Win rate, on-time %, margin by lane, exposure by customer |

---

## 4. Product principles

1. **Nothing is typed twice.** A quotation becomes a job; a rate card becomes a charge sheet; a
   milestone becomes an on-time statistic; a charge becomes a ledger line.
2. **Every number is derived.** No hand-typed dashboard figures. If a KPI cannot be computed from
   records, it does not appear.
3. **Gates, not warnings.** Where the trade has a hard rule — no VGM, no loading — the system
   blocks. Where it has a soft rule, it warns and lets the operator proceed.
4. **The exception queue is the product.** A user should be able to open one screen and know what
   costs money today.
5. **Destructive actions state their blast radius** before they happen.
6. **Every list imports and exports**, and the export round-trips back through the importer.

---

## 5. Phase 1 (delivered) — summary

| Module | Delivered |
| --- | --- |
| Customers & Country Offices | Multi-office customers, per-office port / customs ID / VAT / roles / contacts |
| Service Packages | Rate cards per lane, buy/sell per line, validity, free time, inclusions/exclusions |
| Projects | 8-stage stepper with blocking gates, cut-off calendar, B/L and Indonesian customs identity |
| Containers | ISO 6346 check digit, live CBM/payload validation, VGM, load-plan suggestion |
| Documents | Register with lifecycle, completeness meter, destination-country rules |
| Charges | Buy/sell margin per line, PPN 11%, PPh 23, approval lifecycle |
| Finance | Chart of accounts, double-entry ledger, AR/AP ageing, trial balance, P&L, balance sheet, job profitability |
| Platform | Dark/light theming, custom listboxes, one DataTable with sort / sticky actions / bulk delete / import-export, command palette, exception engine |

---

## 6. Phase 2 requirements

### 6.1 Sales pipeline & quotations `[P0]`

**Problem.** The job register starts at `INQUIRY`, which means an opportunity only exists once
someone has already decided to open a file. Everything before that — the RFQ, the three revisions,
the loss to a competitor on price — is invisible. Industry practice is that an RFQ carries 20–150
lanes and is revised three to five times before it closes, so revisions are the unit of work, not
an edge case.

**Requirements**

| ID | Requirement |
| --- | --- |
| Q1 | A **Quotation** is a first-class record with its own number series, owner, customer, contact, lane, mode, equipment, commodity and validity window |
| Q2 | Quotation lines mirror charge lines: charge code, basis, quantity, buy rate, sell rate, currency, VAT flag, optional flag. Margin is shown per line and in total |
| Q3 | A quotation can be **built from a service package** in one action, copying its mandatory lines |
| Q4 | **Revisions** — a quotation can be revised, producing v2 linked to v1. History is preserved; the revision is the live document |
| Q5 | Status lifecycle: `DRAFT → SENT → UNDER_NEGOTIATION → ACCEPTED / REJECTED / EXPIRED / WITHDRAWN`. Expiry is derived from `validTo`, not set by hand |
| Q6 | A rejection **must** record a loss reason (price / transit time / space / service scope / credit terms / incumbent / no decision / other) and may record the competitor and the price lost to |
| Q7 | **Accept → convert to job**: creates a Project pre-filled with parties, route, Incoterm, terms, currency and every quotation line as a charge line, and links the two records permanently |
| Q8 | Weighted pipeline value = Σ(quote value × probability) for open quotations |
| Q9 | Win rate reportable by lane, salesperson, customer and month; loss reasons ranked |
| Q10 | A credit check runs at quotation stage, not only at job stage |

**Out of scope this phase:** multi-lane tender import, automated carrier rate requests.

---

### 6.2 Partners & vendors `[P0]`

**Problem.** `vendor` is a free-text string on a charge line. That makes AP unmatched, performance
unmeasurable and agent nomination impossible — yet a forwarder's cost base *is* its vendors, and
the overseas agent is the party that decides whether the destination leg succeeds.

**Requirements**

| ID | Requirement |
| --- | --- |
| V1 | A **Partner** record with a code, legal name, one or more types (carrier, overseas agent, trucking, depot, customs broker, warehouse, surveyor, insurer, fumigation), country, city, contacts |
| V2 | Commercial attributes: currency, payment term days, contract number and expiry, SCAC for carriers, tax ID |
| V3 | Service coverage: which services and which lanes the partner serves — used to filter the picker on a charge line |
| V4 | A **scorecard**: on-time %, document accuracy %, responsiveness, open disputes, and jobs handled. Scores are stored as measured values, and the UI shows a derived overall rating |
| V5 | Charge lines reference a partner by id. Legacy free-text vendors are matched by name on migration and left as text where no match exists |
| V6 | AP exposure per partner is derived from bills and unbilled approved cost |
| V7 | Contract and insurance expiry raise exceptions before they lapse |
| V8 | Status: `ACTIVE / PROSPECT / SUSPENDED`. A suspended partner cannot be selected on a new charge |

---

### 6.3 Milestone tracking `[P0]`

**Problem.** The job timeline is prose. On-time performance — the single most requested KPI from a
shipper — cannot be computed from prose. The trade already has a standard for this: UN/EDIFACT
**IFTSTA** reports consignment status at defined milestones (booked, collected, gated in, loaded,
departed, arrived, discharged, delivered), each carrying a status code, a location and an event
timestamp.

**Requirements**

| ID | Requirement |
| --- | --- |
| M1 | A fixed **milestone set** modelled on IFTSTA event codes, ordered along the journey, each with a planned and an actual timestamp, a location (UN/LOCODE where known) and a source |
| M2 | Sources are typed: `MANUAL`, `CARRIER_EDI`, `PORTAL`, `AGENT`. The UI shows provenance because a manually keyed "delivered" is not evidence |
| M3 | Milestones may be recorded at job level or **per container**, because units on the same booking can gate in on different days |
| M4 | Variance = actual − planned, in days. On-time = variance ≤ 0 |
| M5 | A job's on-time performance is the share of passed milestones that were on time; the company figure is the average across jobs |
| M6 | Planned milestones are **seeded from the job's schedule** (cut-offs, ETD, transit days, ETA) rather than typed |
| M7 | A global tracking board shows every in-flight job against its next expected milestone, sorted by risk |
| M8 | The ingestion contract for `CARRIER_EDI` is specified: `{ shipmentRef, eventCode, eventDateTime, locationCode, vessel?, voyage?, equipmentNo? }`, mapped to the internal milestone set |

---

### 6.4 Warehouse & CFS `[P1]`

**Problem.** LCL consolidation, consignment stock and any door-to-door service all involve holding
cargo. Free time and dwell decide whether storage is a service or a loss, and consignment stock at
a destination showroom is inventory the shipper still owns.

**Requirements**

| ID | Requirement |
| --- | --- |
| W1 | A **Warehouse Receipt** records cargo received: warehouse, location, customer, optional job link, packages, CBM, weight, description, HS code, marks, PO number |
| W2 | Status: `IN_STOCK / PARTIALLY_RELEASED / RELEASED / ON_HOLD`; a partial release reduces the quantity on hand |
| W3 | **Dwell days** are derived from received to released (or today). Chargeable days = dwell − free days |
| W4 | Storage charge = chargeable days × CBM × rate. It is computed, and can be pushed to the job's charge sheet as a `STOR` line |
| W5 | Stock on hand by warehouse, by customer and by job |
| W6 | Consignment jobs surface their destination stock here, tied to the sell-through figures on the job |
| W7 | Ageing buckets on stock, because cargo sitting past 90 days is usually a dispute forming |

---

### 6.5 Customs & compliance `[P1]`

**Problem.** Indonesian export customs has moved. As of **KEP-163/BC/2026, effective 3 August 2026**,
supporting documents for a PEB **must** be uploaded through **CEISA 4.0**; the exporter remains
responsible for the accuracy of the data even when a PPJK files on their behalf. The PEB is also
the supporting document for output VAT in Coretax / e-Faktur. A filing is therefore a record with
its own lifecycle, not a number typed onto a job.

**Requirements**

| ID | Requirement |
| --- | --- |
| C1 | A **Customs Filing** record per job: type (`PEB`, `NPE`, `COO/SKA`, `PIB`, `PPFTZ`), registration number and date, CEISA reference, submitted/responded timestamps |
| C2 | **Response channel** is recorded: `HIJAU` (green — released), `KUNING` (yellow — document check), `MERAH` (red — physical inspection), or pending. Yellow and red raise an exception with the expected delay |
| C3 | A **supporting-document checklist** per filing reflecting the CEISA 4.0 upload mandate; a filing cannot be marked submitted while a mandatory document is unuploaded |
| C4 | The filer is recorded — in-house PPJK or a broker partner — alongside the exporter of record, because responsibility for accuracy is split |
| C5 | Declared FOB value and currency are captured and reconciled against the commercial invoice on the job; a mismatch raises an exception |
| C6 | **LARTAS screening**: HS codes on the job are checked against a restricted-goods list; a hit requires an export permit document before the documentation gate opens |
| C7 | Filings are exportable for the monthly Coretax / e-Faktur reconciliation |

---

### 6.6 Operations analytics `[P1]`

**Problem.** The finance reports answer "did we make money". They do not answer "are we good", which
is what renews a contract. The trade's standard KPI set is well established.

**Requirements**

| ID | Requirement |
| --- | --- |
| A1 | **On-time performance** — share of milestones met, and share of jobs delivered by ETA |
| A2 | **Quote win rate** — accepted ÷ decided, with loss reasons ranked |
| A3 | **Cost per shipment** and **revenue per shipment**, by mode and by lane |
| A4 | **Gross margin per shipment**, distribution not just average — the average hides the loss-makers |
| A5 | **DSO** (days sales outstanding) from invoices, with the ageing profile |
| A6 | **Container dwell** and **utilisation** — average fill and the count of units below 65% |
| A7 | **Customer profitability** ranked, with revenue concentration (share held by the top customer) |
| A8 | **Documentation accuracy** — share of documents rejected or re-issued |
| A9 | Every KPI carries a target and shows variance against it; targets are configurable |

---

### 6.7 Settings & audit `[P2]`

| ID | Requirement |
| --- | --- |
| S1 | **FX rate table** — editable per currency, with the rate used for ledger translation |
| S2 | **Tax configuration** — PPN and PPh 23 rates, effective dates |
| S3 | **Numbering series** per document type with prefix, year segment and padding |
| S4 | **Approval thresholds** — the value above which a charge or a bill needs a second approver |
| S5 | **KPI targets** used by the analytics module |
| S6 | **Audit trail** — every create, update, delete and import, with actor, entity, timestamp and detail; filterable and exportable |

---

## 7. Data model additions

```
Quotation ─┬─ QuoteLine[]
           ├─ revisionOf → Quotation
           └─ convertedProjectId → Project

Partner ───┬─ Contact[]
           ├─ PartnerScore
           └─ ← ProjectCharge.partnerId

Milestone ──── projectId, containerId?, code, plannedAt, actualAt, location, source

WarehouseReceipt ── customerId, projectId?, status, dwellDays (derived), storageCharge (derived)

CustomsFiling ──── projectId, type, channel, supportingDocs[], filedBy, exporterOfRecord

AppSettings ────── fxRates, taxRates, numberingSeries, approvalThresholds, kpiTargets
AuditEntry ─────── at, actor, action, entity, entityId, detail
```

**Referential rules**

- Deleting a Partner referenced by a charge is blocked; the UI offers to suspend instead.
- Deleting a Project cascades to its containers, documents, charges, milestones and filings, and
  the cascade is stated in the confirmation.
- Converting a Quotation is idempotent: a quotation already linked to a job cannot convert twice.
- A Milestone's `plannedAt` is regenerated when the job's schedule changes, unless it has an actual.

---

## 8. Non-functional requirements

| Area | Requirement |
| --- | --- |
| **Performance** | Any list renders 1,000 rows without a visible stall; sorting and filtering are synchronous |
| **Accessibility** | Every control is keyboard reachable; listboxes implement `role="listbox"` with arrow/Home/End/type-ahead; focus is visible; colour is never the only signal (status carries a dot and a label) |
| **Theming** | Light and dark are equal citizens; every colour is a token, no hard-coded hex in a component |
| **Data portability** | Every module exports CSV and JSON, and offers a re-importable file whose columns match its importer |
| **Resilience** | The seeded workspace can be restored at any time; import never partially applies a bad row |
| **Localisation readiness** | Dates render `dd MMM yyyy`; money renders with the currency's own minor units (IDR and JPY have none); numerals are tabular in tables |
| **Browser support** | Evergreen Chromium, Firefox, Safari. Desktop-first: the operational screens assume ≥1280 px, and degrade to a horizontally scrolling table below that |

---

## 9. Release plan

| Release | Contents | State |
| --- | --- | --- |
| **1.0** | Customers, offices, packages, projects + stepper, containers, documents, charges, finance, control tower | Shipped |
| **2.0** | Quotations & pipeline, partners, milestone tracking, warehouse, customs filings, operations analytics, settings, audit trail | This document |
| **2.1** | Printable quotation / invoice / draft B/L, SOP per customer, approval routing | Next |
| **3.0** | Backend, auth and roles, carrier EDI ingestion, CEISA 4.0 and Coretax connectors, customer portal | Planned |

---

## 10. Open questions

1. **Rate procurement.** Should a rate request to multiple carriers be modelled as its own record
   (a buy-side RFQ) or does the package rate card remain the single source of buying rates?
2. **Multi-currency ledger.** Charges translate at a job-level FX rate today. A realised/unrealised
   FX split needs a decision on whether the ledger is presented in IDR only.
3. **Consignment revenue recognition.** The forwarder bills logistics immediately; whether the
   goods' settlement belongs in this ledger at all is an accounting-policy question, not a product
   one.
4. **Milestone authority.** When a carrier EDI event contradicts a manually keyed actual, which
   wins? Proposed: EDI wins, the manual value is retained as a superseded record.
