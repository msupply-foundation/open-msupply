PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE __diesel_schema_migrations (
       version VARCHAR(50) PRIMARY KEY NOT NULL,
       run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO __diesel_schema_migrations VALUES('20210805T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210810T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210815T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210820T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210905T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210910T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210915T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210917T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210918T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210920T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20210925T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211005T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211105T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211110T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211115T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211120T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211125T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211210T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211215T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211220T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20211225T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220127T0800','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220211T1500','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1015','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1030','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1130','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1200','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1230','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1300','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1330','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1400','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220315T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220325T1400','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220325T1430','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220401T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220401T1100','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220427T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220427T1300','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1500','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1600','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1700','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1800','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220621013232','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20220831235605','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20221010220028','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20221027T0915','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20221106232008','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20221117221441','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20221201194347','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20230116T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20230327T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20230330220349','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20230421T1000','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20230421T1100','2026-01-05 22:18:24');
INSERT INTO __diesel_schema_migrations VALUES('20230620T1000','2026-01-05 22:18:24');
CREATE TABLE unit (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "index" INTEGER NOT NULL
);
CREATE TABLE user_account (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    -- Hashed password
    hashed_password TEXT NOT NULL,
    email TEXT
, "language" varchar NOT NULL DEFAULT 'ENGLISH');
CREATE TABLE name (
    id TEXT NOT NULL PRIMARY KEY,
    -- Human-readable representation of the entity associated with the name record.
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT CHECK (type IN (
        'FACILITY',
        'PATIENT',
        'BUILD',
        'INVAD',
        'REPACK',
        'STORE',
        'OTHERS'
    )) NOT NULL,
    is_customer BOOLEAN NOT NULL,
    is_supplier BOOLEAN NOT NULL,
   
    supplying_store_id Text,
    first_name Text,
    last_name Text,
    date_of_birth TEXT,
    phone TEXT,
    charge_code TEXT,
    comment TEXT,
    country TEXT,
    address1 TEXT,
    address2 TEXT,
    email TEXT,
    website TEXT,
    is_manufacturer BOOLEAN,
    is_donor BOOLEAN,
    on_hold BOOLEAN,
    created_datetime TIMESTAMP
, gender TEXT, is_deceased BOOLEAN NOT NULL DEFAULT false, national_health_number TEXT);
CREATE TABLE store (
    id TEXT NOT NULL PRIMARY KEY,
    name_id TEXT NOT NULL,
    code TEXT NOT NULL,
    site_id INTEGER NOT NULL, store_mode TEXT DEFAULT 'STORE' NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id)
);
CREATE TABLE item
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    unit_id TEXT REFERENCES unit(id),
    default_pack_size INTEGER NOT NULL,
    type TEXT NOT NULL,
    -- TODO, this is temporary, remove
    legacy_record TEXT NOT NULL
);
CREATE TABLE location (
    id TEXT NOT NULL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    on_hold BOOLEAN NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id)
);
CREATE TABLE stock_line (
    id TEXT NOT NULL PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES item(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    location_id TEXT REFERENCES location(id),
    batch TEXT,
    expiry_date TEXT,
    cost_price_per_pack REAL NOT NULL,
    sell_price_per_pack REAL NOT NULL,
    available_number_of_packs REAL NOT NULL,
    total_number_of_packs REAL NOT NULL,
    pack_size INTEGER NOT NULL,
    on_hold BOOLEAN NOT NULL,
    note TEXT
);
CREATE TABLE requisition (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_number BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    name_id TEXT NOT NULL REFERENCES name(id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT,
    type TEXT CHECK (type IN ('REQUEST', 'RESPONSE')) NOT NULL,
    status TEXT CHECK (status IN ('DRAFT', 'NEW', 'SENT', 'FINALISED')) NOT NULL,
    created_datetime TEXT NOT NULL,
    sent_datetime TEXT,
    finalised_datetime TEXT,
    expected_delivery_date TEXT,
    colour TEXT,
    comment TEXT,
    their_reference TEXT,
    max_months_of_stock  DOUBLE PRECISION NOT NULL,
    min_months_of_stock DOUBLE PRECISION NOT NULL,
    linked_requisition_id TEXT
);
CREATE TABLE requisition_line (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_id TEXT NOT NULL REFERENCES requisition (id),
    item_id TEXT NOT NULL REFERENCES item(id),
    requested_quantity INTEGER NOT NULL,
    suggested_quantity INTEGER NOT NULL,
    supply_quantity INTEGER NOT NULL,
    available_stock_on_hand INTEGER NOT NULL,
    average_monthly_consumption INTEGER NOT NULL,
    -- Calculation of stock on hand and average monthly consumption
    snapshot_datetime TEXT,
    comment TEXT
);
CREATE TABLE invoice (
    id TEXT NOT NULL PRIMARY KEY,
    -- For outbound shipments, the id of the receiving customer.
    -- For inbound shipments, the id of the sending supplier.
    name_id TEXT NOT NULL REFERENCES name(id),
    name_store_id TEXT REFERENCES store (id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT,
    -- For outbound shipments, the id of the issuing store.
    -- For inbound shipments, the id of the receiving store.
    store_id TEXT NOT NULL REFERENCES store (id),
    invoice_number integer NOT NULL,
    type TEXT CHECK (type IN ('OUTBOUND_SHIPMENT', 'INBOUND_SHIPMENT', 'INVENTORY_ADJUSTMENT')) NOT NULL,
    status TEXT CHECK (status IN ('NEW','ALLOCATED', 'PICKED', 'SHIPPED',  'DELIVERED', 'VERIFIED')) NOT NULL,
    on_hold BOOLEAN NOT NULL,
    comment TEXT,
    their_reference TEXT,
    transport_reference TEXT,
    created_datetime TEXT NOT NULL,
    allocated_datetime TEXT,
    picked_datetime TEXT,
    shipped_datetime TEXT,
    delivered_datetime TEXT,
    verified_datetime TEXT,
    colour TEXT,
    requisition_id TEXT,
    linked_invoice_id TEXT
, tax REAL);
CREATE TABLE invoice_line (
    id TEXT NOT NULL PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES invoice(id),
    item_id TEXT NOT NULL REFERENCES item(id),
    item_name TEXT NOT NULL,
    item_code TEXT NOT NULL,
    stock_line_id TEXT REFERENCES stock_line(id),
    location_id TEXT REFERENCES location(id),
    batch TEXT,
    expiry_date TEXT,
    cost_price_per_pack REAL NOT NULL,
    -- sell price without tax
    sell_price_per_pack REAL NOT NULL,
    total_before_tax REAL NOT NULL,
    total_after_tax REAL NOT NULL,
    tax REAL,
    type TEXT CHECK (type IN ('STOCK_IN', 'STOCK_OUT', 'UNALLOCATED_STOCK', 'SERVICE')) NOT NULL,
    number_of_packs REAL NOT NULL,
    pack_size INTEGER NOT NULL,
    note TEXT
);
CREATE TABLE sync_buffer (
    record_id TEXT NOT NULL PRIMARY KEY,
    received_datetime TEXT NOT NULL,
    integration_datetime TEXT,
    integration_error TEXT,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT NOT NULL
);
CREATE TABLE master_list (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL
);
CREATE TABLE master_list_line (
    id TEXT NOT NULL PRIMARY KEY,
    item_id TEXT NOT NULL,
    master_list_id TEXT NOT NULL,
    FOREIGN KEY(item_id) REFERENCES item(id),
    FOREIGN KEY(master_list_id) REFERENCES master_list(id)
);
CREATE TABLE master_list_name_join (
    id TEXT NOT NULL PRIMARY KEY,
    master_list_id TEXT NOT NULL,
    name_id TEXT NOT NULL,
    FOREIGN KEY(name_id) REFERENCES name(id),
    FOREIGN KEY(master_list_id) REFERENCES master_list(id)
);
CREATE TABLE name_store_join (
    id TEXT NOT NULL PRIMARY KEY,
    name_id TEXT NOT NULL REFERENCES name(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    name_is_customer BOOLEAN NOT NULL,
    name_is_supplier BOOLEAN NOT NULL
);
CREATE TABLE number (
    id TEXT NOT NULL PRIMARY KEY,
    -- current counter value
    value BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    type TEXT NOT NULL
  );
CREATE TABLE stocktake (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT NOT NULL,
    stocktake_number INTEGER NOT NULL,
    comment	TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('NEW', 'FINALISED')) NOT NULL,
    created_datetime TEXT NOT NULL,
    stocktake_date TEXT,
    finalised_datetime TEXT,
    is_locked BOOLEAN,
    inventory_adjustment_id TEXT REFERENCES invoice(id)
);
CREATE TABLE stocktake_line (
    id TEXT NOT NULL PRIMARY KEY,
    stocktake_id TEXT NOT NULL REFERENCES stocktake(id),
    stock_line_id TEXT REFERENCES stock_line(id),
    location_id TEXT REFERENCES location(id),
    comment	TEXT,
    snapshot_number_of_packs REAL NOT NULL,
    counted_number_of_packs REAL,
    item_id TEXT NOT NULL REFERENCES item(id),
    batch TEXT,
    expiry_date TEXT,
    pack_size INTEGER,
    cost_price_per_pack REAL,
    sell_price_per_pack REAL,
    note TEXT 
);
CREATE TABLE changelog (
    cursor INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    -- the table name where the change happend
    table_name TEXT NOT NULL,
    -- row id of the modified row
    record_id TEXT NOT NULL,
    row_action TEXT NOT NULL,
    -- Below fields are extracted from associated record where it's deemed necessary (see changelog/README.md)
    name_id TEXT,
    store_id TEXT
);
CREATE TABLE key_value_store (
    id TEXT NOT NULL PRIMARY KEY,
    value_string TEXT,
    value_int INTEGER,
    value_bigint BIGINT,
    value_float REAL,
    value_bool BOOLEAN
);
INSERT INTO key_value_store VALUES('DATABASE_VERSION','1.0.4',NULL,NULL,NULL,NULL);
CREATE TABLE user_store_join (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES user_account(id),
    store_id TEXT NOT NULL REFERENCES store(id),
    is_default BOOLEAN NOT NULL
);
CREATE TABLE clinician
(
    id TEXT NOT NULL PRIMARY KEY,
    code TEXT NOT NULL,
    last_name TEXT NOT NULL,
    initials TEXT NOT NULL,
    first_name TEXT,
    address1 TEXT,
    address2 TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    gender TEXT,
    is_active BOOLEAN NOT NULL
);
CREATE TABLE clinician_store_join
(
    id TEXT NOT NULL PRIMARY KEY,
    clinician_id TEXT NOT NULL REFERENCES clinician(id),
    store_id TEXT NOT NULL REFERENCES store(id)
);
CREATE TABLE form_schema (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    json_schema TEXT NOT NULL,
    ui_schema TEXT NOT NULL
);
CREATE TABLE document (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_ids TEXT NOT NULL,
    user_id TEXT NOT NULL,
    datetime TIMESTAMP NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    form_schema_id TEXT REFERENCES form_schema(id),
    status TEXT NOT NULL,
    owner_name_id TEXT REFERENCES name (id),
    is_sync_update BOOLEAN NOT NULL DEFAULT FALSE
, context TEXT NOT NULL);
CREATE TABLE program_enrolment (
    id TEXT NOT NULL PRIMARY KEY,
    document_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    enrolment_datetime TIMESTAMP NOT NULL,
    program_enrolment_id TEXT,
    status TEXT NOT NULL
, context TEXT NOT NULL, document_type TEXT NOT NULL);
CREATE TABLE encounter (
    id TEXT NOT NULL PRIMARY KEY,
    document_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP,
    status TEXT,
    clinician_id TEXT REFERENCES clinician(id),
    store_id TEXT
, document_type TEXT NOT NULL, context TEXT NOT NULL);
CREATE TABLE program_event (
    id TEXT NOT NULL PRIMARY KEY,
    patient_id TEXT,
    datetime TIMESTAMP NOT NULL,
    active_start_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_start_datetime),
    active_end_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_end_datetime),
    document_type TEXT NOT NULL,
    document_name TEXT,
    type TEXT NOT NULL,
    data TEXT, context TEXT NOT NULL,
    FOREIGN KEY(patient_id) REFERENCES name(id)
);
CREATE TABLE activity_log (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    user_id TEXT,
    store_id TEXT REFERENCES store(id),
    record_id TEXT,
    datetime TIMESTAMP NOT NULL
, event TEXT);
CREATE TABLE sync_log (
    id TEXT NOT NULL PRIMARY KEY,
    started_datetime TIMESTAMP NOT NULL,
    finished_datetime TIMESTAMP,
    prepare_initial_started_datetime TIMESTAMP,
    prepare_initial_finished_datetime TIMESTAMP,

    push_started_datetime TIMESTAMP,
    push_finished_datetime TIMESTAMP,
    push_progress_total INTEGER,
    push_progress_done INTEGER,

    pull_central_started_datetime TIMESTAMP,
    pull_central_finished_datetime TIMESTAMP,
    pull_central_progress_total INTEGER,
    pull_central_progress_done INTEGER,

    pull_remote_started_datetime TIMESTAMP,
    pull_remote_finished_datetime TIMESTAMP,
    pull_remote_progress_total INTEGER,
    pull_remote_progress_done INTEGER,

    integration_started_datetime TIMESTAMP,
    integration_finished_datetime TIMESTAMP,

    error_message TEXT,
    error_code TEXT
);
CREATE TABLE location_movement (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT REFERENCES store(id),
    location_id TEXT REFERENCES location(id),
    stock_line_id TEXT REFERENCES stock_line(id),
    enter_datetime TIMESTAMP,
    exit_datetime TIMESTAMP
);
CREATE TABLE user_permission (
    id TEXT NOT NULL PRIMARY KEY,
    user_id TEXT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    permission TEXT NOT NULL,
    context TEXT
);
CREATE TABLE IF NOT EXISTS "report"
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    template TEXT NOT NULL,
    context TEXT NOT NULL,
    comment TEXT,
    sub_context TEXT,
    argument_schema_id TEXT REFERENCES form_schema(id)
);
CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_context TEXT NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
);
CREATE TABLE migration_fragment_log (
                version_and_identifier TEXT NOT NULL PRIMARY KEY,
                datetime TIMESTAMP
            );
DELETE FROM sqlite_sequence;
CREATE VIEW invoice_stats AS
SELECT
	invoice_line.invoice_id,
    SUM(invoice_line.total_before_tax) AS total_before_tax,
	SUM(invoice_line.total_after_tax) AS total_after_tax,
    (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
	COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
	COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
	COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_before_tax,
	COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0)  AS stock_total_after_tax
FROM
	invoice_line
GROUP BY
	invoice_line.invoice_id;
CREATE UNIQUE INDEX ix_number_store_type_unique ON number(store_id, type);
CREATE VIEW invoice_line_stock_movement AS 
SELECT 
	*,
	CASE
	 WHEN type = 'STOCK_IN' THEN number_of_packs * pack_size
	 WHEN type = 'STOCK_OUT' THEN number_of_packs * pack_size * -1
	END as quantity_movement
FROM invoice_line
WHERE number_of_packs > 0
	AND type IN ('STOCK_IN', 'STOCK_OUT');
CREATE VIEW outbound_shipment_stock_movement AS
SELECT 
    'n/a' as id,
    quantity_movement as quantity,
	item_id,
	store_id,
	picked_datetime as datetime
FROM invoice_line_stock_movement 
JOIN invoice
	ON invoice_line_stock_movement.invoice_id = invoice.id
WHERE invoice.type = 'OUTBOUND_SHIPMENT' 
	AND picked_datetime IS NOT NULL;
CREATE VIEW inbound_shipment_stock_movement AS
SELECT 
    'n/a' as id,
    quantity_movement as quantity,
	item_id,
	store_id,
	delivered_datetime as datetime
FROM invoice_line_stock_movement 
JOIN invoice
	ON invoice_line_stock_movement.invoice_id = invoice.id
WHERE invoice.type = 'INBOUND_SHIPMENT' 
	AND delivered_datetime IS NOT NULL;
CREATE VIEW inventory_adjustment_stock_movement AS
SELECT 
    'n/a' as id,
    quantity_movement as quantity,
	item_id,
	store_id,
	verified_datetime as datetime
FROM invoice_line_stock_movement 
JOIN invoice
	ON invoice_line_stock_movement.invoice_id = invoice.id
WHERE invoice.type = 'INVENTORY_ADJUSTMENT' 
	AND verified_datetime IS NOT NULL;
CREATE VIEW stock_movement AS
SELECT * FROM outbound_shipment_stock_movement
UNION SELECT * from inbound_shipment_stock_movement
UNION SELECT * from inventory_adjustment_stock_movement;
CREATE VIEW consumption AS
SELECT 
    'n/a' as id,
    items_and_stores.item_id AS item_id, 
    items_and_stores.store_id AS store_id,
	abs(COALESCE(stock_movement.quantity, 0)) AS quantity,
	date(stock_movement.datetime) AS date
FROM
   (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
LEFT OUTER JOIN outbound_shipment_stock_movement as stock_movement
	ON stock_movement.item_id = items_and_stores.item_id 
		AND stock_movement.store_id = items_and_stores.store_id;
CREATE VIEW stock_on_hand AS
SELECT 
    'n/a' as id,
    items_and_stores.item_id AS item_id, 
    items_and_stores.store_id AS store_id,
	COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand
FROM
   (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
LEFT OUTER JOIN 
	(SELECT 
	  	item_id, 
	 	store_id,
	 	SUM(pack_size * available_number_of_packs) AS available_stock_on_hand
	FROM stock_line
	WHERE stock_line.available_number_of_packs > 0
	GROUP BY item_id, store_id
	) AS stock
	ON stock.item_id = items_and_stores.item_id 
		AND stock.store_id = items_and_stores.store_id;
CREATE VIEW changelog_deduped AS
    SELECT t1.cursor,
        t1.table_name,
        t1.record_id,
        t1.row_action,
        t1.name_id,
        t1.store_id
    FROM changelog t1
    WHERE t1.cursor = (SELECT max(t2.cursor) 
                    from changelog t2
                    where t2.record_id = t1.record_id)
    ORDER BY t1.cursor;
CREATE TRIGGER location__insert_trigger
  AFTER INSERT ON location
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('location', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER location__update_trigger
  AFTER UPDATE ON location
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('location', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER location__delete_trigger
  AFTER DELETE ON location
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('location', OLD.id, 'DELETE');
  END;
CREATE TRIGGER stock_line_insert_trigger
  AFTER INSERT ON stock_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stock_line', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER stock_line_update_trigger
  AFTER UPDATE ON stock_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stock_line', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER stock_line_delete_trigger
  AFTER DELETE ON stock_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stock_line', OLD.id, 'DELETE');
  END;
CREATE TRIGGER invoice_insert_trigger
  AFTER INSERT ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
  END;
CREATE TRIGGER invoice_update_trigger
  AFTER UPDATE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
  END;
CREATE TRIGGER invoice_delete_trigger
  AFTER DELETE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('invoice', OLD.id, 'DELETE', OLD.name_id, OLD.store_id);
  END;
CREATE TRIGGER invoice_line_insert_trigger
  AFTER INSERT ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', NEW.id, 'UPSERT', name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
  END;
CREATE TRIGGER invoice_line_update_trigger
  AFTER UPDATE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', NEW.id, 'UPSERT', name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
  END;
CREATE TRIGGER invoice_line_delete_trigger
  AFTER DELETE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', OLD.id, 'DELETE', name_id, store_id FROM invoice WHERE id = OLD.invoice_id;
  END;
CREATE TRIGGER stocktake_insert_trigger
  AFTER INSERT ON stocktake
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER stocktake_update_trigger
  AFTER UPDATE ON stocktake
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER stocktake_delete_trigger
  AFTER DELETE ON stocktake
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake', OLD.id, 'DELETE');
  END;
CREATE TRIGGER stocktake_line_insert_trigger
  AFTER INSERT ON stocktake_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake_line', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER stocktake_line_update_trigger
  AFTER UPDATE ON stocktake_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake_line', NEW.id, 'UPSERT');
  END;
CREATE TRIGGER stocktake_line_delete_trigger
  AFTER DELETE ON stocktake_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action)
      VALUES ('stocktake_line', OLD.id, 'DELETE');
  END;
CREATE TRIGGER requisition_insert_trigger
  AFTER INSERT ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
  END;
CREATE TRIGGER requisition_update_trigger
  AFTER UPDATE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
  END;
CREATE TRIGGER requisition_delete_trigger
  AFTER DELETE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', OLD.id, 'DELETE', OLD.name_id, OLD.store_id);
  END;
CREATE TRIGGER requisition_line_insert_trigger
  AFTER INSERT ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', NEW.id, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
  END;
CREATE TRIGGER requisition_line_update_trigger
  AFTER UPDATE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', NEW.id, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
  END;
CREATE TRIGGER requisition_line_delete_trigger
  AFTER DELETE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', OLD.id, 'DELETE', name_id, store_id FROM requisition WHERE id = OLD.requisition_id;
  END;
CREATE INDEX ix_document_name_unique ON document(name);
CREATE VIEW latest_document AS
SELECT d.*
FROM (
      SELECT name, MAX(datetime) AS datetime
      FROM document
      GROUP BY name
) grouped
INNER JOIN document d
ON d.name = grouped.name AND d.datetime = grouped.datetime;
CREATE TRIGGER activity_log_insert_trigger
  AFTER INSERT ON activity_log
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ('activity_log', NEW.id, 'UPSERT', NEW.store_id);
  END;
CREATE INDEX "index_name_first_name" ON "name"("first_name");
CREATE INDEX "index_name_last_name" ON "name"("last_name");
CREATE INDEX "index_name_code" ON "name"("code");
CREATE INDEX "index_name_national_health_number" ON "name"("national_health_number");
COMMIT;
