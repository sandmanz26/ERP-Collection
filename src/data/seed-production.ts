/**
 * Work orders — one per model on an order, sometimes split when the quantity is
 * bigger than a workshop can hold at once.
 *
 * A work order is what consumes material and what produces finished goods, so
 * it is the hinge between the budget and the warehouse.
 */
import type { WorkOrder, WorkOrderStage, WorkOrderStatus } from './types'
import { intBetween, pick, rng, stamp } from './clock'
import { projects } from './seed-projects'
import { stageIndex, workStageOrder } from './reference'

const SUPERVISORS = ['Tri Handoko', 'Sugeng Prayitno', 'Endang Susanti']
const WORKSHOPS = ['Blok C — machining', 'Blok C — assembly', 'Blok E — finishing line', 'Blok E — upholstery']

let woSeq = 0
const woCode = () => `WO-26-${String(++woSeq + 300).padStart(4, '0')}`

const workOrders: WorkOrder[] = []

projects
  .filter((p) => stageIndex(p.stage) >= stageIndex('PRODUCTION') && p.status !== 'LOST')
  .forEach((project, pi) => {
    const r = rng(21_000 + pi * 37)
    const idx = stageIndex(project.stage)
    const shipDay = Math.round((new Date(project.targetShipAt).getTime() - Date.now()) / 86_400_000)

    project.items.forEach((pit, li) => {
      /* a run bigger than 150 pieces is split so two benches can work it */
      const batches = pit.qty > 150 ? 2 : 1
      for (let b = 0; b < batches; b++) {
        const qty = Math.round(pit.qty / batches)
        const producedShare = pit.producedQty / Math.max(1, pit.qty)
        const produced = Math.min(qty, Math.round(qty * producedShare))
        const plannedStart = shipDay - 52 + li * 5 + b * 8
        const due = shipDay - 12 + li * 3

        let stage: WorkOrderStage = 'QUEUED'
        let status: WorkOrderStatus = 'PLANNED'
        if (idx >= stageIndex('SHIPPED')) {
          stage = 'DONE'
          status = 'COMPLETED'
        } else if (idx >= stageIndex('QC_PACKING')) {
          stage = produced >= qty ? 'PACKING' : 'FINISHING'
          status = produced >= qty ? 'COMPLETED' : 'IN_PROGRESS'
        } else if (produced > 0) {
          stage = pick(r, ['CUTTING', 'ASSEMBLY', 'SANDING', 'FINISHING', 'UPHOLSTERY'] as WorkOrderStage[])
          status = 'IN_PROGRESS'
        } else {
          stage = 'QUEUED'
          status = r() > 0.5 ? 'RELEASED' : 'PLANNED'
        }

        /* one run is stopped because the fabric never came */
        const stalled = project.code === 'PRJ-26-0034' && li === 1 && b === 0
        if (stalled) {
          stage = 'UPHOLSTERY'
          status = 'ON_HOLD'
        }

        const subcon = ['DIN-CHR-STD', 'LNG-BCL', 'CST-CONSOLE'].includes(pit.itemRef) && r() > 0.5

        workOrders.push({
          id: `wo_${project.id}_${li}_${b}`,
          code: woCode(),
          projectId: project.id,
          projectItemId: pit.id,
          itemRef: pit.itemRef,
          qty,
          producedQty: produced,
          rejectQty: produced > 0 ? Math.round(produced * (r() * 0.018)) : 0,
          stage,
          status,
          subconSupplierId: subcon ? (r() > 0.5 ? 'sup_14' : 'sup_16') : undefined,
          workshop: subcon ? 'Mulyo Karya, Bangsri' : pick(r, WORKSHOPS),
          plannedStartAt: stamp(plannedStart, 7),
          startedAt: status === 'PLANNED' ? undefined : stamp(plannedStart + intBetween(r, 0, 4), 7),
          dueAt: stamp(due, 17),
          completedAt: status === 'COMPLETED' ? stamp(due - intBetween(r, 0, 6), 16) : undefined,
          supervisorName: pick(r, SUPERVISORS),
          holdReason: stalled
            ? 'Bouclé fabric is twelve days late from Bandung. Frames are finished and stacked; nothing can be covered until it lands.'
            : undefined,
        })
      }
    })
  })

/** Work orders whose due date has passed and which are not finished. */
export const lateWorkOrders = () =>
  workOrders.filter((w) => w.status !== 'COMPLETED' && w.status !== 'CANCELLED' && new Date(w.dueAt) < new Date())

export { workOrders, workStageOrder }
