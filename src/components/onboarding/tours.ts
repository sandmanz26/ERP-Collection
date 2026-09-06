export interface TourStep {
  /** the [data-tour] key the step points at; empty means a centred card */
  target?: string
  title: string
  body: string
  /** the reason it matters, shown in a quieter line under the body */
  because?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'auto'
}

export interface Tour {
  id: string
  /** pathname prefix this tour belongs to */
  path: string
  name: string
  steps: TourStep[]
}

export const TOURS: Tour[] = [
  {
    id: 'welcome',
    path: '/',
    name: 'Control tower',
    steps: [
      {
        target: 'exceptions',
        title: 'Start with what is wrong',
        body: 'Every row here is a rule evaluated against the live records — a purchase order past its date, a sawmill whose legality certificate is lapsing, a container that sails in four days without a V-Legal document. Nothing on this list was typed by anybody.',
        placement: 'bottom',
      },
      {
        target: 'kpis',
        title: 'The numbers are derived, not stored',
        body: 'Order book, exposure, stock value and the cash gap are folded out of projects, purchase orders and the movement ledger every time the page renders.',
        placement: 'bottom',
      },
      {
        target: 'ship',
        title: 'What is sailing soon',
        body: 'Orders ranked by how close their ship date is, with the compliance set each one still owes. This is the list the export desk works from.',
        placement: 'top',
      },
      {
        target: 'palette',
        title: 'Everything is one keystroke away',
        body: 'Press ⌘K — or Ctrl+K — to jump to any order, buyer, supplier, item or screen without touching the sidebar.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'project',
    path: '/projects/',
    name: 'An order end to end',
    steps: [
      {
        target: 'stage',
        title: 'Eleven stages, one record',
        body: 'An enquiry becomes a negotiation, a sample, a quotation, an order, a budget, a purchase run, a production run and finally a container. It is all one record — the negotiation you had in March is still attached when the margin is argued about in September.',
        placement: 'bottom',
      },
      {
        target: 'tabs',
        title: 'The tabs are the workflow',
        body: 'Negotiation holds every round of haggling. Drawings and samples hold what went to the buyer and what came back. Budget is the anggaran belanja. Procurement, production and shipment are what happened after the order was won.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'receipts',
    path: '/receipts',
    name: 'Goods arriving',
    steps: [
      {
        target: 'modes',
        title: 'Goods do not arrive the way they were ordered',
        body: 'A delivery is full, partial, or direct — never touched our gate. Eleven cubic metres of teak turns up as four, then three, then a lorry that is short. Every one of those is its own receipt, and the order balance is computed from them.',
        placement: 'bottom',
      },
      {
        target: 'table-search',
        title: 'Rejections are part of the record',
        body: 'Moisture out of spec, under-thickness stock, or timber with no legality document: the rejected quantity goes to the quarantine bay, stays on the books, and never becomes available to a work order.',
        placement: 'bottom',
      },
    ],
  },
  {
    id: 'inventory',
    path: '/inventory',
    name: 'Stock',
    steps: [
      {
        target: 'stock',
        title: 'There is no balance table',
        body: 'Every quantity here is the sum of the movements that produced it. Available is on hand, less what is sitting in quarantine, less what is already reserved for somebody else’s order.',
        placement: 'bottom',
      },
    ],
  },
]

export const tourFor = (pathname: string) =>
  TOURS.filter((t) => (t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)))
    .sort((a, b) => b.path.length - a.path.length)[0]
