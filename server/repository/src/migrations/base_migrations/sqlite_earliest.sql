PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
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
, "language" varchar NOT NULL DEFAULT 'ENGLISH', first_name text NULL, last_name text NULL, phone_number text NULL, job_title text NULL, last_successful_sync TIMESTAMP NOT NULL DEFAULT 0);
INSERT INTO user_account VALUES('omsupply_system','omsupply_system','',NULL,'ENGLISH',NULL,NULL,NULL,NULL,'2020-01-22 15:16:00');
CREATE TABLE name (
    id TEXT NOT NULL PRIMARY KEY,
    -- Human-readable representation of the entity associated with the name record.
    name TEXT NOT NULL,
    code TEXT NOT NULL,
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
, is_deceased BOOLEAN, national_health_number TEXT, gender, type NOT NULL DEFAULT 'FACILITY', is_sync_update BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE store (
    id TEXT NOT NULL PRIMARY KEY,
    name_id TEXT NOT NULL,
    code TEXT NOT NULL,
    site_id INTEGER NOT NULL, store_mode TEXT DEFAULT 'STORE' NOT NULL, logo TEXT,
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
, supplier_id TEXT REFERENCES name(id), barcode_id TEXT REFERENCES barcode(id));
CREATE TABLE requisition (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_number BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
    name_id TEXT NOT NULL REFERENCES name(id),
    -- Change to reference user_accoun once users are syncing
    user_id TEXT,
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
, status NOT NULL DEFAULT 'DRAFT', type NOT NULL DEFAULT 'REQUEST', approval_status TEXT, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, program_id TEXT, period_id TEXT REFERENCES period(id), order_type TEXT);
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
, approved_quantity INTEGER NOT NULL DEFAULT 0, approval_comment TEXT, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE);
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
, tax REAL, status NOT NULL DEFAULT 'NEW', type NOT NULL DEFAULT 'OUTBOUND_SHIPMENT', clinician_id TEXT REFERENCES clinician(id));
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
    number_of_packs REAL NOT NULL,
    pack_size INTEGER NOT NULL,
    note TEXT
, type NOT NULL DEFAULT 'STOCK_IN', inventory_adjustment_reason_id TEXT REFERENCES inventory_adjustment_reason(id));
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
INSERT INTO master_list VALUES('missing_program','missing_program','missing_program','missing_program');
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
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE);
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
    created_datetime TEXT NOT NULL,
    stocktake_date TEXT,
    finalised_datetime TEXT,
    is_locked BOOLEAN,
    inventory_addition_id TEXT REFERENCES invoice(id)
, status NOT NULL DEFAULT 'NEW', inventory_reduction_id TEXT REFERENCES invoice(id));
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
, inventory_adjustment_reason_id TEXT REFERENCES inventory_adjustment_reason(id));
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
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE key_value_store (
    id TEXT NOT NULL PRIMARY KEY,
    value_string TEXT,
    value_int INTEGER,
    value_bigint BIGINT,
    value_float REAL,
    value_bool BOOLEAN
);
INSERT INTO key_value_store VALUES('DATABASE_VERSION','1.3.0',NULL,NULL,NULL,NULL);
INSERT INTO key_value_store VALUES('SETTINGS_TOKEN_SECRET','313e9a24-3ac4-4b46-b7c0-7dc310abed65',NULL,NULL,NULL,NULL);
INSERT INTO key_value_store VALUES('LOG_DIRECTORY',NULL,NULL,NULL,NULL,NULL);
INSERT INTO key_value_store VALUES('LOG_FILE_NAME',NULL,NULL,NULL,NULL,NULL);
INSERT INTO key_value_store VALUES('LOG_LEVEL','info',NULL,NULL,NULL,NULL);
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
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE clinician_store_join
(
    id TEXT NOT NULL PRIMARY KEY,
    clinician_id TEXT NOT NULL REFERENCES clinician(id),
    store_id TEXT NOT NULL REFERENCES store(id)
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE);
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
, context_id TEXT REFERENCES context(id));
CREATE TABLE program_enrolment (
    id TEXT NOT NULL PRIMARY KEY,
    document_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    enrolment_datetime TIMESTAMP NOT NULL,
    program_enrolment_id TEXT,
    status TEXT NOT NULL
, document_type TEXT NOT NULL, program_id TEXT REFERENCES program(id));
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
, document_type TEXT NOT NULL, program_id TEXT REFERENCES program(id));
CREATE TABLE program_event (
    id TEXT NOT NULL PRIMARY KEY,
    patient_id TEXT,
    datetime TIMESTAMP NOT NULL,
    active_start_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_start_datetime),
    active_end_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_end_datetime),
    document_type TEXT NOT NULL,
    document_name TEXT,
    type TEXT NOT NULL,
    data TEXT, context_id TEXT REFERENCES context(id),
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
    context_id TEXT REFERENCES context(id));
CREATE TABLE IF NOT EXISTS "report"
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    comment TEXT,
    sub_context TEXT,
    argument_schema_id TEXT REFERENCES form_schema(id)
, context NOT NULL DEFAULT 'INBOUND_SHIPMENT', type NOT NULL DEFAULT 'OM_SUPPLY');
CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    category TEXT NOT NULL,
    document_type TEXT NOT NULL,
    name TEXT,
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
, context_id TEXT REFERENCES context(id));
CREATE TABLE inventory_adjustment_reason (
                id TEXT NOT NULL PRIMARY KEY,
                type TEXT,
                is_active BOOLEAN,
                reason TEXT NOT NULL
            );
CREATE TABLE store_preference (
                id TEXT NOT NULL PRIMARY KEY,
                type TEXT DEFAULT 'STORE_PREFERENCES',
                pack_to_one BOOLEAN NOT NULL DEFAULT false
        , response_requisition_requires_authorisation bool NOT NULL DEFAULT false, request_requisition_requires_authorisation bool NOT NULL DEFAULT false, om_program_module bool NOT NULL DEFAULT false);
CREATE TABLE name_tag (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
CREATE TABLE name_tag_join (
                id TEXT NOT NULL PRIMARY KEY,
                name_id TEXT NOT NULL REFERENCES name(id),
                name_tag_id TEXT NOT NULL REFERENCES name_tag(id)
            );
CREATE TABLE period_schedule (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
CREATE TABLE period (
                id TEXT NOT NULL PRIMARY KEY,
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id),
                name TEXT NOT NULL,
                start_date TEXT NOT NULL,
                end_date TEXT NOT NULL
            );
CREATE TABLE program (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT NOT NULL REFERENCES master_list(id),
                name TEXT NOT NULL
            , context_id TEXT NOT NULL DEFAULT temp REFERENCES context(id));
INSERT INTO program VALUES('missing_program','missing_program','missing_program','missing_program');
CREATE TABLE program_requisition_settings (
                id TEXT NOT NULL PRIMARY KEY,
                name_tag_id TEXT NOT NULL REFERENCES name_tag(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                period_schedule_id TEXT NOT NULL REFERENCES period_schedule(id)
            );
CREATE TABLE program_requisition_order_type (
                id TEXT NOT NULL PRIMARY KEY,
                program_requisition_settings_id TEXT NOT NULL REFERENCES program_requisition_settings(id),
                name TEXT NOT NULL,
                threshold_mos REAL NOT NULL,
                max_mos REAL NOT NULL,
                max_order_per_period INTEGER NOT NULL
            );
CREATE TABLE barcode (
                id text NOT NULL PRIMARY KEY,
                gtin text NOT NULL UNIQUE,
                item_id text NOT NULL REFERENCES item(id),
                manufacturer_id text,
                pack_size int4,
                parent_id text
            , is_sync_update bool NOT NULL DEFAULT False);
CREATE TABLE context (
          id TEXT NOT NULL PRIMARY KEY,
          name TEXT NOT NULL
        );
INSERT INTO context VALUES('Patient','Patient context');
INSERT INTO context VALUES('missing_program','missing_program');
INSERT INTO sqlite_sequence VALUES('changelog',0);
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
CREATE VIEW latest_document AS
SELECT d.*
FROM (
      SELECT name, MAX(datetime) AS datetime
      FROM document
      GROUP BY name
) grouped
INNER JOIN document d
ON d.name = grouped.name AND d.datetime = grouped.datetime;
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
                WHERE invoice.type IN ('INVENTORY_REDUCTION', 'INVENTORY_ADDITION') 
                    AND verified_datetime IS NOT NULL;
CREATE VIEW changelog_deduped AS
            SELECT t1.cursor,
                t1.table_name,
                t1.record_id,
                t1.row_action,
                t1.name_id,
                t1.store_id,
                t1.is_sync_update
            FROM changelog t1
            WHERE t1.cursor = (SELECT max(t2.cursor) 
                            from changelog t2
                            where t2.record_id = t1.record_id)
            ORDER BY t1.cursor;
CREATE VIEW requisitions_in_period AS
        SELECT 'n/a' as id, program_id, period_id, store_id, order_type, type, count(*) as count FROM requisition
            GROUP BY 1,2,3,4,5,6;
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
      VALUES ("invoice", NEW.id, "UPSERT", NEW.name_id, NEW.store_id);
  END;
CREATE TRIGGER invoice_update_trigger
  AFTER UPDATE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("invoice", NEW.id, "UPSERT", NEW.name_id, NEW.store_id);
  END;
CREATE TRIGGER invoice_delete_trigger
  AFTER DELETE ON invoice
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("invoice", OLD.id, "DELETE", OLD.name_id, OLD.store_id);
  END;
CREATE TRIGGER invoice_line_insert_trigger
  AFTER INSERT ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "invoice_line", NEW.id, "UPSERT", name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
  END;
CREATE TRIGGER invoice_line_update_trigger
  AFTER UPDATE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "invoice_line", NEW.id, "UPSERT", name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
  END;
CREATE TRIGGER invoice_line_delete_trigger
  AFTER DELETE ON invoice_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "invoice_line", OLD.id, "DELETE", name_id, store_id FROM invoice WHERE id = OLD.invoice_id;
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
CREATE TRIGGER requisition_delete_trigger
  AFTER DELETE ON requisition
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ("requisition", OLD.id, "DELETE", OLD.name_id, OLD.store_id);
  END;
CREATE TRIGGER requisition_line_delete_trigger
  AFTER DELETE ON requisition_line
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT "requisition_line", OLD.id, "DELETE", name_id, store_id FROM requisition WHERE id = OLD.requisition_id;
  END;
CREATE TRIGGER activity_log_insert_trigger
  AFTER INSERT ON activity_log
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
      VALUES ("activity_log", NEW.id, "UPSERT", NEW.store_id);
  END;
CREATE TRIGGER requisition_insert_trigger
                    AFTER insert ON requisition
                    BEGIN
                      INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id, is_sync_update)
                        VALUES ("requisition", NEW.id, "UPSERT", NEW.name_id, NEW.store_id, NEW.is_sync_update);
                    END;
CREATE TRIGGER requisition_update_trigger
                    AFTER update ON requisition
                    BEGIN
                      INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id, is_sync_update)
                        VALUES ("requisition", NEW.id, "UPSERT", NEW.name_id, NEW.store_id, NEW.is_sync_update);
                    END;
CREATE TRIGGER requisition_line_insert_trigger
                    AFTER insert ON requisition_line
                    BEGIN
                        INSERT INTO changelog (table_name, record_id, is_sync_update, row_action, name_id, store_id)
                            SELECT "requisition_line", NEW.id, NEW.is_sync_update, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
                    END;
CREATE TRIGGER requisition_line_update_trigger
                    AFTER update ON requisition_line
                    BEGIN
                        INSERT INTO changelog (table_name, record_id, is_sync_update, row_action, name_id, store_id)
                            SELECT "requisition_line", NEW.id, NEW.is_sync_update, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
                    END;
CREATE TRIGGER barcode_delete_trigger
                AFTER DELETE ON barcode
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('barcode', OLD.id, 'DELETE');
                END;
CREATE TRIGGER location_movement_insert_trigger
          AFTER INSERT ON location_movement
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id)
              VALUES ("location_movement", NEW.id, "UPSERT", NEW.store_id);
          END;
CREATE TRIGGER location_movement_update_trigger
          AFTER UPDATE ON location_movement
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id)
              VALUES ("location_movement", NEW.id, "UPSERT", NEW.store_id);
          END;
CREATE TRIGGER location_movement_delete_trigger
          AFTER DELETE ON location_movement
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id)
              VALUES ("location_movement", OLD.id, "DELETE", OLD.store_id);
          END;
CREATE TRIGGER barcode_insert_trigger
                    AFTER insert ON barcode
                    BEGIN
                        INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
                        VALUES ("barcode", NEW.id, "UPSERT", NEW.is_sync_update);
                    END;
CREATE TRIGGER barcode_update_trigger
                    AFTER update ON barcode
                    BEGIN
                        INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
                        VALUES ("barcode", NEW.id, "UPSERT", NEW.is_sync_update);
                    END;
CREATE TRIGGER clinician_insert_trigger
          AFTER INSERT ON clinician
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
CREATE TRIGGER clinician_update_trigger
          AFTER UPDATE ON clinician
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('clinician', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
CREATE TRIGGER clinician_delete_trigger
          AFTER DELETE ON clinician
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('clinician', OLD.id, 'DELETE', OLD.is_sync_update);
          END;
CREATE TRIGGER clinician_store_join_insert_trigger
          AFTER INSERT ON clinician_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
CREATE TRIGGER clinician_store_join_update_trigger
          AFTER UPDATE ON clinician_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('clinician_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
CREATE TRIGGER clinician_store_join_delete_trigger
          AFTER DELETE ON clinician_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('clinician_store_join', OLD.id, 'DELETE', OLD.store_id, OLD.is_sync_update);
          END;
CREATE TRIGGER name_insert_trigger
          AFTER INSERT ON name
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('name', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
CREATE TRIGGER name_update_trigger
          AFTER UPDATE ON name
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('name', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
CREATE TRIGGER document_insert_trigger
          AFTER INSERT ON document
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('document', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
CREATE TRIGGER document_update_trigger
          AFTER UPDATE ON document
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
              VALUES ('document', NEW.id, 'UPSERT', NEW.is_sync_update);
          END;
CREATE TRIGGER name_store_join_insert_trigger
          AFTER INSERT ON name_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
CREATE TRIGGER name_store_join_update_trigger
          AFTER UPDATE ON name_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, is_sync_update)
              VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.is_sync_update);
          END;
CREATE UNIQUE INDEX ix_number_store_type_unique ON number(store_id, type);
CREATE INDEX ix_document_name_unique ON document(name);
CREATE INDEX "index_name_first_name" ON "name"("first_name");
CREATE INDEX "index_name_last_name" ON "name"("last_name");
CREATE INDEX "index_name_code" ON "name"("code");
CREATE INDEX "index_name_national_health_number" ON "name"("national_health_number");
CREATE INDEX "index_stocktake_line_item_id_fkey" ON "stocktake_line" ("item_id");
CREATE INDEX "index_stocktake_line_location_id_fkey" ON "stocktake_line" ("location_id");
CREATE INDEX "index_stocktake_line_stock_line_id_fkey" ON "stocktake_line" ("stock_line_id");
CREATE INDEX "index_stocktake_line_stocktake_id_fkey" ON "stocktake_line" ("stocktake_id");
CREATE INDEX "index_invoice_line_location_id_fkey" ON "invoice_line" ("location_id");
CREATE INDEX "index_invoice_line_stock_line_id_fkey" ON "invoice_line" ("stock_line_id");
CREATE INDEX "index_invoice_line_item_id_fkey" ON "invoice_line" ("item_id");
CREATE INDEX "index_invoice_line_invoice_id_fkey" ON "invoice_line" ("invoice_id");
CREATE INDEX "index_activity_log_store_id_fkey" ON "activity_log" ("store_id");
CREATE INDEX "index_stocktake_inventory_addition_id_fkey" ON "stocktake" ("inventory_addition_id");
CREATE INDEX "index_stocktake_inventory_reduction_id_fkey" ON "stocktake" ("inventory_reduction_id");
CREATE INDEX "index_stocktake_store_id_fkey" ON "stocktake" ("store_id");
CREATE INDEX "index_location_store_id_fkey" ON "location" ("store_id");
CREATE INDEX "index_user_permission_store_id_fkey" ON "user_permission" ("store_id");
CREATE INDEX "index_user_permission_user_id_fkey" ON "user_permission" ("user_id");
CREATE INDEX "index_store_name_id_fkey" ON "store" ("name_id");
CREATE INDEX "index_user_store_join_store_id_fkey" ON "user_store_join" ("store_id");
CREATE INDEX "index_user_store_join_user_id_fkey" ON "user_store_join" ("user_id");
CREATE INDEX "index_invoice_store_id_fkey" ON "invoice" ("store_id");
CREATE INDEX "index_invoice_name_store_id_fkey" ON "invoice" ("name_store_id");
CREATE INDEX "index_invoice_name_id_fkey" ON "invoice" ("name_id");
CREATE INDEX "index_location_movement_stock_line_id_fkey" ON "location_movement" ("stock_line_id");
CREATE INDEX "index_location_movement_location_id_fkey" ON "location_movement" ("location_id");
CREATE INDEX "index_location_movement_store_id_fkey" ON "location_movement" ("store_id");
CREATE INDEX "index_master_list_name_join_master_list_id_fkey" ON "master_list_name_join" ("master_list_id");
CREATE INDEX "index_master_list_name_join_name_id_fkey" ON "master_list_name_join" ("name_id");
CREATE INDEX "index_item_unit_id_fkey" ON "item" ("unit_id");
CREATE INDEX "index_name_store_join_store_id_fkey" ON "name_store_join" ("store_id");
CREATE INDEX "index_name_store_join_name_id_fkey" ON "name_store_join" ("name_id");
CREATE INDEX "index_stock_line_location_id_fkey" ON "stock_line" ("location_id");
CREATE INDEX "index_stock_line_store_id_fkey" ON "stock_line" ("store_id");
CREATE INDEX "index_stock_line_item_id_fkey" ON "stock_line" ("item_id");
CREATE INDEX "index_master_list_line_master_list_id_fkey" ON "master_list_line" ("master_list_id");
CREATE INDEX "index_master_list_line_item_id_fkey" ON "master_list_line" ("item_id");
CREATE INDEX "index_requisition_line_requisition_id_fkey" ON "requisition_line" ("requisition_id");
CREATE INDEX "index_requisition_name_id_fkey" ON "requisition" ("name_id");
CREATE INDEX "index_requisition_store_id_fkey" ON "requisition" ("store_id");
CREATE INDEX "index_store_site_id" ON "store" ("site_id");
CREATE INDEX "index_stock_line_available_number_of_packs" ON "stock_line" ("available_number_of_packs");
CREATE INDEX "index_stock_line_total_number_of_packs" ON "stock_line" ("total_number_of_packs");
CREATE INDEX "index_stock_line_expiry_date" ON "stock_line" ("expiry_date");
CREATE INDEX "index_requisition_requisition_number" ON "requisition" ("requisition_number");
CREATE INDEX "index_requisition_type" ON "requisition" ("type");
CREATE INDEX "index_requisition_status" ON "requisition" ("status");
CREATE INDEX "index_requisition_linked_requisition_id" ON "requisition" ("linked_requisition_id");
CREATE INDEX "index_requisition_created_datetime" ON "requisition" ("created_datetime");
CREATE INDEX "index_requisition_line_item_id_fkey" ON "requisition_line" ("item_id");
CREATE INDEX "index_invoice_invoice_number" ON "invoice" ("invoice_number");
CREATE INDEX "index_invoice_type" ON "invoice" ("type");
CREATE INDEX "index_invoice_status" ON "invoice" ("status");
CREATE INDEX "index_invoice_created_datetime" ON "invoice" ("created_datetime");
CREATE INDEX "index_invoice_requisition_id" ON "invoice" ("requisition_id");
CREATE INDEX "index_invoice_linked_invoice_id" ON "invoice" ("linked_invoice_id");
CREATE INDEX "index_invoice_line_type" ON "invoice_line" ("type");
CREATE INDEX "index_invoice_line_number_of_packs" ON "invoice_line" ("number_of_packs");
CREATE INDEX "index_sync_buffer_integration_datetime" ON "sync_buffer" ("integration_datetime");
CREATE INDEX "index_sync_buffer_integration_error" ON "sync_buffer" ("integration_error");
CREATE INDEX "index_sync_buffer_action" ON "sync_buffer" ("action");
CREATE INDEX "index_stocktake_stocktake_number" ON "stocktake" ("stocktake_number");
CREATE INDEX "index_stocktake_created_datetime" ON "stocktake" ("created_datetime");
CREATE INDEX "index_changelog_table_name" ON "changelog" ("table_name");
CREATE INDEX "index_changelog_row_action" ON "changelog" ("row_action");
CREATE INDEX "index_changelog_name_id_fkey" ON "changelog" ("name_id");
CREATE INDEX "index_changelog_store_id_fkey" ON "changelog" ("store_id");
CREATE INDEX "index_report_type" ON "report" ("type");
CREATE INDEX "index_activity_log_record_id_fkey" ON "activity_log" ("record_id");
COMMIT;
