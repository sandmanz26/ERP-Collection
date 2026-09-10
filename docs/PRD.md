# Wanakarya — Furniture Production & Import Suite

**Product requirements, for PT Candra Wana Nusantara**
A furniture manufacturer in Semarang, Central Java, that builds to order and imports most of what
it builds with.

---

## 0. How this document was arrived at

The design below is not invented from taste. It comes out of four bodies of research, and every
business rule in §5 traces back to one of them:

1. **What a furniture ERP is normally made of.** Multi-level bills of material, routings over work
   centres, work orders, operation-wise tracking through cutting, edging, carpentry, polishing,
   painting, assembly, packing and dispatch, and the fact that finishing is routinely outsourced —
   so the system has to model a step that leaves the building and comes back.
   ([Odoo/furniture](https://www.infintor.com/odoo-manufacturing-erp-for-furniture-industry/),
   [ERPNext](https://frappe.io/erpnext/manufacturing/open-source-furniture-manufacturing-erp),
   [Digit](https://www.digit-software.com/industries/furniture-woodworking),
   [Odoo MRP: BOM, routing, work orders](https://www.odooskillz.com/blog/odoo-skillz-insights-1/odoo-manufacturing-mrp-bom-work-orders-routing-guide-2026-344))

2. **What a wood furniture line actually does, in the Indonesian idiom.** Log → sawn → **kiln dry to
   8–12% moisture content** → component forming → construction → sanding → assembly → finishing →
   packing, with a *kepala* and a *quality control* on each division. The moisture band is not
   decorative: above it, the piece moves, the joints open and the finish fails months later at the
   customer.
   ([kiln drying](https://www.bioindustries.co.id/proses-kiln-drying-kayu-sebagai-persiapan-bahan-baku-furniture-24302.html),
   [alur proses](https://www.rotanjepara.com/alur-proses-produksi-produk-kayu-dari-log-sampai-klind-dried/),
   [proses pengerjaan](https://www.tentangkayu.com/2008/04/tentang-proses-pengerjaan-furniture.html),
   [proses produksi mebel](https://www.pulsabisnis.com/proses-produksi-mebel-kayu/))

3. **What importing into Indonesia costs and takes.** PIB filed through **CEISA 4.0**, self-assessed
   duty and PDRI, then a lane: **hijau** (release), **kuning** (document check), **merah** (physical
   inspection) — and only then **SPPB**. Landed cost is
   `CIF → BM(%) × customs value → PPN → PPh 22` where PPh 22 is 2.5% with an API and 7.5–10%
   without, plus clearance, trucking and whatever demurrage the lane cost you.
   ([prosedur impor](https://infiniti.id/blog/legal/prosedur-lengkap-impor-barang-di-indonesia),
   [Bea Cukai](https://soetta.beacukai.go.id/mandatory/impor.html),
   [CEISA](https://ukirama.com/blogs/apa-itu-ceisa),
   [BC 2.0 / PIB](https://ukirama.com/blogs/bc-2-0-pib-pengertian-dan-cara-mengisinya),
   [menghitung bea masuk & pajak impor](https://www.uniaircargo.co.id/blog/bea-cukai/cara-menghitung-bea-masuk-pajak-impor),
   [landed cost](https://rtsekspedisi.com/umum/tarif-impor-china-cara-menghitung-landed-cost-dengan-mudah-wajib-tahu-sebelum-import/))

4. **What is restricted, for this specific shopping list.** Imported timber and panel products are
   **LARTAS**: a **Deklarasi Impor Produk Kehutanan** goes through the **SILK** portal under
   **SVLK**, naming exporter, country, species, origin of the wood, net weight and value. Imported
   finishing chemicals — toluene and xylene are in the thinner — are **B2**, needing **IP-B2** (a
   producer-importer approval) plus a **Laporan Surveyor** on every consignment.
   ([SILK / importir](https://silk.phl.kehutanan.go.id/index.php/article/vnews/179),
   [SVLK](https://silk.phl.kehutanan.go.id/index.php/info/svlk),
   [Permenhut 24/2025](https://jdih.kehutanan.go.id/new2/uploads/files/PERMENHUT_24_2025.pdf),
   [IP-B2 / SPI-B2](https://www.ptpbs.co.id/post/prosedur-dan-persyaratan-impor-barang-berbahaya-b2),
   [barang lartas](https://infiniti.id/blog/legal/cara-impor-barang-lartas))

Supporting: MRP netting — gross requirement offset against on-hand and scheduled receipts, with
safety stock excluded from the netting so it is not eaten — and the exception report as MRP's real
output, not the plan.
([MRP](https://en.wikipedia.org/wiki/Material_requirements_planning),
[MRP guide](https://www.mrpeasy.com/material-requirements-planning/),
[manufacturing KPIs](https://www.jmco.com/articles/manufacturing/manufacturing-kpis-every-owner-should-track/))

---

## 1. The problem, in one paragraph

**Three clocks run at different speeds and nothing reconciles them.** A contract customer wants 240
wardrobes in 60 days. The Blum soft-close runners for their drawers ship from Shanghai on a 19-day
sailing, and then sit somewhere between 2 and 11 days in customs depending on which lane the PIB
draws. The American white oak for the frames has to sit in a kiln for 14 days before a saw is
allowed near it. The spray booth can cure 90 door fronts a day and no more. Sales promises against
the first clock, purchasing works the second, production lives on the third, and the reconciliation
happens in somebody's head — until it doesn't, and the order ships three weeks late on air-freighted
hardware that ate the entire margin.

A furniture ERP that is only inventory and work orders does not solve this, because the shortage is
never really a shortage. It is a **date**: the date a box of runners becomes legally available to
issue, which is the discharge date plus the clearance lane plus the trucking, and which no stock
report knows.

**This system's single organising idea: every material shortage is answered with a date and a
cause, and every promised delivery date is defended against all three clocks at once.**

---

## 2. Scope

**In.** Make-to-order and make-to-stock furniture manufacturing: catalogue and configurable
products, multi-level BOMs with yield, routings over work centres, MPS, MRP, work orders and shop
floor, kiln drying, QC at three inspection points, rework; item master, stock and movements,
suppliers, local and import purchase orders; **import shipments end to end** — supplier → forwarder
→ vessel → arrival → PIB via CEISA → lane → SPPB → gate-out → goods receipt → landed cost
allocation; product costing with standard-versus-actual variance; AR/AP, a double-entry ledger and
statutory-shaped reports; operations analytics.

The suite also carries the loops that turn those cores into a business anyone can actually run:
**quotation to order** (a priced pipeline with a frozen standard cost and a recorded loss reason),
**order to delivery** (surat jalan, packing list, container fill and the export document gate),
**delivery to claim** (returns, liability, remedy and the cost of poor quality after the gate),
**invoice to cash** (receipts, payments, withholding, FX difference and the bank), **requisition to
purchase order** (an approval ladder decided by value, and the lead time the waiting costs),
**maintenance** (downtime netted off capacity before the schedule promises it) and
**subcontracting** (our stock, on somebody else's floor).

**Out.** No backend. Everything lives in the browser (Zustand + `localStorage`) against a seeded
operating book. No real CEISA, SILK, INSW or bank integration — those are modelled as records and
statuses, which is what the operator sees anyway. No HR/payroll beyond a labour rate per work
centre. No retail POS.

---

## 3. Who uses it

| Role | Lives on | The question they open the app to answer |
| --- | --- | --- |
| **Direktur Operasi** | Control Tower | What is going to be late, and what is it going to cost? |
| **Sales admin** | Sales orders | Can I promise this date, honestly? |
| **PPIC planner** | MPS · MRP · Capacity · Work orders | What do I release this week, and what stops me? |
| **Purchasing / import staff** | Purchase orders · Import shipments · Customs | Which container do I chase today, and is its paperwork complete? |
| **Gudang (warehouse)** | Inventory · Receipts | What arrived, what is reserved, what may I issue? |
| **Kepala produksi** (per division) | Shop floor | What is queued on my work centre and what is blocked? |
| **QC inspector** | Quality | What failed, why, and does it rework or scrap? |
| **Cost accountant** | Costing · Landed cost · Finance | What did this order really cost against what we quoted? |

---

## 4. The process, end to end

```
                 ┌──────────────────────────────────────────────────────────────┐
   CUSTOMER ───► │ 1 Sales order   ── ATP promise check ──────────────────────► │
                 └───────────────┬──────────────────────────────────────────────┘
                                 ▼
                 ┌──────────────────────────────────────────────────────────────┐
                 │ 2 MPS  →  3 MRP run  (BOM explosion ÷ yield, netting)        │
                 └───────┬───────────────────────────────┬──────────────────────┘
                         │ planned purchase              │ planned production
                         ▼                               ▼
        ┌────────────────────────────────┐   ┌──────────────────────────────────┐
        │ 4 Purchase order               │   │ 7 Work order                     │
        │   local  │  IMPORT             │   │   routed over work centres       │
        └──────────┴──────────┬─────────┘   └───────────┬──────────────────────┘
                              ▼                          ▼
        ┌────────────────────────────────┐   ┌──────────────────────────────────┐
        │ 5 Import shipment              │   │  KILN ─► ROUGH MILL ─► MACHINING │
        │   permit → booking → sailing   │   │   ─► SANDING ─► ASSEMBLY         │
        │   → arrival → PIB (CEISA)      │   │   ─► FINISHING (booth + cure)    │
        │   → lane H/K/M → SPPB → gate   │   │   ─► UPHOLSTERY ─► PACKING       │
        └──────────────┬─────────────────┘   └───────────┬──────────────────────┘
                       ▼                                  ▼
        ┌────────────────────────────────┐   ┌──────────────────────────────────┐
        │ 6 Goods receipt + QC incoming  │──►│ 8 QC in-process / final → rework │
        │   6b LANDED COST allocation    │   └───────────┬──────────────────────┘
        └────────────────────────────────┘               ▼
                       │                     ┌──────────────────────────────────┐
                       └────── real unit ───►│ 9 Finished goods → delivery      │
                              cost           │ 10 Costing: standard vs actual   │
                                             └──────────────────────────────────┘
```

### 4.1 The import sub-process, in the detail that matters

An import shipment moves through eleven states, and the system refuses to skip any of them:

| # | State | What has to be true to leave it |
| --- | --- | --- |
| 1 | `PLANNED` | An approved purchase order exists |
| 2 | `PERMIT_PENDING` | Every LARTAS permit the lines require is **on file and unexpired** — DIPK for forestry lines, IP-B2 + LS for hazardous chemistry, SNI where mandatory |
| 3 | `ORDERED` | Proforma confirmed, payment instrument opened (T/T, L/C sight, L/C usance, D/P) |
| 4 | `IN_PRODUCTION` | Supplier's own lead time; the ready date is what the ETA is built from |
| 5 | `BOOKED` | Vessel, voyage, ETD, ETA and free time recorded |
| 6 | `ON_WATER` | B/L issued; the ETA is now the number every plan hangs on |
| 7 | `ARRIVED` | Discharged; **the free-time clock starts** |
| 8 | `PIB_SUBMITTED` | Every mandatory document present (invoice, packing list, B/L, COO if preference is claimed, permit, insurance), duty and PDRI self-assessed and paid |
| 9 | `LANE_ASSIGNED` | Hijau, kuning or merah — each with its own expected days |
| 10 | `CLEARED` | SPPB issued |
| 11 | `RECEIVED` | Trucked, receipted into a warehouse, incoming QC done, **landed cost finalised** |

### 4.2 The three clocks, reconciled

The system computes, for every material line of every work order:

```
available_date(item) = max over covering supply of:
      on_hand                     → today
      local PO                    → promised date
      import shipment             → ETA + clearance_days(lane, supplier history) + inland_days
      kiln batch (solid timber)   → batch end date, if final MC lands in band
needed_date(WO line) = WO planned start − operation offset
slack = available_date − needed_date        ← negative slack is the exception
```

Nothing on the exception list says "shortage". Every one of them says *how many days late, because
of which supply, sitting where.*

---

## 5. Business rules

These are the rules that make the system worth more than a spreadsheet. Each is enforced in the UI,
not merely reported.

**Commercial**

1. **A quotation freezes the cost it was priced on.** Every quote line stores the standard cost at
   the moment it went out — material exploded off the bill with its yields, plus labour and overhead
   run out over the routing. Without that figure nobody can say afterwards whether a win was worth
   having, and a quote priced under the margin floor needs a signature before it leaves.
2. **A quote has a shelf life.** Past its validity date it cannot be re-sent, only re-priced: the
   timber cost and the settlement rate have both moved underneath it.
3. **Losses are recorded by value and by reason.** A win rate counted on quotations flatters a desk
   that wins small ones, and losing on lead time is the import clock showing up in the order book.
4. **ATP promise check.** A sales order line cannot be confirmed against a date the three clocks
   cannot meet. The system offers the earliest honest date and names the binding constraint.
2. **Credit hold.** An order that takes a customer past their credit limit blocks confirmation, and
   the overage is shown in money, not as a flag.
3. **Deposit gate.** A make-to-order line with imported content will not release a purchase order
   until the contractual deposit is recorded — the company does not finance a customer's hardware.

**Engineering**

4. **Yield is part of the BOM.** Gross requirement = `net quantity ÷ yield%`. Solid timber runs
   62–72% from rough sawn, veneer ~88%, foam ~92%, panel goods ~85% after cutting optimisation. A
   BOM without a yield silently under-orders every material it touches.
5. **Multi-level explosion.** Sub-assemblies (a drawer box, a door front, a seat frame) are
   products in their own right with their own routing, and a change to one rolls up into every
   parent that uses it. **Where-used** is a first-class view, because the question "what breaks if
   this runner is discontinued" is asked constantly.
6. **Phantom & alternates.** A component may carry an approved alternate; when the primary is short
   and the alternate is not, MRP says so instead of raising a shortage.

**Planning**

7. **Netting excludes safety stock.** Available = on-hand − reserved − safety stock. Safety stock
   is not a buffer MRP is allowed to consume.
8. **Import lead time is a first-class number.** An item's lead time is `supplier days + transit
   days + expected clearance days + inland days`, where expected clearance days is derived from
   that supplier's own lane history, not a constant.
9. **Capacity is a gate, not a chart.** A work order cannot be scheduled onto a work centre past
   its available hours for that day. The board names the bottleneck; in this business it is almost
   always finishing, because a spray booth plus a cure time is a hard serial constraint.
10. **Finishing cure time is serial.** A second coat cannot start before the first has cured. The
    routing carries cure hours as queue time, and the scheduler respects it.

**Materials & import**

11. **LARTAS gate.** A purchase order containing a restricted line cannot be released to the
    supplier until the permit is on file, matches the line's HS code and species, and does not
    expire before the expected arrival. A permit inside 60 days of expiry is an exception.
12. **PIB completeness gate.** A PIB cannot be submitted with a mandatory document missing. If the
    COO for a preferential origin is absent, the system re-prices the duty at the MFN rate and shows
    the difference in rupiah, because that is the actual cost of the missing certificate.
13. **NDPBM, not the spot rate.** Duty and PDRI are computed on the Minister of Finance rate in
    force on the PIB date, which is *not* the rate the invoice was paid at. The system keeps both,
    and the gap is a real FX variance carried on the shipment.
14. **Free time and demurrage.** From the discharge date, the free-time clock runs. Chargeable days
    accrue daily at the carrier's tariff and are shown as money accruing *now*, not billed later.
    A red-lane shipment with three days of free time left is the single loudest exception the
    system raises.
15. **Landed cost is allocated, then finalised.** On receipt, goods are valued at a provisional
    cost. When the shipment's costs are complete, `CIF + BM + clearance + inland` is allocated over
    the lines — by customs value, by gross weight or by volume, chosen per cost — and the difference
    against provisional is posted as a purchase price variance. PPN and PPh 22 are creditable and do
    **not** enter inventory cost; treating them as cost is the most common way a furniture works
    over-states its material cost by 14%.

**Production & quality**

16. **The kiln gate.** Solid timber cannot be issued to the rough mill unless its lot's kiln batch
    is closed with a final moisture content inside the target band — 8–12% for indoor, 12–15% for
    outdoor. Out of band, the batch is re-dried and the lot stays blocked. This is the rule that
    prevents the warranty claim eighteen months from now.
17. **Three inspection points.** Incoming (moisture, dimension, colour match, hardware function),
    in-process (squareness, joint strength, thickness after sanding) and final (finishing defects:
    orange peel, sagging, dust nibs, colour deviation against the master panel). Each fail is
    dispositioned — accept, rework, downgrade, scrap, return to supplier — and rework spawns a real
    order that consumes real hours and real finishing material.
18. **Scrap is charged where it happens.** A component scrapped at machining costs its material
    plus the operations already done to it, not just its material.

**Costing**

19. **Standard versus actual, decomposed.** Every closed work order reports material usage variance
    (quantity), material price variance (landed cost against standard), labour efficiency variance
    (hours) and overhead absorption. A variance beyond the tolerance set in Settings raises an
    exception rather than waiting for month end.
20. **Margin is per order, and it is the truth.** Quoted price against actual landed material,
    actual labour, absorbed overhead, plus the rework and the demurrage that the order caused.

**Delivery, claims and cash**

21. **Only a delivery moves a sales order line.** `shippedQuantity` is not editable; it changes when
    a surat jalan is signed for, which is the only event that can honestly change it.
22. **The export document gate.** A delivery cannot be marked loaded or in transit until every
    document its mode requires is verified. A container with an unsubmitted PEB gets no gate pass at
    the port, and Australia refuses solid-wood packing without an ISPM 15 stamp.
23. **Container fill is a margin question.** Below 85% of the cube the freight is the same and every
    piece on board carries the empty space as well as itself, so an under-filled box raises an
    exception naming the cubic metres and the reason they are missing.
24. **A claim costs what the remedy costs.** A repair on site settles at the finisher's travel and
    materials, a credit note at the sale value, a return-and-rework at the rework plus freight both
    ways. Claiming the sale value for a scuff is not a settlement, it is an opening position.
25. **Liability decides who carries it.** Undecided is not neutral — everything in it sits on our
    margin until somebody decides, and a carrier claim is only collectable if the damage was noted
    on the delivery note at the time.
26. **A claim closes with a corrective action or it comes back.** The action lands on the routing,
    the QC plan or a maintenance order, not in a meeting minute.
27. **A receipt with no allocation is not revenue collected.** It is money in a bank account nobody
    can match to anything, and it is reported as such.
28. **Withholding is a prepayment, not a discount.** PPh 23 at 2% on domestic services is kept back
    at source and reclaimed by the supplier; we are liable for it whether or not we remembered.
29. **The FX difference is between invoice rate and settlement rate**, and it is posted, not
    absorbed into the cost of the goods.

**Buying, maintenance and subcontracting**

30. **The approval ladder is decided by value, not by department.** A requisition needs every rung
    whose ceiling it clears, so a box of abrasives takes one signature and a container of walnut
    takes four.
31. **Waiting is measured, not approvals.** Every day a requisition spends on a desk is a day of
    supplier lead time already spent; past the two-day service level it raises an exception naming
    the person it is with.
32. **A requisition converts into one purchase order per supplier**, at the estimated costs and
    carrying the justification that got it signed.
33. **Capacity is scheduled hours less booked downtime.** Maintenance that is overdue, running or
    waiting on a part counts against the window whatever its due date says — a machine that stopped
    last Tuesday is not outside the window, it is in the middle of it.
34. **Material at a subcontractor is still our inventory and still our risk.** It does not appear in
    any warehouse stock report, so it is valued and aged here instead.
35. **Loss beyond 2% at a subcontractor is their method, not our specification**, and it is raised
    against the cutting plan before the next order goes out.

---

## 6. Domain model

**Product** — a sellable finished good or a sub-assembly. Carries collection, category
(case goods, seating, tables, upholstery, outdoor), dimensions, cubic volume for the packed carton,
finish family, standard cost roll-up and list price. `isSubAssembly` makes it a BOM node rather than
a catalogue line.

**BOM** — versioned per product, effective-dated. Lines carry component (item or sub-assembly),
net quantity, unit, **yield %**, scrap %, an operation number (which routing step consumes it) and
an optional approved alternate.

**Routing / Operation** — ordered steps per product: work centre, setup minutes, run minutes per
unit, queue/cure hours, whether it is subcontracted, and the inspection point (if any) that follows
it.

**Work centre** — kiln, rough mill, moulder/CNC, sanding, assembly, spray booth, upholstery,
packing. Carries capacity hours per day, number of parallel stations, labour rate per hour and
overhead rate per hour.

**Item** — a purchased material. Type: solid timber, panel, veneer/laminate, hardware, finishing
chemical, upholstery, packaging, consumable. Carries UoM, HS code, whether it is imported, its
`lartasType` (`NONE` / `DIPK` / `IP_B2` / `SNI`), duty rate (MFN and preferential), lead-time parts,
safety stock, reorder point, standard cost and valuation.

**Lot** — a receipted quantity of an item with its own origin: species, country of harvest, supplier,
import shipment and — for timber — its kiln batch and moisture reading. Traceability runs from a
finished wardrobe back to a species and a country, which is what an export customer's EUDR question
needs.

**Supplier** — local or overseas. Currency, Incoterm, payment instrument and terms, lead-time days,
**lane history** (how many of their PIBs drew hijau/kuning/merah and how many days each took), and
a scorecard from on-time, quality and document accuracy.

**Purchase order** — lines against items, with the shipment it belongs to. Local POs are simple;
import POs are the head of an import shipment.

**Import shipment** — the eleven-state record of §4.1: supplier, forwarder, Incoterm, container(s),
vessel/voyage, ETD/ETA, discharge date, free time, B/L, the permits it needs, the PIB (registration
number and date, CEISA channel, lane, SPPB), the cost lines (freight, insurance, duty, PPN, PPh 22,
clearance, THC, trucking, demurrage), the NDPBM used, and the allocation basis per cost.

**Sales order** — customer, lines against products, promised and confirmed dates, ATP result and
binding constraint, deposit, and the work orders raised from it.

**Work order** — product, quantity, dates, routing progress per operation, material issues and
their lots, QC results, scrap and rework, and the cost roll-up.

**Kiln batch** — chamber, schedule, species, charge volume, start/end, target band, readings over
time, final MC, and the lots inside it.

**QC record** — point, work order or receipt, sample size, defects found by code, disposition.

**Stock movement** — receipt, issue, transfer, adjustment, scrap, production output. Every
quantity change in the system is a movement; nothing is set directly.

**Finance** — Indonesian-shaped chart of accounts (raw material / WIP / finished goods inventory
split, COGS split by material / labour / overhead, PPN masukan and keluaran, PPh 22 dibayar di muka,
purchase price variance and usage variance as named accounts), double-entry journal, AR and AP with
ageing, trial balance, income statement and balance sheet.

---

## 7. Screens

| Group | Screen | What it is for |
| --- | --- | --- |
| **Control** | Control Tower | Every exception, ranked by money and by days; the three clocks on one page |
| **Sales** | **Quotations** | Weighted pipeline, margin against the floor, validity clock, loss reasons by value |
| | Sales Orders | Order book, ATP promise, credit and deposit gates |
| | **Deliveries & Packing** | Surat jalan, packing list, container fill, the export document gate |
| | **Returns & Claims** | Liability, remedy, cost of poor quality, corrective actions |
| | Customers | Retail, contract/FF&E and export customers with terms and limits |
| **Engineering** | Products | Catalogue, standard cost roll-up, margin at list |
| | Bill of Materials | Multi-level tree, yield, alternates, **where-used** |
| | Routings & Work Centres | Operations, rates, capacity, the bottleneck |
| **Planning** | Master Schedule | Demand against capacity, period by period |
| | MRP Run | Netting, shortages **with dates and causes**, planned orders |
| | Capacity & Load | Load percentage per work centre per day |
| **Production** | Work Orders | Release, schedule, progress by operation, cost |
| | Shop Floor | One board per work centre: queued, running, blocked |
| | Kiln Drying | Batches, readings, the moisture gate |
| | **Subcontracting** | Value out at a subcontractor, days late, loss against tolerance, PPh 23 |
| | **Maintenance** | Preventive intervals, breakdowns, downtime netted off availability |
| | Quality | Inspections, defect Pareto, dispositions, rework |
| **Materials** | Item Master | Every purchased material with its import identity |
| | Inventory | On hand, reserved, available, movements, lot traceability |
| | Suppliers | Scorecards and lane history |
| | **Requisitions** | The approval ladder by value, and the lead time the waiting costs |
| | Purchase Orders | Local and import, with the LARTAS release gate |
| | **Import Shipments** | The eleven states, free time, demurrage accruing |
| | **Customs & Permits** | PIB register, CEISA lane, SPPB, permit expiry |
| | **Landed Cost** | Allocation, provisional against final, variance |
| **Finance** | Costing & Variance | Standard against actual per work order |
| | Invoices & Bills | AR and AP with ageing |
| | **Receipts & Payments** | Cash in and out, allocations, withholding, FX difference, the bank |
| | General Ledger · Chart of Accounts · Reports | Double entry, trial balance, P&L, balance sheet |
| **Insight** | Analytics | On-time, yield, scrap, OEE-shaped utilisation, import lead time, cost variance |
| | Settings & Audit | Tax rates, tolerances, numbering, activity trail |

---

## 8. What the system measures

| KPI | Definition | Why this business cares |
| --- | --- | --- |
| **On-time delivery** | SO lines shipped on or before confirmed date | The contract customer's penalty clause |
| **Promise accuracy** | Confirmed date against ATP-suggested date | How often sales overrode the system, and what it cost |
| **Material yield** | Actual issued against BOM standard | Solid timber is the single largest cost line |
| **Scrap rate** | Scrapped value ÷ material issued | 4% scrap is 4% of material *plus* the operations already spent on it |
| **First-pass yield** | Final QC passed first time | Rework in finishing is the most expensive rework there is |
| **Work-centre utilisation** | Loaded hours ÷ available hours | Finds the bottleneck before the plan does |
| **Import lead time, actual** | PO date → available-to-issue date | The number every promise is built on |
| **Clearance days by lane** | PIB date → SPPB, split hijau/kuning/merah | Turns "customs is slow" into a planning parameter |
| **Demurrage & detention** | Accrued and paid, per shipment and per supplier | Pure loss, and always someone's decision |
| **Landed cost variance** | Final against provisional | Whether the material cost in the quote was ever real |
| **Purchase price variance** | Landed against standard cost | Where inflation and FX actually landed |
| **Gross margin per order** | Price against actual cost | The only number the director keeps |

---

## 9. Non-functional

Front end only, no API. React 19 + TypeScript + Vite + Tailwind v4, Radix primitives, Zustand with
`persist` to `localStorage`. Everything on every screen is **derived** from the seeded book —
there is no hand-typed dashboard number anywhere in the application. Light and dark themes.
Keyboard command palette. CSV/JSON export and CSV import on every table, round-tripping through the
same column set.
