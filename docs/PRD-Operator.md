# The Operator's Four Phases

**Product requirements — operator workspace**
Written for anyone at the company, not only the people who build software.

> A rendered version of this document, with the flow diagrams, is published as an artifact.
> The technical PRD covering the whole suite is in [`PRD.md`](PRD.md).

---

## 1. What this is

We already have a system that holds everything about a shipment. This document is about giving one
particular person — the **operator** — a way into it that matches how they actually work.

An operator is the member of staff who takes a booking and makes it happen: chases the empty
container, books the crew who load it, gets it through the terminal gate before the cut-off,
assembles the paperwork, and hands the costs to finance at the end. They usually run six to ten
shipments at once, all at different points, all with their own deadlines.

The full system has **23 menu items**. That is the right amount for a manager who needs to look at
the business from every angle. It is the wrong amount for somebody who does not browse at all — who
opens the screen wanting to know one thing: *what needs me right now?*

So the operator gets a different door into the same building. **8 menu items**, arranged as the four
phases a shipment actually passes through. Nothing is hidden from them; the rest of the system is
still there. It simply is not in the way.

---

## 2. The problem we are solving

Ask an operator what went wrong on a bad week and the answer is rarely "I could not find the screen".
It is one of these four:

1. **Nobody owned the job.** It sat between the sales desk and operations for two days. By the time
   someone picked it up, the booking cut-off had moved and the container rolled to the next sailing.
2. **The deadline was not visible until it was past.** Every shipment has three or four cut-offs,
   days apart, set by the shipping line. Miss one and the box does not travel — but nothing counts
   down for you.
3. **The paperwork looked finished and was not.** A document marked "issued" that is missing a field
   a bank checks costs an amendment fee and a fortnight.
4. **The job closed before the money did.** Cash handed to an operator at the port never came back
   with receipts, and a charge left in draft never reached the invoice.

Each of these is a *timing* problem, not an information problem. The information was always in the
system. What was missing was something that put it in front of the right person at the moment it
still mattered.

> **The design principle behind everything here:** the workspace does not show the operator what
> exists. It shows them what to do next, and it says out loud what happens if they leave it.

---

## 3. Who uses it

| Role | Who this is | Opens on |
| --- | --- | --- |
| **Operator** | Runs shipments day to day. Six to ten at a time. | The four-phase workspace, showing only their own jobs |
| **Operations supervisor** | Assigns work, steps in when a job is stuck. | The full suite; can switch to the operator view and see every job |
| **Sales** | Wins the business and hands it over. | Quotations, customers and the pipeline |
| **Finance** | Invoices, pays vendors, closes the books. | Charges, invoices, the ledger and reports |
| **Warehouse** | Receives cargo and supervises loading. | Receipts, the yard schedule and stuffing |
| **Administrator** | Runs the workspace itself. | Everything, including company settings and user accounts |
| **Viewer** | An auditor or a visiting stakeholder. | Everything, read only |

Jobs are assigned by the port they load from, so the operator sitting in Surabaya gets the Surabaya
shipments. An operator sees their own work and nobody else's — not as a restriction, but because a
list of somebody else's deadlines is noise.

---

## 4. The four phases

Behind the scenes a shipment moves through eight stages, from inquiry to settlement. That model is
right for the shipment. It is too fine-grained for the person working it, who thinks in four moves:
take it on, run it, paper it, close it.

Each phase answers one question, and that question is printed at the top of the screen.

### 1 · Take the job on — *menerima project*
**Can I actually run this?**
A shipment lands on the desk. The operator reads the brief, ticks off what they have in hand, and
either accepts it or sends it back with a reason. Nothing moves until somebody owns it.

### 2 · Run the job — *execute project*
**Will the box make the vessel?**
The physical work: plan the cargo into containers, book the loading crew, seal the box, get it
through the terminal gate before the cut-off, and watch it sail.

### 3 · Get the papers right — *pengaturan dokumen*
**Would a bank or customs accept this?**
Every document the shipment needs, complete to its own standard and issued in the right order.
Paperwork runs alongside everything, so this phase covers any job with something outstanding.

### 4 · Close it out — *penutup*
**Is everything billed and settled?**
Delivery confirmed, every charge on the sheet, the cash advanced at the port settled against
receipts, and the cost summary handed to finance.

### How the eight stages fold into four phases

| Phase | Stages it covers |
| --- | --- |
| 1 · Take the job on | Inquiry & Quotation, Carrier Booking |
| 2 · Run the job | Cargo & Container Plan, Stuffing & Gate-in, Departure & Transit |
| 3 · Get the papers right | Documentation & Customs — plus any job, at any stage, with paperwork outstanding |
| 4 · Close it out | Arrival & Delivery, Billing & Settlement |

Phase 3 is deliberately the odd one out. A certificate can be rejected while the container is still
being loaded, so the documents phase counts *every* job with something missing, not only those at the
documentation stage. The job cards elsewhere stay grouped by stage, so a shipment appears exactly
once.

---

## 5. User flow

### Who holds the job

```
SALES DESK    Wins the job ──────────┐         ┌── Fixes what is missing, re-offers ──┐
                                     │         │ ▲                                    │
                          hands over │         │ │ sends back, with a reason          │ re-offered
                                     ▼         │ │                                    ▼
OPERATOR              1 Take it on ──┴─────────┴─┴──▶ 2 Run it ──▶ 3 Paper it ──▶ 4 Close it
                                                                                      │
                                                                            job sheet │
                                                                                      ▼
FINANCE                                                        Invoices, pays vendors, closes books
```

The send-back path is the one most systems leave out. An operator who cannot run a shipment sends it
back, and the system **requires a written reason** before it will accept the refusal — because "not
ready" gives the sales desk nothing to act on, and the job simply returns unchanged.

### What actually stops a shipment in each phase

| 1 · Take it on | 2 · Run it | 3 · Paper it | 4 · Close it |
| --- | --- | --- | --- |
| Nobody has accepted it | Loading booked after cut-off | A document was rejected | Charges still in draft |
| No booking, so no cut-offs | Container weight not filed | Issued, but fields missing | Port cash not settled |
| Charges not priced yet | Sealed with no seal number | Customs upload incomplete | No proof of delivery |
| | Loaded short of the packing list | Instruction past its deadline | |

These are not reminders. Each item is a condition under which a container, a document or an invoice
genuinely does not move, and the workspace refuses to let the job advance past it. Everything else is
presented as "due" or "next up" and can wait.

**Nothing on this list outstanding → the job shows as clear, and the operator moves on to the next.**

---

## 6. User journey

One shipment, followed from the desk to the ledger, through the eyes of Rizky — an export operator in
Jakarta with seven jobs open.

### Phase 1 — Monday morning

- **What he does.** Opens the workspace. Two jobs are waiting for an answer. He reads the first
  brief — a textile shipment to Los Angeles — and works down a seven-point checklist of what he
  should have before starting.
- **What he sees.** The route, the trade terms, the cargo and the cut-off dates on one card. Two of
  the seven items are unticked: no carrier booking, and the charges are not priced. The screen names
  both.
- **How it feels.** Clear-headed. He is deciding, not guessing.
- **What the system does.** Lets him accept anyway — with a warning that the two gaps become his to
  chase. If he sends it back instead, it will not let him do so without a written reason.

### Phase 2 — Tuesday to Friday

- **What he does.** Plans the cargo into three containers, books the loading crew for Thursday
  morning at the shipper's factory, arranges the empty containers and the trucks.
- **What he sees.** Per job: how many containers are planned, how many have had their weight filed,
  how many are through the gate — and how many days of slack each loading slot has against the
  terminal deadline.
- **How it feels.** Busy but not anxious. The countdown is on the screen rather than in his head.
- **What the system does.** Refuses a loading slot booked at or after the terminal's own deadline —
  that container cannot make the sailing, so it is not a plan. Flags a short count against the
  packing list as critical.

### Phase 3 — running alongside

- **What he does.** Works the document checklist: shipping instruction, invoice, packing list, export
  declaration, certificate of origin, bill of lading. Uploads what customs needs.
- **What he sees.** Every document the shipment needs, marked done, in progress, rejected, or issued
  but incomplete — with the missing fields named, not just a count.
- **How it feels.** Methodical. The list is the same shape every time, so it becomes a habit rather
  than a memory test.
- **What the system does.** Will not let a document be marked approved or issued while a field the
  bank or the customs office checks is empty. Blocks the export declaration until its mandatory
  uploads are in.

### Phase 4 — six weeks later

- **What he does.** Confirms delivery, approves the last charges, chases the receipts for the cash he
  advanced at the port, and closes the job.
- **What he sees.** What was billed, what it cost split three ways, the margin, and exactly how much
  cash is still out at the port and with whom.
- **How it feels.** Finished, properly. He is not wondering three weeks later whether something on
  that shipment was ever invoiced.
- **What the system does.** Lists what finance would otherwise send back: charges still in draft,
  cash advanced with no receipts, and any disbursement billed above what was paid for it.

> The emotional arc matters more than it sounds. An operator's bad day is not caused by hard work —
> it is caused by *discovering something late*. Every guard above exists to move a discovery earlier,
> when it is still cheap.

---

## 7. What the system refuses to do

Most systems warn. This one refuses, in a small number of places where a warning would be ignored and
the cost is high.

**Refuses outright**

- **Sending a job back without a reason.** A refusal is a normal answer — but "not ready" gives the
  sales desk nothing to fix.
- **Booking a loading slot after the terminal deadline.** That container cannot make the sailing.
- **Marking a container sealed with no seal number.** The terminal turns the unit away at the gate.
- **Marking a document issued while a required field is empty.** That document exists to be checked
  by somebody outside the company, against exactly those fields.
- **Closing an incident without a root cause.** Without one it happens again.

**Warns, loudly**

- **Accepting a job with unconfirmed items.** Allowed — the operator may know something the system
  does not — but the message says plainly that the gaps are now theirs.
- **Cargo loaded short of the packing list.** Names what it forces: the invoice, packing list and
  bill of lading all have to be amended to what actually shipped.

**Simply reports.** Everything else, grouped as "due now" or "next up".

---

## 8. Screen by screen

**My jobs — the home board.** Opens with the things that will stop a shipment if left, each with the
reason underneath. Then four cards, one per phase, with a count and how many are blocked. Then the
jobs themselves, grouped by phase, each showing where it is, the next deadline, and the single most
urgent thing on it.

**1 · Take the job on.** Jobs waiting for an answer, with the brief and the seven-point checklist
open. Below that, jobs the operator already sent back — with their reason still visible, and a way to
take them after all. Below that, jobs accepted but not yet started.

**2 · Run the job.** One panel per shipment: containers planned, weights filed, units through the
gate, and every loading slot with its date, place, supervisor, crew size and slack against the
deadline.

**3 · Get the papers right.** One checklist per shipment covering every document type, each marked
done, in progress, rejected, issued-but-incomplete, or not started. Missing fields are named
individually.

**4 · Close it out.** Billed, cost, margin and cash still at the port, then cost split three ways.
Cash still out is listed by amount and by who holds it. A job with nothing outstanding offers a single
button to close it.

**Reference.** Three items sit outside the phases because they are looked up rather than worked
through: shipment tracking, the yard's loading schedule, and the incident log.

---

## 9. Scope

| In | Not yet |
| --- | --- |
| A dedicated operator role and workspace | A phone app — the workspace is responsive, but the yard needs a purpose-built one |
| Accepting and sending back a job, with a checklist and a required reason | Automatic assignment by workload rather than by loading port |
| Next actions per job, ranked by whether they stop a shipment | Notifications by email or messaging when something becomes blocking |
| The four phase screens, end to end | Handing a job between operators mid-shipment with a record of why |
| Switching between the operator view and the full suite | Restricting what an operator can open — today the view is focused, not locked |

**Worth being clear about one thing.** The operator view narrows what is *shown*; it does not yet
enforce what may be *opened*. That is a deliberate first step — focus is the problem we set out to
solve, and permissions are a separate piece of work that needs the server side built first.

---

## 10. How we will know it worked

| Measure | Why it tells us something | Target |
| --- | --- | ---: |
| Time from hand-over to acceptance | The gap where jobs used to sit unowned. Hours, not days. | under 4 h |
| Containers rolled to a later sailing | The most expensive failure, and the one the countdown exists to prevent. | under 2% |
| Documents rejected or amended after issue | Whether the field standards catch problems before somebody outside does. | under 3% |
| Port cash unsettled after seven days | Whether closing a job closes the money as well as the shipment. | zero |

A fifth, softer measure is worth watching: how often an operator opens the full suite instead of the
workspace. If that number stays high, the four phases are missing something they need.

---

## 11. Open questions

1. **Should accepting a job with gaps be allowed at all?** Today it is, with a warning. The argument
   for keeping it: an operator often knows the booking is coming this afternoon. The argument
   against: it quietly becomes the normal path.
2. **Who does a sent-back job go to?** Right now it returns to the sales desk. It may be better
   routed to the operations supervisor, who can fix it or reassign it.
3. **Should the four phases become the default for supervisors too?** They currently open on the full
   suite. If they spend most of their day in the operator view, the default is wrong.
4. **How much should an operator see of the money?** The closing screen shows margin. That is useful
   for judgement and awkward in some companies. It should probably be a setting.
