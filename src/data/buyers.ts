/**
 * Overseas buyers.
 *
 * The seeded book started with every job shipping from a customer to one of that
 * same customer's own offices. That is a real pattern — an exporter with a
 * distribution arm abroad — but it cannot be the *only* pattern, because a
 * commercial invoice where the seller and the buyer are the same legal entity is
 * not a document a bank would look at twice.
 *
 * So each destination country gets a real buyer, and jobs are consigned to the
 * buyer in their destination country.
 */
import type { Customer, CountryOffice } from './types'

const office = (
  customerId: string,
  id: string,
  name: string,
  countryCode: string,
  country: string,
  city: string,
  port: [string, string],
  addressLine: string,
  customsId: string,
  contact: { name: string; title: string; email: string; phone: string },
): CountryOffice => ({
  id, customerId, name, countryCode, country, city,
  portCode: port[0], portName: port[1],
  addressLine, customsId,
  roles: ['CONSIGNEE', 'NOTIFY'],
  isHeadquarter: true,
  isBillingOffice: true,
  active: true,
  contacts: [{ id: `${id}_c1`, ...contact, isPrimary: true }],
})

const buyer = (
  id: string,
  code: string,
  legalName: string,
  industry: string,
  o: CountryOffice,
  incoterm: Customer['defaultIncoterm'],
  term: Customer['defaultPaymentTerm'],
  salesOwner: string,
): Customer => ({
  id, code, legalName,
  tradeName: legalName.split(' ').slice(0, 2).join(' '),
  industry,
  roles: ['CONSIGNEE', 'NOTIFY'],
  status: 'ACTIVE',
  riskRating: 'LOW',
  creditLimit: 0,
  creditCurrency: 'USD',
  creditTermDays: 0,
  outstandingAr: 0,
  defaultIncoterm: incoterm,
  defaultPaymentTerm: term,
  salesOwner,
  onboardedAt: '2024-06-01',
  notes: 'Consignee only — billed through the Indonesian shipper, no credit facility with us.',
  offices: [o],
})

export const buyers: Customer[] = [
  buyer('cus_b1', 'CUS-0101', 'Van der Meer Wonen B.V.', 'Furniture retail',
    office('cus_b1', 'off_b1', 'Rotterdam Head Office', 'NL', 'Netherlands', 'Rotterdam',
      ['NLRTM', 'Rotterdam'], 'Waalhaven Oostzijde 84, 3087 BM Rotterdam', 'EORI NL823114596',
      { name: 'Joost van der Meer', title: 'Purchasing Director', email: 'joost@vdmwonen.nl', phone: '+31 10 428 7710' }),
    'FOB', 'LC_AT_SIGHT', 'Sofia Reyes'),

  buyer('cus_b2', 'CUS-0102', 'Yokohama Gomu Shoji K.K.', 'Rubber trading',
    office('cus_b2', 'off_b2', 'Yokohama Office', 'JP', 'Japan', 'Yokohama',
      ['JPYOK', 'Yokohama'], '2-14-1 Kaigan-dori, Naka-ku, Yokohama 231-0002', 'JP 7020001033118',
      { name: 'Kenji Watanabe', title: 'Import Manager', email: 'watanabe@ygs.co.jp', phone: '+81 45 211 6620' }),
    'CIF', 'LC_AT_SIGHT', 'David Chen'),

  buyer('cus_b3', 'CUS-0103', 'Southern Cross Homewares Pty Ltd', 'Homeware retail',
    office('cus_b3', 'off_b3', 'Sydney Distribution', 'AU', 'Australia', 'Sydney',
      ['AUSYD', 'Sydney'], '14 Bourke Road, Alexandria NSW 2015', 'ABN 61 004 218 907',
      { name: 'Fiona Brady', title: 'Category Buyer', email: 'fiona@sxhomewares.com.au', phone: '+61 2 9310 4488' }),
    'DAP', 'NET_30', 'Sofia Reyes'),

  buyer('cus_b4', 'CUS-0104', 'Hanseatische Kaffee Handel GmbH', 'Coffee importer',
    office('cus_b4', 'off_b4', 'Hamburg Trading Floor', 'DE', 'Germany', 'Hamburg',
      ['DEHAM', 'Hamburg'], 'Sandtorkai 62, 20457 Hamburg', 'EORI DE517742093',
      { name: 'Anke Brandt', title: 'Green Coffee Buyer', email: 'a.brandt@hkh-kaffee.de', phone: '+49 40 3037 1180' }),
    'FOB', 'LC_AT_SIGHT', 'Sofia Reyes'),

  buyer('cus_b5', 'CUS-0105', 'Shanghai Hongyuan Electronics Co. Ltd', 'Electronics assembly',
    office('cus_b5', 'off_b5', 'Pudong Plant', 'CN', 'China', 'Shanghai',
      ['CNSHA', 'Shanghai'], 'No. 1128 Jinhai Road, Pudong New District, Shanghai 201206', 'CN 91310115MA1K3',
      { name: 'Li Wei', title: 'Supply Chain Lead', email: 'liwei@hongyuan-elec.cn', phone: '+86 21 5899 3300' }),
    'FCA', 'NET_30', 'David Chen'),

  buyer('cus_b6', 'CUS-0106', 'Busan Seongjin Trading Co.', 'Commodity trading',
    office('cus_b6', 'off_b6', 'Busan Office', 'KR', 'South Korea', 'Busan',
      ['KRPUS', 'Busan'], '1211 Jungang-daero, Dong-gu, Busan 48821', 'KR 605-81-42117',
      { name: 'Park Ji-ho', title: 'Import Team Leader', email: 'jhpark@seongjin.co.kr', phone: '+82 51 462 7700' }),
    'CIF', 'LC_AT_SIGHT', 'David Chen'),

  buyer('cus_b7', 'CUS-0107', 'Al Faris Building Materials LLC', 'Stone and construction supply',
    office('cus_b7', 'off_b7', 'Jebel Ali Yard', 'AE', 'United Arab Emirates', 'Dubai',
      ['AEJEA', 'Jebel Ali'], 'Warehouse 14, Jebel Ali Industrial Area 1, Dubai', 'TRN 100427861900003',
      { name: 'Omar Al Faris', title: 'Managing Partner', email: 'omar@alfarisbm.ae', phone: '+971 4 883 5510' }),
    'CFR', 'NET_45', 'Priya Nair'),

  buyer('cus_b8', 'CUS-0108', 'Coastline Apparel Group Inc.', 'Apparel wholesale',
    office('cus_b8', 'off_b8', 'Long Beach Warehouse', 'US', 'United States', 'Los Angeles',
      ['USLAX', 'Los Angeles'], '2400 E Anaheim Street, Long Beach, CA 90804', 'EIN 95-4471203',
      { name: 'Marisol Ortega', title: 'Director of Sourcing', email: 'mortega@coastlineapparel.com', phone: '+1 562 435 2200' }),
    'FOB', 'NET_30', 'Sofia Reyes'),

  buyer('cus_b9', 'CUS-0109', 'Saigon Precision Components JSC', 'Electronics manufacturing',
    office('cus_b9', 'off_b9', 'Cat Lai Plant', 'VN', 'Vietnam', 'Ho Chi Minh City',
      ['VNSGN', 'Cat Lai'], 'Lot C3, Cat Lai Industrial Park, Thu Duc, Ho Chi Minh City', 'VN 0312886471',
      { name: 'Tran Minh Duc', title: 'Procurement Manager', email: 'duc.tran@saigonprecision.vn', phone: '+84 28 3742 6600' }),
    'FCA', 'NET_30', 'David Chen'),
]

export const buyerForCountry = (code: string) => buyers.find((b) => b.offices[0].countryCode === code)
