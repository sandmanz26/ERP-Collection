-- Kriyanusa ERP — proposed PostgreSQL schema (target, not yet deployed)
-- Generated from src/data/types.ts. Display-only copies (buyerName, supplierName, poCode ...)
-- are dropped: resolve them with JOINs.  Order matters little: add FKs after table creation if needed.

CREATE TABLE user_accounts (
  id                        uuid PRIMARY KEY,
  email                     text NOT NULL,
  password                  text NOT NULL,
  full_name                 text NOT NULL,
  job_title                 text NOT NULL,
  role                      text NOT NULL CHECK (role IN ('ADMIN', 'SALES', 'ESTIMATOR', 'PURCHASING', 'WAREHOUSE', 'PRODUCTION', 'FINANCE', 'EXPORT', 'VIEWER')),
  status                    text NOT NULL CHECK (status IN ('ACTIVE', 'PENDING_VERIFICATION', 'INVITED', 'LOCKED', 'SUSPENDED')),
  department                text,
  phone                     text,
  failed_attempts           integer NOT NULL,
  locked_until              timestamptz,
  last_login_at             timestamptz,
  must_change_password      boolean NOT NULL,
  two_factor_enabled        boolean NOT NULL,
  created_at                timestamptz NOT NULL
);

CREATE TABLE password_reset_tokens (
  token                     text PRIMARY KEY,
  email                     text NOT NULL,
  issued_at                 timestamptz NOT NULL,
  expires_at                timestamptz NOT NULL,
  used                      boolean NOT NULL
);

CREATE TABLE company_profile (
  id                        smallint PRIMARY KEY,
  legal_name                text NOT NULL,
  trading_name              text NOT NULL,
  tax_id                    text NOT NULL,
  registration_no           text NOT NULL,
  exporter_id               text NOT NULL,
  founded_year              integer NOT NULL,
  address_line              text NOT NULL,
  city                      text NOT NULL,
  province                  text NOT NULL,
  country_code              text NOT NULL,
  phone                     text NOT NULL,
  email                     text NOT NULL,
  website                   text NOT NULL,
  workshop_count            integer NOT NULL,
  headcount                 integer NOT NULL
);

CREATE TABLE company_licences (
  company_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  kind                      text NOT NULL CHECK (kind IN ('BUSINESS_REGISTRATION', 'TAX_REGISTRATION', 'EXPORTER_ID', 'SVLK', 'FSC_COC', 'ISPM15_FUMIGATION', 'INDUSTRIAL_PERMIT', 'ENVIRONMENTAL', 'MEMBERSHIP')),
  reference                 text NOT NULL,
  issuer                    text NOT NULL,
  issued_at                 timestamptz NOT NULL,
  expires_at                timestamptz NOT NULL,
  note                      text,
  FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE
);

CREATE TABLE bank_accounts (
  company_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  bank_name                 text NOT NULL,
  account_no                text NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  swift                     text,
  primary                   boolean,
  FOREIGN KEY (company_id) REFERENCES company_profile(id) ON DELETE CASCADE
);

CREATE TABLE buyers (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  legal_name                text NOT NULL,
  trading_name              text NOT NULL,
  segment                   text NOT NULL CHECK (segment IN ('RETAIL_CHAIN', 'WHOLESALER', 'IMPORTER', 'INTERIOR_STUDIO', 'HOSPITALITY', 'ECOMMERCE')),
  status                    text NOT NULL CHECK (status IN ('PROSPECT', 'ACTIVE', 'ON_HOLD', 'DORMANT', 'BLACKLISTED')),
  country_code              text NOT NULL,
  country_name              text NOT NULL,
  city                      text NOT NULL,
  address_line              text NOT NULL,
  destination_port          text NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  default_incoterm          text NOT NULL CHECK (default_incoterm IN ('EXW', 'FOB', 'FCA', 'CFR', 'CIF', 'DAP', 'DDP')),
  payment_term              text NOT NULL CHECK (payment_term IN ('TT_30_70', 'TT_50_50', 'TT_100_ADVANCE', 'LC_AT_SIGHT', 'LC_60_DAYS', 'DP_60_DAYS', 'OPEN_ACCOUNT_45')),
  credit_limit              numeric(18,4) NOT NULL,
  outstanding               numeric(18,4) NOT NULL,
  requires_fsc              boolean NOT NULL,
  requires_eudr_dds         boolean NOT NULL,
  requires_lab_test         boolean NOT NULL,
  quality_standard          text NOT NULL,
  customer_since            timestamptz NOT NULL,
  owner_id                  uuid NOT NULL,
  owner_name                text NOT NULL,
  note                      text
);

CREATE TABLE buyer_contacts (
  buyer_id                  uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  name                      text NOT NULL,
  role                      text NOT NULL,
  email                     text NOT NULL,
  phone                     text NOT NULL,
  primary                   boolean,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE CASCADE
);

CREATE TABLE suppliers (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  name                      text NOT NULL,
  type                      text NOT NULL CHECK (type IN ('SAWMILL', 'PANEL', 'HARDWARE', 'FINISHING', 'UPHOLSTERY', 'PACKAGING', 'SUBCON_WORKSHOP', 'SERVICE', 'LOGISTICS')),
  status                    text NOT NULL CHECK (status IN ('ACTIVE', 'PROBATION', 'ON_HOLD', 'BLACKLISTED')),
  city                      text NOT NULL,
  province                  text NOT NULL,
  address_line              text NOT NULL,
  tax_id                    text NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  payment_term_days         integer NOT NULL,
  lead_time_days            integer NOT NULL,
  quality_score             integer NOT NULL,
  on_time_score             integer NOT NULL,
  price_score               integer NOT NULL,
  svlk_certified            boolean NOT NULL,
  svlk_number               text,
  svlk_expires_at           timestamptz,
  fsc_certified             boolean NOT NULL,
  fsc_number                text,
  fsc_expires_at            timestamptz,
  bank_name                 text,
  bank_account_no           text,
  since                     timestamptz NOT NULL,
  note                      text
);

CREATE TABLE supplier_contacts (
  supplier_id               uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  name                      text NOT NULL,
  role                      text NOT NULL,
  email                     text NOT NULL,
  phone                     text NOT NULL,
  primary                   boolean,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE items (
  id                        uuid PRIMARY KEY,
  sku                       text NOT NULL,
  name                      text NOT NULL,
  category                  text NOT NULL CHECK (category IN ('TIMBER', 'PANEL', 'HARDWARE', 'FINISHING', 'UPHOLSTERY', 'PACKAGING', 'CONSUMABLE', 'COMPONENT', 'FINISHED_GOOD')),
  status                    text NOT NULL CHECK (status IN ('ACTIVE', 'RESTRICTED', 'PHASING_OUT', 'DISCONTINUED')),
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  species                   text NOT NULL CHECK (species IN ('TEAK', 'MAHOGANY', 'ACACIA', 'MINDI', 'PINE', 'RUBBERWOOD', 'SUAR', 'NONE')),
  grade                     text,
  cbm_per_unit              numeric(18,4) NOT NULL,
  weight_kg                 numeric(18,4) NOT NULL,
  standard_cost             numeric(18,4) NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  default_supplier_id       uuid,
  lead_time_days            integer NOT NULL,
  min_stock                 numeric(18,4) NOT NULL,
  reorder_point             numeric(18,4) NOT NULL,
  max_stock                 numeric(18,4) NOT NULL,
  hs_code                   text,
  legality_controlled       boolean NOT NULL,
  note                      text,
  FOREIGN KEY (default_supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE warehouses (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  name                      text NOT NULL,
  type                      text NOT NULL CHECK (type IN ('RAW_MATERIAL', 'KILN_DRY', 'WORK_IN_PROGRESS', 'FINISHED_GOODS', 'SUBCON', 'QUARANTINE')),
  city                      text NOT NULL,
  address_line              text NOT NULL,
  capacity_m3               numeric(18,4) NOT NULL,
  manager_name              text NOT NULL,
  supplier_id               uuid,
  active                    boolean NOT NULL,
  note                      text,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE storage_bins (
  id                        uuid PRIMARY KEY,
  warehouse_id              uuid NOT NULL,
  code                      text NOT NULL,
  zone                      text NOT NULL,
  description               text NOT NULL,
  capacity_m3               numeric(18,4) NOT NULL,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

CREATE TABLE projects (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  name                      text NOT NULL,
  buyer_id                  uuid NOT NULL,
  stage                     text NOT NULL CHECK (stage IN ('INQUIRY', 'NEGOTIATION', 'SAMPLING', 'QUOTED', 'ORDER_CONFIRMED', 'BUDGETING', 'PROCUREMENT', 'PRODUCTION', 'QC_PACKING', 'SHIPPED', 'CLOSED')),
  status                    text NOT NULL CHECK (status IN ('OPEN', 'WON', 'LOST', 'CANCELLED', 'CLOSED')),
  priority                  text NOT NULL CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  incoterm                  text NOT NULL CHECK (incoterm IN ('EXW', 'FOB', 'FCA', 'CFR', 'CIF', 'DAP', 'DDP')),
  payment_term              text NOT NULL CHECK (payment_term IN ('TT_30_70', 'TT_50_50', 'TT_100_ADVANCE', 'LC_AT_SIGHT', 'LC_60_DAYS', 'DP_60_DAYS', 'OPEN_ACCOUNT_45')),
  destination_port          text NOT NULL,
  destination_country       text NOT NULL,
  inquiry_at                timestamptz NOT NULL,
  quoted_at                 timestamptz,
  po_number                 text,
  po_at                     timestamptz,
  target_ship_at            timestamptz NOT NULL,
  actual_ship_at            timestamptz,
  contract_value            numeric(18,4) NOT NULL,
  deposit_pct               numeric(18,4) NOT NULL,
  deposit_received_at       timestamptz,
  sales_owner_id            uuid NOT NULL,
  production_owner_name     text NOT NULL,
  exchange_rate             numeric(18,4) NOT NULL,
  loss_reason               text CHECK (loss_reason IN ('PRICE', 'LEAD_TIME', 'CAPACITY', 'SPECIFICATION', 'CERTIFICATION', 'NO_RESPONSE', 'OTHER')),
  loss_note                 text,
  competitor                text,
  note                      text,
  created_at                timestamptz NOT NULL,
  updated_at                timestamptz NOT NULL,
  FOREIGN KEY (buyer_id) REFERENCES buyers(id),
  FOREIGN KEY (sales_owner_id) REFERENCES user_accounts(id)
);

CREATE TABLE project_items (
  project_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  line_no                   integer NOT NULL,
  item_ref                  text NOT NULL,
  name                      text NOT NULL,
  species                   text NOT NULL CHECK (species IN ('TEAK', 'MAHOGANY', 'ACACIA', 'MINDI', 'PINE', 'RUBBERWOOD', 'SUAR', 'NONE')),
  finish                    text NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  length_mm                 numeric(18,4) NOT NULL,
  width_mm                  numeric(18,4) NOT NULL,
  height_mm                 numeric(18,4) NOT NULL,
  cbm_per_unit              numeric(18,4) NOT NULL,
  packing_type              text NOT NULL CHECK (packing_type IN ('KNOCK_DOWN', 'ASSEMBLED', 'CARTON', 'CRATE', 'PALLET')),
  target_unit_price         numeric(18,4) NOT NULL,
  agreed_unit_price         numeric(18,4) NOT NULL,
  produced_qty              numeric(18,4) NOT NULL,
  packed_qty                numeric(18,4) NOT NULL,
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE negotiation_rounds (
  project_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  round                     integer NOT NULL,
  at                        timestamptz NOT NULL,
  from                      text NOT NULL CHECK (from IN ('BUYER', 'US')),
  subject                   text NOT NULL CHECK (subject IN ('PRICE', 'SPECIFICATION', 'LEAD_TIME', 'PAYMENT_TERMS', 'PACKING', 'QUANTITY', 'CERTIFICATION')),
  buyer_value               numeric(18,4),
  our_value                 numeric(18,4),
  summary                   text NOT NULL,
  outcome                   text NOT NULL CHECK (outcome IN ('OPEN', 'ACCEPTED', 'COUNTERED', 'REJECTED', 'WITHDRAWN')),
  by_name                   text NOT NULL,
  attachment                text,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE drawings (
  project_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  title                     text NOT NULL,
  revision                  text NOT NULL,
  item_ref                  text NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'REVISION_REQUESTED', 'APPROVED', 'SUPERSEDED')),
  sent_at                   timestamptz,
  responded_at              timestamptz,
  approved_at               timestamptz,
  file_name                 text NOT NULL,
  length_mm                 numeric(18,4) NOT NULL,
  width_mm                  numeric(18,4) NOT NULL,
  height_mm                 numeric(18,4) NOT NULL,
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE samples (
  project_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  item_ref                  text NOT NULL,
  status                    text NOT NULL CHECK (status IN ('REQUESTED', 'IN_MAKING', 'SENT', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED')),
  requested_at              timestamptz NOT NULL,
  cost_idr                  numeric(18,4) NOT NULL,
  charged_to_buyer          boolean NOT NULL,
  courier                   text,
  awb                       text,
  sent_at                   timestamptz,
  decided_at                timestamptz,
  round                     integer NOT NULL,
  feedback                  text,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE project_compliance (
  id                        uuid PRIMARY KEY,
  project_id                uuid NOT NULL,
  key                       text NOT NULL CHECK (key IN ('SVLK_VLEGAL', 'EUDR_DDS', 'FSC_COC', 'ISPM15', 'FUMIGATION', 'COO_FORM', 'LAB_TEST', 'CARB_TSCA', 'PEB')),
  status                    text NOT NULL CHECK (status IN ('NOT_REQUIRED', 'REQUIRED', 'IN_PROGRESS', 'SATISFIED', 'FAILED')),
  reference                 text,
  obtained_at               timestamptz,
  expires_at                timestamptz,
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE budgets (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  project_id                uuid NOT NULL,
  version                   integer NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REVISED', 'REJECTED', 'CLOSED')),
  prepared_by_id            uuid NOT NULL,
  prepared_at               timestamptz NOT NULL,
  submitted_at              timestamptz,
  approved_by_name          text,
  approved_at               timestamptz,
  rejected_reason           text,
  target_margin_pct         numeric(18,4) NOT NULL,
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (prepared_by_id) REFERENCES user_accounts(id)
);

CREATE TABLE budget_lines (
  budget_id                 uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  category                  text NOT NULL CHECK (category IN ('TIMBER', 'PANEL', 'HARDWARE', 'FINISHING', 'UPHOLSTERY', 'PACKAGING', 'LABOUR', 'SUBCON', 'OVERHEAD', 'EXPORT_LOGISTICS', 'CERTIFICATION', 'CONTINGENCY')),
  item_id                   uuid,
  description               text NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  unit_cost                 numeric(18,4) NOT NULL,
  wastage_pct               numeric(18,4) NOT NULL,
  supplier_id               uuid,
  note                      text,
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE purchase_requests (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  project_id                uuid,
  warehouse_id              uuid NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIALLY_ORDERED', 'ORDERED', 'CANCELLED')),
  requested_by_id           uuid NOT NULL,
  requested_at              timestamptz NOT NULL,
  approved_by_name          text,
  approved_at               timestamptz,
  rejected_reason           text,
  justification             text NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (requested_by_id) REFERENCES user_accounts(id)
);

CREATE TABLE purchase_request_lines (
  purchase_request_id       uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  item_id                   uuid NOT NULL,
  description               text NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  estimated_unit_cost       numeric(18,4) NOT NULL,
  budget_line_id            uuid,
  needed_by                 timestamptz NOT NULL,
  ordered_qty               numeric(18,4) NOT NULL,
  FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (budget_line_id) REFERENCES budget_lines(id)
);

CREATE TABLE purchase_orders (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  supplier_id               uuid NOT NULL,
  project_id                uuid,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED')),
  ordered_at                timestamptz NOT NULL,
  expected_at               timestamptz NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  payment_term_days         integer NOT NULL,
  delivery_mode             text NOT NULL CHECK (delivery_mode IN ('TO_WAREHOUSE', 'TO_SUBCON', 'TO_SITE')),
  warehouse_id              uuid NOT NULL,
  partial_allowed           boolean NOT NULL,
  over_receipt_tolerance_pctnumeric(18,4) NOT NULL,
  raised_by_id              uuid NOT NULL,
  raised_by_name            text NOT NULL,
  approved_by_name          text,
  approved_at               timestamptz,
  requires_svlk_doc         boolean NOT NULL,
  note                      text,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE purchase_order_lines (
  purchase_order_id         uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  item_id                   uuid NOT NULL,
  description               text NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  unit_price                numeric(18,4) NOT NULL,
  discount_pct              numeric(18,4) NOT NULL,
  tax_pct                   numeric(18,4) NOT NULL,
  needed_by                 timestamptz NOT NULL,
  budget_line_id            uuid,
  received_qty              numeric(18,4) NOT NULL,
  rejected_qty              numeric(18,4) NOT NULL,
  note                      text,
  FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (budget_line_id) REFERENCES budget_lines(id)
);

CREATE TABLE goods_receipts (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  po_id                     uuid NOT NULL,
  supplier_id               uuid NOT NULL,
  project_id                uuid,
  mode                      text NOT NULL CHECK (mode IN ('FULL')),
  sequence                  integer NOT NULL,
  received_at               timestamptz NOT NULL,
  delivery_note_no          text NOT NULL,
  vehicle_no                text,
  driver_name               text,
  warehouse_id              uuid NOT NULL,
  delivered_to_name         text,
  qc_result                 text NOT NULL CHECK (qc_result IN ('PENDING', 'PASSED', 'PARTIAL', 'FAILED')),
  qc_by_name                text NOT NULL,
  received_by_name          text NOT NULL,
  posted                    boolean NOT NULL,
  note                      text,
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE goods_receipt_lines (
  goods_receipt_id          uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  po_line_id                uuid NOT NULL,
  item_id                   uuid NOT NULL,
  description               text NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  qty_delivered             numeric(18,4) NOT NULL,
  qty_accepted              numeric(18,4) NOT NULL,
  qty_rejected              numeric(18,4) NOT NULL,
  reject_reason             text CHECK (reject_reason IN ('MOISTURE', 'DIMENSION', 'DEFECT', 'WRONG_ITEM', 'DAMAGED', 'SHORT_SHIPPED', 'NO_LEGALITY_DOC', 'FINISH_QUALITY')),
  bin_code                  text,
  batch_no                  text,
  legality_doc_no           text,
  moisture_pct              numeric(18,4),
  note                      text,
  FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (po_line_id) REFERENCES purchase_order_lines(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE stock_movements (
  id                        uuid PRIMARY KEY,
  at                        timestamptz NOT NULL,
  type                      text NOT NULL CHECK (type IN ('RECEIPT', 'ISSUE_PRODUCTION', 'RETURN_PRODUCTION', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'SCRAP', 'FG_PRODUCED', 'SHIPMENT_OUT', 'OPENING')),
  item_id                   uuid NOT NULL,
  warehouse_id              uuid NOT NULL,
  bin_code                  text,
  qty                       numeric(18,4) NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  unit_cost                 numeric(18,4) NOT NULL,
  batch_no                  text,
  ref_type                  text NOT NULL,
  ref_code                  text NOT NULL,
  project_id                uuid,
  actor_name                text NOT NULL,
  note                      text,
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE stock_transfers (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  from_warehouse_id         uuid NOT NULL,
  to_warehouse_id           uuid NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED')),
  issued_at                 timestamptz NOT NULL,
  expected_at               timestamptz NOT NULL,
  received_at               timestamptz,
  project_id                uuid,
  reason                    text NOT NULL,
  issued_by_name            text NOT NULL,
  FOREIGN KEY (from_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (to_warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE stock_transfer_lines (
  transfer_id               uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  item_id                   uuid NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  uom                       text NOT NULL CHECK (uom IN ('PCS', 'SET', 'M3', 'M2', 'MTR', 'KG', 'LTR', 'SHEET', 'ROLL', 'BOX', 'HOUR')),
  received_qty              numeric(18,4) NOT NULL,
  FOREIGN KEY (transfer_id) REFERENCES stock_transfers(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE stock_reservations (
  id                        uuid PRIMARY KEY,
  project_id                uuid NOT NULL,
  item_id                   uuid NOT NULL,
  warehouse_id              uuid NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  status                    text NOT NULL CHECK (status IN ('RESERVED', 'PICKED', 'RELEASED', 'CANCELLED')),
  reserved_at               timestamptz NOT NULL,
  needed_by                 timestamptz NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (item_id) REFERENCES items(id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE stock_counts (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  warehouse_id              uuid NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'COUNTING', 'REVIEW', 'POSTED', 'CANCELLED')),
  counted_at                timestamptz NOT NULL,
  counted_by_name           text NOT NULL,
  posted_at                 timestamptz,
  note                      text,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
);

CREATE TABLE stock_count_lines (
  count_id                  uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  item_id                   uuid NOT NULL,
  system_qty                numeric(18,4) NOT NULL,
  counted_qty               numeric(18,4) NOT NULL,
  note                      text,
  FOREIGN KEY (count_id) REFERENCES stock_counts(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE work_orders (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  project_id                uuid NOT NULL,
  project_item_id           uuid NOT NULL,
  item_ref                  text NOT NULL,
  qty                       numeric(18,4) NOT NULL,
  produced_qty              numeric(18,4) NOT NULL,
  reject_qty                numeric(18,4) NOT NULL,
  stage                     text NOT NULL CHECK (stage IN ('QUEUED', 'CUTTING', 'ASSEMBLY', 'SANDING', 'FINISHING', 'UPHOLSTERY', 'PACKING', 'DONE')),
  status                    text NOT NULL CHECK (status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED')),
  subcon_supplier_id        uuid,
  workshop                  text NOT NULL,
  started_at                timestamptz,
  planned_start_at          timestamptz NOT NULL,
  due_at                    timestamptz NOT NULL,
  completed_at              timestamptz,
  supervisor_name           text NOT NULL,
  hold_reason               text,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (project_item_id) REFERENCES project_items(id),
  FOREIGN KEY (subcon_supplier_id) REFERENCES suppliers(id)
);

CREATE TABLE shipments (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  project_id                uuid NOT NULL,
  status                    text NOT NULL CHECK (status IN ('PLANNED', 'STUFFING', 'STUFFED', 'DOCS_IN_PROGRESS', 'CUSTOMS', 'SAILED', 'ARRIVED', 'CLOSED')),
  forwarder_name            text NOT NULL,
  booking_no                text,
  vessel_name               text,
  voyage_no                 text,
  pol_name                  text NOT NULL,
  pod_name                  text NOT NULL,
  stuffing_at               timestamptz,
  etd                       timestamptz NOT NULL,
  eta                       timestamptz NOT NULL,
  atd                       timestamptz,
  incoterm                  text NOT NULL CHECK (incoterm IN ('EXW', 'FOB', 'FCA', 'CFR', 'CIF', 'DAP', 'DDP')),
  invoice_value             numeric(18,4) NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE shipment_containers (
  shipment_id               uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  size                      text NOT NULL CHECK (size IN ('LCL', '20GP', '40GP', '40HC')),
  container_no              text,
  seal_no                   text,
  loaded_cbm                numeric(18,4) NOT NULL,
  loaded_weight_kg          numeric(18,4) NOT NULL,
  packages                  integer NOT NULL,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE TABLE export_documents (
  shipment_id               uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  type                      text NOT NULL CHECK (type IN ('COMMERCIAL_INVOICE', 'PACKING_LIST', 'VLEGAL', 'PEB', 'COO', 'BILL_OF_LADING', 'FUMIGATION_CERT', 'ISPM15_CERT', 'INSURANCE', 'EUDR_DDS', 'FSC_CERT')),
  status                    text NOT NULL CHECK (status IN ('REQUIRED', 'DRAFT', 'SUBMITTED', 'ISSUED', 'REJECTED', 'NOT_REQUIRED')),
  reference                 text,
  issued_at                 timestamptz,
  issuer                    text,
  mandatory                 boolean NOT NULL,
  note                      text,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

CREATE TABLE accounts (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  name                      text NOT NULL,
  type                      text NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  group                     text NOT NULL,
  active                    boolean NOT NULL,
  description               text
);

CREATE TABLE journal_entries (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  at                        timestamptz NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'POSTED', 'VOID')),
  source                    text NOT NULL,
  ref_code                  text,
  memo                      text NOT NULL,
  project_id                uuid,
  posted_by_name            text NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE journal_lines (
  journal_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  account_code              text NOT NULL,
  debit                     numeric(18,4) NOT NULL,
  credit                    numeric(18,4) NOT NULL,
  memo                      text,
  project_id                uuid,
  FOREIGN KEY (journal_id) REFERENCES journal_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE supplier_bills (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  supplier_invoice_no       text NOT NULL,
  supplier_id               uuid NOT NULL,
  po_id                     uuid,
  project_id                uuid,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'DISPUTED', 'VOID')),
  issued_at                 timestamptz NOT NULL,
  due_at                    timestamptz NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  subtotal                  numeric(18,4) NOT NULL,
  tax_amount                numeric(18,4) NOT NULL,
  paid_amount               numeric(18,4) NOT NULL,
  approved_by_name          text,
  dispute_reason            text,
  note                      text,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE sales_invoices (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  kind                      text NOT NULL CHECK (kind IN ('PROFORMA', 'DEPOSIT', 'FINAL', 'CREDIT_NOTE')),
  project_id                uuid NOT NULL,
  buyer_id                  uuid NOT NULL,
  status                    text NOT NULL CHECK (status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID')),
  issued_at                 timestamptz NOT NULL,
  due_at                    timestamptz NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  amount                    numeric(18,4) NOT NULL,
  paid_amount               numeric(18,4) NOT NULL,
  exchange_rate             numeric(18,4) NOT NULL,
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (buyer_id) REFERENCES buyers(id)
);

CREATE TABLE payments (
  id                        uuid PRIMARY KEY,
  code                      text NOT NULL,
  direction                 text NOT NULL CHECK (direction IN ('OUT', 'IN')),
  method                    text NOT NULL CHECK (method IN ('BANK_TRANSFER', 'CASH', 'LETTER_OF_CREDIT', 'CHEQUE', 'PETTY_CASH')),
  at                        timestamptz NOT NULL,
  counterparty_id           uuid NOT NULL,
  currency                  text NOT NULL CHECK (currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  amount                    numeric(18,4) NOT NULL,
  exchange_rate             numeric(18,4) NOT NULL,
  bank_account_no           text,
  reference                 text NOT NULL,
  project_id                uuid,
  note                      text,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE payment_allocations (
  payment_id                uuid NOT NULL,
  id                        uuid PRIMARY KEY,
  target_id                 uuid NOT NULL,
  amount                    numeric(18,4) NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

CREATE TABLE app_settings (
  id                        smallint PRIMARY KEY,
  base_currency             text NOT NULL CHECK (base_currency IN ('IDR', 'USD', 'EUR', 'AUD', 'JPY', 'GBP')),
  fx_rates                  jsonb NOT NULL,
  target_margin_pct         numeric(18,4) NOT NULL,
  po_approval_threshold_idr numeric(18,4) NOT NULL,
  bill_variance_tolerance_pctnumeric(18,4) NOT NULL,
  default_over_receipt_tolerance_pctnumeric(18,4) NOT NULL,
  wastage_default_pct       numeric(18,4) NOT NULL,
  certificate_warning_days  integer NOT NULL,
  slow_moving_days          integer NOT NULL,
  container_cbm             jsonb NOT NULL,
  numbering                 jsonb NOT NULL,
  fiscal_year_start_month   numeric(18,4) NOT NULL
);

CREATE TABLE supplier_bill_receipts (
  bill_id                   uuid,
  goods_receipt_id          uuid,
  PRIMARY KEY (bill_id,goods_receipt_id),
  FOREIGN KEY (bill_id) REFERENCES supplier_bills(id) ON DELETE CASCADE,
  FOREIGN KEY (goods_receipt_id) REFERENCES goods_receipts(id)
);

CREATE TABLE activity_log (
  id                        bigint PRIMARY KEY,
  at                        timestamptz NOT NULL,
  actor_id                  uuid NOT NULL,
  action                    text NOT NULL,
  entity_type               text NOT NULL,
  entity_id                 uuid NOT NULL,
  detail                    jsonb,
  FOREIGN KEY (actor_id) REFERENCES user_accounts(id)
);

CREATE VIEW stock_balance AS
SELECT item_id, warehouse_id, SUM(qty) AS on_hand
FROM stock_movements GROUP BY item_id, warehouse_id;

CREATE VIEW po_progress AS
SELECT pl.id AS po_line_id, pl.qty AS ordered,
       COALESCE(SUM(gl.qty_accepted),0) AS received,
       pl.qty - COALESCE(SUM(gl.qty_accepted),0) AS open_qty
FROM purchase_order_lines pl
LEFT JOIN goods_receipt_lines gl ON gl.po_line_id = pl.id
GROUP BY pl.id, pl.qty;
