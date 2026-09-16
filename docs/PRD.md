# PRD — PT Tata Gemilang Outsourcing Management System

**Phase 1 · front-end build with seeded data**

---

## 1. The business

PT Tata Gemilang supplies outsourced personnel — principally security (satuan pengamanan) and
cleaning service, plus supporting roles — to large companies across Indonesia. It signs a contract per
building for a fixed period, agrees how many people of which position have to be on site in which
shift, recruits and deploys them, equips them from its own warehouses, and invoices monthly.

Its revenue is headcount × rate. Its risk is an empty post: a service-level breach, a deduction, and
eventually a contract that is not renewed. Its second-largest cost after salaries is the equipment
those people carry.

## 2. The problem this phase solves

Today the operating book lives in spreadsheets. Three questions cannot be answered quickly, and all
three cost money:

1. **How many contracted posts are actually filled right now, and where are the gaps?**
   A coordinator knows their own sites. Nobody has the company-wide picture without rebuilding it by
   hand, so recruitment is prioritised by whoever shouts loudest rather than by where the shortfall is.
2. **Which contracts are about to end, and which of them need an extension letter?**
   A contract without auto-renewal that reaches its notice period unnoticed is simply lost.
3. **Can the warehouse equip the people we have promised?**
   Uniform and equipment demand is a function of headcount, but it is planned separately from the
   contracts that create it, so deployments wait on stock that was never ordered.

## 3. Scope of this phase

| In scope | Out of scope (stated so it is a decision, not an omission) |
| --- | --- |
| Authentication: sign in, register, forgot and reset password | Server-side authentication, role enforcement, SSO, real 2FA |
| Client master with commercial terms and contacts | Credit control, dunning |
| Building master, one client to many buildings | Floor plans, post maps, patrol routes |
| Projects: period, one building, manpower requirement lines | Contract document generation and e-signature |
| Deployment register across all projects | Named personnel, certificates, attendance, payroll |
| Position master with rates and standard issue | Recruitment pipeline, training records |
| Inventory: warehouses, item master, warehouse stock, transfers between warehouses | Issue notes to a site, stock takes |
| Procurement: divisions, suppliers, monthly material request sessions, purchase requests | Tendering, contracts, framework agreements |
| Purchasing: orders per supplier, goods receipt, payments in full or in part | Supplier invoices, three-way match |
| Finance: monthly client invoices with PPN and PPh 23, receipts, receivables ageing, credit exposure | The general ledger, faktur pajak, tax returns, payroll |
| Fulfilment, contract value and margin as computed figures | Invoicing, tax documents, general ledger |
| User management: accounts, roles and privilege control, enforced across the interface | Server-side enforcement, SSO, real second-factor challenge |

## 4. Data model and the rules that matter

```
UserAccount ──N:M──> Role ──N:M──> Permission (code-defined)
     └── grantedPermissions / revokedPermissions (the exception layer)

Client ──1:N──> Building
   │               │
   └──1:N──> Project ──1:1──> Building
                │
                └──1:N──> ManpowerRequirement ──N:1──> Position ──N:M──> InventoryItem (standard issue)

Warehouse ──1:N──> WarehouseStock ──N:1──> InventoryItem

Division ──1:N──> MrRequest ──N:1──> MrSession (one per month)
                     └── MrRequestLine ──N:1──> InventoryItem

MrSession ──1:1──> PurchaseRequest        created by the lock, never by hand
                      └── PurchaseRequestLine ──N:1──> InventoryItem
                            ├── sources[] ──N:1──> Division   (who asked, how many)
                            └── supplierId ──N:1──> Supplier

Supplier ──1:N──> PurchasePrice ──N:1──> InventoryItem       what was paid, and when
                      ▲
                      │ written by every receipt
PurchaseRequest ──split──> PurchaseOrder ──N:1──> Supplier
                              ├──1:N──> GoodsReceipt ──> WarehouseStock   (stock in)
                              └──1:N──> SupplierPayment

StockTransfer ──N:1──> Warehouse (from) and Warehouse (to)
      └── StockTransferLine ──N:1──> WarehouseStock (the exact source line)

Project ──monthly──> Invoice ──N:1──> Client
            └── InvoiceLine   SERVICE | DEDUCTION | ADJUSTMENT
                  └──N:1──> ManpowerRequirement   (what was contracted, what stood empty)
            └──1:N──> ClientReceipt               (money in, full or partial)
```

**R1 — One project serves exactly one building.** A client that wants a second building signs a second
project. Enforced in the type (`Project.buildingId`, singular) and in the form: the building list is
filtered to the selected client, and any building already carrying an active or pending project is
disabled, naming the project that holds it.

**R2 — A manpower line is a position, a shift and a headcount.** Coverage of a 24-hour site is three
lines, not one line with a note. This is what makes "where is the gap" answerable by shift.

**R3 — Deployed can never exceed contracted headcount.** Rejected on save; over-deployment is a
billing conversation, not a data entry.

**R4 — Only a running contract can be short of people.** Draft, pending, completed and terminated
projects are excluded from fulfilment figures and gap alerts. A suspended contract owes nobody a post;
counting it as a shortfall would depress the company figure permanently and hide real gaps.

**R5 — A warehouse stock line points at exactly one master item.** The master holds the definition and
no quantities; the stock line holds quantities and no definition. Deleting a master item deletes its
stock lines, because a quantity with no definition means nothing.

**R6 — One stock line per warehouse, item and batch.** A second line for the same three would
double-count the stock; the form blocks it and names the bin that already holds it.

**R7 — Availability is on hand less reserved; health is judged on hand.** Reserved stock is promised to
a project but still physically present, so a reorder decision looks at the shelf.

**R8 — Planning levels are company-wide on the master, per-warehouse on the line.** The central
warehouse runs to the company floor; a regional or site store keeps its own, set as an override on the
line.

**R9 — Effective privileges are `union(active roles) + granted − revoked`.** A role only grants; denial
lives on the account, so a role can be read as a policy without holding every exception in mind.
Revoked wins over any grant, because an exception a role change can silently undo is not an exception.

**R10 — An inactive role grants nothing.** An engagement (the external auditor) can be switched off
without unpicking who held the role, and switched back on without rebuilding it.

**R11 — The system can never be locked against everyone.** No account edit, account deletion or role
edit may leave zero active accounts holding `users.edit`, `users.create`, `roles.edit` or
`roles.create`. The check runs before the write and refuses with the reason. An account cannot suspend
or delete itself; system roles cannot be deleted; Super Administrator cannot be edited.

**R12 — A role in use cannot be deleted.** Reassign its holders first, so no account is left with no
role and therefore no way to work.

**R13 — One material request session per period.** Two open sessions for the same month would split a
division's demand across both, and the recap would understate it. The form refuses the duplicate and
names the session that already holds the period.

**R14 — A division files exactly one request per session.** The page a division head opens loads that
request or creates it; there is no second one to reconcile. A line is one item — the same item twice
in one request is refused, since the quantities belong on one line.

**R15 — Only an item the warehouse already holds can be requested.** An active master item with at
least one stock line. Anything genuinely new is an item-master decision made by the warehouse team,
not something a request can conjure into existence.

**R16 — The estimated unit price is optional; the fallback is stated.** Where a division gives none,
the item's standard cost stands in and is labelled as such. A reference figure that reads like a quote
is worse than no figure.

**R17 — Locking is refused while any request is still in draft.** Locking would silently drop it.
Purchasing waits for the division to submit, or returns the request — which makes the exclusion
deliberate, attributed and visible in the recap dialog before the button is pressed.

**R18 — The lock is one-way, and it freezes its source.** Submitted requests become approved and can
no longer be edited by their division, the session becomes `LOCKED` and keeps the id of the purchase
request it produced, so the recap can always be read back to the requests it came from.

**R19 — The recap merges by item and keeps every source.** One purchase request line per item,
`qty = Σ sources.qty`, with each contributing division, its quantity and its estimate retained on the
line. The merge is never a sum that loses its parts.

**R20 — A line's price states its basis.** In descending order of authority: agreed on this request →
last purchase from the assigned supplier → last purchase from anyone → the highest division estimate →
the item's standard cost. The basis is shown next to the figure, with the date of the purchase it came
from.

**R21 — A supplier outside the approved categories may be assigned, but never silently.** The picker
separates approved suppliers from the rest; choosing from the rest names the mismatch and offers to
add the category to that supplier's record, so the next request does not ask again. A blacklisted
supplier is never offered, and one on hold cannot be picked. Changing the supplier on a line clears
the agreed price, because that price belonged to the previous one.

**R21a — A line with no approved supplier is a dead end, not a rule.** A supplier can be registered
from the purchase request line itself — enough of a record to place an order, completed later on the
supplier page — and is assigned in the same step.

**R21b — Approval is a final check with stated criteria.** Blockers stop it: a line with no supplier,
or a supplier on hold or blacklisted. Warnings are shown but never enforced: a supplier outside the
category, a price with no purchase from that supplier behind it, a price more than 10% above the last
one paid, and a supplier bucket under its minimum order value. Once approved, the next step is
issuing the orders, offered from the same panel.

**R22 — Draft and assigned are derived, not chosen.** A purchase request becomes `ASSIGNED` when every
line carries a supplier and returns to `DRAFT` the moment one loses it. Approval is refused while any
line is unassigned, and freezes suppliers and prices.

**R23 — A division with request history cannot be deleted.** Deleting it would orphan the sources the
recap is built from and make an approved purchase request unreadable.

**R24 — One supplier, one order.** An approved purchase request is split into one order per supplier,
priced at what the request settled on. A request can be split only once, and only when every line
carries a supplier — otherwise part of the demand would silently never be ordered.

**R25 — Terms are copied onto the order at issue.** Lead time, payment term and the PPN rate are
frozen on the document. Renegotiating a supplier's terms next quarter must not move the due date of
an order placed last month.

**R26 — A delivery can never exceed what is outstanding.** Received plus rejected is capped at
`ordered − already received`, per line. Several deliveries against one order are normal; the order's
status is derived from the totals, never chosen.

**R27 — Rejected goods do not enter stock and stay owed.** They are recorded with a reason and remain
outstanding on the order, because the supplier still has to deliver them.

**R28 — Receiving is the only event that adds stock from outside the company**, and it does three
things atomically: adds to the order's received total, posts the goods into a warehouse, and writes
the price paid. Batch and expiry are required where the item master demands them.

**R29 — Goods arriving join the line already holding that item in that batch, at a weighted average
cost.** One bin now holds two purchases mixed together, and only one number can honestly describe
what is in it.

**R30 — The last purchase price is a fact, not a decision.** It is read from what a receipt recorded,
never from a price typed on a request. A price entered by hand is possible but privileged
(`suppliers.price`), for purchases made before or outside the system.

**R31 — Payment is against the order, in full or in parts.** No payment may exceed the outstanding
balance; an order is settled when nothing is outstanding. A deposit before delivery is allowed and
flagged as paid ahead of receipt, because that is a decision somebody should make deliberately.

**R32 — The payment term runs from the first delivery.** A supplier that has not delivered has not
started the clock, so an order with nothing received is never overdue.

**R33 — Stock leaves on dispatch and arrives on receipt.** Between the two it is counted in neither
warehouse. A transfer can only send what is available at the source, and cancelling one already in
transit puts the goods back on the shelf they left.

**R34 — A shortfall in transit must be explained.** Receiving less than was sent is refused until a
reason is given, and the difference is then kept on the line as a variance rather than quietly
adjusting the quantity.

**R35 — One project, one month, one invoice.** A project is one contract for one building with its own
payment term, so that is the unit that gets billed. A period can only be billed once; a cancelled
invoice frees it to be billed again, which is what cancelling is for.

**R36 — The invoice bills the contract and deducts what was not delivered.** Service lines carry the
contracted headcount at the contracted rate; a deduction line follows at the same rate for every post
that stood empty. They are shown separately rather than netted, because the client will ask which is
which. The management fee is never a line of its own: the bill rate already contains it, and adding
one would count the margin twice.

**R37 — PPN is added, PPh 23 is withheld.** `total = subtotal + PPN`, and what the client actually
transfers is `total − PPh 23`. Both rates come from the client record and are copied onto the invoice
when it is raised, so a change of terms next quarter cannot restate a bill that has already gone out.
A client not subject to PPN gets no PPN line rather than a zero one.

**R38 — Raising produces drafts, never issued bills.** The headcount behind a month has to be
confirmed by a coordinator before anything reaches a client. Issuing freezes the lines and starts the
payment term from the issue date.

**R39 — A draft owes nothing and cannot be late.** Only an issued invoice can be overdue, collected
against or counted as a receivable.

**R40 — An invoice with money against it cannot be cancelled.** The receipt would be left pointing at
a claim that no longer exists. Refund it outside the system first, then cancel.

**R41 — Money in cannot exceed what is owed.** A receipt is capped at the outstanding balance, and the
invoice's status is derived from what has been received rather than chosen: issued → partially paid →
paid.

**R42 — The credit limit is advisory, and visible.** What a client owes is shown against the limit on
its record wherever the decision is made — on the register, on the invoice and in a warning before
issuing another bill to a client already over it — but it never blocks the invoice, because refusing
to bill for work already done helps nobody.

## 5. Module requirements

### 5.1 Authentication
- Sign in with email and password; five failed attempts lock the account for fifteen minutes.
- Distinct, actionable outcomes for: unknown email, wrong password, unverified, invited, locked,
  suspended. Each states what happened *and* what the person can do about it.
- Registration restricted to the company domain; password policy of ten characters with upper, lower,
  digit and symbol, shown as live feedback rather than as a rejection after the fact.
- Reset links valid thirty minutes, single use, and the request form answers identically whether or
  not the address exists.

### 5.2 Clients
- Identity (legal name, brand, NPWP, industry, tier), address, contacts with one primary.
- Commercial terms — payment term, invoice day, PPN, PPh 23, credit limit — held once and inherited by
  new projects.
- Record view: buildings, projects, fulfilment, monthly value and margin.

### 5.3 Buildings
- Belongs to one client. Type, floors, area, operating hours, shift pattern, site contact, access rules.
- The register shows the project currently serving each building, and flags buildings with none.

### 5.4 Projects
- Contract number, status, period, project manager, site supervisor, payment term, management fee,
  renewal mode and notice days.
- Manpower lines: position, shift, headcount, deployed, days per week, hours per shift, bill and cost
  rate per person, note.
- Status flow: `DRAFT → PENDING_APPROVAL → ACTIVE → {SUSPENDED ⇄ ACTIVE} → COMPLETED | TERMINATED`.
- Derived and shown: fulfilment, gap by shift, monthly value, monthly cost, margin, contract value,
  period progress, days remaining, inventory demand against availability.

### 5.5 Positions
- Service line, grade, certifications, minimum education and experience, salary, allowance, default
  bill rate, standard issue (SKU × quantity per person), status.
- The default bill rate must exceed the loaded monthly cost (salary + allowance + BPJS + THR
  provision); rejected on save otherwise.

### 5.6 Inventory
- **Warehouses** — code, name, type, address, manager, capacity, status. Deleting one deletes its stock.
- **Item master** — the standard content set: SKU, name, description, category, sub-category, UoM,
  brand, variant, barcode, standard cost, min, max, reorder point, reorder quantity, batch and expiry
  handling, hazard flag, supplier, lead time, service lines, status, and audit fields (created,
  updated, updated by).
- **Warehouse stock** — warehouse, item, bin, on hand, reserved, unit cost, condition, batch, expiry,
  minimum override, last counted, last movement. Batch and expiry are required when the master says so.

### 5.7 Procurement

- **Divisions** — code, name, head, cost centre, branch, email, status. The CMS behind everything
  else in the module: only a division can raise a material request. One with request history is
  protected from deletion.
- **Suppliers** — legal and brand name, approved categories, PIC and contact, address, NPWP, payment
  term, lead time, minimum order value, bank details, rating, on-time rate, status and supplier-since
  date, plus the purchase history behind them: item, unit price, quantity, purchase order and date.
- **MR sessions** — code, title, period (month and year, unique), filing window, status
  (`DRAFT → OPEN → CLOSED → LOCKED`, or `CANCELLED`), and, once locked, who locked it, when, and the
  purchase request it produced. The register shows filed against eligible divisions, total lines, the
  number of items the merge will produce, and the estimated value.
- **The division head's page** — this division's request in the open session: add a line (item from
  the requestable catalogue, filtered by category, quantity, purpose, optional estimated unit price),
  save as draft, submit.
  Read-only once submitted; a returned request shows the reason and can be revised and resubmitted.
- **Purchasing's session view** — every division's request side by side with approve and return, the
  divisions that have not filed, a preview of the recap exactly as the lock would build it, and the
  lock itself: a dialog that states how many requests merge into how many lines, how many combine more
  than one division, and what is being left out.
- **Purchase requests** — the register (period, status, lines, units, divisions, supplier assignment
  progress, agreed prices, value) and the detail: lines with their division sources, per-line supplier
  assignment surfacing that supplier's last purchase price and its date, the full purchase history for
  the item, an agreed price that overrides it, and the same recap grouped by supplier (with a minimum
  order warning) and by division (with each one's share of the value). A **final check** tab lists the
  blockers and warnings above before approval, and the divisions behind the request as information.

### 5.8 Purchasing

- **Purchase orders** — one per supplier, split from an approved request: lines with ordered
  quantity, unit price and a running received total; which divisions are waiting on the order and for
  what share of it, as information; delivery warehouse; ordered and expected dates;
  the supplier's payment term and the PPN rate copied at issue. An order can be closed short or
  cancelled, with a reason. The register shows delivery progress, payment state, days late and days
  overdue.
- **Goods receipt** — per delivery: warehouse, date, delivery note, vehicle, and per line the
  quantity received, the quantity rejected with its reason, bin, batch and expiry. Receiving posts
  stock and records the price paid. The register carries on-time performance and rejections.
- **Payments** — per payment: amount, method (transfer, giro, cheque, cash), date, reference and
  bank account. A "Full" button fills the outstanding balance; anything less is a part payment. The
  register shows what has been paid and, on a second tab, every order still owed with an ageing
  breakdown.
- **Manual price entry** — recording or correcting a purchase price on the supplier record, for
  purchases the system did not see.

### 5.9 Stock transfers

- Draft → dispatch → receive, with cancel available until it has arrived. Source, destination,
  reason, expected date, and lines drawn from specific stock lines so batch, expiry and cost travel
  with the goods.
- Dispatch takes the stock out of the source warehouse; receipt puts what actually arrived into the
  destination, and a shortfall is recorded as a variance with a reason.

### 5.10 Finance

- **Invoices** — per project per period: service lines from the manpower requirements, automatic
  deduction lines for unfilled posts, free adjustments, the client purchase order, the payment term,
  and the PPN and PPh 23 rates copied from the client. Raise a whole period at once, edit while it is
  a draft, issue it, cancel it with a reason.
- **The tax block** states each step rather than only the answer: services, deductions, adjustments,
  DPP, PPN, invoice total, PPh 23 withheld, and what the client actually transfers.
- **Receipts** — amount, method (transfer, giro, cheque, cash), date, reference, and the account the
  money landed in. Full or partial; the invoice status follows the balance.
- **Receivables** — ageing in the usual four buckets, what each client owes against its credit limit,
  and how many days early or late each payment actually arrived.
- **Finance overview** — contracted margin, owed by clients, owed to suppliers, net position, money in
  against money out month by month, ageing, and the clients worth chasing first.

### 5.11 User management

- **Privileges** are defined in code as `<module>.<action>` with a risk level, because each one
  corresponds to a control the interface shows or hides. 106 of them across 24 modules.
- **Roles** bundle privileges. Ten ship with the system and cannot be deleted; custom roles are
  created by administrators, and any role can be duplicated as a starting point. The editor is a
  module × action matrix that states how many accounts a change will affect before it is saved.
- **Accounts** hold one or more roles plus two override lists, and carry a branch data scope.
  Administrative actions: invite, edit, release a lock, suspend, restore, issue a temporary password,
  delete.
- **Enforcement** is three-deep: the navigation hides what cannot be opened, the route guard refuses
  it and names the missing privilege, and every create, edit, delete, import and export control is
  rendered only for an account that holds the matching privilege.
- **Audit**: a role's privilege change is logged as what was added and removed, not as "updated".

## 6. Interface standard

Every register in the suite carries, without exception: sortable columns, free-text search, per-column
filters, CSV import with mapping and validation, CSV/JSON export (including a re-importable file), a
visible total row count, column show/hide, density control, bulk selection and delete with a cascade
warning.

Money is always written out in full with thousand separators — `IDR 111,949,605` — and never on an
abbreviated scale such as `111.9M` or `385K`, anywhere in the interface. Where a figure is then too
long for the space, the type size gives way; the figure never does.

Every register offers two presentations of the same data, chosen by the reader and remembered:
**Detailed**, every column at once, for reconciling a month; and **Relaxed**, only the columns that
decide (each register declares them), with the remaining fields folded behind a chevron on each row
that opens a labelled panel underneath. Folding is presentation only — search, sort, filters and
export keep working on the full column set. The switch between them is a floating control the reader
can drag anywhere, collapse to a single button, and which appears only where there is a register to
restyle.

Navigation and field labels are English. Operating vocabulary — shift names, position titles, item
names — stays Indonesian.

One theme: light, with a blue primary. Status colour is reserved: green a filled post, amber a
shortfall, red a breach.

## 7. How success is judged

| Question | Where it is answered | Target |
| --- | --- | --- |
| Company-wide fulfilment right now | Dashboard, first tile | one screen, no filtering |
| Which position to recruit for first | Deployments, sorted by gap | one click from the dashboard |
| Which contracts end within 90 days | Dashboard and the project filter | before the notice period closes |
| Whether a project's kit can be issued | Project record, inventory demand tab | before deployment day |
| What needs reordering | Warehouse stock, level filter | before the lead time makes it late |
| Why a person can do something | Privileges matrix, and the effective-access tab on their account | without reading any code |
| What the company is asking to buy this month | MR session, recap preview | before the session is locked |
| Which divisions have not filed yet | MR session, divisions submitted tile | while the window is still open |
| What a line should cost | Purchase request, unit price and its basis | at the moment the supplier is chosen |
| What one supplier is being asked for | Purchase request, by-supplier view | as a single order, not line by line |
| Which suppliers are late | Purchase orders, days late on the register | before the site runs out |
| What an item last actually cost | The item's price history, written by every receipt | at the moment a supplier is chosen |
| What the company owes and when | Payments, ageing view | before the term runs out |
| Where a batch physically is | Stock transfers, in-transit view | while it is still on the road |
| What an unfilled post costs the company | Invoice, deduction lines | in the month it happened, not at year end |
| Which client is slowest to pay | Client receipts, days against term | before the next contract is renewed |
| Whether the month covered itself | Finance overview, money in and out | on one screen |

## 8. Next phases

1. **Personnel.** Named employees, certificates and their expiry dates, assignment to a manpower line.
   Turns fulfilment from a typed number into an attested one.
2. **Attendance.** Daily post confirmation per shift, which turns fulfilment from a monthly claim into
   a daily fact and feeds the SLA deduction calculation.
3. **Issue and stock take.** Goods now arrive by receipt and move by transfer; what is missing is
   issuing them out to a project and counting them physically. Those two close the last places where
   a quantity changes without a document behind it.
4. **The ledger and tax filing.** Invoices and payments now exist on both sides, but nothing posts to
   an account: no trial balance, no accrual for goods received and not yet invoiced, no faktur pajak
   and no monthly return assembled from the PPN and PPh 23 each invoice already calculates.
5. **Server-side enforcement.** The same privilege keys gating the API, so the front end's checks
   become a convenience rather than the control. Plus branch data scope applied to the queries
   themselves — it is recorded on the account today but not yet used to filter what is fetched.
