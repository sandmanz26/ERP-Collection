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
    id: 'projects-v1',
    name: 'Projects',
    path: '/projects',
    steps: [
      {
        placement: 'center',
        title: 'This is where a shipment lives',
        body: 'Every export job is one row. It carries the parties, the route, the cut-off dates, the containers, the documents and the money — so nothing about a shipment lives in somebody’s inbox.',
        because: 'Takes about a minute. You can leave at any point with Esc.',
      },
      {
        target: 'projects-stage',
        title: 'The stage says how far along it is',
        body: 'A job moves through eight stages, from inquiry to settlement. The bar fills as it goes, and the label tells you what is happening right now.',
        because: 'Sort by this column to see everything sitting at the same step.',
      },
      {
        target: 'projects-cutoff',
        title: 'The next deadline, counting down',
        body: 'Shipping lines set three or four cut-offs per shipment, days apart. This shows the nearest one and how long is left — amber inside three days, red inside one.',
        because: 'Miss a cut-off and the container waits for the next vessel. This is the single most expensive mistake in the job.',
      },
      {
        target: 'projects-margin',
        title: 'What the job is actually making',
        body: 'Buy and sell are held per charge line, so the margin here is calculated, not typed in. It moves as costs land.',
        because: 'A quote at 20% that closes at 4% usually did so through charges nobody was watching.',
      },
      {
        target: 'table-search',
        title: 'Find anything by typing',
        body: 'Search matches the job number, the customer, the vessel, the ports and the commodity at once. Filters sit next to it for narrowing by status, type or destination.',
      },
      {
        target: 'table-export',
        title: 'Import and export live here',
        body: 'Export gives you the filtered view, your selection, or everything — and a re-importable file whose columns match the importer exactly, so a round trip loses nothing.',
        because: 'Every module in the suite works the same way.',
      },
      {
        target: 'table-actions',
        title: 'Actions stay pinned',
        body: 'However wide the table gets, the action column stays on the right and the identity column stays on the left. Deleting always asks first, and says what else it would remove.',
      },
      {
        placement: 'center',
        title: 'Open a job to see the stepper',
        body: 'Inside a job the eight stages become a checklist with gates: the system will not let a job advance while something genuinely blocks it — an overloaded container, a rejected document, a customer over their credit limit.',
        because: 'You can replay this tour any time from the account menu.',
      },
    ],
  },
  {
    id: 'project-detail-v1',
    name: 'Inside a job',
    path: '/projects/',
    steps: [
      {
        placement: 'center',
        title: 'One job, end to end',
        body: 'Everything about this shipment is on this page, split across tabs. The header keeps the route, the vessel and the owner in view wherever you are.',
      },
      {
        target: 'job-stepper',
        title: 'The eight stages, with gates',
        body: 'Each stage has a checklist. The number on a stage is how many tasks are done. A stage will not open while a blocking task is outstanding.',
        because: 'This is the difference between a system that records what happened and one that stops it happening wrong.',
      },
      {
        target: 'job-blockers',
        title: 'What is stopping this job',
        body: 'Blockers come from the rules, not from a checklist somebody remembered to tick: an overloaded container, a missing VGM, a rejected certificate, a customs filing short of its uploads.',
      },
      {
        target: 'job-tabs',
        title: 'Containers, documents, charges and the rest',
        body: 'Containers hold the cargo plan and the weights. Documents is the register with each one checked against its own standard. Charges is buy and sell per line. Job sheet is the recap finance receives.',
      },
    ],
  },
  {
    id: 'operator-v1',
    name: 'Your workspace',
    path: '/my',
    steps: [
      {
        placement: 'center',
        title: 'Your desk, in four phases',
        body: 'Take the job on, run it, paper it, close it. Every shipment you own sits in one of them, and each one tells you what it needs next.',
        because: 'Takes under a minute. Esc leaves at any point.',
      },
      {
        target: 'my-blocking',
        title: 'What will stop a shipment',
        body: 'These are not reminders. Each one means a container, a document or an invoice genuinely does not move until it is dealt with — and the line underneath says what it costs to leave it.',
      },
      {
        target: 'my-phases',
        title: 'The four phases',
        body: 'A count and how many are blocked. Click any of them to work that phase on its own.',
        because: 'Documents span every phase, because a certificate can be rejected while the box is still loading.',
      },
      {
        target: 'my-jobs',
        title: 'Your jobs, grouped by phase',
        body: 'Each card shows where the job is, the nearest deadline, and the single most urgent thing on it. A job with nothing outstanding says so.',
      },
    ],
  },
]

export const tourFor = (pathname: string) => {
  /* the most specific matching path wins, so /projects/prj_1 gets the detail tour */
  const matches = TOURS.filter((t) => pathname.startsWith(t.path) && (t.path !== '/projects' || pathname === '/projects'))
  return matches.sort((a, b) => b.path.length - a.path.length)[0]
}
