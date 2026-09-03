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
| Inventory: warehouses, item master, warehouse stock | Purchase orders, goods receipt, issue notes, stock takes |
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

### 5.7 User management

- **Privileges** are defined in code as `<module>.<action>` with a risk level, because each one
  corresponds to a control the interface shows or hides. 58 of them across 13 modules.
- **Roles** bundle privileges. Eight ship with the system and cannot be deleted; custom roles are
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

## 8. Next phases

1. **Personnel.** Named employees, certificates and their expiry dates, assignment to a manpower line.
   Turns fulfilment from a typed number into an attested one.
2. **Attendance.** Daily post confirmation per shift, which turns fulfilment from a monthly claim into
   a daily fact and feeds the SLA deduction calculation.
3. **Stock movements.** Purchase order, receipt, issue to project, transfer between warehouses,
   stock take. Removes the last place where a quantity changes without a document behind it.
4. **Billing.** Monthly invoice from the manpower lines, with PPN and PPh 23 as the client record
   already describes them.
5. **Server-side enforcement.** The same privilege keys gating the API, so the front end's checks
   become a convenience rather than the control. Plus branch data scope applied to the queries
   themselves — it is recorded on the account today but not yet used to filter what is fetched.
