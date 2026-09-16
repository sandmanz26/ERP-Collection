# Kriyanusa Furniture — Export Manufacturing Suite

A front-end for an Indonesian furniture manufacturer that exports: the kind of business in Jepara
that takes a brief from a Dutch retail chain, argues over the price for six rounds, makes a sample,
costs the order into a rupiah budget, buys teak from four different sawmills, receives it in
whatever order it actually turns up, moves it through four workshops and seven warehouses, and
finally stuffs a container that cannot legally leave the country without a V-Legal document behind
it.

This is a **front-end only** build. All data lives in the browser (Zustand + `localStorage`), seeded
with a realistic operating book: 15 export orders, 12 buyers in 12 countries, 18 suppliers, a
57-line item master, 12 bills of materials, 10 budgets across 291 costed lines, 63 purchase orders,
78 goods receipts, 504 stock movements, 13 work orders, 3 shipments and a posted general ledger.
There is no backend and no API layer.

Sign in with any of the seeded accounts — `rahmat.nugroho@kriyanusa.co.id` and the rest — using
`Kriyanusa#2026`. Three accounts deliberately fail (unverified, locked, suspended) so those paths
can be walked without breaking anything.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

---

## Why it is shaped this way

An ERP that is only CRUD is worse than a spreadsheet, because a spreadsheet at least does not
pretend to be authoritative. The parts of exporting furniture that actually cost money are these:

| What goes wrong | Where the system catches it |
| --- | --- |
| A price is agreed over six rounds and nobody can remember why it ended up where it did | Every negotiation round is kept on the order — subject, both sides' numbers, and the outcome |
| A sample is made, couriered and rejected, and the cost quietly disappears | Sample register per order, with cost, courier, round and whether it was ever re-charged |
| Production starts on a drawing the buyer never signed | Drawing register with revision letters; an unapproved drawing on a job in production raises an exception |
| An order is bought for before anybody costs it | Budget approval state, and a critical exception the moment a purchase order exists without an approved budget behind it |
| The budget is spent twice because "committed" and "actual" are the same column | Budget, committed and received are three separate numbers on every cost category |
| Timber moves 11% between costing and ordering and the margin vanishes | Budget versioning, with the superseded version kept and the margin drop shown |
| Eleven cubic metres of teak arrives as four, then three, then a lorry that is short | Every delivery is its own goods receipt; the order's open balance is the sum of them, never a typed figure |
| Cartons go straight to the packing hall and are never booked in | Direct delivery mode — received on paper against the delivery note, without pretending it entered the gate |
| Material is delivered to a village workshop and forgotten | Subcontractor warehouse: our stock, their shed, still on our books and still our risk |
| Timber arrives with no legality reference and enters the chain anyway | Rejected to quarantine on arrival, with a critical exception saying it cannot be carried into a V-Legal document |
| A sawmill's SVLK certificate lapses halfway through a live purchase order | Certificate expiry watched against open orders, 60 days out |
| Our own FSC certificate expires while three buyers sell the range as certified | Company licence register raising the same exception against ourselves |
| A container sails to Rotterdam without a due diligence pack | EUDR requirement derived from the destination, blocking, with its 14-day lead time counted against the ETD |
| Wooden crating ships untreated and the whole container is refused at the border | ISPM-15 switched on by the packing method, not by a checkbox |
| The export declaration is filed before the legality licence it has to quote | The declaration cannot show as issued while the V-Legal document is not |
| A supplier invoices the ordered quantity rather than the quantity we accepted | Three-way match on every bill, naming quantity variance and price variance separately |
| A buyer over their credit limit is given another order | Credit exposure against limit on the buyer, raised as a critical exception on any live order |
| A deposit is never received and the factory buys anyway | Deposit state on the order; buying past an unpaid deposit is a critical exception |
| Stock drops below its reorder point and nobody raises an order | Reorder exception only where nothing is on order — purchasing already doing its job is not an exception |
| A warehouse figure and a goods receipt disagree | There is no balance table: every quantity is folded out of the movement ledger |
| A count is started and left half-finished, freezing the ledger against unconfirmed numbers | Open counts raised after two days |
| A transfer leaves one warehouse and never arrives at the other | In-transit ageing, because stock in that state belongs to neither store |
| A chair programme looks better per piece than a slab table and worse per container | FOB cost sheet showing cost and margin per cubic metre as well as per piece |
| Stock sits for months and nobody notices the money standing still | Slow-moving analysis by value, against a threshold you can change |

Every number on the Control Tower is derived from the orders, budgets, purchase orders, receipts and
movements in the store. Nothing is a hand-typed dashboard figure, and no rule on the exception list
is a stored flag.

---

## Modules

**Commercial** — Projects (inquiry → negotiation → drawings → samples → order) · Pipeline board · Buyers
**Costing** — Budgets (anggaran belanja) · Profitability and the FOB cost sheet
**Procurement** — Purchase requests · Purchase orders · Goods receipts · Suppliers
**Inventory** — Stock on hand · Item master · Warehouses · Stock ledger · Transfers & counts
**Make & ship** — Work orders · Shipments and the export document set
**Finance** — Payables · Receivables · Payments · General ledger
**Insight** — Analytics · Settings & audit

Twenty-three screens, plus a detail page for an order, a purchase order, a buyer and a goods receipt.

---

## The five things it was built to do

**1 · Handling an inbound project.** An enquiry arrives and becomes a record that never gets
re-keyed. It carries the buyer, the destination, the models, the dimensions in millimetres as the
buyer reads them, and the volume per piece that decides how many containers the order needs. Around
that sit the three things a commercial desk actually does: the negotiation (69 rounds across the
book, each with its subject, both sides' numbers and its outcome), the drawings (29, with revision
letters and what came back marked up) and the samples (15, with what each cost, whether it was
charged, and what the buyer said about it).

**2 · Building the spending budget.** A budget is not typed. It is exploded from the bill of
materials for the models on the order — 12 recipes, item by item — priced at standard cost, grossed
up for the wastage the estimator expects to lose (eighteen per cent on timber, because that is what
actually disappears between a sawn board and a finished component), then carried through labour at
a burdened bench rate, subcontract on borongan terms, overhead absorbed per cubic metre, export
logistics, the certificates the destination forces on us, and a contingency. The margin is whatever
is left, which is the number management argues about.

**3 · Buying, and the money.** Budget lines become purchase requests, requests become orders, and
orders become commitments. The order screen separates what has been ordered from what has been
received, because those are different kinds of money. Supplier invoices are matched three ways
against the order and the goods receipt before finance will pay them, and the ledger, the payables
ageing and the project profitability all read from the same records.

**4 · Goods arriving, whole or in pieces.** This is the part most systems get wrong. A delivery is
**full**, **partial**, or **direct** — 62 of the 78 receipts in the seeded book are partial, and 5
never touched the gate at all. Each carries its own tally, its own inspection, its own bin and batch,
and its own supplier legality reference. What is accepted goes to the receiving store; what fails
inspection goes to the quarantine bay and stays on the books but out of reach of any work order. The
purchase order's open balance is computed from these and cannot be edited into agreement.
**Book in a delivery** on the receipts screen runs the whole flow live.

**5 · Inventory across seven warehouses.** Raw material, kiln and dry store, workshop WIP, finished
goods, a staging depot in Semarang, a subcontractor's shed and a quarantine bay. Stock on hand is
folded out of 504 movements every time a screen renders — there is no balance to drift. *Available*
is on hand less quarantine less what is already reserved to somebody else's order, which is the only
number a production planner can safely believe.

---

## Domain model

```
Buyer ─┬─ Project ─┬─ ProjectItem        the models, dimensions, volume and agreed price
       │           ├─ NegotiationRound   subject, both numbers, outcome
       │           ├─ Drawing            revision, sent, marked up, approved
       │           ├─ Sample             round, cost, courier, verdict
       │           └─ ComplianceItem     derived from destination + what it is made of
       │
       ├─ SalesInvoice ── Payment (IN)
       │
Budget ─── BudgetLine ──┐               exploded from the bill of materials
                        │
PurchaseRequest ────────┴─ PurchaseOrder ─┬─ PurchaseOrderLine
                                          └─ GoodsReceipt ─── GoodsReceiptLine
                                                   │                │
                                                   │                └─ StockMovement (+ accepted, + rejected → quarantine)
                                                   └─ SupplierBill ── Payment (OUT)

WorkOrder ── StockMovement (− material issued, + finished goods produced)
StockTransfer / StockCount ── StockMovement
Shipment ─┬─ ShipmentContainer
          └─ ExportDocument              derived from the compliance set
```

`Item` and `BomRecipe` sit underneath all of it: the recipe is what turns an order into a material
demand, and the item master is what turns a demand into a purchase order and a legality obligation.

---

## What is real and what is not

**Real.** Every derivation. Stock balances, moving-average valuation, available-to-promise,
material shortfalls, budget versus committed versus actual, projected margin, the three-way match,
payables ageing, supplier punctuality computed from receipts against promised dates, the compliance
set derived from destination and packing, the export document set derived from that, and all
seventy-odd exception rules. Posting a goods receipt really does write the purchase order line and
two stock movements. Posting a count really does adjust the ledger.

**Not real.** There is no server. Authentication is a demonstration of the *interface* — lockouts,
unverified accounts, expired reset links — not a security boundary; a real build authenticates on
the server and never lets a credential reach the client. Documents are records, not files. The
seeded book is anchored to the day you open it, so cut-offs and ageing stay live.

---

## Stack

React 19 · TypeScript · Vite · Tailwind v4 with a token-based design system · Radix primitives ·
Zustand with `persist` · react-router 7 · lucide icons.

The palette is a timber one with no blue in it: burnt teak for the brand, plantation green for the
accent, amber, brick red, iris for the informational tone and mulberry for the rare tags. Light
("workshop paper") is the default; dark ("night workshop") is one click away and is resolved before
first paint, so choosing it does not cost you a white flash on every reload. Both themes are defined
from the same token names, so every screen follows automatically — the worst badge contrast in
either theme is 6.5:1.

The table on every list screen is one component: search, multi-select filters, column visibility and
ordering, sticky columns, dense mode, pagination, CSV and JSON export, CSV import with column
mapping, bulk delete with cascade warnings, and a footer summary. Column layouts persist per screen.

`docs/PRD.md` covers the research behind the domain, the decisions taken and the data model in full.
