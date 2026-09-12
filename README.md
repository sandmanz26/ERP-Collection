# Wanakarya — Furniture Production & Import Suite

A front-end for an Indonesian furniture manufacturer that builds to order and imports most of what
it builds with: a works in Semarang that buys American white oak from New York, Hettich runners from
Kirchlengern, MDF from Port Klang and PU lacquer from Bologna — and then has to promise a hotel in
Ubud a delivery date it can actually meet.

This is a **front-end only** build. Everything lives in the browser (Zustand + `localStorage`),
seeded with an operating book of 12 sales orders, 14 products with multi-level bills of material,
36 purchased items, 11 suppliers, **10 import consignments spread across every state of the customs
machine**, 17 work orders on the floor, 9 kiln batches, 9 quality inspections, 38 stock lots and a
posted double-entry ledger. There is no backend and no API layer.

Sign in with any seeded account — `rizky.pratama@wanakarya.co.id` and the rest — using
`Wanakarya#2026`. Three accounts deliberately fail (unverified, locked, suspended) so those paths
can be walked without breaking anything.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

---

## The idea it is built around

**Three clocks run at different speeds and nothing reconciles them.**

A contract customer wants 120 wardrobes in 34 days. The Blum-class soft-close runners for their
drawers ship from Hamburg on a 31-day sailing and then sit somewhere between one and eleven days in
customs depending on which lane the declaration draws. The American oak for the frames has to sit in
a kiln for a fortnight before a saw is allowed near it — and if it comes out at 13.4% instead of
inside the 8–12% band, it goes back in for another ten days. Sales promises against the first clock,
purchasing works the second, production lives on the third, and the reconciliation happens in
somebody's head until it doesn't.

A manufacturing system that is only inventory and work orders does not solve this, because **the
shortage is never really a shortage.** It is a date: the date a box of runners becomes legally
available to issue, which is the discharge date plus the clearance lane plus the trucking, and which
no stock report knows.

So the organising rule of this build is: **every material shortage is answered with a date and a
cause, and every promised delivery date is defended against all three clocks at once.**

The MRP screen does not say *short 340 pairs*. It says:

> **HDW-RUN-450 lands 5 days after it is needed.** Hettich Quadro V6 soft-close runner, 450 mm.
> Needed 14 Oct for WO-2026-4412 · Larasati Three-Door Wardrobe × 120. IMP-2026-0074 — berths
> 18 Oct, then 2 days clearance on this supplier's record and 2 inland.
> **Do this —** re-sequence the work order around the operation that needs it, split the release, or
> air-freight the balance and price the difference honestly.

---

## Why it is shaped this way

| What goes wrong | Where the system catches it |
| --- | --- |
| Sales promises a date the plan never supported | ATP check on every order line, recomputed live against today's stock, today's shipments and today's load — with the binding clock named and, where the contract carries a penalty clause, the slip priced in rupiah |
| Wet timber is cut and the joints open eighteen months later at the customer | The kiln gate: solid timber cannot be issued unless its batch closed inside the band — 8–12% indoor, 12–15% outdoor. A batch out of band blocks every lot inside it |
| A purchase order goes to a supplier for goods that will be refused at the border | LARTAS release gate: a restricted line does not leave the building until the permit is on file, covers its HS code, **and does not lapse before the vessel berths** |
| A declaration is lodged incomplete and the container sits accruing demurrage | PIB completeness gate against the mandatory document set, with the free-time clock running from *discharge* and demurrage shown accruing **now**, not billed later |
| A missing Form D quietly turns a nil-duty consignment into a 10% one | Preferential origin computed both ways and the difference shown in money on the shipment, the exception list and the Control Tower |
| Material cost is over-stated by 14% because someone put PPN into inventory | Landed-cost allocation that spreads every cost on its own basis — freight by volume, trucking by weight, duty per line at its own rate — and keeps creditable taxes deliberately out of it |
| Duty is computed on one exchange rate and the supplier paid at another | NDPBM kept separately from the settlement rate; the gap is carried on the shipment as a real FX variance |
| A bill of material without a yield under-orders every material it touches | Yield and scrap on every BOM line — solid timber 62–72%, panel 85%, veneer 88%, lacquer 80% after overspray — with gross requirement exploded through every level |
| The factory is at 70% and still misses every date | Capacity as a gate rather than a chart, day by day, naming the bottleneck — nearly always finishing, because a spray booth plus a cure time is a hard serial constraint |
| A finishing failure eats two booth days the next order was counting on | Three inspection points, a defect Pareto, dispositions that spawn real rework orders, and a mandatory root cause |
| A variance is explained six weeks later at month end | Cost variance decomposed into material, labour and overhead per work order, raising an exception the day it crosses tolerance |
| "Customs is slow" is treated as weather | Clearance measured by lane from our own declarations, and fed straight back into the MRP run as the parameter that decides when a container becomes issuable |
| A component is discontinued and nobody knows what breaks | Multi-level BOM with a first-class **where-used**: one runner sits in the wardrobe, the sideboard, the nightstand and the desk |
| A second dye lot is mixed into one sofa | Lot-level stock with traceability back to flitch, dye lot, species and country of harvest |

Every number on the Control Tower is derived from the orders, bills, shipments, batches and ledger
in the store. There is no hand-typed dashboard figure anywhere in the application.

---

## Modules

**Control** — Control Tower · **Material Flow** (the whole chain on one screen)
**Sales** — **Quotations** (weighted pipeline, margin floor, validity clock, loss reasons) · Sales orders (with the ATP promise, credit and deposit gates) · **Deliveries & packing** (surat jalan, container fill, the export document gate) · **Returns & claims** · Customers
**Engineering** — Products · Bills of material (multi-level, yield, alternates, where-used) · Routings & work centres
**Planning** — Master schedule · MRP run · Capacity & load
**Production** — Work orders · Shop floor · **Production reporting** (lapor produksi) · Kiln drying · **Subcontracting** · **Maintenance** · Quality
**Materials & Import** — Item master · Inventory & lots · **Material conversion** (raw into semi-finished, ours or a third party's) · **Offcuts & remnants** (bahan sisa) · Suppliers (with qualification, certificates and the agreed price list) · **Requisitions** (the approval ladder) · Purchase orders · **Goods receipt** (penerimaan barang) · **Import shipments** · **Customs & permits** · **Landed cost**
**Finance** — Costing & variance · Invoices & bills · **Receipts & payments** · General ledger · Chart of accounts · Financial reports
**Insight** — Operations analytics · Settings & audit

Arriving is not the same as being in stock. A **goods receipt** passes through counting, quarantine
and put-away, and only the last of those makes anything issuable — which is also the only thing that
moves a purchase order line, so until it happens MRP is right to keep counting the order as supply
still to come. Every discrepancy has a name and somebody to charge it to, and timber that lands
outside its moisture band is blocked at the kiln gate on arrival whatever the delivery note says.

**Production reporting** is the other half of the same idea: until an operator books an output there
is no scrap, no actual labour and no real yield, only a plan with a tick against it. A booking writes
the scrap into the work order at the operation that caused it, the hours into its actual cost, and
the output into stock — and material drawn and not used comes back, as stock if it is whole and onto
the offcut rack if it is not.

Between buying a cubic metre and building a wardrobe the material changes shape — ripped, nested,
pressed, resawn or dried — and it does so on our own floor or at somebody else's. **Conversion**
gives that step orders of its own, consuming raw and semi-finished material together and producing
three things rather than one: the output that was wanted, the offcut that is still worth money, and
the waste that is not. The **offcut rack** is where the second of those lives, and the MRP run nets
it before it suggests buying anything — because an offcut of oak is oak that is already cut, already
dried and already paid for.

Each of those closes a loop the core would otherwise leave open. A quotation carries the standard
cost it was priced on, frozen, so a win can be judged afterwards. A delivery is the only thing that
moves a sales order line, and it will not load until the paperwork its mode demands is verified —
a container with an unsubmitted PEB gets no gate pass. A claim settles at what the remedy costs, not
at the sale value, and closes with a corrective action or it comes back. A receipt with nothing to
allocate it to is reported as money nobody can match to anything. A requisition needs every rung of
the approval ladder its value clears, and the days it waits are counted as lead time spent. Downtime
is netted off capacity before the schedule promises the hours. And material at a subcontractor is
valued and aged here, because it is still our stock and it is on somebody else's floor.

The product requirements document behind all of it, including the research it was built from, is in
[`docs/PRD.md`](docs/PRD.md).

---

## The import sub-system, in detail

This is the half of the build the brief was really about. A consignment moves through **eleven
states**, and the system refuses to skip any of them:

```
PLANNED → PERMIT_PENDING → ORDERED → IN_PRODUCTION → BOOKED → ON_WATER
   → ARRIVED → PIB_SUBMITTED → LANE_ASSIGNED → CLEARED → RECEIVED
```

Each has a gate that must be true before the next:

| State | What has to be true to leave it |
| --- | --- |
| `PERMIT_PENDING` | Every LARTAS permit the lines require is on file, matches their HS codes and does not expire before arrival — **DIPK** through the SILK portal for forestry lines, **IP-B2 plus a Laporan Surveyor** for the hazardous finishing chemistry, an **SNI** certificate where one is mandatory |
| `ARRIVED` | Discharged. **The free-time clock starts here** — not at arrival notice, not at the PIB |
| `PIB_SUBMITTED` | Every mandatory document present, duty and PDRI self-assessed and paid through CEISA |
| `LANE_ASSIGNED` | Channelled **hijau**, **kuning** or **merah**, each with its own expected days drawn from that supplier's own record |
| `RECEIVED` | Trucked, receipted, incoming QC passed and the landed cost finalised |

And the number every plan actually hangs on is not the ETA:

```
available_to_issue = ETA + clearance_days(lane, this supplier's history) + inland_days
```

The seeded book puts one consignment in each interesting position: a red-lane chemistry container a
day from demurrage with its surveyor's original still in Genoa; a panel shipment paying MFN duty
because a Form D went to the wrong office in Klang; a timber booking whose forestry declaration
expires five days before the vessel berths; a chemistry order blocked at the permit gate because the
IP-B2 renewal has not been filed; and four consignments already received and fully costed, so the
lane statistics and the landed-cost variances have something real to stand on.

---

## Domain model

**Product & BOM & Routing** — a product carries collection, category, finish family, packed volume
and target margin. Sub-assemblies (a drawer box, a veneered door front, a webbed seat frame) are
products in their own right with their own routings, so a change to one rolls into every parent.
Each BOM line carries net quantity, **yield**, scrap and the operation number that consumes it.

**Work centre & operation** — kiln, rough mill, machining, sanding, assembly, finishing, upholstery,
packing and subcontract, each with stations, hours, a labour rate and an overhead rate. An operation
carries setup, run-per-unit and **queue hours** — which here means physics, not backlog: lacquer
curing and glue setting cannot be shortened by adding people.

**Item & lot** — an item carries its import identity: HS code, MFN and preferential duty rates, the
scheme a certificate of origin would buy, its LARTAS regime, and a lead time broken into supplier,
transit, clearance and inland days. A lot carries what an export customer's compliance desk asks for
by name: species, country of harvest, kiln batch, moisture reading, flitch or dye lot.

**Import shipment** — the eleven states, the vessel and container, free time and the demurrage rate,
the PIB and its lane and the SPPB, the permits, and the cost lines with the basis each spreads on.

**Work order** — routing progress per operation, material issues against the bill, QC results,
scrap, rework and a cost roll-up that keeps material, labour, overhead and subcontract apart.

**Quotation, delivery and claim** — a quotation line freezes the standard cost it was priced on and
the lead time it promised. A delivery carries packed units with their marks, cartons, weight and
cube, the documents its mode requires, and the short quantity with the reason for it. A claim
carries liability, remedy, what was claimed against what was settled, what was recovered from
whoever caused it, and the corrective action that stops it recurring.

**Payment** — direction, method, the bank account it moved through, withholding kept back at source,
bank charges, the FX difference between invoice and settlement rate, and the allocations that say
which invoice or which order each slice of the money is against.

**Requisition, maintenance and subcontract order** — a requisition carries the justification that
got it raised and an approval ladder built from its own value. A maintenance order carries its
interval, its planned and actual downtime, the parts and the root cause. A subcontract order carries
what went out, what came back, what was lost, and the value standing at somebody else's premises.

**Finance** — an Indonesian-shaped chart of accounts that separates the three inventory stages,
splits cost of sales into material, labour and overhead, treats PPN masukan and PPh 22 as prepaid
tax rather than cost, and gives purchase price variance and usage variance accounts of their own.

---

## Built with

React 19 · TypeScript · Vite · Tailwind v4 · Radix primitives · Zustand with `persist` ·
`lucide-react` · light and dark themes · a keyboard command palette (`⌘K`) · CSV/JSON export and
CSV import on every table.

The UI kit (`src/components/ui`, `src/components/data-table`, `src/components/layout`) is shared
with the freight-forwarding build on the sibling branch; everything under `src/data`, `src/lib`,
`src/store` and `src/pages` is this domain.
