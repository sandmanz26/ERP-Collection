/**
 * Guided tours.
 *
 * Each step points at an element carrying `data-tour="<key>"`. A step whose
 * target is not on the page is skipped rather than shown against nothing, so a
 * tour survives a table being empty or a column being hidden.
 */
export interface TourStep {
  target?: string
  title: string
  body: string
  /** why this matters, in one line — the part people actually remember */
  because?: string
  placement?: 'auto' | 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export interface Tour {
  id: string
  name: string
  /** the route this tour belongs to; matched against the pathname */
  path: string
  steps: TourStep[]
}

export const TOURS: Tour[] = [
  {
    id: 'tower-v1',
    name: 'Control Tower',
    path: '/',
    steps: [
      {
        placement: 'center',
        title: 'Three clocks, on one page',
        body: 'A customer promise, a container on the water and a kiln that has not finished drying all run at different speeds. Everything below is the reconciliation between them.',
        because: 'Takes about a minute. Leave at any point with Esc.',
      },
      {
        target: 'tower-clocks',
        title: 'The clocks themselves',
        body: 'What is promised, what is in the import pipeline, and what is blocked at the kiln gate. Each one links to the screen that can do something about it.',
      },
      {
        target: 'tower-exceptions',
        title: 'Every exception says what it costs',
        body: 'Not a red flag — a sentence: what it is, what it means, what to do, and what happens in money if nobody does. That last part is what makes the list rank.',
        because: 'A list without a cost is a list nobody works.',
      },
    ],
  },
  {
    id: 'mrp-v1',
    name: 'MRP run',
    path: '/mrp',
    steps: [
      {
        placement: 'center',
        title: 'A shortage is never a quantity',
        body: 'It is a date. Every line here answers with the day the covering supply becomes issuable and the reason it is not sooner.',
      },
      {
        target: 'mrp-slack',
        title: 'Slack is the whole column',
        body: 'Negative slack means the material lands after the operation that needs it. Five days late on a hardware line is five days late on the order.',
      },
      {
        target: 'mrp-coverage',
        title: 'And the cause, in a sentence',
        body: '“Berths on the eleventh, clears in two on this supplier’s own record, two days inland.” That is a plan you can argue with. “Short 340 pairs” is not.',
      },
    ],
  },
  {
    id: 'imports-v1',
    name: 'Import shipments',
    path: '/imports',
    steps: [
      {
        placement: 'center',
        title: 'Eleven states, and none of them skippable',
        body: 'Permit, order, production, booking, sailing, arrival, PIB, lane, SPPB, gate-out, receipt. Each one has a gate that has to be true before the next.',
      },
      {
        target: 'imports-freetime',
        title: 'Free time runs from discharge',
        body: 'Not from arrival notice, not from the PIB. From the day the box came off the ship — and demurrage after that is shown accruing now, not billed later.',
        because: 'Demurrage is always somebody’s decision, and it is always cheaper to make it early.',
      },
    ],
  },
]

/** The tour registered for a route, if any. The longest matching path wins. */
export function tourFor(pathname: string): Tour | undefined {
  const matches = TOURS.filter((t) => (t.path === '/' ? pathname === '/' : pathname.startsWith(t.path)))
  return matches.sort((a, b) => b.path.length - a.path.length)[0]
}
