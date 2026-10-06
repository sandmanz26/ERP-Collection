import type { KbArticle } from './types'

const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString()

export const KB: KbArticle[] = [
  {
    id: 'kb_wifi', title: 'Connect to the office Wi-Fi (staff and guests)', categoryId: 'c_it_net',
    summary: 'Which network to join, how to sign in and what to do when it keeps dropping.', views: 1840, helpful: 212, notHelpful: 14, updatedAt: ago(12), authorId: 'u_fajar', audience: 'everyone',
    body: [
      '## Staff devices',
      'Join **NUSANTARA-CORP** and sign in with your work email and password. Your device is remembered for 90 days.',
      '## Guests',
      '- Join **NUSANTARA-GUEST**',
      '- Open any web page and enter the 6-digit code from your host (hosts see it in Visitors → pass)',
      '- Guest access lasts for the day of the visit',
      '## If it keeps dropping',
      '- Forget the network and join again',
      '- Turn off any VPN client for a minute and test again',
      '- Note the floor and nearest meeting room and raise a Network & Wi-Fi ticket — we can see which access point you were on',
    ],
  },
  {
    id: 'kb_pwd', title: 'Reset your password or unlock your account', categoryId: 'c_it_sw',
    summary: 'Self-service password reset in under two minutes.', views: 2310, helpful: 301, notHelpful: 9, updatedAt: ago(30), authorId: 'u_yoga', audience: 'everyone',
    body: [
      'Go to the company sign-in page and choose **Forgot password**. You will receive a code on the phone number registered with HR.',
      '## Still locked out?',
      '- Accounts lock after 5 wrong attempts and unlock automatically after 30 minutes',
      '- If you changed phone number recently, raise a Software & accounts ticket so we can verify you in person',
      'Never share your code with anyone — the IT Service Desk will never ask for it.',
    ],
  },
  {
    id: 'kb_vpn', title: 'Set up the VPN on your laptop', categoryId: 'c_it_net',
    summary: 'Install the client, sign in with MFA and fix the usual connection errors.', views: 960, helpful: 120, notHelpful: 22, updatedAt: ago(45), authorId: 'u_fajar', audience: 'everyone',
    body: [
      '- Install **Company VPN** from the Self-Service app store',
      '- Server address: `vpn.nusantara.example`',
      '- Sign in with your work email, then approve the push notification on your phone',
      '## Error 809 / timeout',
      'Your home router is blocking the tunnel. Switch to the mobile hotspot to confirm, then ask the Service Desk to move you to the TCP fallback profile.',
    ],
  },
  {
    id: 'kb_ac', title: 'The office is too hot or too cold', categoryId: 'c_hvac',
    summary: 'What we can adjust, how long it takes and when to raise a ticket.', views: 1520, helpful: 168, notHelpful: 41, updatedAt: ago(8), authorId: 'u_budi', audience: 'everyone',
    body: [
      'The building is held at **23–25 °C** on weekdays. Individual comfort differs, so before raising a ticket:',
      '- Check the thermostat or remote on your zone is on **Auto**, 24 °C',
      '- Make sure nothing is blocking the vents or the return grille',
      '- Ask neighbours — if several people feel the same, it is probably a zone fault',
      '## Raise a ticket when',
      '- The room is above 27 °C or below 21 °C for over an hour',
      '- There is water dripping from a unit, or a burning smell (call Security on ext. 100 immediately)',
      'After-hours cooling is available on request — raise an *After-hours AC* request at least one working day ahead.',
    ],
  },
  {
    id: 'kb_room', title: 'Book a meeting room', categoryId: 'c_it_av',
    summary: 'Find a free room, add catering and release it if plans change.', views: 2090, helpful: 276, notHelpful: 8, updatedAt: ago(20), authorId: 'u_eko', audience: 'everyone',
    body: [
      'Open **Book a room**, pick the day and filter by capacity or equipment. Free slots are shown in green.',
      '- Rooms hold for 15 minutes — if nobody checks in, they are released automatically',
      '- Boardroom and training room bookings need a team lead approval',
      '- Add catering at least 24 hours ahead from the booking details',
      '## Release a room you no longer need',
      'Open **My bookings** and choose Cancel. It helps everyone — rooms are at 80% utilisation on Tuesdays and Wednesdays.',
    ],
  },
  {
    id: 'kb_visitor', title: 'Register a visitor before they arrive', categoryId: 'c_card',
    summary: 'Pre-registration gets your guest through reception in under a minute.', views: 1330, helpful: 144, notHelpful: 6, updatedAt: ago(15), authorId: 'u_eko', audience: 'everyone',
    body: [
      'Go to **Visitors → Invite a visitor** and enter their name, company and arrival time.',
      '- Your guest receives an email with a QR pass and directions',
      '- Reception scans the QR code on arrival and you are notified instantly',
      '- Delivery drivers and contractors need a separate **Contractor induction** — raise a Workplace request',
      'Visitors must wear their pass visibly and be accompanied above the 3rd floor.',
    ],
  },
  {
    id: 'kb_card', title: 'Lost or faulty access card', categoryId: 'c_card',
    summary: 'Block a lost card immediately and get a replacement the same day.', views: 870, helpful: 99, notHelpful: 4, updatedAt: ago(60), authorId: 'u_maya', audience: 'everyone',
    body: [
      '## Lost or stolen',
      'Raise an **Access card** ticket straight away — the old card is blocked within 15 minutes. Collect a temporary pass at reception with your ID.',
      '## Not opening a door',
      '- Check the reader light turns green for other colleagues',
      '- If only your card fails, your access group may have changed — mention the door location in the ticket',
      'A replacement card is free the first time and costs Rp 50,000 afterwards (deducted automatically).',
    ],
  },
  {
    id: 'kb_print', title: 'Add a network printer on Windows or Mac', categoryId: 'c_it_print',
    summary: 'Self-service install of the floor printers.', views: 740, helpful: 71, notHelpful: 18, updatedAt: ago(90), authorId: 'u_yoga', audience: 'everyone',
    body: [
      'Open the **Self-Service** app and search for the printer name on the label (for example *PRN-L5-01*).',
      '- Choose **Install** and wait for the confirmation toast',
      '- Release your job at any printer with your access card',
      'If a printer shows an error code, photograph the screen and attach it to the ticket.',
    ],
  },
  {
    id: 'kb_priority', title: 'How we prioritise tickets', categoryId: 'c_safety',
    summary: 'What Critical, High, Medium and Low mean and the response you can expect.', views: 640, helpful: 88, notHelpful: 3, updatedAt: ago(5), authorId: 'u_rina', audience: 'everyone',
    body: [
      '- **Critical** — safety risk or a whole floor/service is down. Response in 15 minutes, 24/7',
      '- **High** — a team cannot work or a key facility is unavailable. Response in 1 hour',
      '- **Medium** — individual impact with a workaround. Response in 4 working hours',
      '- **Low** — questions, requests and cosmetic issues. Response in 8 working hours',
      'You choose the impact; our team confirms the priority. If you think something is more urgent than we have set it, add a comment and tell us why.',
    ],
  },
  {
    id: 'kb_afterhours', title: 'Request after-hours air conditioning or lighting', categoryId: 'c_hvac',
    summary: 'Work late or on weekends? Book the floor ahead so the building is ready.', views: 520, helpful: 62, notHelpful: 5, updatedAt: ago(40), authorId: 'u_dimas', audience: 'everyone',
    body: [
      'Raise an **After-hours services** request at least **one working day ahead** with the floor, date and hours.',
      '- Charged per floor per hour to your cost centre (Rp 450,000)',
      '- Weekend bookings are confirmed by the Building Manager by 15:00 on Friday',
    ],
  },
  {
    id: 'kb_evac', title: 'Fire alarm and evacuation procedure', categoryId: 'c_safety',
    summary: 'What to do when the alarm sounds and where to assemble.', views: 1210, helpful: 190, notHelpful: 2, updatedAt: ago(25), authorId: 'u_maya', audience: 'everyone',
    body: [
      '- Stop what you are doing and leave belongings behind',
      '- Use the **stairs**, not the lifts, following your floor warden',
      '- Assemble at the **Sudirman forecourt** (Annex staff: Senopati car park)',
      '- Do not return until Security gives the all-clear',
      'Know your nearest exit — floor plans are posted by every lift lobby.',
    ],
  },
  {
    id: 'kb_lift', title: 'A lift is out of service or you are stuck inside', categoryId: 'c_lift',
    summary: 'Stay calm, press the intercom, and what happens next.', views: 430, helpful: 52, notHelpful: 1, updatedAt: ago(70), authorId: 'u_dimas', audience: 'everyone',
    body: [
      '## If you are inside a stuck lift',
      '- Press and hold the **intercom** button — Security answers 24/7',
      '- Do not try to open the doors or climb out',
      '- A technician is dispatched immediately; typical release time is 20 minutes',
      '## If a lift is simply out of service',
      'Raise a Lift ticket with the lift number. We publish planned downtime on the home page.',
    ],
  },
  {
    id: 'kb_parking', title: 'Apply for a parking permit', categoryId: 'c_park',
    summary: 'Monthly permits, motorbikes and visitor parking.', views: 690, helpful: 74, notHelpful: 12, updatedAt: ago(33), authorId: 'u_eko', audience: 'everyone',
    body: [
      'Submit a **Parking** request with your vehicle plate and STNK. Permits are issued from the 1st of each month.',
      '- Cars: B1/B2, Rp 1,200,000 per month',
      '- Motorbikes: B2, Rp 250,000 per month',
      '- Visitors: register them in advance to get a validated exit ticket',
    ],
  },
  {
    id: 'kb_agent_pm', title: 'Technician guide: closing a preventive work order', categoryId: 'c_hvac',
    summary: 'Checklist, readings, photos and the 5-minute close-out routine.', views: 210, helpful: 31, notHelpful: 0, updatedAt: ago(18), authorId: 'u_dimas', audience: 'staff',
    body: [
      '- Tick every checklist line — abnormal findings need a note and a photo',
      '- Log your time as you go, not at the end of the shift',
      '- Record parts used with quantity; costs flow to the asset history',
      '- If you find a defect that cannot be fixed on the spot, use **Raise ticket from finding** so it gets its own SLA',
    ],
  },
  {
    id: 'kb_agent_sla', title: 'Agent guide: pausing the SLA clock correctly', categoryId: 'c_safety',
    summary: 'When Pending is legitimate and when it is not.', views: 180, helpful: 26, notHelpful: 1, updatedAt: ago(9), authorId: 'u_rina', audience: 'staff',
    body: [
      'Set a ticket to **Pending** only when the next move is genuinely with someone else:',
      '- **Requester** — you asked a question and need the answer',
      '- **Vendor** — a work order is with a contractor',
      '- **Parts** — the part is on order',
      'Always add a comment saying what you are waiting for. Pending tickets with no activity for 3 days are flagged to your supervisor.',
    ],
  },
]
