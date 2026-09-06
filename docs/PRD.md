# Kriyanusa Furniture — Export Manufacturing Suite
## Product requirements, the research behind them, and the data model

---

## 1 · The business

Kriyanusa is an Indonesian furniture manufacturer in Jepara, Central Java, that sells almost
entirely for export. It employs 218 people across four workshops, buys sawn timber from a spread of
small sawmills, subcontracts carving and some assembly to village workshops on *borongan* terms — a
fixed price for a finished quantity — and ships in containers from Tanjung Emas in Semarang.

Its customers are overseas: a Dutch retail chain, an American wholesaler working under letters of
credit, a French interior studio, an Australian outdoor range, a Japanese importer with ±1mm
tolerances, and a Danish prospect that will not buy at all unless the range is FSC 100%.

The company already knows how to make furniture. What it does not have is a system that can answer,
on any given morning, which of those orders is about to lose money and why.

### 1.1 Who uses it

| Role | What they are doing |
| --- | --- |
| Export sales | Reading an enquiry, arguing the price, chasing a drawing approval, sending a sample |
| Estimator | Turning an order into a costed budget, and defending the margin when it is thin |
| Purchasing | Turning budget lines into orders, chasing sawmills, arguing about short deliveries |
| Warehouse | Receiving, inspecting, putting away, transferring, counting, issuing to the floor |
| Production | Running work orders through cutting, assembly, finishing, upholstery and packing |
| Export & compliance | The V-Legal document, the export declaration, and everything the destination demands |
| Finance | Bills, invoices, payments, the ledger, and whether the job made anything |

Nine roles are modelled. The application deliberately does **not** fork into per-role workspaces: in
a company of this size the same four people do all of it, and a supervisor who cannot see the
warehouse screen is a supervisor who cannot help.

---

## 2 · The research

### 2.1 Timber legality is not paperwork, it is the business

Indonesia operates SVLK — *Sistem Verifikasi Legalitas Kayu*, its timber legality assurance system.
Every export consignment of timber product, furniture included, must carry a **V-Legal document**
issued by an accredited verification body (LVLK), and that document can only be issued if the chain
of custody holds from the forest through every processing step to the exporter.

Three consequences shaped the design:

1. **Legality is an attribute of a batch, not of a company.** A supplier can be SVLK certified and
   still deliver a lorry with no legality reference for that particular load. So the goods receipt
   line — not the supplier record — carries `legalityDocNo`, and a timber line without one is
   rejected to quarantine with `NO_LEGALITY_DOC`.
2. **A certificate that lapses mid-order is a live problem.** Supplier SVLK expiry is watched
   against *open* purchase orders, and our own licences are watched the same way against ourselves.
3. **The export declaration quotes the V-Legal number**, so it cannot be filed first. The shipment
   model enforces the ordering.

### 2.2 EUDR arrives during the life of this order book

The EU Deforestation Regulation requires operators placing wood products on the EU market to hold a
due diligence statement backed by plot geolocation, supplier declarations and a risk assessment.
Large and medium operators fall inside the regime from **30 December 2026**, with micro and small
enterprises following in June 2027; Indonesia is benchmarked as standard risk. From 2027 EU customs
can block non-compliant shipments.

For an exporter this is not the importer's problem: the importer files the statement, but the
evidence comes from us. So EUDR is modelled as a **blocking compliance requirement with a fourteen
day lead time**, switched on by the destination country rather than by a checkbox, and it appears in
the budget as a real cost line (geolocation collection and risk assessment are work somebody does).

### 2.3 The rest of the compliance set is conditional, and that is the point

| Requirement | Switched on by | Blocking |
| --- | --- | --- |
| V-Legal (SVLK) | Always, for timber product | Yes |
| Export declaration (PEB) | Always | Yes |
| Certificate of origin | Always | No |
| EUDR evidence pack | An EU destination | Yes |
| FSC chain of custody | The buyer selling the range as certified | Yes |
| ISPM-15 treated packaging | Solid wood packing — crates, pallets, dunnage | Yes |
| Fumigation | An Australian or New Zealand destination | Yes |
| CARB / TSCA Title VI | A US destination *and* panel in the piece | Yes |
| Laboratory testing | The buyer's own supplier manual | No |

The rule that catches people is the last blocking one: formaldehyde certification binds the *panel
supplier*, not the furniture maker, which is exactly why it is missed. `requiredCompliance()` reads
all of this off the order — destination, buyer requirements, packing method, whether the piece
contains panel — so nobody has to remember.

### 2.4 Furniture is a volume cargo

A container fills before it gets heavy. A 40' high cube holds roughly 76 m³ internally but about
**66 m³ usable**, because nothing stacks perfectly; a 20' general purpose about 28. So the number
that matters on an order is cubic metres, and the number that matters on a *comparison between*
orders is margin per cubic metre — a chair programme can look better per piece than a slab table and
still be worse per container. The FOB cost sheet is built around that.

### 2.5 FOB costing, and where the money actually goes

Export costing conventionally builds from ex-works — raw material, labour, overhead, export packing
— then adds inland transport, terminal and documentation charges to reach FOB. In solid-wood
furniture the shape is roughly: material 55–70%, labour 8–12%, overhead 10–15%, packing 4–7%, with
timber alone usually a third to a half of the entire cost. That is why an eleven per cent movement
in the sawn price is not a rounding error, and why the budget model keeps wastage explicit rather
than burying it in a unit rate.

### 2.6 Deliveries do not arrive the way they were ordered

Small sawmills ship what they have on the lorry they can find. The single most useful thing this
system does for a purchasing desk is to stop treating a purchase order as a thing that is either
open or closed. Hence three delivery modes (**full**, **partial**, **direct**), an over-receipt
tolerance, a rejection reason on the line, and an open balance that is always computed and never
stored.

**Sources.** SVLK / V-Legal: Ministry of Environment and Forestry, LVLK certification bodies, and
exporter guidance summarised at [wisanka.com/svlk](https://www.wisanka.com/svlk/) and
[teakroute.com](https://www.teakroute.com/blog/what-is-svlk-certification). EUDR timing and scope:
[Latham & Watkins](https://www.lw.com/en/insights/european-commission-maintains-30-december-2025-application-date-for-eu-deforestation-regulation),
[PSQR 2026 update](https://psqr.eu/publications-resources/eu-deforestation-regulation-eudr-2026-update-new-deadlines-for-companies/),
[TracExtech on furniture compliance](https://tracextech.com/eudr-furniture-compliance/). Furniture
ERP module scope: [SysGenPro](https://sysgenpro.com/resources/erp-for-furniture-manufacturing),
[Udyog](https://www.udyogsoftware.com/erp-for-furniture-manufacturing-industry). FOB costing
structure: [ximpex export pricing guide](https://ximpex.in/guides/how-to-calculate-export-pricing/),
[ExportHelp costing sheet](https://exporthelp.org/export-documentation/costing-sheet-framework/guidelines-for-completing-the-costing-sheet/).
Jepara industry background: [Profil Industri Mebel Jepara](https://www.researchgate.net/publication/329396715_PROFIL_INDUSTRI_MEBEL_JEPARA).

---

## 3 · Requirements

### 3.1 Handling an inbound project

An enquiry becomes one record that is never re-keyed, and it accumulates rather than replaces.

* **Order lines** carry model, species, finish, quantity, dimensions in millimetres, volume per
  piece, packing method, the buyer's target price and the price actually agreed. Volume drives the
  container plan; the two prices together are the record of what the negotiation cost.
* **Negotiation** is a first-class list, not a notes field. Each round has a direction (buyer or us),
  a subject (price, specification, lead time, payment terms, packing, quantity, certification), both
  sides' numbers where the subject is price, a summary, and an outcome. The pipeline screen totals
  rounds, days spent and how far our own price moved — because a price that fell five per cent over
  six rounds is margin given away one concession at a time.
* **Drawings** carry a revision letter, when they were sent, when the buyer answered, and what they
  marked up. Production running on an unapproved drawing is an exception.
* **Samples** carry the round, what making and couriering it cost, whether it was re-charged, and
  the buyer's verdict. Sample cost absorbed is shown on the order and on the FOB sheet, because it
  is a real cost of winning that most systems lose.
* **Compliance** is derived, never entered.

Eleven stages, grouped commercial → preparation → execution → closing. Stage is advanced explicitly;
the system does not silently move an order behind somebody's back.

### 3.2 Budgeting — *anggaran belanja*

* A budget is **exploded from the bill of materials** for the models on the order. Twelve recipes
  cover the catalogue; each names its items, quantity per finished piece, cost category, bench hours
  and any subcontract price.
* **Wastage is explicit per category** — 18% timber, 8% panel, 10% finishing, 6% upholstery, 3%
  packaging, 2% hardware — because it is real and an estimator who omits it loses the margin twice.
* Beyond material: labour at a burdened bench rate, subcontract on borongan terms, overhead absorbed
  per cubic metre shipped, export logistics per cubic metre, one line per required certificate, and
  a contingency.
* Budgets are **versioned**. The superseded version is kept with a note; the seeded book contains
  one order re-costed after teak moved eleven per cent, dropping the margin from 17% to 12%.
* States: draft → submitted → approved (or rejected, or revised, or closed). **Nothing may be
  ordered against an unapproved budget**, and an order with purchase orders and no approved budget
  is a critical exception.

### 3.3 Procurement and finance

* **Purchase request** → **purchase order** → **goods receipt** → **supplier bill** → **payment**,
  with the budget line carried through so spend can always be traced back to what allowed it.
* An order records its delivery mode, whether partial delivery is allowed, and an over-receipt
  tolerance. Approval is required above a configurable threshold.
* **Three-way match** on every bill: purchase order, goods receipt, invoice. The failure mode is
  named — quantity variance (a short delivery nobody credited), price variance (a rate that moved),
  or no receipt at all.
* Budget spend is three columns, never one: **budget**, **committed** (ordered, not yet delivered)
  and **actual** (delivered, whether or not invoiced — that is when the cost becomes ours).
* Payables ageing, receivables by currency, payments with allocations, a 43-account chart, and a
  journal whose account balances are folded out of the posted entries.

### 3.4 Goods arriving — whole, in pieces, or never at the gate

* **Full**, **partial** or **direct**. Direct means the goods went straight to a workshop or the
  packing hall and were received on paper against the delivery note; it is recorded as what it is
  rather than dressed up as a normal receipt.
* Each receipt carries the supplier's delivery note number, vehicle, driver, receiver and inspector.
* Each line carries delivered, accepted and rejected quantities, a rejection reason, bin, batch,
  moisture reading for timber, and the supplier legality reference.
* Posting a receipt does three things atomically: writes the received and rejected quantities back
  onto the purchase order line, posts a stock movement into the receiving warehouse for what was
  accepted, and posts a second movement into the quarantine bay for what was not.
* The purchase order's status is then **recomputed from the receipts**. It is not a field anybody
  edits.

### 3.5 Inventory and multiple warehouses

Seven warehouses, and they are not interchangeable:

| Store | What it is for |
| --- | --- |
| Gudang Bahan Baku | Raw material as delivered |
| Kiln & Dry Store | Four chambers; nothing leaves above 12% moisture |
| Workshop WIP Store | Components between benches |
| Gudang Barang Jadi | Packed goods, allocated by container |
| Semarang Staging Depot | A rented bay near the port for consolidating part loads |
| Subcon — Mulyo Karya | Our material, somebody else's shed; still our stock and our risk |
| Quarantine Bay | Rejected on arrival; on the books, unavailable to any work order |

* **There is no balance table.** Every quantity is the sum of the movements that produced it.
  Valuation is a moving average computed from the movements that added stock.
* **Available** = on hand − quarantined − reserved. That is the only figure a production planner can
  safely believe, and it is what the material-shortfall calculation uses.
* Transfers move stock in two legs, so in-transit stock belongs to neither store and is aged.
* Stock counts (*opname*) hold a system quantity and a counted quantity per line; posting one writes
  the adjustment movements and reports the value it moved.
* The opening balance is reconciled: the seed walks every item and warehouse chronologically and
  raises the opening where a balance would otherwise go negative, because a warehouse that goes
  negative is a warehouse whose numbers are fiction.

### 3.6 Production and shipping

* One work order per model on an order, split when the run is larger than a bench can hold. It draws
  material out of stock and puts finished goods back in. Stage, workshop, subcontractor, due date
  and hold reason are all tracked; a stalled run says exactly why.
* A shipment carries containers with loaded volume against the box's usable volume, and a document
  set derived from the compliance requirements. Mandatory documents outstanding inside three weeks
  of the ETD escalate as the date approaches.

---

## 4 · Data model

```ts
Project {                      // the enquiry that becomes an export order
  stage, status, priority, incoterm, paymentTerm, currency, exchangeRate
  items:         ProjectItem[]        // model, dimensions, cbm, target vs agreed price, produced, packed
  negotiations:  NegotiationRound[]   // direction, subject, both numbers, outcome
  drawings:      Drawing[]            // revision, sent, responded, approved
  samples:       Sample[]             // round, cost, charged, courier, verdict
  compliance:    ComplianceItem[]     // derived from destination + packing + panel content
}

Budget { version, status, targetMarginPct, lines: BudgetLine[] }
BudgetLine { category, itemId?, qty, uom, unitCost, wastagePct, supplierId? }

PurchaseOrder {
  status, deliveryMode, partialAllowed, overReceiptTolerancePct, requiresSvlkDoc
  lines: PurchaseOrderLine[]          // receivedQty and rejectedQty written only by receipts
}

GoodsReceipt {
  mode: FULL | PARTIAL | DIRECT, sequence, deliveryNoteNo, vehicle, driver, qcResult
  lines: GoodsReceiptLine[]           // delivered / accepted / rejected, reason, bin, batch,
}                                     // moisture, legalityDocNo

StockMovement {                       // the only source of truth for any quantity
  type, itemId, warehouseId, binCode, qty (signed), unitCost, batchNo, refType, refCode, projectId
}

WorkOrder { stage, status, qty, producedQty, rejectQty, subconSupplierId?, dueAt, holdReason? }
Shipment  { containers: ShipmentContainer[], documents: ExportDocument[] }
```

**Derivation libraries** (`src/lib`) hold everything computed:

| File | What it derives |
| --- | --- |
| `costing.ts` | Budget totals, category roll-up (budget / committed / actual), projected margin, FOB sheet, realised margin, sample cost |
| `inventory.ts` | Stock rows and moving-average valuation, item positions (available, reserved, quarantined, cover), warehouse load, material gaps, slow-moving, count variance |
| `procurement.ts` | Order progress and backorder, three-way match, payables ageing, supplier scorecards, open order quantity |
| `analytics.ts` | Pipeline, win/loss, country mix, margin by order, spend by supplier and category, delivery punctuality, ship forecast, cash position, negotiation effort |
| `exceptions.ts` | The rule engine — every rule evaluated against live records on each render |

---

## 5 · Decisions taken, and what was rejected

**One record from enquiry to container, rather than quotation → order conversion.** Converting loses
the argument that produced the price. The stage field carries the same information without the copy.

**Three spend columns, not two.** "Committed" and "actual" being one number is the single most
common way a job goes over budget without anybody noticing.

**Compliance derived, not entered.** A checklist somebody ticks is a checklist somebody forgets. The
destination, the buyer's own demands and the packing method are already in the record.

**No per-role workspaces.** Considered and rejected: at 218 people the same handful of desks touch
everything, and hiding screens would cost more than it saves.

**No offline document storage.** Documents are records with a reference, an issuer and a state.
Without a backend, storing files would be a demonstration of `localStorage` limits rather than of
the domain.

**The opening balance absorbs the reconciliation.** It is the one figure with no document behind it,
so it is the honest place to put the difference — rather than allowing negative stock, which would
make every downstream number meaningless.

---

## 6 · What is not built

* No server, no API, no real authentication. The sign-in flow demonstrates the interface — lockouts,
  unverified accounts, expired reset links — and nothing more.
* No document files, no printing, no e-mail.
* No capacity planning or finite scheduling on the workshop. Work orders carry a stage and a due
  date, not a routing with machine capacity.
* No landed-cost or import side. The company exports; the import direction of "export–import" is
  represented by the buyer's obligations rather than by our own inbound customs.
* No multi-company or multi-branch. One legal entity, seven warehouses.
