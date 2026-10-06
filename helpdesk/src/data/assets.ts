import type { Asset, AssetCategory, AssetStatus, Criticality } from './types'

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString()

type Row = [
  id: string, name: string, cat: AssetCategory['id'], space: string, vendor: string | undefined,
  mfr: string, model: string, status: AssetStatus, crit: Criticality, ageDays: number, warrantyDays: number | null,
  lastServiceDays: number | null, cost: number,
]

const rows: Row[] = [
  ['a_chiller1', 'Chiller 1 (600 TR)', 'ac_hvac', 'sp_roof_chiller', 'v_cool', 'Trane', 'CVHF-600', 'operational', 'critical', 2900, null, 41, 4_200_000_000],
  ['a_chiller2', 'Chiller 2 (600 TR)', 'ac_hvac', 'sp_roof_chiller', 'v_cool', 'Trane', 'CVHF-600', 'degraded', 'critical', 2900, null, 38, 4_200_000_000],
  ['a_ct1', 'Cooling tower A', 'ac_hvac', 'sp_roof_chiller', 'v_cool', 'Marley', 'NC-8412', 'operational', 'high', 2900, null, 12, 640_000_000],
  ['a_ct2', 'Cooling tower B', 'ac_hvac', 'sp_roof_chiller', 'v_cool', 'Marley', 'NC-8412', 'operational', 'high', 2900, null, 12, 640_000_000],
  ['a_ahu_f3', 'AHU L3', 'ac_hvac', 'sp_f3_open', 'v_cool', 'Carrier', '39M-30', 'operational', 'high', 2100, null, 70, 210_000_000],
  ['a_ahu_f5', 'AHU L5', 'ac_hvac', 'sp_f5_open', 'v_cool', 'Carrier', '39M-30', 'degraded', 'high', 2100, null, 84, 210_000_000],
  ['a_ahu_f6', 'AHU L6', 'ac_hvac', 'sp_f6_open', 'v_cool', 'Carrier', '39M-30', 'operational', 'high', 2100, null, 33, 210_000_000],
  ['a_fcu_boro', 'Fan coil — Borobudur', 'ac_hvac', 'sp_f3_borobudur', 'v_cool', 'Daikin', 'FWD08', 'operational', 'medium', 1500, 180, 90, 18_000_000],
  ['a_fcu_bromo', 'Fan coil — Bromo', 'ac_hvac', 'sp_f5_bromo', 'v_cool', 'Daikin', 'FWD10', 'operational', 'medium', 1500, null, 55, 21_000_000],
  ['a_vrf_ann', 'VRF outdoor unit — Annex', 'ac_hvac', 'sp_a2_open', 'v_cool', 'Daikin', 'RXQ20', 'operational', 'medium', 900, 420, 120, 185_000_000],
  ['a_ups1', 'Main UPS 200 kVA', 'ac_elec', 'sp_f2_server', 'v_volt', 'Eaton', '93PM-200', 'operational', 'critical', 1300, null, 160, 780_000_000],
  ['a_genset', 'Genset 1000 kVA', 'ac_elec', 'sp_b1_genset', 'v_volt', 'Cummins', 'C1100D5', 'operational', 'critical', 2600, null, 22, 1_900_000_000],
  ['a_ats', 'ATS panel', 'ac_elec', 'sp_b1_genset', 'v_volt', 'Schneider', 'Masterpact', 'operational', 'critical', 2600, null, 190, 320_000_000],
  ['a_lvmdp', 'LV main switchboard', 'ac_elec', 'sp_b1_genset', 'v_volt', 'Schneider', 'Prisma', 'operational', 'critical', 2900, null, 175, 540_000_000],
  ['a_panel_f5', 'Distribution board L5', 'ac_elec', 'sp_f5_open', 'v_volt', 'Schneider', 'Acti9', 'operational', 'medium', 2100, null, 200, 45_000_000],
  ['a_lift1', 'Passenger lift 1', 'ac_lift', 'sp_roof_lift', 'v_vertex', 'Otis', 'Gen2', 'operational', 'high', 2800, null, 14, 1_100_000_000],
  ['a_lift2', 'Passenger lift 2', 'ac_lift', 'sp_roof_lift', 'v_vertex', 'Otis', 'Gen2', 'down', 'high', 2800, null, 14, 1_100_000_000],
  ['a_lift3', 'Passenger lift 3', 'ac_lift', 'sp_roof_lift', 'v_vertex', 'Otis', 'Gen2', 'operational', 'high', 2800, null, 14, 1_100_000_000],
  ['a_lift4', 'Passenger lift 4', 'ac_lift', 'sp_roof_lift', 'v_vertex', 'Otis', 'Gen2', 'degraded', 'high', 2800, null, 14, 1_100_000_000],
  ['a_lift5', 'Service lift', 'ac_lift', 'sp_roof_lift', 'v_vertex', 'Otis', 'Gen2 Freight', 'operational', 'medium', 2800, null, 14, 1_250_000_000],
  ['a_pump_fire', 'Fire pump (diesel)', 'ac_fire', 'sp_b1_pump', 'v_safe', 'Grundfos', 'NK 150', 'operational', 'critical', 2700, null, 28, 380_000_000],
  ['a_pump_jockey', 'Jockey pump', 'ac_fire', 'sp_b1_pump', 'v_safe', 'Grundfos', 'CR 5', 'operational', 'high', 2700, null, 28, 62_000_000],
  ['a_fap', 'Fire alarm panel', 'ac_fire', 'sp_hq_lobby', 'v_safe', 'Notifier', 'NFS2-3030', 'operational', 'critical', 1800, 365, 20, 240_000_000],
  ['a_spk', 'Sprinkler zone valve set', 'ac_fire', 'sp_b1_pump', 'v_safe', 'Viking', 'Series E', 'operational', 'critical', 2700, null, 60, 150_000_000],
  ['a_apar', 'Fire extinguishers (L1–L6)', 'ac_fire', 'sp_hq_lobby', 'v_safe', 'Yamato', 'ABC 6kg', 'operational', 'high', 700, null, 320, 52_000_000],
  ['a_booster', 'Domestic water booster set', 'ac_plumb', 'sp_b1_pump', 'v_aqua', 'Grundfos', 'Hydro MPC', 'operational', 'high', 2300, null, 75, 210_000_000],
  ['a_sewage', 'Sewage pump duty/standby', 'ac_plumb', 'sp_b1_pump', 'v_aqua', 'Ebara', 'DL-55', 'degraded', 'high', 2300, null, 140, 88_000_000],
  ['a_heater_pantry', 'Water heater — L5 pantry', 'ac_plumb', 'sp_f5_pantry', 'v_aqua', 'Ariston', 'Andris 30', 'down', 'low', 900, 90, null, 6_500_000],
  ['a_swc', 'Core switch', 'ac_it', 'sp_f2_server', 'v_net', 'Cisco', 'Catalyst 9500', 'operational', 'critical', 1100, 700, 45, 520_000_000],
  ['a_fw', 'Edge firewall pair', 'ac_it', 'sp_f2_server', 'v_net', 'Fortinet', 'FG-200F', 'operational', 'critical', 800, 900, 45, 280_000_000],
  ['a_ap_f3', 'Wi-Fi access points L3 (14)', 'ac_it', 'sp_f3_open', 'v_net', 'Aruba', 'AP-635', 'degraded', 'high', 600, 800, 45, 210_000_000],
  ['a_ap_f5', 'Wi-Fi access points L5 (18)', 'ac_it', 'sp_f5_open', 'v_net', 'Aruba', 'AP-635', 'operational', 'high', 600, 800, 45, 270_000_000],
  ['a_disp_bromo', 'Display & hybrid kit — Bromo', 'ac_it', 'sp_f5_bromo', 'v_net', 'Samsung', 'QM85 + Poly Studio X70', 'degraded', 'medium', 700, 380, null, 78_000_000],
  ['a_disp_boro', 'Display & hybrid kit — Borobudur', 'ac_it', 'sp_f3_borobudur', 'v_net', 'Samsung', 'QM75 + Poly Studio X50', 'operational', 'medium', 700, 380, null, 62_000_000],
  ['a_disp_raja', 'Boardroom AV system', 'ac_it', 'sp_f6_raja', 'v_net', 'Crestron', 'Flex UC', 'operational', 'high', 650, 450, null, 190_000_000],
  ['a_print_f5', 'MFP printer — L5', 'ac_it', 'sp_f5_open', undefined, 'Ricoh', 'IM C4510', 'operational', 'low', 1000, null, 20, 64_000_000],
  ['a_print_f6', 'MFP printer — L6', 'ac_it', 'sp_f6_open', undefined, 'Ricoh', 'IM C4510', 'degraded', 'low', 1000, null, 55, 64_000_000],
  ['a_nvr', 'CCTV NVR (96 cameras)', 'ac_sec', 'sp_f2_server', 'v_net', 'Hikvision', 'DS-96128', 'operational', 'high', 1200, 300, 80, 145_000_000],
  ['a_acs', 'Access control controllers', 'ac_sec', 'sp_hq_lobby', 'v_net', 'HID', 'VertX EVO', 'operational', 'high', 1200, 300, 80, 210_000_000],
  ['a_turn', 'Lobby speed gates (6)', 'ac_sec', 'sp_hq_lobby', 'v_net', 'Boon Edam', 'Speedlane', 'degraded', 'medium', 1200, null, 100, 480_000_000],
  ['a_door_f6', 'Door closer & maglock — L6 east', 'ac_sec', 'sp_f6_open', undefined, 'Dorma', 'TS 93', 'degraded', 'low', 1200, null, null, 8_000_000],
]

export const ASSETS: Asset[] = rows.map(([id, name, categoryId, spaceId, vendorId, manufacturer, model, status, criticality, ageDays, warrantyDays, lastService, purchaseCost], i) => ({
  id,
  tag: `AST-${String(i + 101).padStart(4, '0')}`,
  name, categoryId, spaceId, vendorId, manufacturer, model,
  serial: `${manufacturer.slice(0, 3).toUpperCase()}${(i * 7919 + 10453).toString(36).toUpperCase()}`,
  status, criticality,
  installedAt: ago(ageDays),
  warrantyUntil: warrantyDays == null ? undefined : ahead(warrantyDays),
  lastServiceAt: lastService == null ? undefined : ago(lastService),
  purchaseCost,
}))
