import type { ProjectStage, StageKey } from '@/data/types'
import { STAGES } from '@/data/reference'
import { uid } from '@/lib/utils'

const TASKS: Record<StageKey, { label: string; blocking: boolean; hint?: string }[]> = {
  INQUIRY: [
    { label: 'Requirement captured (commodity, volume, terms)', blocking: true },
    { label: 'Service package selected and priced', blocking: true, hint: 'Links the rate card that drives the charge sheet.' },
    { label: 'Quotation sent to client', blocking: true },
    { label: 'Credit check against limit and outstanding AR', blocking: true, hint: 'Blocks the job when the client is over their limit.' },
    { label: 'Client acceptance received in writing', blocking: true },
  ],
  BOOKING: [
    { label: 'Space booked with carrier', blocking: true },
    { label: 'Booking confirmation received', blocking: true },
    { label: 'Vessel, voyage and ETD confirmed', blocking: true },
    { label: 'Cut-off calendar recorded (SI / VGM / gate-in)', blocking: true, hint: 'Every downstream alert is derived from these dates.' },
    { label: 'Empty container release order issued', blocking: false },
  ],
  CARGO_PLAN: [
    { label: 'Cargo list received from shipper', blocking: true },
    { label: 'Cargo allocated to containers', blocking: true },
    { label: 'Volume and payload validated against container specs', blocking: true, hint: 'Overloaded containers are rejected at the gate.' },
    { label: 'Dangerous goods classification checked', blocking: false },
    { label: 'Stuffing schedule agreed with the depot', blocking: false },
  ],
  DOCUMENTATION: [
    { label: 'Shipping Instruction filed before SI cut-off', blocking: true },
    { label: 'Commercial invoice and packing list received', blocking: true },
    { label: 'PEB submitted via CEISA', blocking: true, hint: 'Indonesian export declaration.' },
    { label: 'Certificate of Origin applied for', blocking: false },
    { label: 'Draft B/L approved by the shipper', blocking: true },
  ],
  STUFFING: [
    { label: 'Container stuffed and sealed', blocking: true },
    { label: 'VGM weighed and submitted before cut-off', blocking: true, hint: 'SOLAS: no VGM, no loading.' },
    { label: 'NPE issued by Customs', blocking: true },
    { label: 'Container gated in before the CY cut-off', blocking: true },
  ],
  DEPARTURE: [
    { label: 'Loaded on board confirmed', blocking: true },
    { label: 'B/L issued and released per instruction', blocking: true },
    { label: 'Shipping advice sent to consignee', blocking: false },
    { label: 'Tracking milestones subscribed', blocking: false },
  ],
  ARRIVAL: [
    { label: 'Arrival notice sent to the consignee', blocking: true },
    { label: 'Original B/L surrendered or telex released', blocking: true },
    { label: 'Delivery order released', blocking: true },
    { label: 'Proof of delivery collected', blocking: false },
  ],
  SETTLEMENT: [
    { label: 'All charges approved and locked', blocking: true },
    { label: 'Sales invoice issued to the client', blocking: true },
    { label: 'Vendor bills matched and posted', blocking: true },
    { label: 'Consignment sales report reconciled', blocking: false, hint: 'Consignment jobs only.' },
    { label: 'Job costing reviewed and closed', blocking: true },
  ],
}

export const STAGE_TEMPLATE = (): ProjectStage[] =>
  STAGES.map((s, i) => ({
    key: s.key,
    enteredAt: i === 0 ? new Date().toISOString() : undefined,
    tasks: TASKS[s.key].map((t) => ({ id: uid('tsk'), label: t.label, blocking: t.blocking, hint: t.hint, done: false })),
  }))
