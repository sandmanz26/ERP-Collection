import type {
  Announcement, AssetCategory, Building, CannedResponse, Category, Contract, Space, Team, User, Vendor,
} from './types'

export const COMPANY = 'Nusantara Group'

export const TEAMS: Team[] = [
  { id: 'tm_fac', name: 'Facilities Engineering', description: 'HVAC, electrical, plumbing, lifts and building systems.', domain: 'facilities' },
  { id: 'tm_hk', name: 'Housekeeping', description: 'Cleaning, waste, pest control and consumables.', domain: 'facilities' },
  { id: 'tm_it', name: 'IT Service Desk', description: 'Devices, accounts, network and meeting-room tech.', domain: 'it' },
  { id: 'tm_sec', name: 'Security & Safety', description: 'Access control, CCTV, fire safety and incidents.', domain: 'security' },
  { id: 'tm_wp', name: 'Workplace Services', description: 'Moves, furniture, catering, parcels and visitors.', domain: 'workplace' },
]

export const USERS: User[] = [
  // managers
  { id: 'u_rina', name: 'Rina Kusuma', email: 'rina.kusuma@nusantara.example', role: 'manager', title: 'Head of Workplace & Facilities', dept: 'Workplace', phone: '+62 811-2000-101' },
  { id: 'u_dimas', name: 'Dimas Prakoso', email: 'dimas.prakoso@nusantara.example', role: 'manager', title: 'Building Manager', dept: 'Facilities', phone: '+62 811-2000-102', teamId: 'tm_fac' },
  // agents
  { id: 'u_budi', name: 'Budi Santoso', email: 'budi.santoso@nusantara.example', role: 'agent', title: 'HVAC Technician', dept: 'Facilities', phone: '+62 812-3000-201', teamId: 'tm_fac' },
  { id: 'u_agus', name: 'Agus Salim', email: 'agus.salim@nusantara.example', role: 'agent', title: 'Electrical Technician', dept: 'Facilities', phone: '+62 812-3000-202', teamId: 'tm_fac' },
  { id: 'u_wayan', name: 'Wayan Sudira', email: 'wayan.sudira@nusantara.example', role: 'agent', title: 'Housekeeping Lead', dept: 'Facilities', phone: '+62 812-3000-203', teamId: 'tm_hk' },
  { id: 'u_yoga', name: 'Yoga Pratama', email: 'yoga.pratama@nusantara.example', role: 'agent', title: 'IT Support Analyst', dept: 'IT', phone: '+62 812-3000-204', teamId: 'tm_it' },
  { id: 'u_fajar', name: 'Fajar Nugroho', email: 'fajar.nugroho@nusantara.example', role: 'agent', title: 'Network Engineer', dept: 'IT', phone: '+62 812-3000-205', teamId: 'tm_it' },
  { id: 'u_maya', name: 'Maya Lestari', email: 'maya.lestari@nusantara.example', role: 'agent', title: 'Security Supervisor', dept: 'Security', phone: '+62 812-3000-206', teamId: 'tm_sec' },
  { id: 'u_eko', name: 'Eko Prasetyo', email: 'eko.prasetyo@nusantara.example', role: 'agent', title: 'Workplace Coordinator', dept: 'Workplace', phone: '+62 812-3000-207', teamId: 'tm_wp' },
  // requesters
  { id: 'u_anisa', name: 'Anisa Putri', email: 'anisa.putri@nusantara.example', role: 'requester', title: 'Senior Product Designer', dept: 'Product', phone: '+62 813-4000-301', homeSpaceId: 'sp_f5_open' },
  { id: 'u_bayu', name: 'Bayu Anggara', email: 'bayu.anggara@nusantara.example', role: 'requester', title: 'Finance Controller', dept: 'Finance', phone: '+62 813-4000-302', homeSpaceId: 'sp_f6_open' },
  { id: 'u_citra', name: 'Citra Wulandari', email: 'citra.wulandari@nusantara.example', role: 'requester', title: 'HR Business Partner', dept: 'People', phone: '+62 813-4000-303', homeSpaceId: 'sp_f4_open' },
  { id: 'u_dewi', name: 'Dewi Maharani', email: 'dewi.maharani@nusantara.example', role: 'requester', title: 'Marketing Manager', dept: 'Marketing', phone: '+62 813-4000-304', homeSpaceId: 'sp_f3_open' },
  { id: 'u_erik', name: 'Erik Hartono', email: 'erik.hartono@nusantara.example', role: 'requester', title: 'Chief Operating Officer', dept: 'Executive', phone: '+62 813-4000-305', homeSpaceId: 'sp_f6_exec', vip: true },
  { id: 'u_farah', name: 'Farah Nabila', email: 'farah.nabila@nusantara.example', role: 'requester', title: 'Legal Counsel', dept: 'Legal', phone: '+62 813-4000-306', homeSpaceId: 'sp_f6_open' },
  { id: 'u_galih', name: 'Galih Saputra', email: 'galih.saputra@nusantara.example', role: 'requester', title: 'Software Engineer', dept: 'Engineering', phone: '+62 813-4000-307', homeSpaceId: 'sp_f5_open' },
  { id: 'u_hana', name: 'Hana Pertiwi', email: 'hana.pertiwi@nusantara.example', role: 'requester', title: 'Data Analyst', dept: 'Engineering', phone: '+62 813-4000-308', homeSpaceId: 'sp_f5_open' },
  { id: 'u_irfan', name: 'Irfan Maulana', email: 'irfan.maulana@nusantara.example', role: 'requester', title: 'Sales Lead', dept: 'Sales', phone: '+62 813-4000-309', homeSpaceId: 'sp_f3_open' },
  { id: 'u_jihan', name: 'Jihan Aulia', email: 'jihan.aulia@nusantara.example', role: 'requester', title: 'Procurement Officer', dept: 'Finance', phone: '+62 813-4000-310', homeSpaceId: 'sp_f6_open' },
  { id: 'u_kevin', name: 'Kevin Tanoto', email: 'kevin.tanoto@nusantara.example', role: 'requester', title: 'Account Executive', dept: 'Sales', phone: '+62 813-4000-311', homeSpaceId: 'sp_f3_open' },
  { id: 'u_laras', name: 'Laras Ayu', email: 'laras.ayu@nusantara.example', role: 'requester', title: 'Customer Success Lead', dept: 'Support', phone: '+62 813-4000-312', homeSpaceId: 'sp_a2_open' },
]

export const BUILDINGS: Building[] = [
  { id: 'b_hq', name: 'Menara Nusantara', code: 'HQ', address: 'Jl. Jenderal Sudirman Kav. 52, Jakarta', floors: 12 },
  { id: 'b_annex', name: 'Nusantara Annex', code: 'ANX', address: 'Jl. Senopati No. 18, Jakarta', floors: 4 },
]

const sp = (
  id: string, buildingId: string, floor: number, name: string, kind: Space['kind'], capacity = 0, bookable = false, amenities: string[] = [],
): Space => ({ id, buildingId, floor, name, kind, capacity, bookable, amenities })

export const SPACES: Space[] = [
  sp('sp_hq_lobby', 'b_hq', 1, 'Main lobby & reception', 'lobby', 60),
  sp('sp_f1_cafe', 'b_hq', 1, 'Ground café', 'pantry', 40),
  sp('sp_b1_park', 'b_hq', -1, 'Parking B1', 'parking', 120),
  sp('sp_b2_park', 'b_hq', -2, 'Parking B2', 'parking', 140),
  sp('sp_b1_genset', 'b_hq', -1, 'Genset & fuel room', 'technical'),
  sp('sp_b1_pump', 'b_hq', -1, 'Pump room', 'technical'),
  sp('sp_f2_server', 'b_hq', 2, 'Server room', 'technical'),
  sp('sp_f2_bunaken', 'b_hq', 2, 'Bunaken', 'meeting', 4, true, ['Display', 'Video call']),
  sp('sp_f2_open', 'b_hq', 2, 'Floor 2 — Operations', 'office', 60),
  sp('sp_f3_borobudur', 'b_hq', 3, 'Borobudur', 'meeting', 14, true, ['Display', 'Video call', 'Whiteboard', 'Catering']),
  sp('sp_f3_prambanan', 'b_hq', 3, 'Prambanan', 'meeting', 8, true, ['Display', 'Video call', 'Whiteboard']),
  sp('sp_f3_open', 'b_hq', 3, 'Floor 3 — Commercial', 'office', 80),
  sp('sp_f3_pantry', 'b_hq', 3, 'Floor 3 pantry', 'pantry', 12),
  sp('sp_f4_komodo', 'b_hq', 4, 'Komodo', 'meeting', 6, true, ['Display', 'Video call']),
  sp('sp_f4_rinjani', 'b_hq', 4, 'Rinjani', 'meeting', 4, true, ['Display']),
  sp('sp_f4_open', 'b_hq', 4, 'Floor 4 — People & Legal', 'office', 70),
  sp('sp_f5_bromo', 'b_hq', 5, 'Bromo', 'meeting', 20, true, ['Display', 'Video call', 'Whiteboard', 'Catering', 'Hybrid audio']),
  sp('sp_f5_toba', 'b_hq', 5, 'Toba', 'meeting', 10, true, ['Display', 'Video call', 'Whiteboard']),
  sp('sp_f5_open', 'b_hq', 5, 'Floor 5 — Product & Engineering', 'office', 120),
  sp('sp_f5_pantry', 'b_hq', 5, 'Floor 5 pantry', 'pantry', 14),
  sp('sp_f5_wc', 'b_hq', 5, 'Floor 5 restrooms', 'restroom'),
  sp('sp_f6_raja', 'b_hq', 6, 'Raja Ampat Boardroom', 'meeting', 16, true, ['Display', 'Video call', 'Hybrid audio', 'Catering']),
  sp('sp_f6_exec', 'b_hq', 6, 'Executive suite', 'office', 18),
  sp('sp_f6_open', 'b_hq', 6, 'Floor 6 — Finance & Procurement', 'office', 60),
  sp('sp_f6_wc', 'b_hq', 6, 'Floor 6 restrooms', 'restroom'),
  sp('sp_roof_chiller', 'b_hq', 12, 'Rooftop chiller plant', 'technical'),
  sp('sp_roof_lift', 'b_hq', 12, 'Lift machine room', 'technical'),
  sp('sp_a1_lobby', 'b_annex', 1, 'Annex reception', 'lobby', 20),
  sp('sp_a2_open', 'b_annex', 2, 'Annex 2 — Customer Success', 'office', 40),
  sp('sp_a2_meet', 'b_annex', 2, 'Senopati Room', 'meeting', 8, true, ['Display', 'Video call']),
  sp('sp_a3_training', 'b_annex', 3, 'Training Room', 'meeting', 30, true, ['Projector', 'Whiteboard', 'Catering', 'Hybrid audio']),
]

export const spaceLabel = (s: Space, buildings = BUILDINGS) => {
  const b = buildings.find((x) => x.id === s.buildingId)
  const fl = s.floor < 0 ? `B${Math.abs(s.floor)}` : `L${s.floor}`
  return `${b?.code ?? ''} · ${fl} · ${s.name}`
}

const cat = (
  id: string, name: string, domain: Category['domain'], teamId: string, kind: Category['kind'], defaultPriority: Category['defaultPriority'], icon: string, description: string, parentId?: string,
): Category => ({ id, name, domain, teamId, kind, defaultPriority, icon, description, parentId })

export const CATEGORIES: Category[] = [
  cat('c_hvac', 'Air conditioning', 'facilities', 'tm_fac', 'incident', 'p3', 'Snowflake', 'Too hot, too cold, noisy or leaking air conditioning'),
  cat('c_elec', 'Electrical & lighting', 'facilities', 'tm_fac', 'incident', 'p3', 'Zap', 'Power outages, sockets, lights and switches'),
  cat('c_plumb', 'Plumbing & water', 'facilities', 'tm_fac', 'incident', 'p3', 'Droplets', 'Leaks, blocked drains, taps and toilets'),
  cat('c_lift', 'Lifts', 'facilities', 'tm_fac', 'incident', 'p2', 'ArrowUpDown', 'Lift out of service, stuck, noisy or slow'),
  cat('c_clean', 'Cleaning & waste', 'facilities', 'tm_hk', 'request', 'p4', 'SprayCan', 'Spills, extra cleaning, bins and restroom supplies'),
  cat('c_pest', 'Pest control', 'facilities', 'tm_hk', 'incident', 'p3', 'Bug', 'Insects and rodents'),
  cat('c_furn', 'Furniture & fixtures', 'workplace', 'tm_wp', 'request', 'p4', 'Armchair', 'Chairs, desks, lockers and blinds'),
  cat('c_door', 'Doors & access hardware', 'security', 'tm_sec', 'incident', 'p3', 'DoorClosed', 'Door closers, locks and turnstiles'),
  cat('c_it_hw', 'Laptop & hardware', 'it', 'tm_it', 'incident', 'p3', 'Laptop', 'Laptops, monitors, peripherals'),
  cat('c_it_net', 'Network & Wi-Fi', 'it', 'tm_it', 'incident', 'p2', 'Wifi', 'Wi-Fi, LAN ports and VPN'),
  cat('c_it_sw', 'Software & accounts', 'it', 'tm_it', 'incident', 'p3', 'KeyRound', 'Passwords, licences and application access'),
  cat('c_it_av', 'Meeting-room AV', 'it', 'tm_it', 'incident', 'p3', 'MonitorPlay', 'Displays, cameras, microphones and cables'),
  cat('c_it_print', 'Printing', 'it', 'tm_it', 'incident', 'p4', 'Printer', 'Printers, scanners and toner'),
  cat('c_it_new', 'New starter equipment', 'it', 'tm_it', 'request', 'p3', 'PackagePlus', 'Laptop and accounts for a new joiner'),
  cat('c_card', 'Access card', 'security', 'tm_sec', 'request', 'p3', 'IdCard', 'New, lost or not working building access cards'),
  cat('c_safety', 'Safety hazard', 'security', 'tm_sec', 'incident', 'p2', 'ShieldAlert', 'Anything that could hurt someone'),
  cat('c_lost', 'Lost & found', 'security', 'tm_sec', 'request', 'p4', 'Search', 'Report or claim a lost item'),
  cat('c_move', 'Desk or space move', 'workplace', 'tm_wp', 'request', 'p4', 'MoveRight', 'Change seats, reserve a project area'),
  cat('c_cater', 'Catering & pantry', 'workplace', 'tm_wp', 'request', 'p4', 'Coffee', 'Event catering, pantry restocking'),
  cat('c_parcel', 'Parcels & courier', 'workplace', 'tm_wp', 'request', 'p4', 'Package', 'Incoming and outgoing parcels'),
  cat('c_park', 'Parking', 'workplace', 'tm_wp', 'request', 'p4', 'CircleParking', 'Parking permits and issues'),
]

export const ASSET_CATEGORIES: AssetCategory[] = [
  { id: 'ac_hvac', name: 'HVAC', icon: 'Snowflake' },
  { id: 'ac_elec', name: 'Electrical', icon: 'Zap' },
  { id: 'ac_plumb', name: 'Plumbing & pumps', icon: 'Droplets' },
  { id: 'ac_lift', name: 'Vertical transport', icon: 'ArrowUpDown' },
  { id: 'ac_fire', name: 'Fire & life safety', icon: 'Flame' },
  { id: 'ac_it', name: 'IT & AV', icon: 'MonitorPlay' },
  { id: 'ac_sec', name: 'Security systems', icon: 'ShieldCheck' },
]

export const VENDORS: Vendor[] = [
  { id: 'v_cool', name: 'CoolTech Mechanical', trade: 'HVAC', contact: 'Hendro', phone: '+62 21 555 0101', email: 'service@cooltech.example', rating: 4.4, responseHours: 4 },
  { id: 'v_volt', name: 'Voltaris Electrical', trade: 'Electrical', contact: 'Sari', phone: '+62 21 555 0102', email: 'ops@voltaris.example', rating: 4.1, responseHours: 6 },
  { id: 'v_vertex', name: 'Vertex Lift Services', trade: 'Lifts', contact: 'Panji', phone: '+62 21 555 0103', email: 'dispatch@vertexlift.example', rating: 3.7, responseHours: 2 },
  { id: 'v_safe', name: 'SafeGuard Fire Systems', trade: 'Fire safety', contact: 'Lina', phone: '+62 21 555 0104', email: 'contracts@safeguard.example', rating: 4.6, responseHours: 8 },
  { id: 'v_aqua', name: 'AquaFlow Plumbing', trade: 'Plumbing', contact: 'Tono', phone: '+62 21 555 0105', email: 'hello@aquaflow.example', rating: 4.0, responseHours: 5 },
  { id: 'v_spark', name: 'Sparkle Clean Services', trade: 'Cleaning', contact: 'Yanti', phone: '+62 21 555 0106', email: 'ops@sparkle.example', rating: 4.3, responseHours: 3 },
  { id: 'v_net', name: 'NetBridge Solutions', trade: 'IT & network', contact: 'Rizal', phone: '+62 21 555 0107', email: 'support@netbridge.example', rating: 4.5, responseHours: 4 },
  { id: 'v_pest', name: 'PestAway Indonesia', trade: 'Pest control', contact: 'Gita', phone: '+62 21 555 0108', email: 'book@pestaway.example', rating: 4.2, responseHours: 24 },
]

const yr = (offsetDays: number) => new Date(Date.now() + offsetDays * 86_400_000).toISOString()

export const CONTRACTS: Contract[] = [
  { id: 'ct_cool', vendorId: 'v_cool', title: 'Chiller & AHU maintenance', startsAt: yr(-300), endsAt: yr(65), annualValue: 480_000_000, scope: 'Quarterly PM of chillers, cooling towers and AHUs; 4h emergency response.', autoRenew: true },
  { id: 'ct_volt', vendorId: 'v_volt', title: 'Electrical & genset maintenance', startsAt: yr(-200), endsAt: yr(165), annualValue: 360_000_000, scope: 'Monthly genset test, semi-annual panel thermography, UPS battery checks.', autoRenew: false },
  { id: 'ct_vertex', vendorId: 'v_vertex', title: 'Lift full-maintenance contract', startsAt: yr(-500), endsAt: yr(21), annualValue: 620_000_000, scope: 'Monthly service on 6 passenger lifts; 2h entrapment response.', autoRenew: false },
  { id: 'ct_safe', vendorId: 'v_safe', title: 'Fire systems inspection', startsAt: yr(-120), endsAt: yr(245), annualValue: 210_000_000, scope: 'Quarterly sprinkler, pump and detector tests; annual APAR refill.', autoRenew: true },
  { id: 'ct_aqua', vendorId: 'v_aqua', title: 'Plumbing call-out retainer', startsAt: yr(-60), endsAt: yr(305), annualValue: 96_000_000, scope: 'On-call plumbing and pump servicing.', autoRenew: true },
  { id: 'ct_spark', vendorId: 'v_spark', title: 'Housekeeping outsourcing', startsAt: yr(-400), endsAt: yr(-4), annualValue: 840_000_000, scope: '24 cleaners, 2 supervisors, consumables.', autoRenew: false },
  { id: 'ct_net', vendorId: 'v_net', title: 'Network managed service', startsAt: yr(-90), endsAt: yr(275), annualValue: 264_000_000, scope: 'Wi-Fi, switching, firewall monitoring.', autoRenew: true },
  { id: 'ct_pest', vendorId: 'v_pest', title: 'Monthly pest control', startsAt: yr(-30), endsAt: yr(335), annualValue: 48_000_000, scope: 'Monthly treatment, rodent traps, on-demand visits.', autoRenew: true },
]

export const CANNED: CannedResponse[] = [
  { id: 'cr_ack', title: 'Acknowledge', body: 'Hi {{name}}, thanks for reporting this. I have picked it up and will update you shortly.' },
  { id: 'cr_onway', title: 'Technician on the way', body: 'Hi {{name}}, a technician is on the way to you now. Please make sure someone can give access to the area.' },
  { id: 'cr_info', title: 'Need more information', body: 'Hi {{name}}, could you share a photo and the exact location (floor and nearest column or room)? That will help us send the right person first time.' },
  { id: 'cr_vendor', title: 'Waiting for vendor', body: 'Hi {{name}}, this needs our specialist vendor. They have been booked and we will update you as soon as they have confirmed an arrival time.' },
  { id: 'cr_resolved', title: 'Resolved — please confirm', body: 'Hi {{name}}, the work is done. Could you confirm it is fixed on your side? If we do not hear back in 3 working days we will close this ticket.' },
  { id: 'cr_kb', title: 'Point to knowledge article', body: 'Hi {{name}}, this looks like something our knowledge base covers — see the linked article for step-by-step instructions. Let us know if it does not work and we will take over.' },
]

export const ANNOUNCEMENTS: Announcement[] = [
  { id: 'an_1', title: 'Lift 3 scheduled service — Saturday 06:00–12:00', body: 'Lift 3 will be out of service for its monthly maintenance. Please use lifts 1, 2 and 4.', tone: 'info', at: new Date().toISOString(), buildingId: 'b_hq' },
  { id: 'an_2', title: 'Fire drill next Wednesday at 10:30', body: 'Floor wardens will brief teams on Tuesday. Assembly point is the Sudirman forecourt.', tone: 'warning', at: new Date().toISOString() },
]
