/**
 * Shipments — the container, and the paperwork it cannot sail without.
 *
 * The document set is not a checklist somebody typed: it is derived from the
 * order's compliance requirements, which are themselves derived from where the
 * goods are going and what they are made of.
 */
import type { ExportDocument, Shipment, ShipmentContainer } from './types'
import { day, intBetween, pick, rng, round, stamp } from './clock'
import { projects, projectCbm } from './seed-projects'
import { containerSpec, exportDocSpec, requiredExportDocs, stageIndex, suggestContainers } from './reference'

const FORWARDERS = ['Meridian Freight Indonesia', 'PT Trans Jateng Logistik', 'Samudera Global Forwarding']
const VESSELS = ['MV Kota Lambang', 'MV Wan Hai 623', 'MV Ever Bloom', 'MV APL Charleston', 'MV Sinar Bandung']
const PREFIXES = ['MSKU', 'TCLU', 'CAIU', 'OOLU', 'WHLU']

const shipments: Shipment[] = []

projects
  .filter((p) => stageIndex(p.stage) >= stageIndex('QC_PACKING') && p.status !== 'LOST')
  .forEach((project, i) => {
    const r = rng(71_000 + i * 23)
    const idx = stageIndex(project.stage)
    const cbm = projectCbm(project)
    const plan = suggestContainers(cbm)
    const shipDay = Math.round(
      (new Date(project.actualShipAt ?? project.targetShipAt).getTime() - Date.now()) / 86_400_000,
    )

    /* Volume is spread in proportion to what each box can actually hold — a
       20-footer beside a high cube does not take half the load. */
    const planUsable = plan.reduce((a, x) => a + x.count * (containerSpec(x.size).usableCbm || 12), 0)
    let unitIdx = 0
    const containers: ShipmentContainer[] = plan.flatMap((c) =>
      Array.from({ length: c.count }, () => {
        unitIdx += 1
        const usable = containerSpec(c.size).usableCbm || 12
        const share = planUsable ? cbm * (usable / planUsable) : cbm
        const loaded = round(Math.min(usable * 0.99, share * (0.9 + r() * 0.09)), 2)
        return {
          id: `cnt_${project.id}_${unitIdx}`,
          size: c.size,
          containerNo:
            idx >= stageIndex('SHIPPED') || r() > 0.4
              ? `${pick(r, PREFIXES)} ${intBetween(r, 100000, 999999)}-${intBetween(r, 0, 9)}`
              : undefined,
          sealNo: idx >= stageIndex('SHIPPED') ? `ID${intBetween(r, 100000, 999999)}` : undefined,
          loadedCbm: loaded,
          loadedWeightKg: round(loaded * 310, 0),
          packages: Math.round(loaded * 3.6),
        }
      }),
    )

    const keys = project.compliance.map((c) => c.key)
    const documents: ExportDocument[] = requiredExportDocs(keys, project.incoterm).map((d, di) => {
      const spec = exportDocSpec(d.type)
      let status: ExportDocument['status'] = 'REQUIRED'
      let issuedAt: string | undefined
      let reference: string | undefined
      if (idx >= stageIndex('SHIPPED')) {
        status = 'ISSUED'
        issuedAt = stamp(shipDay - intBetween(r, 2, 9), 11)
        reference = `${d.type.slice(0, 4)}/26/${intBetween(r, 10_000, 99_999)}`
      } else {
        const roll = r()
        if (roll > 0.66) {
          status = 'ISSUED'
          issuedAt = stamp(-intBetween(r, 1, 9), 11)
          reference = `${d.type.slice(0, 4)}/26/${intBetween(r, 10_000, 99_999)}`
        } else if (roll > 0.4) status = 'SUBMITTED'
        else if (roll > 0.2) status = 'DRAFT'
      }
      /* the export declaration cannot be filed before the legality licence exists */
      if (d.type === 'PEB') {
        const vlegal = di
        void vlegal
      }
      return {
        id: `doc_${project.id}_${di}`,
        type: d.type,
        status,
        reference,
        issuedAt,
        issuer: spec?.issuer,
        mandatory: d.mandatory,
        note: spec?.hint,
      }
    })

    /* the declaration cannot be ahead of the legality licence it has to quote */
    const vlegal = documents.find((d) => d.type === 'VLEGAL')
    const peb = documents.find((d) => d.type === 'PEB')
    if (peb && vlegal && vlegal.status !== 'ISSUED' && peb.status === 'ISSUED') {
      peb.status = 'DRAFT'
      peb.reference = undefined
      peb.issuedAt = undefined
    }

    const status: Shipment['status'] =
      idx >= stageIndex('CLOSED') ? 'CLOSED'
        : idx >= stageIndex('SHIPPED') ? (shipDay < -25 ? 'ARRIVED' : 'SAILED')
          : containers.every((c) => c.containerNo) ? 'DOCS_IN_PROGRESS' : 'STUFFING'

    shipments.push({
      id: `shp_${project.id}`,
      code: `SHP-26-${String(500 + i * 4).padStart(4, '0')}`,
      projectId: project.id,
      buyerName: project.buyerName,
      status,
      forwarderName: pick(r, FORWARDERS),
      bookingNo: `BKG${intBetween(r, 100_000, 999_999)}`,
      vesselName: idx >= stageIndex('SHIPPED') || r() > 0.5 ? pick(r, VESSELS) : undefined,
      voyageNo: `${intBetween(r, 100, 399)}${pick(r, ['E', 'W', 'N'])}`,
      polName: project.buyerCountry === 'JP' ? 'Surabaya (Tanjung Perak)' : 'Semarang (Tanjung Emas)',
      podName: project.destinationPort,
      stuffingAt: stamp(shipDay - intBetween(r, 4, 9), 8),
      etd: day(shipDay),
      eta: day(shipDay + intBetween(r, 21, 42)),
      atd: idx >= stageIndex('SHIPPED') ? day(shipDay) : undefined,
      incoterm: project.incoterm,
      invoiceValue: project.contractValue,
      currency: project.currency,
      containers,
      documents,
      note:
        project.destinationCountry === 'AU'
          ? 'Inside the brown marmorated stink bug season — the fumigation certificate has to name every container number on the booking.'
          : undefined,
    })
  })

export { shipments }
export const shipmentForProject = (projectId: string) => shipments.find((s) => s.projectId === projectId)
