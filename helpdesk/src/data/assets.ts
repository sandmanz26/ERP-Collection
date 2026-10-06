import type { Asset, AssetStatus, Criticality } from './types'

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

type Row = [id: string, name: string, cat: string, space: string, vendor: string | undefined, mfr: string, model: string, status: AssetStatus, crit: Criticality, ageDays: number, warrantyDays: number | null, lastServiceDays: number | null, cost: number]

const rows: Row[] = [
  ['a_boiler1', 'Boiler 1 (5 ton/jam)', 'ac_utilitas', 'sp_boiler', 'v_boiler', 'Miura', 'LX-300', 'down', 'critical', 2900, null, 20, 1_850_000_000],
  ['a_boiler2', 'Boiler 2 (standby)', 'ac_utilitas', 'sp_boiler', 'v_boiler', 'Miura', 'LX-300', 'operational', 'high', 2900, null, 35, 1_850_000_000],
  ['a_komp1', 'Kompresor Udara 1 (75 kW)', 'ac_utilitas', 'sp_kompresor', 'v_boiler', 'Atlas Copco', 'GA75', 'operational', 'critical', 2100, null, 28, 620_000_000],
  ['a_komp2', 'Kompresor Udara 2 (75 kW)', 'ac_utilitas', 'sp_kompresor', 'v_boiler', 'Atlas Copco', 'GA75', 'degraded', 'critical', 2100, null, 28, 620_000_000],
  ['a_dryer', 'Air Dryer', 'ac_utilitas', 'sp_kompresor', 'v_boiler', 'Atlas Copco', 'FD300', 'operational', 'high', 2100, null, 60, 95_000_000],
  ['a_chiller', 'Chiller Proses (150 TR)', 'ac_ac', 'sp_ct', 'v_dingin', 'Daikin', 'WMC150', 'operational', 'critical', 1800, null, 40, 780_000_000],
  ['a_ct1', 'Cooling Tower CT-1', 'ac_ac', 'sp_ct', 'v_dingin', 'Marley', 'NC-8412', 'operational', 'high', 1800, null, 12, 240_000_000],
  ['a_ac_qc', 'AC Presisi Lab QC', 'ac_ac', 'sp_lab', 'v_dingin', 'Daikin', 'FXMQ', 'degraded', 'high', 900, 120, 70, 85_000_000],
  ['a_ac_server', 'AC Ruang Server (2 unit)', 'ac_ac', 'sp_server', 'v_dingin', 'Daikin', 'FTKC', 'operational', 'critical', 700, 200, 50, 42_000_000],
  ['a_ac_kantor', 'AC Split Kantor Admin (18 unit)', 'ac_ac', 'sp_kantor', 'v_dingin', 'Daikin', 'FTV', 'operational', 'medium', 1100, null, 45, 135_000_000],
  ['a_ac_meeting', 'AC Ruang Meeting & Training', 'ac_ac', 'sp_training', 'v_dingin', 'Panasonic', 'CS-XU', 'operational', 'medium', 800, 300, 80, 56_000_000],
  ['a_ahu_pack', 'AHU Area Packing', 'ac_ac', 'sp_packing', 'v_dingin', 'Carrier', '39M-20', 'operational', 'high', 1500, null, 55, 175_000_000],
  ['a_genset', 'Genset 800 kVA', 'ac_listrik', 'sp_genset', 'v_daya', 'Cummins', 'C900D5', 'operational', 'critical', 2600, null, 22, 1_450_000_000],
  ['a_ats', 'ATS Genset', 'ac_listrik', 'sp_genset', 'v_daya', 'Schneider', 'Masterpact', 'operational', 'critical', 2600, null, 190, 290_000_000],
  ['a_lvmdp', 'Panel LVMDP', 'ac_listrik', 'sp_genset', 'v_daya', 'Schneider', 'Prisma', 'operational', 'critical', 2900, null, 175, 520_000_000],
  ['a_trafo', 'Trafo 1600 kVA', 'ac_listrik', 'sp_genset', 'v_daya', 'Trafindo', 'TRF-1600', 'operational', 'critical', 2900, null, 300, 640_000_000],
  ['a_capbank', 'Capacitor Bank', 'ac_listrik', 'sp_genset', 'v_daya', 'ABB', 'CLMD', 'operational', 'medium', 2000, null, 240, 85_000_000],
  ['a_ups', 'UPS Ruang Server 20 kVA', 'ac_listrik', 'sp_server', 'v_daya', 'Eaton', '9PX', 'operational', 'high', 1000, 400, 130, 120_000_000],
  ['a_hibay1', 'Lampu High Bay Line 1', 'ac_listrik', 'sp_line1', undefined, 'Philips', 'BY698P', 'operational', 'medium', 1200, null, 200, 48_000_000],
  ['a_hibay2', 'Lampu High Bay Line 2', 'ac_listrik', 'sp_line2', undefined, 'Philips', 'BY698P', 'degraded', 'medium', 1200, null, 200, 48_000_000],
  ['a_hibay3', 'Lampu High Bay Line 3', 'ac_listrik', 'sp_line3', undefined, 'Philips', 'BY698P', 'operational', 'medium', 1200, null, 200, 48_000_000],
  ['a_pump_proses', 'Pompa Air Proses P-01', 'ac_air', 'sp_pompa', 'v_pompa', 'Grundfos', 'NK 100', 'operational', 'critical', 2300, null, 75, 160_000_000],
  ['a_tandon', 'Tandon Air Bersih 50 m³', 'ac_air', 'sp_pompa', 'v_pompa', 'Fabrikasi', 'Stainless 50m3', 'operational', 'high', 3000, null, 170, 210_000_000],
  ['a_pump_ipal', 'Pompa IPAL (duty/standby)', 'ac_air', 'sp_ipal', 'v_pompa', 'Ebara', 'DL-55', 'degraded', 'high', 1800, null, 140, 88_000_000],
  ['a_ipal', 'Unit IPAL', 'ac_air', 'sp_ipal', 'v_pompa', 'Fabrikasi', 'Biologis 120 m³/hari', 'operational', 'high', 1800, null, 90, 950_000_000],
  ['a_hydrant', 'Pompa Hydrant (diesel)', 'ac_k3', 'sp_pompa', 'v_fire', 'Grundfos', 'NK 150', 'operational', 'critical', 2700, null, 6, 380_000_000],
  ['a_jockey', 'Pompa Jockey', 'ac_k3', 'sp_pompa', 'v_fire', 'Grundfos', 'CR 5', 'operational', 'high', 2700, null, 6, 62_000_000],
  ['a_fap', 'Panel Fire Alarm', 'ac_k3', 'sp_pos', 'v_fire', 'Notifier', 'NFS2-3030', 'operational', 'critical', 1800, 365, 40, 240_000_000],
  ['a_sprinkler', 'Sprinkler Area Produksi', 'ac_k3', 'sp_line1', 'v_fire', 'Viking', 'Series E', 'operational', 'critical', 2700, null, 60, 410_000_000],
  ['a_apar_prod', 'APAR Area Produksi (46 unit)', 'ac_k3', 'sp_line2', 'v_fire', 'Yamato', 'ABC 6kg', 'operational', 'high', 700, null, 320, 69_000_000],
  ['a_apar_gd', 'APAR Gudang (28 unit)', 'ac_k3', 'sp_gd_baku', 'v_fire', 'Yamato', 'ABC 6kg', 'operational', 'high', 700, null, 300, 42_000_000],
  ['a_fl01', 'Forklift FL-01 (3 ton, diesel)', 'ac_angkut', 'sp_gd_baku', 'v_fork', 'Toyota', '8FD30', 'operational', 'high', 1900, null, 18, 380_000_000],
  ['a_fl02', 'Forklift FL-02 (2.5 ton, listrik)', 'ac_angkut', 'sp_gd_jadi', 'v_fork', 'Toyota', '8FB25', 'degraded', 'high', 1300, 200, 18, 420_000_000],
  ['a_fl03', 'Forklift FL-03 (3 ton, diesel)', 'ac_angkut', 'sp_dock', 'v_fork', 'Komatsu', 'FD30', 'operational', 'high', 2500, null, 25, 350_000_000],
  ['a_hoist', 'Overhead Crane Line 3 (5 ton)', 'ac_angkut', 'sp_line3', 'v_fork', 'Hoist Indo', 'EOT-5T', 'operational', 'critical', 2800, null, 90, 520_000_000],
  ['a_dock', 'Dock Leveler (3 unit)', 'ac_angkut', 'sp_dock', 'v_fork', 'Hormann', 'HLS', 'operational', 'medium', 1700, null, 110, 150_000_000],
  ['a_swc', 'Core Switch & Jaringan Pabrik', 'ac_it', 'sp_server', 'v_net', 'Cisco', 'Catalyst 9300', 'operational', 'critical', 1100, 700, 45, 320_000_000],
  ['a_nvr', 'CCTV NVR (64 kamera)', 'ac_it', 'sp_pos', 'v_net', 'Hikvision', 'DS-9664', 'operational', 'high', 1200, 300, 80, 145_000_000],
  ['a_gate', 'Palang Parkir & Access Control', 'ac_it', 'sp_pos', 'v_net', 'HID', 'VertX', 'degraded', 'medium', 1200, null, 100, 95_000_000],
  ['a_atap_gd', 'Atap & Talang Gudang Barang Jadi', 'ac_gedung', 'sp_gd_jadi', undefined, 'Struktur', 'Spandek 0.4mm', 'degraded', 'high', 3200, null, 365, 780_000_000],
  ['a_lantai', 'Lantai Epoxy Area Produksi', 'ac_gedung', 'sp_line1', undefined, 'Struktur', 'Epoxy 3mm', 'operational', 'medium', 2400, null, 400, 360_000_000],
  ['a_sound_aula', 'Panggung & Sound Aula', 'ac_it', 'sp_aula', 'v_net', 'Yamaha', 'MG16', 'operational', 'low', 800, 180, null, 78_000_000],
]

export const ASSETS: Asset[] = rows.map(([id, name, categoryId, spaceId, vendorId, manufacturer, model, status, criticality, ageDays, warrantyDays, lastService, purchaseCost], i) => ({
  id, tag: `AST-${String(i + 101).padStart(4, '0')}`, name, categoryId, spaceId, vendorId, manufacturer, model,
  serial: `${manufacturer.slice(0, 3).toUpperCase()}${(i * 7919 + 10453).toString(36).toUpperCase()}`,
  status, criticality, installedAt: ago(ageDays),
  warrantyUntil: warrantyDays == null ? undefined : ahead(warrantyDays),
  lastServiceAt: lastService == null ? undefined : ago(lastService),
  purchaseCost,
}))
