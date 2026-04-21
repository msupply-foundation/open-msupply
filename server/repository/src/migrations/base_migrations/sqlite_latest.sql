PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE __diesel_schema_migrations (
       version VARCHAR(50) PRIMARY KEY NOT NULL,
       run_on TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO __diesel_schema_migrations VALUES('20210805T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210810T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210815T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210820T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210905T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210910T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210915T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210917T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210918T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210920T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20210925T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211005T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211105T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211110T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211115T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211120T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211125T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211210T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211215T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211220T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20211225T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220127T0800','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220211T1500','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1015','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1030','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1130','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1200','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1230','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1300','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1330','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220223T1400','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220315T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220325T1400','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220325T1430','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220401T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220401T1100','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220427T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220427T1300','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1500','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1600','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1700','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220607T1800','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220621013232','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20220831235605','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20221010220028','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20221027T0915','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20221106232008','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20221117221441','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20221201194347','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20230116T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20230327T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20230330220349','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20230421T1000','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20230421T1100','2026-01-05 22:17:24');
INSERT INTO __diesel_schema_migrations VALUES('20230620T1000','2026-01-05 22:17:24');
CREATE TABLE unit (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    "index" INTEGER NOT NULL
, is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE user_account (
    id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    -- Hashed password
    hashed_password TEXT NOT NULL,
    email TEXT
, "language" varchar NOT NULL DEFAULT 'ENGLISH', first_name text NULL, last_name text NULL, phone_number text NULL, job_title text NULL, last_successful_sync TIMESTAMP);
INSERT INTO user_account VALUES('omsupply_system','omsupply_system','',NULL,'ENGLISH',NULL,NULL,NULL,NULL,NULL);
INSERT INTO user_account VALUES('omsupply_plugin','omsupply_plugin','',NULL,'ENGLISH',NULL,NULL,NULL,NULL,NULL);
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
, is_deceased BOOLEAN NOT NULL DEFAULT false, national_health_number TEXT, gender, type NOT NULL DEFAULT 'FACILITY', is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, date_of_death DATE, custom_data TEXT DEFAULT NULL, deleted_datetime TEXT, properties TEXT, next_of_kin_id TEXT, next_of_kin_name TEXT, hsh_code TEXT, hsh_name TEXT, margin REAL, freight_factor REAL, currency_id TEXT REFERENCES currency(id));
CREATE TABLE item
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    unit_id TEXT REFERENCES unit(id),
    type TEXT NOT NULL,
    -- TODO, this is temporary, remove
    legacy_record TEXT NOT NULL
, is_active BOOLEAN NOT NULL DEFAULT TRUE, default_pack_size REAL NOT NULL DEFAULT 0, is_vaccine BOOLEAN NOT NULL DEFAULT FALSE, strength TEXT, ven_category TEXT NOT NULL DEFAULT 'NOT_ASSIGNED', vaccine_doses INTEGER NOT NULL DEFAULT 0, restricted_location_type_id TEXT REFERENCES location_type(id));
CREATE TABLE location (
    id TEXT NOT NULL PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    on_hold BOOLEAN NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id)
, location_type_id TEXT
                REFERENCES "location_type"(id), volume REAL NOT NULL DEFAULT 0.0);
CREATE TABLE stock_line (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    location_id TEXT REFERENCES location(id),
    batch TEXT,
    expiry_date TEXT,
    cost_price_per_pack REAL NOT NULL,
    sell_price_per_pack REAL NOT NULL,
    available_number_of_packs REAL NOT NULL,
    total_number_of_packs REAL NOT NULL,
    on_hold BOOLEAN NOT NULL,
    note TEXT
, barcode_id TEXT REFERENCES barcode(id), item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES item_link(id), supplier_link_id TEXT REFERENCES name_link(id), pack_size REAL NOT NULL DEFAULT 0, item_variant_id TEXT REFERENCES item_variant(id), vvm_status_id TEXT REFERENCES vvm_status(id), campaign_id TEXT REFERENCES campaign(id), donor_link_id TEXT REFERENCES name_link(id), total_volume REAL NOT NULL DEFAULT 0.0, volume_per_pack REAL NOT NULL DEFAULT 0.0, program_id TEXT REFERENCES program(id));
CREATE TABLE requisition (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_number BIGINT NOT NULL,
    store_id TEXT NOT NULL REFERENCES store(id),
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
, status NOT NULL DEFAULT 'DRAFT', type NOT NULL DEFAULT 'REQUEST', approval_status TEXT, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, program_id TEXT, period_id TEXT REFERENCES period(id), order_type TEXT, name_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration', is_emergency BOOLEAN NOT NULL DEFAULT FALSE, created_from_requisition_id TEXT, original_customer_id TEXT REFERENCES name(id));
CREATE TABLE requisition_line (
    id TEXT NOT NULL PRIMARY KEY,
    requisition_id TEXT NOT NULL REFERENCES requisition (id),
    snapshot_datetime TEXT,
    comment TEXT
, approval_comment TEXT, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES item_link(id), item_name TEXT NOT NULL DEFAULT '', requested_quantity REAL, suggested_quantity REAL, supply_quantity REAL, available_stock_on_hand REAL, average_monthly_consumption REAL, approved_quantity REAL, initial_stock_on_hand_units REAL NOT NULL DEFAULT 0, incoming_units REAL NOT NULL DEFAULT 0, outgoing_units REAL NOT NULL DEFAULT 0, loss_in_units REAL NOT NULL DEFAULT 0, addition_in_units REAL NOT NULL DEFAULT 0, expiring_units REAL NOT NULL DEFAULT 0, days_out_of_stock REAL NOT NULL DEFAULT 0, option_id TEXT REFERENCES reason_option(id), price_per_unit REAL);
CREATE TABLE invoice (
    id TEXT NOT NULL PRIMARY KEY,
    -- For outbound shipments, the id of the receiving customer.
    -- For inbound shipments, the id of the sending supplier.
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
, tax_percentage REAL, status NOT NULL DEFAULT 'NEW', type NOT NULL DEFAULT 'OUTBOUND_SHIPMENT', currency_id TEXT REFERENCES currency(id), currency_rate REAL NOT NULL DEFAULT 1.0, name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES name_link(id), clinician_link_id TEXT REFERENCES clinician_link (id), original_shipment_id TEXT, backdated_datetime TIMESTAMP, diagnosis_id TEXT REFERENCES diagnosis(id), program_id TEXT
                REFERENCES program (id), name_insurance_join_id TEXT
                    REFERENCES name_insurance_join (id), insurance_discount_amount REAL, insurance_discount_percentage REAL, is_cancellation BOOLEAN NOT NULL DEFAULT FALSE, cancelled_datetime TEXT, expected_delivery_date TEXT, default_donor_link_id TEXT REFERENCES name_link(id), received_datetime TEXT, goods_received_id TEXT);
CREATE TABLE sync_buffer (
    record_id TEXT NOT NULL PRIMARY KEY,
    received_datetime TEXT NOT NULL,
    integration_datetime TEXT,
    integration_error TEXT,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT NOT NULL
, source_site_id INTEGER);
CREATE TABLE master_list (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT NOT NULL
, is_active BOOLEAN NOT NULL DEFAULT TRUE, is_default_price_list BOOLEAN DEFAULT FALSE, discount_percentage REAL);
INSERT INTO master_list VALUES('missing_program','missing_program','missing_program','missing_program',0,0,NULL);
CREATE TABLE name_store_join (
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    name_is_customer BOOLEAN NOT NULL,
    name_is_supplier BOOLEAN NOT NULL
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, name_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration');
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
, status NOT NULL DEFAULT 'NEW', inventory_reduction_id TEXT REFERENCES invoice(id), program_id TEXT
                REFERENCES program (id), counted_by TEXT, verified_by TEXT, is_initial_stocktake BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE key_value_store (
    id TEXT NOT NULL PRIMARY KEY,
    value_string TEXT,
    value_int INTEGER,
    value_bigint BIGINT,
    value_float REAL,
    value_bool BOOLEAN
);
INSERT INTO key_value_store VALUES('DATABASE_VERSION','2.15.0',NULL,NULL,NULL,NULL);
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
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, store_id TEXT REFERENCES store(id));
CREATE TABLE clinician_store_join
(
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id)
, is_sync_update BOOLEAN NOT NULL DEFAULT FALSE, clinician_link_id TEXT NOT NULL REFERENCES clinician_link (id) DEFAULT 'temp_for_migration');
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
    is_sync_update BOOLEAN NOT NULL DEFAULT FALSE
, context_id TEXT REFERENCES context(id), owner_name_link_id TEXT REFERENCES name_link (id));
CREATE TABLE program_enrolment (
    id TEXT NOT NULL PRIMARY KEY,
    document_name TEXT NOT NULL,
    enrolment_datetime TIMESTAMP NOT NULL,
    program_enrolment_id TEXT,
    document_type TEXT NOT NULL, program_id TEXT REFERENCES program(id), status TEXT, patient_link_id TEXT REFERENCES name_link(id) NOT NULL DEFAULT 'temp_for_migration', store_id TEXT REFERENCES store(id));
CREATE TABLE activity_log (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    user_id TEXT,
    store_id TEXT REFERENCES store(id),
    record_id TEXT,
    datetime TIMESTAMP NOT NULL
, changed_from TEXT, changed_to TEXT);
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
, integration_progress_total INTEGER, integration_progress_done INTEGER, pull_v6_started_datetime TIMESTAMP, pull_v6_finished_datetime TIMESTAMP, pull_v6_progress_total INTEGER, pull_v6_progress_done INTEGER, push_v6_started_datetime TIMESTAMP, push_v6_finished_datetime TIMESTAMP, push_v6_progress_total INTEGER, push_v6_progress_done INTEGER, duration_in_seconds INT DEFAULT 0 NOT NULL);
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
CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    category TEXT NOT NULL,
    document_type TEXT NOT NULL,
    name TEXT,
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
, context_id TEXT REFERENCES context(id));
CREATE TABLE migration_fragment_log (
                version_and_identifier TEXT NOT NULL PRIMARY KEY,
                datetime TIMESTAMP
            );
INSERT INTO migration_fragment_log VALUES('2.2.0-add_low_stock_and_requisition_line_id','2026-01-05 22:17:25.963037');
INSERT INTO migration_fragment_log VALUES('2.2.0-requisitions_in_period','2026-01-05 22:17:25.964060');
INSERT INTO migration_fragment_log VALUES('2.2.0-add_requisition_approved_activity_type','2026-01-05 22:17:25.964332');
INSERT INTO migration_fragment_log VALUES('2.2.0-fix_rnr_form_line_columns','2026-01-05 22:17:25.965221');
INSERT INTO migration_fragment_log VALUES('2.2.1-add_store_ids_to_existing_rnr_form_changelogs','2026-01-05 22:17:25.965869');
INSERT INTO migration_fragment_log VALUES('2.2.2-master_list_default_price_list','2026-01-05 22:17:25.969713');
INSERT INTO migration_fragment_log VALUES('2.2.2-master_list_line_price_per_unit','2026-01-05 22:17:25.974298');
INSERT INTO migration_fragment_log VALUES('2.3.0-drop_program_deleted_datetime','2026-01-05 22:17:25.984623');
INSERT INTO migration_fragment_log VALUES('2.3.0-rename_vaccine_course_schedule_to_dose','2026-01-05 22:17:25.990780');
INSERT INTO migration_fragment_log VALUES('2.3.0-remove_num_doses_from_vaccine_course','2026-01-05 22:17:25.995881');
INSERT INTO migration_fragment_log VALUES('2.3.0-remove_vaccine_course_dose_dose_number','2026-01-05 22:17:26.000893');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccine_course_changelog_table_names','2026-01-05 22:17:26.006237');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccinations_table','2026-01-05 22:17:26.006821');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccination_activity_log_type','2026-01-05 22:17:26.007079');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccine_doses_to_item','2026-01-05 22:17:26.008570');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_max_age_to_vaccine_dose','2026-01-05 22:17:26.010059');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_report_version_fields','2026-01-05 22:17:26.014093');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_facility_to_vaccination','2026-01-05 22:17:26.016909');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccine_course_dose_deleted_datetime','2026-01-05 22:17:26.021642');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccine_course_dose_custom_age_label','2026-01-05 22:17:26.023129');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_backdated_datetime','2026-01-05 22:17:26.024626');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_vaccine_course_item_deleted_datetime','2026-01-05 22:17:26.026257');
INSERT INTO migration_fragment_log VALUES('2.3.0-add_store_id_to_program_enrolment','2026-01-05 22:17:26.027865');
INSERT INTO migration_fragment_log VALUES('2.3.0-remove_stops_from_report_ids','2026-01-05 22:17:26.029165');
INSERT INTO migration_fragment_log VALUES('2.3.1-add_demographic_table','2026-01-05 22:17:26.031393');
INSERT INTO migration_fragment_log VALUES('2.3.1-move_vaccine_course_to_demographic','2026-01-05 22:17:26.038388');
INSERT INTO migration_fragment_log VALUES('2.3.1-add_reference_and_comment_to_rnr_form','2026-01-05 22:17:26.041427');
INSERT INTO migration_fragment_log VALUES('2.3.1-add_rnr_columns','2026-01-05 22:17:26.044482');
INSERT INTO migration_fragment_log VALUES('2.4.0-delete_pack_variant','2026-01-05 22:17:26.045525');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_reason_option_table','2026-01-05 22:17:26.046116');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_manual_requisition_line_fields','2026-01-05 22:17:26.057546');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_unserviceable_status_to_asset_status_enum','2026-01-05 22:17:26.057885');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_expected_lifespan_to_assets','2026-01-05 22:17:26.059302');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_cold_storage_type_table','2026-01-05 22:17:26.061236');
INSERT INTO migration_fragment_log VALUES('2.4.0-item_variant','2026-01-05 22:17:26.062220');
INSERT INTO migration_fragment_log VALUES('2.4.0-program_indicator_create_table','2026-01-05 22:17:26.062775');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_item_variant_id_to_stock_line_and_invoice_line','2026-01-05 22:17:26.065739');
INSERT INTO migration_fragment_log VALUES('2.4.0-indicator_column_create_table','2026-01-05 22:17:26.066568');
INSERT INTO migration_fragment_log VALUES('2.4.0-indicator_value_create_table','2026-01-05 22:17:26.067122');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_bundled_item_table','2026-01-05 22:17:26.067872');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_demographic_indicator_types_to_activity_log','2026-01-05 22:17:26.068136');
INSERT INTO migration_fragment_log VALUES('2.4.0-indicator_indexes','2026-01-05 22:17:26.070397');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_store_pref_use_extra_fields','2026-01-05 22:17:26.072099');
INSERT INTO migration_fragment_log VALUES('2.4.0-add_item_variant_id_to_stocktake_line','2026-01-05 22:17:26.073753');
INSERT INTO migration_fragment_log VALUES('2.4.0-item_changelog','2026-01-05 22:17:26.074008');
INSERT INTO migration_fragment_log VALUES('2.4.0-fix_asset_log_reasons_postgres','2026-01-05 22:17:26.074230');
INSERT INTO migration_fragment_log VALUES('2.4.1-item_categories','2026-01-05 22:17:26.075306');
INSERT INTO migration_fragment_log VALUES('2.4.1-system_log_table','2026-01-05 22:17:26.078776');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_contact_form_table','2026-01-05 22:17:26.079670');
INSERT INTO migration_fragment_log VALUES('2.5.0-new_store_preferences','2026-01-05 22:17:26.084204');
INSERT INTO migration_fragment_log VALUES('2.5.0-remove_unique_description_on_tmp_breach','2026-01-05 22:17:26.089084');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_emergency_orders','2026-01-05 22:17:26.092177');
INSERT INTO migration_fragment_log VALUES('2.5.0-abbreviation_create_table','2026-01-05 22:17:26.092750');
INSERT INTO migration_fragment_log VALUES('2.5.0-remove_contact_form_site_id','2026-01-05 22:17:26.098564');
INSERT INTO migration_fragment_log VALUES('2.5.0-item_direction_create_table','2026-01-05 22:17:26.099109');
INSERT INTO migration_fragment_log VALUES('2.5.0-diagnosis_create_table','2026-01-05 22:17:26.099616');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_email_queue_table','2026-01-05 22:17:26.100122');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_elmis_code_to_program','2026-01-05 22:17:26.101752');
INSERT INTO migration_fragment_log VALUES('2.5.0-diagnosis_add_to_invoice','2026-01-05 22:17:26.103439');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_email_retry_at','2026-01-05 22:17:26.105083');
INSERT INTO migration_fragment_log VALUES('2.5.0-remove_contact_form_user_account_fk','2026-01-05 22:17:26.111416');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_contact_form_processor_pg_enum_type','2026-01-05 22:17:26.111740');
INSERT INTO migration_fragment_log VALUES('2.5.0-remove_vaccination_user_account_fk','2026-01-05 22:17:26.116596');
INSERT INTO migration_fragment_log VALUES('2.5.0-add_requisition_is_emergency','2026-01-05 22:17:26.118266');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_index_to_sync_buffer','2026-01-05 22:17:26.119027');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_invoice_line_prescribed_quantity','2026-01-05 22:17:26.120710');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_program_deleted_datetime','2026-01-05 22:17:26.122410');
INSERT INTO migration_fragment_log VALUES('2.6.0-backend_plugin','2026-01-05 22:17:26.122981');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_create_invoice_from_requisition_permission','2026-01-05 22:17:26.123247');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_name_next_of_kin_id','2026-01-05 22:17:26.124922');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_load_plugin_processor_pg_enum_type','2026-01-05 22:17:26.125183');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_program_id_to_invoice','2026-01-05 22:17:26.127013');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_insurance_provider','2026-01-05 22:17:26.127776');
INSERT INTO migration_fragment_log VALUES('2.6.0-plugin_data_update','2026-01-05 22:17:26.128738');
INSERT INTO migration_fragment_log VALUES('2.6.0-frontend_plugins','2026-01-05 22:17:26.129349');
INSERT INTO migration_fragment_log VALUES('2.6.0-prescribed_quantity_store_pref','2026-01-05 22:17:26.131110');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_name_next_of_kin_name','2026-01-05 22:17:26.132892');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_program_id_to_stocktake','2026-01-05 22:17:26.134623');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_name_insurance_join','2026-01-05 22:17:26.135165');
INSERT INTO migration_fragment_log VALUES('2.6.0-printer_configuration_create_table','2026-01-05 22:17:26.135706');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_insurance_fields_to_invoice','2026-01-05 22:17:26.140534');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_cancelled_status_to_invoice','2026-01-05 22:17:26.140863');
INSERT INTO migration_fragment_log VALUES('2.6.0-report_add_prescription_context','2026-01-05 22:17:26.141116');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_cancellation_fields_to_invoice','2026-01-05 22:17:26.144500');
INSERT INTO migration_fragment_log VALUES('2.6.0-reinitialise_reports_updated','2026-01-05 22:17:26.145534');
INSERT INTO migration_fragment_log VALUES('2.6.0-report','2026-01-05 22:17:26.145816');
INSERT INTO migration_fragment_log VALUES('2.6.0-om_form_schema','2026-01-05 22:17:26.146072');
INSERT INTO migration_fragment_log VALUES('2.6.0-add_report_is_active','2026-01-05 22:17:26.147817');
INSERT INTO migration_fragment_log VALUES('2.6.0-plugin_data_changelog','2026-01-05 22:17:26.148101');
INSERT INTO migration_fragment_log VALUES('2.6.0-report_fix_prescriptions_report_code_updated','2026-01-05 22:17:26.148404');
INSERT INTO migration_fragment_log VALUES('2.6.1-change_vaccination_date_to_nullable','2026-01-05 22:17:26.154054');
INSERT INTO migration_fragment_log VALUES('2.6.1-remove_plugins','2026-01-05 22:17:26.155916');
INSERT INTO migration_fragment_log VALUES('2.6.1-report_add_internal_order_context','2026-01-05 22:17:26.156180');
INSERT INTO migration_fragment_log VALUES('2.6.2-store_reintegrate_for_created_date','2026-01-05 22:17:26.156717');
INSERT INTO migration_fragment_log VALUES('2.6.2-add_assign_requisition_number_processor_cursor_pg_enum_type','2026-01-05 22:17:26.156964');
INSERT INTO migration_fragment_log VALUES('2.6.3-remove_non_custom_standard_reports','2026-01-05 22:17:26.157417');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_preference_table','2026-01-05 22:17:26.158193');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_linked_invoice_id_to_invoice_line','2026-01-05 22:17:26.159997');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_expected_delivery_date','2026-01-05 22:17:26.161814');
INSERT INTO migration_fragment_log VALUES('2.7.0-new_stocktake_fields','2026-01-05 22:17:26.165264');
INSERT INTO migration_fragment_log VALUES('2.7.0-asset_data_matrix_permission','2026-01-05 22:17:26.165575');
INSERT INTO migration_fragment_log VALUES('2.7.0-asset_data_matrix_locked_fields','2026-01-05 22:17:26.167444');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_patient_link_id_to_vaccination','2026-01-05 22:17:26.169368');
INSERT INTO migration_fragment_log VALUES('2.7.0-change_vaccination_date_to_not_nullable','2026-01-05 22:17:26.174893');
INSERT INTO migration_fragment_log VALUES('2.7.0-remove_encounter_clinician_link_constraint2','2026-01-05 22:17:26.180155');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_warning_table','2026-01-05 22:17:26.180721');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_item_warning_join_table','2026-01-05 22:17:26.181286');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_given_store_id_to_vaccination','2026-01-05 22:17:26.184655');
INSERT INTO migration_fragment_log VALUES('2.7.0-trigger_patient_visibility_sync','2026-01-05 22:17:26.185009');
INSERT INTO migration_fragment_log VALUES('2.7.0-add_central_patient_visibility_processor_pg_enum_type','2026-01-05 22:17:26.185247');
INSERT INTO migration_fragment_log VALUES('2.7.0-drop_encounters_report','2026-01-05 22:17:26.185538');
INSERT INTO migration_fragment_log VALUES('2.7.4-create_dynamic_cursor_key','2026-01-05 22:17:26.186049');
INSERT INTO migration_fragment_log VALUES('2.7.4-create_sync_message_table','2026-01-05 22:17:26.186584');
INSERT INTO migration_fragment_log VALUES('2.7.4-create_plugin_user','2026-01-05 22:17:26.187032');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_vvm_status_table','2026-01-05 22:17:26.187785');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_doses_columns_to_item_variant','2026-01-05 22:17:26.195494');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_initial_stocktake_field','2026-01-05 22:17:26.197219');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_created_fields_to_item_variant','2026-01-05 22:17:26.200416');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_item_variant_enums_to_activity_log','2026-01-05 22:17:26.200678');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_vvm_status_log_change_log_table_name','2026-01-05 22:17:26.200897');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_view_and_edit_vvm_status_permission','2026-01-05 22:17:26.201140');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_donor_id_to_invoice_and_invoice_lines','2026-01-05 22:17:26.208715');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_vvm_status_log_update_to_activity_log','2026-01-05 22:17:26.208954');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_vvm_status_id_to_stock_line','2026-01-05 22:17:26.210683');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_campaign_table','2026-01-05 22:17:26.211196');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_campaign_change_log_table_name','2026-01-05 22:17:26.211442');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_donor_id_to_stock_lines','2026-01-05 22:17:26.213144');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_donor_id_to_stocktake_line','2026-01-05 22:17:26.216109');
INSERT INTO migration_fragment_log VALUES('2.8.0-migrate_reason_option_ids','2026-01-05 22:17:26.230889');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_vvm_status_log_table','2026-01-05 22:17:26.231505');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_vvm_status_id_to_invoice_line','2026-01-05 22:17:26.233386');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_open_vial_wastage_to_reason_option_type','2026-01-05 22:17:26.233671');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_campaign_id_to_stock_line','2026-01-05 22:17:26.235466');
INSERT INTO migration_fragment_log VALUES('2.8.0-reintegrate_options_sync_buffer_records','2026-01-05 22:17:26.235795');
INSERT INTO migration_fragment_log VALUES('2.8.0-donor_id_to_donor_link_id','2026-01-05 22:17:26.259897');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_campaign_id_to_invoice_line_row','2026-01-05 22:17:26.261755');
INSERT INTO migration_fragment_log VALUES('2.8.0-add_population_percentage_to_demographic','2026-01-05 22:17:26.263811');
INSERT INTO migration_fragment_log VALUES('2.8.0-rename_vaccine_course_is_active_to_use_in_gaps','2026-01-05 22:17:26.271354');
INSERT INTO migration_fragment_log VALUES('2.8.0-sync_donor_id_to_existing_stock_and_invoice_lines','2026-01-05 22:17:26.271677');
INSERT INTO migration_fragment_log VALUES('2.8.3-invoice_received_status','2026-01-05 22:17:26.273837');
INSERT INTO migration_fragment_log VALUES('2.9.0-process_clinician_store_join_deletes','2026-01-05 22:17:26.274353');
INSERT INTO migration_fragment_log VALUES('2.9.0-add_mutate_clinician_permission','2026-01-05 22:17:26.274621');
INSERT INTO migration_fragment_log VALUES('2.9.0-add_store_id_to_clinician','2026-01-05 22:17:26.276441');
INSERT INTO migration_fragment_log VALUES('2.9.0-extend_name_table_fields','2026-01-05 22:17:26.284117');
INSERT INTO migration_fragment_log VALUES('2.9.0-resync_existing_vaccine_course_records','2026-01-05 22:17:26.285867');
INSERT INTO migration_fragment_log VALUES('2.9.0-resync_existing_vaccine_course_dose_and_item','2026-01-05 22:17:26.286179');
INSERT INTO migration_fragment_log VALUES('2.9.0-add_shipped_number_of_packs_to_invoice_line','2026-01-05 22:17:26.292784');
INSERT INTO migration_fragment_log VALUES('2.9.0-add_shipped_number_of_packs_to_invoice_line_legacy','2026-01-05 22:17:26.293082');
INSERT INTO migration_fragment_log VALUES('2.9.0-add_excel_template_to_report','2026-01-05 22:17:26.294773');
INSERT INTO migration_fragment_log VALUES('2.9.0-resync_existing_vaccination_records','2026-01-05 22:17:26.295086');
INSERT INTO migration_fragment_log VALUES('2.9.0-remove_item_variant_doses_column','2026-01-05 22:17:26.301174');
INSERT INTO migration_fragment_log VALUES('2.9.0-reintegrate_clinician_gender','2026-01-05 22:17:26.301471');
INSERT INTO migration_fragment_log VALUES('2.9.1-add_can_cancel_finalised_invoices_user_permission','2026-01-05 22:17:26.301931');
INSERT INTO migration_fragment_log VALUES('2.9.1-add_delete_rnr_form_activity_log_enum','2026-01-05 22:17:26.302150');
INSERT INTO migration_fragment_log VALUES('2.9.1-remove_rnr_form_line_entered_losses_default','2026-01-05 22:17:26.316876');
INSERT INTO migration_fragment_log VALUES('2.9.1-add_invoice_line_shipped_pack_size','2026-01-05 22:17:26.318682');
INSERT INTO migration_fragment_log VALUES('2.9.1-invoice_line_shipped_pack_size_sync_buffer','2026-01-05 22:17:26.318978');
INSERT INTO migration_fragment_log VALUES('2.9.2-add_last_fix_ledger_run_key_value_store','2026-01-05 22:17:26.319500');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_contact_table','2026-01-05 22:17:26.322298');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_purchase_order_tables','2026-01-05 22:17:26.323475');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_purchase_order_to_number_type','2026-01-05 22:17:26.323842');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_purchase_order_report_context','2026-01-05 22:17:26.324070');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_item_store_join','2026-01-05 22:17:26.327219');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_purchase_order_permission_enum_values','2026-01-05 22:17:26.327533');
INSERT INTO migration_fragment_log VALUES('2.10.0-rename_cold_storage_type_to_location_type','2026-01-05 22:17:26.348544');
INSERT INTO migration_fragment_log VALUES('2.10.0-delete_unused_number_type','2026-01-05 22:17:26.348858');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_restricted_location_type_id_to_item','2026-01-05 22:17:26.350801');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_goods_received_table','2026-01-05 22:17:26.351474');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_supplier_discount_percentage_to_purchase_order','2026-01-05 22:17:26.353359');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_stock_volume','2026-01-05 22:17:26.360573');
INSERT INTO migration_fragment_log VALUES('2.10.0-stock_volume_sync_buffer','2026-01-05 22:17:26.360926');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_item_variant_enums_to_activity_log','2026-01-05 22:17:26.361195');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_more_dates_to_purchase_order','2026-01-05 22:17:26.364778');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_goods_received_line_table','2026-01-05 22:17:26.365417');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_closed_vial_wastage_reason_option_type','2026-01-05 22:17:26.365721');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_campaign_and_program_to_stocktake_line_row','2026-01-05 22:17:26.369348');
INSERT INTO migration_fragment_log VALUES('2.10.0-rename_vvm_status_level_to_priority','2026-01-05 22:17:26.377335');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_program_id_to_stock_and_invoice_lines','2026-01-05 22:17:26.381119');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_volume_to_location','2026-01-05 22:17:26.382956');
INSERT INTO migration_fragment_log VALUES('2.10.0-reintegrate_location_volume','2026-01-05 22:17:26.383261');
INSERT INTO migration_fragment_log VALUES('2.10.0-rename_cold_storage_type_fk.rs','2026-01-05 22:17:26.383520');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_vvm_status_to_stocktake_line','2026-01-05 22:17:26.385367');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_comment_to_purchase_order_line','2026-01-05 22:17:26.387220');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_goods_received_permission_enum_values','2026-01-05 22:17:26.387509');
INSERT INTO migration_fragment_log VALUES('2.10.0-rename_authorised_to_adjusted_number_of_units','2026-01-05 22:17:26.395573');
INSERT INTO migration_fragment_log VALUES('2.10.0-remove_use_campaigns_pref','2026-01-05 22:17:26.395893');
INSERT INTO migration_fragment_log VALUES('2.10.0-activity_log_goods_received','2026-01-05 22:17:26.396204');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_purchase_order_activity_logs','2026-01-05 22:17:26.396460');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_goods_received_report_context','2026-01-05 22:17:26.396709');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_extra_purchase_order_fields','2026-01-05 22:17:26.401675');
INSERT INTO migration_fragment_log VALUES('2.10.0-add_goods_received_id_to_invoice','2026-01-05 22:17:26.403854');
INSERT INTO migration_fragment_log VALUES('2.10.0-rename_cold_storage_type_activity_log_enum','2026-01-05 22:17:26.404134');
INSERT INTO migration_fragment_log VALUES('2.10.1-add_name_of_insured_to_name_insurance_join','2026-01-05 22:17:26.406219');
INSERT INTO migration_fragment_log VALUES('2.11.0-add_permission_to_verify_inbound_shipment','2026-01-05 22:17:26.406719');
INSERT INTO migration_fragment_log VALUES('2.11.0-update_goods_received_report_context','2026-01-05 22:17:26.406974');
INSERT INTO migration_fragment_log VALUES('2.11.0-add_purchase_order_line_status_enums','2026-01-05 22:17:26.409070');
INSERT INTO migration_fragment_log VALUES('2.11.0-add_ignore_for_orders_to_item_store_join','2026-01-05 22:17:26.410933');
INSERT INTO migration_fragment_log VALUES('2.11.2-add_patient_updated_to_activity_log','2026-01-05 22:17:26.411422');
INSERT INTO migration_fragment_log VALUES('2.12.0-update_purchase_order_status_enum','2026-01-05 22:17:26.411876');
INSERT INTO migration_fragment_log VALUES('2.12.0-update_purchase_order_activity_log_type_enum','2026-01-05 22:17:26.412123');
INSERT INTO migration_fragment_log VALUES('2.12.0-rename_authorised_datetime_to_request_approval_datetime','2026-01-05 22:17:26.420067');
INSERT INTO migration_fragment_log VALUES('2.12.0-add_shipping_method_table','2026-01-05 22:17:26.420597');
INSERT INTO migration_fragment_log VALUES('2.12.0-add_purchase_order_status_logs_to_activity_log_type_enum','2026-01-05 22:17:26.420852');
INSERT INTO migration_fragment_log VALUES('2.12.0-rename_purchase_order_line_price_per_unit_per_pack','2026-01-05 22:17:26.437158');
INSERT INTO migration_fragment_log VALUES('2.12.0-add_skip_dose_option_to_vaccine_course','2026-01-05 22:17:26.439182');
INSERT INTO migration_fragment_log VALUES('2.12.0-add_requisition_auto_finalise_processor_cursor_pg_enum','2026-01-05 22:17:26.439508');
INSERT INTO migration_fragment_log VALUES('2.13.0-add_created_from_req_ids_to_requisition','2026-01-05 22:17:26.443696');
INSERT INTO migration_fragment_log VALUES('2.13.0-add_master_list_to_changelog','2026-01-05 22:17:26.444005');
INSERT INTO migration_fragment_log VALUES('2.13.0-add_margin_to_item_store_join','2026-01-05 22:17:26.445915');
INSERT INTO migration_fragment_log VALUES('2.13.1-reintegrate asset tables','2026-01-05 22:17:26.446486');
INSERT INTO migration_fragment_log VALUES('2.13.1-can_edit_asset_status_permission','2026-01-05 22:17:26.446727');
INSERT INTO migration_fragment_log VALUES('2.13.1-remove_fk_on_asset_internal_location','2026-01-05 22:17:26.452430');
INSERT INTO migration_fragment_log VALUES('2.13.1-update_store_id_for_asset_internal_location_changelog','2026-01-05 22:17:26.452786');
INSERT INTO migration_fragment_log VALUES('2.14.0-add_encounter_changelog_table_name','2026-01-05 22:17:26.453491');
INSERT INTO migration_fragment_log VALUES('2.14.0-requisition_line_add_price_per_unit','2026-01-05 22:17:26.455547');
INSERT INTO migration_fragment_log VALUES('2.14.0-resync_existing_vaccination_encounter_records','2026-01-05 22:17:26.455896');
INSERT INTO migration_fragment_log VALUES('2.15.0-remove_skip_immediate_statuses_in_outbound_pref','2026-01-05 22:17:26.456439');
CREATE TABLE store_preference (
                id TEXT NOT NULL PRIMARY KEY,
                type TEXT DEFAULT 'STORE_PREFERENCES',
                pack_to_one BOOLEAN NOT NULL DEFAULT false
        , response_requisition_requires_authorisation bool NOT NULL DEFAULT false, request_requisition_requires_authorisation bool NOT NULL DEFAULT false, om_program_module bool NOT NULL DEFAULT false, vaccine_module bool NOT NULL DEFAULT false, issue_in_foreign_currency bool NOT NULL DEFAULT false, monthly_consumption_look_back_period REAL DEFAULT 0.0, months_lead_time REAL DEFAULT 0.0, months_overstock REAL DEFAULT 6.0, months_understock REAL DEFAULT 3.0, months_items_expire REAL DEFAULT 3.0, stocktake_frequency REAL DEFAULT 1.0, extra_fields_in_requisition BOOLEAN NOT NULL DEFAULT FALSE, keep_requisition_lines_with_zero_requested_quantity_on_finalised BOOLEAN NOT NULL DEFAULT FALSE, use_consumption_and_stock_from_customers_for_internal_orders BOOLEAN NOT NULL DEFAULT FALSE, manually_link_internal_order_to_inbound_shipment BOOLEAN NOT NULL DEFAULT FALSE, edit_prescribed_quantity_on_prescription
                BOOLEAN NOT NULL DEFAULT FALSE);
CREATE TABLE name_tag (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
CREATE TABLE name_tag_join (
                id TEXT NOT NULL PRIMARY KEY,
                name_tag_id TEXT NOT NULL REFERENCES name_tag(id)
            , name_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration');
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
            , is_emergency BOOLEAN NOT NULL DEFAULT FALSE, max_items_in_emergency_order INTEGER NOT NULL DEFAULT 0);
CREATE TABLE barcode (
                id text NOT NULL PRIMARY KEY,
                gtin text NOT NULL UNIQUE,
                item_id text NOT NULL REFERENCES item(id),
                parent_id text
            , is_sync_update bool NOT NULL DEFAULT False, manufacturer_link_id TEXT REFERENCES name_link(id), pack_size REAL);
CREATE TABLE context (
          id TEXT NOT NULL PRIMARY KEY,
          name TEXT NOT NULL
        );
INSERT INTO context VALUES('Patient','Patient context');
INSERT INTO context VALUES('Immunisation','Immunisation context');
INSERT INTO context VALUES('missing_program','missing_program');
CREATE TABLE contact_trace (
          id TEXT NOT NULL PRIMARY KEY,
          program_id TEXT NOT NULL REFERENCES program(id),
          document_id TEXT NOT NULL REFERENCES document(id),
          datetime TIMESTAMP,
          contact_trace_id TEXT,
          first_name TEXT,
          last_name TEXT,
          gender TEXT,
          date_of_birth TIMESTAMP,
          store_id TEXT REFERENCES store(id)
        , relationship TEXT, patient_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration', contact_patient_link_id TEXT REFERENCES name_link (id));
CREATE TABLE sensor (
                id TEXT NOT NULL PRIMARY KEY,
                serial TEXT NOT NULL,
                name TEXT NOT NULL,
                is_active BOOLEAN,
                store_id TEXT NOT NULL REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                battery_level INTEGER,
                log_interval INTEGER,
                last_connection_datetime TEXT,
                type TEXT
            );
CREATE TABLE temperature_breach (
                id TEXT NOT NULL PRIMARY KEY,
                duration_milliseconds INTEGER NOT NULL,
                type TEXT NOT NULL,
                sensor_id TEXT NOT NULL REFERENCES sensor(id),
                store_id TEXT NOT NULL REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                start_datetime TEXT NOT NULL,
                end_datetime TEXT,
                unacknowledged BOOLEAN,
                threshold_minimum REAL NOT NULL,
                threshold_maximum REAL NOT NULL,
                threshold_duration_milliseconds INTEGER NOT NULL
            , comment TEXT);
CREATE TABLE temperature_log (
                id TEXT NOT NULL PRIMARY KEY,
                temperature REAL NOT NULL,
                sensor_id TEXT NOT NULL REFERENCES sensor(id),
                store_id TEXT NOT NULL REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                datetime TEXT NOT NULL,
                temperature_breach_id TEXT REFERENCES temperature_breach(id)
            );
CREATE TABLE currency (
            id TEXT NOT NULL PRIMARY KEY,
            rate REAL NOT NULL,
            code TEXT NOT NULL,
            is_home_currency BOOLEAN NOT NULL DEFAULT FALSE,
            date_updated TEXT
        , is_active BOOLEAN NOT NULL DEFAULT TRUE);
CREATE TABLE item_link (
            id TEXT NOT NULL PRIMARY KEY,
            item_id TEXT NOT NULL REFERENCES item(id)
        );
CREATE TABLE master_list_line (
                id TEXT NOT NULL PRIMARY KEY,
                item_link_id TEXT NOT NULL REFERENCES item_link(id),
                master_list_id TEXT NOT NULL REFERENCES master_list(id)
            , price_per_unit REAL);
CREATE TABLE name_link (
            id TEXT NOT NULL PRIMARY KEY,
            name_id TEXT NOT NULL REFERENCES name(id)
        );
CREATE TABLE changelog (
            cursor INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            -- the table name where the change happened
            table_name TEXT NOT NULL,
            -- row id of the modified row
            record_id TEXT NOT NULL,
            row_action TEXT NOT NULL,
            -- Below fields are extracted from associated record where it's deemed necessary (see changelog/README.md)
            name_link_id TEXT REFERENCES name_link(id), -- RENAMED from name_id
            store_id TEXT,
            is_sync_update BOOLEAN NOT NULL DEFAULT FALSE
        , source_site_id INTEGER);
CREATE TABLE master_list_name_join (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT NOT NULL REFERENCES master_list(id),
                name_link_id TEXT NOT NULL REFERENCES name_link(id)
            );
CREATE TABLE program_event (
            id TEXT NOT NULL PRIMARY KEY,
            patient_link_id TEXT REFERENCES name(id),
            datetime TIMESTAMP NOT NULL,
            active_start_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_start_datetime),
            active_end_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_end_datetime),
            document_type TEXT NOT NULL,
            document_name TEXT,
            type TEXT NOT NULL,
            data TEXT,
            context_id TEXT REFERENCES context(id)
        );
CREATE TABLE clinician_link (
            id TEXT NOT NULL PRIMARY KEY,
            clinician_id TEXT NOT NULL REFERENCES clinician(id)
        );
CREATE TABLE asset_class (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            UNIQUE (name)
        );
INSERT INTO asset_class VALUES('fad280b6-8384-41af-84cf-c7b6b4526ef0','Cold chain equipment');
CREATE TABLE asset_category (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            asset_class_id TEXT NOT NULL REFERENCES asset_class (id),
            UNIQUE (asset_class_id, name)
        );
INSERT INTO asset_category VALUES('b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','Insulated containers','fad280b6-8384-41af-84cf-c7b6b4526ef0');
INSERT INTO asset_category VALUES('02cbea92-d5bf-4832-863b-c04e093a7760','Refrigerators and freezers','fad280b6-8384-41af-84cf-c7b6b4526ef0');
INSERT INTO asset_category VALUES('7db32eb6-5929-4dd1-a5e9-01e36baa73ad','Cold rooms and freezer rooms','fad280b6-8384-41af-84cf-c7b6b4526ef0');
CREATE TABLE asset_catalogue_type (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            asset_category_id TEXT NOT NULL REFERENCES asset_category (id),
            UNIQUE (asset_category_id, name)
        );
INSERT INTO asset_catalogue_type VALUES('99906787-bd32-4ec2-bd2d-ba5547622bb0','Cold box - long range','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_catalogue_type VALUES('bbab79fe-8112-4f90-aabc-726f88a15410','Cold box - short range','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_catalogue_type VALUES('c9017d0b-ce3c-40f1-9986-e4afe0185ddd','Combined ice-lined refrigerator / freezer','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('0e58c7e6-e603-4513-a088-79fe9f08e22f','Combined refrigerator / freezer','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Freezer','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('05d9a49a-4d94-4e00-9728-2549ad323544','Ultralow freezer','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('4d7302b8-e47b-42fd-ac5e-4645376aa349','Ice-lined refrigerator','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('f2f2756e-0c15-49fd-bb01-3f45886e4870','Long-term passive storage device','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_catalogue_type VALUES('fd79171f-5da8-4801-b299-9426f34310a8','Refrigerator','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Solar direct drive combined refrigerator / freezer','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('525b614e-f9f5-4866-9553-24bad2b7b826','Solar direct drive freezer','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('d4434727-dc35-437d-a5fa-739a491381b7','Solar direct drive refrigerator','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Vaccine carrier','02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO asset_catalogue_type VALUES('ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Vaccine carrier - freeze-free','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO asset_catalogue_type VALUES('9a4ad0dd-138a-41b2-81df-08772635085e','Cold room','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
INSERT INTO asset_catalogue_type VALUES('6d49edfd-a12b-43c8-99fb-3300d67e0192','Freezer room','7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
CREATE TABLE asset_catalogue_item (
            id TEXT NOT NULL PRIMARY KEY,
            code TEXT NOT NULL,
            sub_catalogue TEXT NOT NULL,
            asset_class_id TEXT NOT NULL REFERENCES asset_class(id),
            asset_category_id TEXT NOT NULL REFERENCES asset_category(id),
            asset_catalogue_type_id TEXT NOT NULL REFERENCES asset_catalogue_type(id),
            manufacturer TEXT,
            model TEXT NOT NULL,
            deleted_datetime TEXT, properties TEXT,
            UNIQUE (code)
        );
INSERT INTO asset_catalogue_item VALUES('4f13efbe-4349-4fc3-ac22-584728003e63','E004/004','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','B Medical Systems Sarl','RCW12',NULL,'{"external_dimensions":"25.1 x 17.6 x 20.9","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('61fd9f8f-fa2c-4b91-b67c-aa4810ad089c','E004/005','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','B Medical Systems Sarl','RCW25',NULL,'{"external_dimensions":"40.6 x 25.2 x 20.2","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('88ebf779-dce3-4814-b4d4-38fbbd7d3437','E004/010','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Apex International','AICB-444L',NULL,'{"external_dimensions":"76.1 x 61.1 x 51.3","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('6b472fc0-41dd-4aa1-857c-905a2e882f0b','E004/013','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Nilkamal Limited','RCB-444L',NULL,'{"external_dimensions":"77.4 x 61.6 x 53","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1487cb9b-7766-4936-a296-c70bc284712d','E004/015','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','AOV International LLP','ACB-503L',NULL,'{"external_dimensions":"77 x 61 x 51","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5e65703e-edd7-4af4-ac01-2467c4d463e6','E004/018','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Blowkings','CB-12-CF',NULL,'{"external_dimensions":"61 x 60 x 56","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b748254f-c741-4e85-8fe1-2f11a6345b08','E004/023','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','AOV International LLP','ACB-264SL',NULL,'{"external_dimensions":"62.4 x 50.2 x 42.6","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8934933b-cfc1-46d3-a799-f44561b5f6b4','E004/024','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','AOV International LLP','ACB-316L',NULL,'{"external_dimensions":"77 x 61.8 x 51.3","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('0e5164dc-eb2d-4b8f-bfb0-f622de78385b','E004/025','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Blowkings','CB-20-CF',NULL,'{"external_dimensions":"79.5 x 58.2 x 56.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('ade1062d-cbcc-4cfc-ad11-4b4645458070','E004/031','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Apex International','AICB 503L',NULL,'{"external_dimensions":"76.5 x 61.2 x 51.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8c6da895-1b20-4089-9a4d-d91d5038b471','E004/034','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Nilkamal Limited','RCB 264SL',NULL,'{"external_dimensions":"65 x 53 x 46","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('7b4ef131-10fa-4e35-a70c-ccc9ef76478e','E004/036','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Nilkamal Limited','RCB 444L-A',NULL,'{"external_dimensions":"77 x 62 x 53.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('38651428-95be-4d16-8b2a-5e779f47f91a','E004/045','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Apex International','AICB-156L',NULL,'{"external_dimensions":"54 x 44.5 x 41.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('28b111ca-9243-48e3-8f2d-6c67a8019e23','E004/046','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Apex International','AICB-316L',NULL,'{"external_dimensions":"77 x 61.5 x 51.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('9894255b-fcea-43fb-b3a4-01291aabe2af','E004/067','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Nilkamal Limited','RCB503L',NULL,'{"external_dimensions":"78.5 x 63.2 x 53.3","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('05a85d7b-9a25-40ce-a11e-a8a88e18a873','E004/068','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Nilkamal Limited','RCB316L',NULL,'{"external_dimensions":"78.5 x 63.2 x 53.3","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('50f9769d-a042-49ab-8433-b1d9e63d2345','E004/069','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','99906787-bd32-4ec2-bd2d-ba5547622bb0','Qingdao Leff International Trading Co Ltd','FHCB23-0624',NULL,'{"external_dimensions":"77.5 x 54.5 x 48.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('86dbb025-30ab-457a-981f-9d34841f9188','E004/003','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','B Medical Systems Sarl','RCW8',NULL,'{"external_dimensions":"32.6 x 10.7 x 20.2","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('08b04f35-6026-4ddf-b141-2eaefac25307','E004/017','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','AOV International LLP','ACB 246LS',NULL,'{"external_dimensions":"39.9 x 39.6 x 14.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1b92ae8c-2841-4040-bda8-3412b52adcff','E004/019','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','Blowkings','CB-55-CF',NULL,'{"external_dimensions":"49 x 44 x 39.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('dfda32ea-1f5b-4d42-8526-d64ec68f80fe','E004/026','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','Nilkamal Limited','RCB246LS',NULL,'{"external_dimensions":"65 x 65 x 37","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('01bd1a67-ee4e-4c0b-aa52-5821bf721bdd','E004/027','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','Nilkamal Limited','RCB324SS',NULL,'{"external_dimensions":"65 x 65 x 37","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('fa0b89b9-9cae-4840-882b-d04c63f28cc6','E004/030','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','Apex International','AICB-243s',NULL,'{"external_dimensions":"54.4 x 44.5 x 42","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('3f5a5232-77b6-4bbe-bbfc-017155c3b3db','E004/042','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','EBAC CO. Ltd.','EBT-30',NULL,'{"external_dimensions":"50 x 37 x 38","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('6f360126-45fa-41a3-8439-2cb5aa45cc8b','E004/056','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','bbab79fe-8112-4f90-aabc-726f88a15410','Nilkamal Limited','RCB244SS',NULL,'{"external_dimensions":"49.3 x 45.5 x 39.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f17c924d-cb72-431d-8a00-514a50570449','E003/070','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','c9017d0b-ce3c-40f1-9986-e4afe0185ddd','Vestfrost Solutions','VLS 064 RF AC',NULL,'{"storage_capacity_5c":52.5,"storage_capacity_20c":5.1,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"84.5 x 72.5 x 71","waterpack_storage_capacity":3.6,"waterpack_freezing_capacity":1.6,"energy_consumption_stable":0.63,"energy_consumption_freezing":1.8,"hold_over_time":45.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('3721143e-6aca-4686-b94b-a09ab064b9c4','E003/123','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','c9017d0b-ce3c-40f1-9986-e4afe0185ddd','B Medical Systems Sarl','TCW120AC',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":120.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91 x 162 x 79","waterpack_freezing_capacity":1.6,"hold_over_time":72.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('db64a976-85cd-497e-a960-476a50753a21','E003/131','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','c9017d0b-ce3c-40f1-9986-e4afe0185ddd','Qingdao Haier Biomedical Co., Ltd','HBD265',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":211.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"164.7 x 71.7 x 94","energy_consumption_stable":1.42,"energy_consumption_freezing":1.4,"hold_over_time":11.42,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('57a4b8f7-0863-4a8d-a24a-1ee81dc61648','E003/097','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','0e58c7e6-e603-4513-a088-79fe9f08e22f','Qingdao Haier Biomedical Co., Ltd','HBCD-90',NULL,'{"storage_capacity_5c":30.0,"storage_capacity_20c":32.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"87.2 x 112.8 x 71.7","waterpack_storage_capacity":16.0,"waterpack_freezing_capacity":4.0,"energy_consumption_stable":0.7,"energy_consumption_freezing":0.97,"hold_over_time":63.8,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd','E003/103','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','0e58c7e6-e603-4513-a088-79fe9f08e22f','Godrej & Boyce MFG. Co. Ltd.','GVR 55 FF AC',NULL,'{"storage_capacity_5c":58.0,"storage_capacity_20c":44.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"182 x 79.5 x 75","waterpack_storage_capacity":14.4,"waterpack_freezing_capacity":2.4,"energy_consumption_stable":1.91,"energy_consumption_freezing":1.91,"hold_over_time":113.62,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('cb1167ed-683f-4bb0-a67b-129231af7dda','E003/138','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','0e58c7e6-e603-4513-a088-79fe9f08e22f','B Medical Systems Sarl','TVW4000AC',NULL,'{"storage_capacity_5c":240.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"160 x 78 x 91.5","waterpack_storage_capacity":252.0,"waterpack_freezing_capacity":24.0,"energy_consumption_stable":4.45,"energy_consumption_freezing":4.45,"hold_over_time":50.15,"climate_zone":"Hot","freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('7d73bfdb-76ca-4cfa-ac52-6215048bebbb','E003/060','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Qingdao Aucma Global Medical Co.,Ltd.','DW-25W147',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":96.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"79 X 59.5 X 880","waterpack_storage_capacity":19.4,"waterpack_freezing_capacity":14.5,"energy_consumption_stable":3.31,"energy_consumption_freezing":2.81,"hold_over_time":6.73,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3','E003/061','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Qingdao Aucma Global Medical Co.,Ltd.','DW-25W300',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":240.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"122.6 x 79 x 945","waterpack_storage_capacity":44.3,"waterpack_freezing_capacity":38.3,"energy_consumption_stable":3.37,"energy_consumption_freezing":3.54,"hold_over_time":58.6,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('0bbf332d-52bd-41aa-ba7d-d7709f08eeed','E003/127','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Western Refrigeration Private Limited','VFW140H-HC',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":68.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"71 x 72 x 95.5","waterpack_storage_capacity":72.5,"waterpack_freezing_capacity":16.2,"energy_consumption_stable":1.94,"freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c7d48b5c-74b2-4077-94f5-2b25d67a447b','E003/002','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Qingdao Haier Biomedical Co., Ltd','HBD 116',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":121.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"82 x 67 x 63","waterpack_storage_capacity":81.6,"waterpack_freezing_capacity":12.0,"energy_consumption_stable":0.38,"energy_consumption_freezing":3.77,"hold_over_time":2.5,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('23bcee45-886e-42c3-8661-4e56b9bb6ff0','E003/003','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Qingdao Haier Biomedical Co., Ltd','HBD 286',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":298.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"81.8 x 124 x 63","waterpack_storage_capacity":186.0,"waterpack_freezing_capacity":16.8,"energy_consumption_stable":4.36,"hold_over_time":4.15,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5','E003/023','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Vestfrost Solutions','MF 314',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":281.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"84 x 156 x 70","waterpack_storage_capacity":153.6,"waterpack_freezing_capacity":7.2,"energy_consumption_stable":4.23,"energy_consumption_freezing":4.24,"hold_over_time":4.0,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b1278bbb-e818-4bb5-9839-2b8b287c637e','E003/024','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Vestfrost Solutions','MF 114',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":105.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"84 x 72 x 70","waterpack_storage_capacity":38.4,"waterpack_freezing_capacity":7.2,"energy_consumption_stable":2.24,"energy_consumption_freezing":3.33,"hold_over_time":2.8,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('33cad6a0-4e2c-4b0f-8bb0-c1961aba8740','E003/025','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Vestfrost Solutions','MF 214',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":171.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"84 x 113 x 70","waterpack_storage_capacity":96.0,"waterpack_freezing_capacity":7.2,"energy_consumption_stable":3.0,"energy_consumption_freezing":3.56,"hold_over_time":2.9,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8cd56b7f-6f4e-478e-be9b-33b54d8a0c97','E003/126','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Qingdao Haier Biomedical Co., Ltd','HBD-86',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":61.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"78.8 x 71.7 x 87.2","energy_consumption_stable":0.95,"hold_over_time":7.32,"climate_zone":"Hot","freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('536d23cd-f797-4558-8fa8-c509077a229e','E003/128','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Western Refrigeration Private Limited','VFW310H-HC',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":166.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"123 x 72 x 96.5","waterpack_storage_capacity":203.0,"waterpack_freezing_capacity":28.2,"energy_consumption_stable":2.27,"climate_zone":"Hot","freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e779cf64-d940-4500-98f2-171fbd0f3ec9','E003/130','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','Godrej & Boyce MFG. Co. Ltd.','GMF 200 ECO lite',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":153.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"76.2 x 82.5 x 85","waterpack_storage_capacity":130.8,"waterpack_freezing_capacity":20.91,"energy_consumption_stable":4.13,"hold_over_time":9.82,"climate_zone":"Hot","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e6be81b8-151f-4e90-87e9-f8af776c7252','E003/071','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','710194ce-8c6c-47ab-b7fe-13ba8cf091f6','B Medical Systems Sarl','TFW 3000 AC',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":204.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"91 x 127 x 78","waterpack_storage_capacity":97.2,"waterpack_freezing_capacity":32.4,"energy_consumption_stable":2.15,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('42fe34c3-9f9d-4a2a-b15d-6177f7586e43','E003/125','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','05d9a49a-4d94-4e00-9728-2549ad323544','B Medical Systems Sarl','U201',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":0.0,"storage_capacity_70c":214.0,"refrigerant_type":"R290","external_dimensions":"129.3 x 69.9 x 103.9","energy_consumption_stable":13.5,"freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('9d77cc99-6098-438a-8242-0bb55a450b49','E003/007','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','MK 304',NULL,'{"storage_capacity_5c":105.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"84 x 69 x 126","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":3.2,"hold_over_time":25.6,"climate_zone":"Hot, Temperate, Cold","freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753','E003/011','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','MK 204',NULL,'{"storage_capacity_5c":75.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"84 x 70 x 92","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.89,"hold_over_time":20.1,"climate_zone":"Hot","freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('981c12f8-b054-4793-aab1-4f8363b4191c','E003/022','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','MK 144',NULL,'{"storage_capacity_5c":48.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"88 x 96.5 x 71","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":2.3,"hold_over_time":43.13,"climate_zone":"Hot","freeze_protection":"Not tested","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('53a49c7e-168d-4599-8a5e-5da9281914c4','E003/044','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Zero Appliances (Pty) Ltd','ZLF 150 AC (SureChill ®)',NULL,'{"storage_capacity_5c":128.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"190 x 85 x 72","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.98,"energy_consumption_freezing":2.03,"hold_over_time":128.2,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('aee18a7b-0b1f-4448-a08d-37b9d61c240c','E003/051','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Zero Appliances (Pty) Ltd','ZLF30 AC (SureChill ®)',NULL,'{"storage_capacity_5c":27.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"102.8 x 61.9 x 56.3","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.68,"energy_consumption_freezing":2.56,"hold_over_time":77.2,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('2f74670b-5081-42d5-852c-8ce392b6a536','E003/066','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','B Medical Systems Sarl','TCW 4000 AC',NULL,'{"storage_capacity_5c":240.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91.5 x 162.5 x 78","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.85,"hold_over_time":77.3,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f1ba0107-8465-44f2-aa3b-36944dce498a','E003/072','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Dulas Ltd','VC225ILR',NULL,'{"storage_capacity_5c":184.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"98 x 128.2 x 74","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":803.0,"hold_over_time":94.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('6f9f4cf0-7d70-4448-8b0a-57ecf3361912','E003/079','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Qingdao Aucma Global Medical Co.,Ltd.','CFD-50',NULL,'{"storage_capacity_5c":50.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"158.8 x 54.5 x 65.5","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.54,"hold_over_time":120.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d3920fb9-7927-4549-ab3b-fd13498fb570','E003/080','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GVR 51 LITE AC',NULL,'{"storage_capacity_5c":51.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"151.5 x 61.8 x 77.4","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.63,"hold_over_time":89.72,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('59a197c5-76ab-47ec-84fc-8a2802f1d1be','E003/081','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GVR 75 Lite',NULL,'{"storage_capacity_5c":72.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"151.5 x 61.8 x 77.4","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.47,"hold_over_time":81.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5f5b435f-8520-4dbf-84db-4db43f0ebbd0','E003/082','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GVR 99 Lite',NULL,'{"storage_capacity_5c":98.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"170 x 61.8 x 77.4","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.23,"hold_over_time":59.56,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('92a77272-d0c0-43f6-85ec-647c9447f194','E003/083','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GVR 225 AC',NULL,'{"storage_capacity_5c":225.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"183 x 79.5 x 75","waterpack_freezing_capacity":0.0,"energy_consumption_stable":2.04,"hold_over_time":55.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f7270d64-1680-4928-9fa4-a0ab01af698c','E003/087','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Qingdao Haier Biomedical Co., Ltd','HBC-260',NULL,'{"storage_capacity_5c":211.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"94 x 164.7 x 71.7","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.62,"hold_over_time":62.23,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('087e7310-8781-412f-99b6-f3b0c0afd7eb','E003/088','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Qingdao Haier Biomedical Co., Ltd','HBC-150',NULL,'{"storage_capacity_5c":122.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"87.2 x 112.8 x 71.7","waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.54,"hold_over_time":60.83,"freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('6baa49bf-4412-42d0-a50d-c4758f96a071','E003/089','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Qingdao Haier Biomedical Co., Ltd','HBC-80',NULL,'{"storage_capacity_5c":61.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"87.2 x 112.8 x 71.7","waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.57,"hold_over_time":59.85,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8','E003/096','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Zero Appliances (Pty) Ltd','ZLF80AC (SureChill®)',NULL,'{"storage_capacity_5c":77.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"167 x 85 x 71","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.4,"hold_over_time":105.28,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b50409f4-89d5-4cef-a6e0-6185e2df9ce7','E003/100','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','B Medical Systems Sarl','TCW 40R AC',NULL,'{"storage_capacity_5c":36.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"103 x 78 x 89","waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.8,"hold_over_time":121.9,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('9cb9524f-b96d-4750-8d1d-28a3f239ef2b','E003/101','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','B Medical Systems Sarl','TCW 80 AC',NULL,'{"storage_capacity_5c":80.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"103 x 78 x 90","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.16,"hold_over_time":72.15,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('a1e4b0e1-f1e2-4217-b8c9-906ef901b14c','E003/110','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','VLS 304A AC',NULL,'{"storage_capacity_5c":98.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"85 x 92 x 70","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.6,"hold_over_time":55.5,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('a609ed46-7cc3-4c3f-bf6e-de406fdac81a','E003/111','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','VLS 354A AC',NULL,'{"storage_capacity_5c":127.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"85 x 113 x 70","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.62,"hold_over_time":54.7,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c19638fd-cefc-4369-9284-6fd67e4830ab','E003/112','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','VLS 404A AC',NULL,'{"storage_capacity_5c":145.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"86 x 127 x 70","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.67,"hold_over_time":55.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f6011b71-4590-4d4a-bf12-0bd04cd79d4a','E003/113','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','VLS 504A AC',NULL,'{"storage_capacity_5c":242.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"84.5 x 156.3 x 70","waterpack_freezing_capacity":0.0,"energy_consumption_stable":638.0,"hold_over_time":55.27,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e8bfd677-cd75-4344-bf3f-696abe951c71','E003/114','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Qingdao Haier Biomedical Co., Ltd','HBC-120',NULL,'{"storage_capacity_5c":100.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"89 x 82.9 x 142.5","waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.4,"hold_over_time":128.8,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5bf69a09-f734-4689-b1b6-2856155f3546','E003/115','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Qingdao Haier Biomedical Co., Ltd','HBC-240',NULL,'{"storage_capacity_5c":200.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"89 x 82.9 x 182","waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.44,"hold_over_time":87.23,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('2ce1032f-311e-420e-a854-bef87c3147e5','E003/120','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Vestfrost Solutions','VLS 174A AC',NULL,'{"storage_capacity_5c":38.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"95 x 55 x 65","waterpack_freezing_capacity":0.0,"energy_consumption_stable":504.0,"hold_over_time":57.52,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('cd9caec3-bf95-4ce3-a1f6-64e3e11b390a','E003/122','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Coolfinity Medical B.V.','IceVolt 300P',NULL,'{"storage_capacity_5c":241.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"67 x 73 x 199.9","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":2.98,"hold_over_time":25.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d087d824-efa1-494a-90a8-f3a9d1519c61','E003/133','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Western Refrigeration Private Limited','I425H120',NULL,'{"storage_capacity_5c":192.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"132 x 80.5 x 97","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.5,"climate_zone":"Hot, Temperate, Cold","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('08b2711a-912b-4023-a94c-62f2f7ff15da','E003/136','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GHR 200 AC',NULL,'{"storage_capacity_5c":226.4,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"126 x 84.6 x 84.7","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.67,"hold_over_time":34.99,"freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('bb658a06-2699-43ca-a700-cd5604838a60','E003/137','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GHR 90 AC',NULL,'{"storage_capacity_5c":103.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"76.2 x 84.6 x 84.7","waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.64,"hold_over_time":25.95,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('869ff8de-9c4b-4425-a894-0b0c6cd3bf14','E003/139','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','4d7302b8-e47b-42fd-ac5e-4645376aa349','Godrej & Boyce MFG. Co. Ltd.','GHR 150 AC',NULL,'{"storage_capacity_5c":164.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"10.1 x 84.2 x 84.5","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":1.77,"hold_over_time":40.22,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('bc0bad9a-744a-46f4-bb65-bc317897cd0b','E004/041','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','f2f2756e-0c15-49fd-bb01-3f45886e4870','Qingdao Aucma Global Medical Co.,Ltd.','ARKTEK™ model YBC-5 (P6)',NULL,'{"external_dimensions":"52.8 x 74.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('781f4e20-e317-4e8a-b7c8-263c95d6b675','E003/109','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','fd79171f-5da8-4801-b299-9426f34310a8','Vestfrost Solutions','VLS 204A',NULL,'{"storage_capacity_5c":60.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"85 x 73 x 70","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.57,"hold_over_time":54.0,"freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('783da0b3-f157-46a2-9b78-1430b8680753','E003/035','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','B Medical Systems Sarl','TCW 2000 SDD',NULL,'{"storage_capacity_5c":99.0,"storage_capacity_20c":42.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"127 x 78 x 91","waterpack_storage_capacity":14.4,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":94.0,"climate_zone":"Temperate","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('7b54d581-13c6-4f70-8a2f-a736fb12c881','E003/042','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','B Medical Systems Sarl','TCW 40 SDD',NULL,'{"storage_capacity_5c":36.0,"storage_capacity_20c":4.8,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"90 x 78 x 103","waterpack_storage_capacity":3.6,"waterpack_freezing_capacity":1.89,"energy_consumption_stable":0.0,"hold_over_time":94.4,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('6ff0747c-1639-403b-95e9-7e1dbca8a917','E003/043','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','B Medical Systems Sarl','TCW 2043 SDD',NULL,'{"storage_capacity_5c":70.0,"storage_capacity_20c":42.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91 x 127 x 78","waterpack_storage_capacity":10.5,"waterpack_freezing_capacity":2.5,"energy_consumption_stable":0.0,"hold_over_time":79.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('222111ec-4aa3-41ce-8c35-b86f3fa08d23','E003/048','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Dulas Ltd','VC150SDD',NULL,'{"storage_capacity_5c":102.0,"storage_capacity_20c":42.9,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"98 x 128.2 x 74","waterpack_storage_capacity":8.1,"waterpack_freezing_capacity":2.04,"energy_consumption_stable":0.0,"hold_over_time":83.7,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1b2c352a-5c69-4b76-a411-d93be56cc05a','E003/057','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Qingdao Haier Biomedical Co., Ltd','HTCD-160-SDD',NULL,'{"storage_capacity_5c":100.0,"storage_capacity_20c":40.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"169.5 x 86.5 x 82.5","waterpack_storage_capacity":10.68,"waterpack_freezing_capacity":2.08,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f400cd20-29f2-42c6-9805-df6458eba554','E003/074','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Qingdao Haier Biomedical Co., Ltd','HTCD 90 SDD',NULL,'{"storage_capacity_5c":37.5,"storage_capacity_20c":32.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"72 x 87.5 x 112.8","waterpack_storage_capacity":12.0,"waterpack_freezing_capacity":2.43,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84','E003/077','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','B Medical Systems Sarl','TCW15 SDD',NULL,'{"storage_capacity_5c":16.0,"storage_capacity_20c":2.4,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"95 x 73 x 73","waterpack_storage_capacity":2.4,"waterpack_freezing_capacity":1.97,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('eda9ae25-6184-4141-80a0-e1b0940f7f1d','E003/091','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Vestfrost Solutions','VLS 026 RF SDD',NULL,'{"storage_capacity_5c":20.0,"storage_capacity_20c":34.3,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"88 x 111 x 65","waterpack_storage_capacity":17.4,"waterpack_freezing_capacity":1.8,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('fff04c75-2f70-45e2-ac3b-89c054240ca7','E003/092','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Vestfrost Solutions','VLS 056 RF SDD',NULL,'{"storage_capacity_5c":36.0,"storage_capacity_20c":34.3,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"88 x 111 x 65","waterpack_storage_capacity":17.4,"waterpack_freezing_capacity":1.8,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8a64271b-011d-4320-a1da-66c6bed2befa','E003/095','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Godrej & Boyce MFG. Co. Ltd.','GVR 55 FF DC',NULL,'{"storage_capacity_5c":58.0,"storage_capacity_20c":44.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"183 x 79.5 x 75","waterpack_storage_capacity":14.4,"waterpack_freezing_capacity":2.4,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('7964fff0-ea1d-46ff-88fd-4e9c9eacc685','E003/119','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Vestfrost Solutions','VLS 076 RF SDD',NULL,'{"storage_capacity_5c":61.25,"storage_capacity_20c":34.3,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"96 x 128 x 65","waterpack_storage_capacity":17.4,"waterpack_freezing_capacity":1.8,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('beb89f3c-e33b-4ab2-9032-69f313681c24','E003/129','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Qingdao Aucma Global Medical Co.,Ltd.','TCD-100',NULL,'{"storage_capacity_5c":48.0,"storage_capacity_20c":38.0,"storage_capacity_70c":0.0,"refrigerant_type":"R290","external_dimensions":"105 x 75 x 97.5","waterpack_storage_capacity":10.7,"waterpack_freezing_capacity":2.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7','E003/132','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','Vestfrost Solutions','VLS 096A RF SDD',NULL,'{"storage_capacity_5c":110.0,"storage_capacity_20c":50.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"87 x 151 x 74","waterpack_storage_capacity":17.4,"waterpack_freezing_capacity":2.4,"hold_over_time":114.33,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e2e9d099-5eea-422c-95b6-e1dfc536b9eb','E003/124','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','8b32f63b-28ac-4c31-94dc-55ddb5aa131a','B Medical Systems Sarl','TCW120SDD',NULL,'{"storage_capacity_5c":120.0,"storage_capacity_20c":28.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91 x 162 x 79","waterpack_freezing_capacity":1.6,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('bcf6e728-1df6-4b30-bd24-300981eecbaa','E003/073','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','525b614e-f9f5-4866-9553-24bad2b7b826','B Medical Systems Sarl','TFW 40 SDD',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":64.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"90 x 103 78","waterpack_storage_capacity":11.24,"waterpack_freezing_capacity":2.16,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('4901660d-315f-4c1c-9550-db33e8bed04f','E003/086','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','525b614e-f9f5-4866-9553-24bad2b7b826','Qingdao Haier Biomedical Co., Ltd','HTD-40',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":48.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"72 x 87.5 x 78.8","waterpack_storage_capacity":20.0,"waterpack_freezing_capacity":2.4,"hold_over_time":120.0,"climate_zone":"Hot","freeze_protection":"Not tested","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8948b544-8283-4d19-b523-bfff7ef10967','E003/099','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','525b614e-f9f5-4866-9553-24bad2b7b826','Vestfrost Solutions','VFS 048 SDD',NULL,'{"storage_capacity_5c":0.0,"storage_capacity_20c":34.3,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"85 x 55.5 x 65","waterpack_storage_capacity":17.4,"waterpack_freezing_capacity":1.6,"energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5752325d-f156-45d2-ae37-3905edf43690','E003/030','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','TCW 3000 SDD',NULL,'{"storage_capacity_5c":156.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91 x 127 x 78","waterpack_storage_capacity":9.6,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":94.08,"climate_zone":"Temperate","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b5c76f4d-c0ef-4260-897c-f8e661ec1b68','E003/037','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Zero Appliances (Pty) Ltd','ZLF 100 DC (SureChill ®)',NULL,'{"storage_capacity_5c":93.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"180 x 85 x 73","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":125.0,"climate_zone":"Temperate","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d3239141-6073-4fb0-b3ea-55664a415917','E003/040','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Dulas Ltd','VC200SDD',NULL,'{"storage_capacity_5c":132.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"98 x 128.2 x 74","waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('48a73892-0391-48e6-bea7-a2c5e7963ad3','E003/045','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','TCW 3043 SDD',NULL,'{"storage_capacity_5c":89.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91 x 127 x 78","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":124.8,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('4b40f057-a760-4944-9672-cd4f34810fae','E003/049','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Godrej & Boyce MFG. Co. Ltd.','GVR 50DC SDD',NULL,'{"storage_capacity_5c":46.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"121.5 x 79.5 x75","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":119.2,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173','E003/050','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Godrej & Boyce MFG. Co. Ltd.','GVR 100 DC (SureChill®)',NULL,'{"storage_capacity_5c":99.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"182 x 79.5 x 75","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('ca835a1e-984d-46b5-b7e0-67d26dbbd630','E003/052','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Zero Appliances (Pty) Ltd','ZLF 150 DC (SureChill ®)',NULL,'{"storage_capacity_5c":128.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R134A","external_dimensions":"189 x 83 x 71","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":167.9,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0','E003/055','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Zero Appliances (Pty) Ltd','ZLF 30DC SDD (SureChill ®)',NULL,'{"storage_capacity_5c":27.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"102.5 x 56 x 60","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":87.27,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f1d7348d-f38d-4a74-ab0a-45227b89d314','E003/058','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Dulas Ltd','Dulas VC110SDD',NULL,'{"storage_capacity_5c":110.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"98 x 128.2 x 74","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":91.65,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('03a22d21-658c-4b4d-92f7-ae0b5e5f96ce','E003/059','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Dulas Ltd','VC88SDD',NULL,'{"storage_capacity_5c":88.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"98 x 128.2 x 74","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":1.65,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('af28530e-b31a-4359-9209-fdf1d7b38f1e','E003/067','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','TCW 15R SDD',NULL,'{"storage_capacity_5c":16.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"95 x 73 x 73","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":7.7,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('589736aa-d375-4905-9ff7-4faae9eedece','E003/068','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','TCW 40R SDD',NULL,'{"storage_capacity_5c":36.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"90 x 103 78","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":93.4,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('a00dffee-a550-44d8-b473-1d512f6c9995','E003/069','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Vestfrost Solutions','VLS 024 SDD',NULL,'{"storage_capacity_5c":25.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"83 x 55.5 x 64.5","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"hold_over_time":91.28,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('cf2569d8-e3cf-4e00-b11c-e1088555bb7a','E003/075','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Haier Biomedical Co., Ltd','HTC 40 SDD',NULL,'{"storage_capacity_5c":22.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"72 x 87.5 x 78.8","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8db398a9-3640-4675-81d9-19f5ab3f25de','E003/076','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Haier Biomedical Co., Ltd','HTC 110 SDD',NULL,'{"storage_capacity_5c":59.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"72 x 87.5 x 112.8","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e','E003/078','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Dulas Ltd','VC50SDD',NULL,'{"storage_capacity_5c":52.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"97.5 x 100 x 74","waterpack_freezing_capacity":0.0,"hold_over_time":74.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('4151bc4d-598d-4334-86b6-668f4ee5e5e9','E003/084','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Dulas Ltd','VC60SDD-1',NULL,'{"storage_capacity_5c":57.0,"storage_capacity_20c":24.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"98 x 128.2 x 74","waterpack_storage_capacity":13.8,"waterpack_freezing_capacity":2.4,"hold_over_time":94.18,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('cc2404af-1863-438d-8ff9-38d66e4f6796','E003/085','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Dulas Ltd','VC30SDD',NULL,'{"storage_capacity_5c":25.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"97.5 x 89 x 74","waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1a85c145-29d2-4343-9010-d52d981bd009','E003/090','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','Ultra 16 SDD',NULL,'{"storage_capacity_5c":24.2,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"113 x 78 x 85","waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('27852f5c-a5db-4b1f-a311-9ff67e74cb88','E003/093','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','TCW 4000 SDD',NULL,'{"storage_capacity_5c":220.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"91.5 x 162.5 x 78","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('0fbb3210-3c90-41df-b39e-eefe032f738a','E003/098','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Aucma Global Medical Co.,Ltd.','CFD-50 SDD',NULL,'{"storage_capacity_5c":50.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"158.8 x 54.5 x 65.5","waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('407d4a90-c403-46c3-bf57-31c2fe1ad0e0','E003/102','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Haier Biomedical Co., Ltd','HTC-112',NULL,'{"storage_capacity_5c":75.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"72 x 87.5 x 112.8","waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5','E003/106','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Vestfrost Solutions','VLS 054A SDD',NULL,'{"storage_capacity_5c":55.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"85 x 72 x 60","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"hold_over_time":89.32,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('460fd161-1f25-40dd-aafa-39dac9f8690b','E003/107','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Vestfrost Solutions','VLS 094A SDD',NULL,'{"storage_capacity_5c":92.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"86 x 93 x 70","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e2285ed2-1492-41c2-8933-79591c179ec5','E003/108','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Vestfrost Solutions','VLS 154A SDD Greenline',NULL,'{"storage_capacity_5c":170.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"86 x 127 x 70","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"hold_over_time":77.75,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f04d5fd1-150d-4ee7-8011-151f74dc42e2','E003/116','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Haier Biomedical Co., Ltd','HTC-120-SDD',NULL,'{"storage_capacity_5c":100.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"86.5 x 82.5 x 142.5","waterpack_freezing_capacity":0.0,"freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c6ba691e-c574-4031-9ba7-65c8df849e61','E003/117','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Haier Biomedical Co., Ltd','HTC-240-SDD',NULL,'{"storage_capacity_5c":200.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"86.5 x 82.5 x 181.5","waterpack_freezing_capacity":0.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b38f7ece-a922-4dbf-9000-f78854a55a17','E003/118','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Aucma Global Medical Co.,Ltd.','ARKTEK YBC-10 SDD',NULL,'{"storage_capacity_5c":10.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"external_dimensions":"52.8 x 86","waterpack_freezing_capacity":0.0,"freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('eae13af2-4e0a-4438-8594-89a350a96cdd','E003/121','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','B Medical Systems Sarl','TCW80-SDD',NULL,'{"storage_capacity_5c":80.5,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"90 x 103 x 78","waterpack_freezing_capacity":0.0,"hold_over_time":192.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Solar","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('051009da-3162-487c-b7da-e6f7be61ca53','E003/135','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','d4434727-dc35-437d-a5fa-739a491381b7','Qingdao Haier Biomedical Co., Ltd','HTCD-160B',NULL,'{"storage_capacity_5c":100.0,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"refrigerant_type":"R600A","external_dimensions":"169.5 x 86.5 x 82.5","waterpack_storage_capacity":22.4,"waterpack_freezing_capacity":2.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b7899fc3-972e-439b-9289-8421d344d1df','E003/134','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','BlackFrog Technologies Private Limited','Emvolio Plus',NULL,'{"storage_capacity_5c":1.55,"storage_capacity_20c":0.0,"storage_capacity_70c":0.0,"external_dimensions":"30 x 20 x 41","waterpack_storage_capacity":0.0,"waterpack_freezing_capacity":0.0,"energy_consumption_stable":0.84,"hold_over_time":12.0,"climate_zone":"Hot","freeze_protection":"Grade A","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c74a3f72-fda6-4bb8-a08f-5f79a20a8716','E004/002','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','B Medical Systems Sarl','RCW4',NULL,'{"external_dimensions":"36.2 x 28.3 x 29.9","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('55042f99-370b-407b-9155-d4a594595abc','E004/007','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','AOV International LLP','ADVC-24',NULL,'{"external_dimensions":"17.3 x 10.3 x 4.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c6ee8e1f-1219-4455-83a2-dd991a89d6a0','E004/008','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','AOV International LLP','AVC-44',NULL,'{"external_dimensions":"9 x 9.1 x 16.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('40f215fb-3eb9-4fa4-9c80-b08f275db34f','E004/009','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','AOV International LLP','AVC-46',NULL,'{"external_dimensions":"11.38 x 11.38 x 19","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('32181403-62bc-4895-b5eb-4d76cd566920','E004/011','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Apex International','AIDVC-24',NULL,'{"external_dimensions":"25 x 18 x 12","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d1f6c228-72ed-477c-adf8-bf72b8b875f1','E004/020','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Blowkings','BK-VC 2.6-CF',NULL,'{"external_dimensions":"26 x 26 32","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f3e9c894-ab61-4513-a26b-efc7f8056026','E004/021','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Blowkings','BK-VC 1.7-CF',NULL,'{"external_dimensions":"26 x 25 x 28.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('edd6ccce-437c-4d1c-97c8-e24001929e9c','E004/022','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Blowkings','VDC-24-CF',NULL,'{"external_dimensions":"2.5 x 16 x 25","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5a3bf0db-4ba3-456a-8ae0-a63e1503caa1','E004/028','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','BBVC23',NULL,'{"external_dimensions":"24.6 x 18 x 21.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b08b1aba-3b41-470c-846a-c6d61514d547','E004/029','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','BCVC43',NULL,'{"external_dimensions":"28 x 28 x 31.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('661abdb9-2782-459f-ab37-924c757851f9','E004/032','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Giostyle SpA','GioStyle VC 2.6L',NULL,'{"external_dimensions":"29 x 24 x 32","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d8fe26dc-7dfd-4bcd-96e3-034ff73387b4','E004/040','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','Vaccine carrier LR BCVC46',NULL,'{"external_dimensions":"27 x 27 x 32","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('cad62a7b-9765-4a43-b82e-a2e2ffb8fdc3','E004/043','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Blowkings','BK-VC 3.4 -CF',NULL,'{"external_dimensions":"28.8 x 28.9 x 33.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d6ea93ba-4346-434a-a024-7984bb125b2c','E004/044','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Apex International','AIVC-44LR',NULL,'{"external_dimensions":"25 x 25 x 30","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('d167df7b-c6e3-41f2-8b02-86254ee0d4f6','E004/047','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Apex International','AIVC-46',NULL,'{"external_dimensions":"29 x 29 x 32.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c8c517f8-9371-493f-8c5a-417e1db0f23f','E004/049','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','BCVC43A',NULL,'{"external_dimensions":"25.2 x 25.2 x 30.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('8580876d-6ba4-4c62-8e37-51bb16ce9bca','E004/053','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','BCVC44B',NULL,'{"external_dimensions":"25.3 x 25.3 x 30.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('6b3f1728-e4fd-49d1-a4f4-36ade1416b49','E004/054','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','BDVC44',NULL,'{"external_dimensions":"25.2 x 26 x 30.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b8ce710a-a07f-4818-857b-eb6e1e27147e','E004/055','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Nilkamal Limited','BDVC46',NULL,'{"external_dimensions":"29.5 x 29.5 x 33.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e68c1615-70e4-4753-8814-5d2c54ad4d1b','E004/059','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','B Medical Systems Sarl','RCW1',NULL,'{"external_dimensions":"34.7 x 28.1 x 43","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f63dddb0-eb02-43ed-9ae5-e13ad2632542','E004/060','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','Rajas Enterprises','RE0333VC',NULL,'{"external_dimensions":"24.8 x 29 x 24.6","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('56744764-b8af-40c1-a370-f8e34c99cb6a','E004/061','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','0b7ac91d-6cfa-49bb-bac2-35e7cb31564b','PARACOAT PRODUCTS LTD','2CPCPVC-001',NULL,'{"external_dimensions":"24.6 x 30.5 x 24.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('39d90134-a7d3-4c1e-860b-95d11de90fcc','E004/050','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','AOV International LLP','AFVC-46',NULL,'{"external_dimensions":"31 x 31 x 30","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('ce5edb48-84e0-4ccb-beb6-518c4de86b47','E004/051','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Qingdao Leff International Trading Co Ltd','FFVC-1.7L',NULL,'{"external_dimensions":"30.8 x 30.8 x 30","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('aaaf4b4b-803f-4ab5-83e5-eea2dc43250f','E004/052','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Blowkings','BK-FF-VC-1.6L',NULL,'{"external_dimensions":"28.5 28.5 x 33.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('cd83c1f9-8d64-46bb-afde-23ef64abfc81','E004/057','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Qingdao Leff International Trading Co Ltd','FFCB-15L',NULL,'{"external_dimensions":"77 x 54 x 47","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('58cd1449-95cb-40da-b33a-17bd25f62b7e','E004/058','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Nilkamal Limited','BCVC46LFF',NULL,'{"external_dimensions":"31.8 x 31.8 x 29.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('4d7c245f-5d10-4bac-b37b-e61eba497f3e','E004/063','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','AOV International LLP','AFVC44',NULL,'{"external_dimensions":"28.5 x 28.5 x 27","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('e30e1f14-2957-4336-8a08-229f044f67ec','E004/064','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Qingdao Leff International Trading Co Ltd','FFCB-20L',NULL,'{"external_dimensions":"77.5 x 54.5 x 47.3","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('3ce28e4d-6d28-41d8-b6a2-1c94ea0c1866','E004/065','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Blowkings','BK-VC-FF 2.4 L',NULL,'{"external_dimensions":"32.5 x 32.5 x 32.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c6136467-58b1-4904-a82b-81427fef4ad8','E004/066','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','TRIMURTI PLAST CONTAINERS PRIVATE LIMITED','TPVC 46 LFF',NULL,'{"external_dimensions":"31 x 31 x 30.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('440df6fb-dc3b-4ce7-b7c3-3b034c74e1d2','E004/070','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','Gobi Technologies','FF001A Eclipse 1.8L',NULL,'{"external_dimensions":"22 x 38.7","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('a3f03639-4a5a-4393-801c-639d73dba762','E004/071','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','GKS Healthsol LLP','GKS FFVC-44LR',NULL,'{"external_dimensions":"28.5 x 30.5 x 29.5","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('189ef51c-d232-4da7-b090-ca3a53d31f58','E004/072','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d','ad3405e1-ef3f-4159-b693-0e7d5fa6a814','GKS Healthsol LLP','FFVC 44SR',NULL,'{"external_dimensions":"29 x 28.5 x 27.8","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f7db1278-a70c-4bcc-8e3c-f670b9965aea','E001/001-C','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','9a4ad0dd-138a-41b2-81df-08772635085e','Porkka Finland Oy','Custom',NULL,'{"refrigerant_type":"R404A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('5c3be815-6377-4d2a-ba56-bee5e5307e64','E001/001-F','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','6d49edfd-a12b-43c8-99fb-3300d67e0192','Porkka Finland Oy','Custom',NULL,'{"refrigerant_type":"R404A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('1cabed40-4c27-49f5-b7d2-b8305fca4802','E001/002-C','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','9a4ad0dd-138a-41b2-81df-08772635085e','SN Zhendre','Custom',NULL,'{"refrigerant_type":"R134A, R452A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('b6de9c26-797d-49ad-a4ba-4553d5d8bd2c','E001/002-F','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','6d49edfd-a12b-43c8-99fb-3300d67e0192','SN Zhendre','Custom',NULL,'{"refrigerant_type":"R134A, R452A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('99206b1c-d1fc-41af-9d41-9151c1382407','E001/003-C','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','9a4ad0dd-138a-41b2-81df-08772635085e','Qingdao Haier Biomedical Co., Ltd','Custom',NULL,'{"refrigerant_type":"R448A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('2e57aa44-8f93-476f-8bdb-235b84464752','E001/003-F','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','6d49edfd-a12b-43c8-99fb-3300d67e0192','Qingdao Haier Biomedical Co., Ltd','Custom',NULL,'{"refrigerant_type":"R448A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('0df0ff5d-d328-4c92-94ab-e8b4d69608ee','E001/004-C','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','9a4ad0dd-138a-41b2-81df-08772635085e','Foster Refrigerator','Custom',NULL,'{"refrigerant_type":"R404A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('c316a7bf-b09c-4af6-93bb-0af0d8f0eaa6','E001/004-F','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','6d49edfd-a12b-43c8-99fb-3300d67e0192','Foster Refrigerator','Custom',NULL,'{"refrigerant_type":"R404A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('f53ba4fe-50ce-408f-a4cb-83067a767b5e','E001/005-C','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','9a4ad0dd-138a-41b2-81df-08772635085e','Viessmann Kuhlsysteme GmbH','Custom',NULL,'{"refrigerant_type":"R134A, R407A, R452A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
INSERT INTO asset_catalogue_item VALUES('4866491b-3385-41bb-803e-c04002693929','E001/005-F','WHO PQS','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad','6d49edfd-a12b-43c8-99fb-3300d67e0192','Viessmann Kuhlsysteme GmbH','Custom',NULL,'{"refrigerant_type":"R134A, R407A, R452A","climate_zone":"Hot, Temperate, Cold","energy_source":"Electricity","expected_lifespan":10}');
CREATE TABLE asset_log_reason (
            id TEXT NOT NULL PRIMARY KEY,
            asset_log_status TEXT NOT NULL,
            reason TEXT NOT NULL,
            deleted_datetime TEXT
            );
INSERT INTO asset_log_reason VALUES('020a3b04-4a29-46ca-9afd-140edcc15b7c','NOT_IN_USE','Awaiting installation',NULL);
INSERT INTO asset_log_reason VALUES('44f648e9-2ff1-4010-be84-6bb6befce2d7','NOT_IN_USE','Stored',NULL);
INSERT INTO asset_log_reason VALUES('772231c3-d715-4a80-868b-57afb58f7e89','NOT_IN_USE','Offsite for repairs',NULL);
INSERT INTO asset_log_reason VALUES('6c79d05f-ebd0-4a1d-9d7e-fcea52fb24e4','NOT_IN_USE','Awaiting decommissioning',NULL);
INSERT INTO asset_log_reason VALUES('325c1a24-97eb-4597-885d-253a52430125','FUNCTIONING_BUT_NEEDS_ATTENTION','Needs servicing',NULL);
INSERT INTO asset_log_reason VALUES('2f734462-c76d-4b08-b8d2-40b250538d46','NOT_IN_USE','Multiple temperature breaches',NULL);
INSERT INTO asset_log_reason VALUES('d37a8d80-aaa7-4585-a1fc-0c69f7770129','NOT_IN_USE','Unknown',NULL);
INSERT INTO asset_log_reason VALUES('b4ae8758-27d8-440c-8f23-08d5423748e8','NOT_FUNCTIONING','Needs spare parts',NULL);
INSERT INTO asset_log_reason VALUES('290ed6c8-20ef-469d-bf6c-dd944ae24e8f','NOT_FUNCTIONING','Lack of power',NULL);
CREATE TABLE asset (
            id TEXT NOT NULL PRIMARY KEY,
            store_id TEXT REFERENCES store (id), -- This serves as the location of the asset at least for now can be null for un-assigned assets
            notes TEXT,
            asset_number TEXT,
            serial_number TEXT, 
            asset_catalogue_item_id TEXT REFERENCES asset_catalogue_item (id),
            asset_category_id TEXT REFERENCES asset_category (id),
            asset_class_id TEXT REFERENCES asset_class (id),
            asset_catalogue_type_id TEXT REFERENCES asset_catalogue_type (id),
            installation_date TEXT,
            replacement_date TEXT,
            deleted_datetime TEXT,
            created_datetime TEXT NOT NULL,
            modified_datetime TEXT NOT NULL
        , properties TEXT, donor_name_id TEXT REFERENCES name_link(id), warranty_start TEXT, warranty_end TEXT, needs_replacement BOOLEAN, locked_fields_json TEXT);
CREATE TABLE asset_log (
            id TEXT NOT NULL PRIMARY KEY,
            asset_id TEXT NOT NULL REFERENCES asset(id),
            user_id TEXT NOT NULL,
            status TEXT,
            reason_id TEXT REFERENCES asset_log_reason(id),
            comment TEXT,
            type TEXT,
            log_datetime TEXT NOT NULL
          );
CREATE TABLE sync_file_reference (
                id TEXT NOT NULL PRIMARY KEY,
                table_name TEXT NOT NULL, -- Associated Table
                record_id TEXT NOT NULL, -- Associated record id
                file_name TEXT NOT NULL,
                mime_type TEXT,
                uploaded_bytes INTEGER NOT NULL DEFAULT 0,
                downloaded_bytes INTEGER NOT NULL DEFAULT 0,
                total_bytes INTEGER NOT NULL DEFAULT 0,
                retries INTEGER NOT NULL DEFAULT 0,
                retry_at TIMESTAMP,
                direction TEXT NOT NULL,
                status TEXT NOT NULL,
                error TEXT,
                created_datetime TIMESTAMP NOT NULL, -- No modified datetime, as we don't allow updates it would break sync
                deleted_datetime TIMESTAMP
            );
CREATE TABLE IF NOT EXISTS "store" (
          id TEXT NOT NULL PRIMARY KEY,
          name_link_id TEXT NOT NULL REFERENCES name_link(id),
          code TEXT NOT NULL,
          site_id INTEGER NOT NULL,
          logo TEXT,
          store_mode TEXT DEFAULT 'store' NOT NULL,
          created_date TEXT,
          is_disabled BOOLEAN DEFAULT FALSE NOT NULL
        );
CREATE TABLE asset_property (
                id TEXT NOT NULL PRIMARY KEY,
                key TEXT NOT NULL,
                name TEXT NOT NULL,
                asset_class_id TEXT,
                asset_category_id TEXT,
                asset_type_id TEXT,
                value_type TEXT NOT NULL,
                allowed_values TEXT
            );
INSERT INTO asset_property VALUES('external_dimensions','external_dimensions','External dimensions - WxDxH (in cm)','fad280b6-8384-41af-84cf-c7b6b4526ef0',NULL,NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('storage_capacity_5c-cr','storage_capacity_5c','Storage capacity +5 °C (litres)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('storage_capacity_20c-cr','storage_capacity_20c','Storage capacity -20 °C (litres)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('storage_capacity_70c-cr','storage_capacity_70c','Storage capacity -70 °C (litres)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('waterpack_storage_capacity-cr','waterpack_storage_capacity','Waterpack storage capacity (Kg)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('waterpack_freezing_capacity-cr','waterpack_freezing_capacity','Waterpack freezing capacity per 24 hours (Kg)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('energy_consumption_stable-cr','energy_consumption_stable','Energy consumption (stable running, continuous power) (KW per day)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('energy_consumption_freezing-cr','energy_consumption_freezing','Energy consumption during freezing (KW per day)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('hold_over_time-cr','hold_over_time','Hold over time (hours)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('climate_zone-cr','climate_zone','Climate zone','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('freeze_protection-cr','freeze_protection','Freeze protection','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('temperature_monitoring_device-cr','temperature_monitoring_device','Temperature monitoring device','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'STRING','Integrated, External, None');
INSERT INTO asset_property VALUES('voltage_stabilizer-cr','voltage_stabilizer','Voltage stabilizer','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'STRING','Integrated, External, None');
INSERT INTO asset_property VALUES('energy_source-cr','energy_source','Energy Source','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('refrigerant_type-cr','refrigerant_type','Refrigerant Type(s)','fad280b6-8384-41af-84cf-c7b6b4526ef0','7db32eb6-5929-4dd1-a5e9-01e36baa73ad',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('storage_capacity_5c-fr','storage_capacity_5c','Storage capacity +5 °C (litres)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('storage_capacity_20c-fr','storage_capacity_20c','Storage capacity -20 °C (litres)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('storage_capacity_70c-fr','storage_capacity_70c','Storage capacity -70 °C (litres)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('waterpack_storage_capacity-fr','waterpack_storage_capacity','Waterpack storage capacity (Kg)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('waterpack_freezing_capacity-fr','waterpack_freezing_capacity','Waterpack freezing capacity per 24 hours (Kg)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('energy_consumption_stable-fr','energy_consumption_stable','Energy consumption (stable running, continuous power) (KW per day)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('energy_consumption_freezing-fr','energy_consumption_freezing','Energy consumption during freezing (KW per day)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('hold_over_time-fr','hold_over_time','Hold over time (hours)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'FLOAT',NULL);
INSERT INTO asset_property VALUES('climate_zone-fr','climate_zone','Climate zone','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('freeze_protection-fr','freeze_protection','Freeze protection','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('temperature_monitoring_device-fr','temperature_monitoring_device','Temperature monitoring device','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'STRING','Integrated, External, None');
INSERT INTO asset_property VALUES('voltage_stabilizer-fr','voltage_stabilizer','Voltage stabilizer','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'STRING','Integrated, External, None');
INSERT INTO asset_property VALUES('energy_source-fr','energy_source','Energy Source','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('refrigerant_type-fr','refrigerant_type','Refrigerant Type(s)','fad280b6-8384-41af-84cf-c7b6b4526ef0','02cbea92-d5bf-4832-863b-c04e093a7760',NULL,'STRING',NULL);
INSERT INTO asset_property VALUES('temperature_monitoring_device-ic','temperature_monitoring_device','Temperature monitoring device','fad280b6-8384-41af-84cf-c7b6b4526ef0','b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d',NULL,'STRING','Integrated, External, None');
INSERT INTO asset_property VALUES('expected_lifespan','expected_lifespan','Expected Lifespan (in years)','fad280b6-8384-41af-84cf-c7b6b4526ef0',NULL,NULL,'FLOAT',NULL);
CREATE TABLE property (
                id TEXT NOT NULL PRIMARY KEY,
                key TEXT NOT NULL,
                name TEXT NOT NULL,
                value_type TEXT NOT NULL,
                allowed_values TEXT
            );
CREATE TABLE name_property (
                id TEXT NOT NULL PRIMARY KEY,
                property_id TEXT NOT NULL REFERENCES property(id),
                remote_editable BOOLEAN NOT NULL
            );
CREATE TABLE demographic_indicator (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL,
                base_year INTEGER NOT NULL,
                base_population INTEGER,
                population_percentage REAL NOT NULL,
                year_1_projection INTEGER NOT NULL,
                year_2_projection INTEGER NOT NULL,
                year_3_projection INTEGER NOT NULL,
                year_4_projection INTEGER NOT NULL,
                year_5_projection INTEGER NOT NULL
            , demographic_id TEXT REFERENCES demographic(id));
CREATE TABLE demographic_projection (
                id TEXT NOT NULL PRIMARY KEY,
                base_year INTEGER NOT NULL,
                year_1 REAL NOT NULL,
                year_2 REAL NOT NULL,
                year_3 REAL NOT NULL,
                year_4 REAL NOT NULL,
                year_5 REAL NOT NULL
            );
CREATE TABLE vaccine_course (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            program_id TEXT NOT NULL REFERENCES program(id),
            coverage_rate FLOAT NOT NULL DEFAULT 100,
            use_in_gaps_calculations BOOL NOT NULL DEFAULT true,
            wastage_rate FLOAT NOT NULL DEFAULT 0,
            deleted_datetime TEXT
        , demographic_id TEXT REFERENCES demographic(id), can_skip_dose BOOLEAN DEFAULT FALSE);
CREATE TABLE vaccine_course_item (
            id TEXT PRIMARY KEY NOT NULL,
            vaccine_course_id TEXT NOT NULL REFERENCES vaccine_course(id),
            item_link_id TEXT NOT NULL REFERENCES item_link(id)
        , deleted_datetime TEXT);
CREATE TABLE IF NOT EXISTS "vaccine_course_dose" (
            id TEXT PRIMARY KEY NOT NULL,
            vaccine_course_id TEXT NOT NULL REFERENCES vaccine_course(id),
            label TEXT NOT NULL
        , min_interval_days INT NOT NULL DEFAULT 0, min_age REAL NOT NULL DEFAULT 0.0, max_age REAL NOT NULL DEFAULT 0, deleted_datetime TEXT, custom_age_label TEXT);
CREATE TABLE IF NOT EXISTS "program" (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT,
                name TEXT NOT NULL,
                context_id TEXT NOT NULL REFERENCES context(id),
                is_immunisation BOOLEAN NOT NULL, elmis_code TEXT, deleted_datetime TEXT);
INSERT INTO program VALUES('missing_program','missing_program','missing_program','missing_program',0,NULL,NULL);
CREATE TABLE rnr_form (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT NOT NULL REFERENCES store(id),
                name_link_id TEXT NOT NULL REFERENCES name_link(id),
                period_id TEXT NOT NULL REFERENCES period(id),
                program_id TEXT NOT NULL REFERENCES program(id),
                status TEXT NOT NULL,
                created_datetime TIMESTAMP NOT NULL,
                finalised_datetime TIMESTAMP,
                linked_requisition_id TEXT
            , their_reference TEXT, comment TEXT);
CREATE TABLE rnr_form_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    rnr_form_id TEXT NOT NULL REFERENCES rnr_form(id),
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    requisition_line_id TEXT,

                    average_monthly_consumption REAL NOT NULL,
                    previous_monthly_consumption_values TEXT NOT NULL,
                    initial_balance REAL NOT NULL,
                    snapshot_quantity_received REAL NOT NULL,
                    snapshot_quantity_consumed REAL NOT NULL,
                    snapshot_adjustments REAL NOT NULL,
                    entered_quantity_received REAL,
                    entered_quantity_consumed REAL,
                    entered_adjustments REAL,
                    adjusted_quantity_consumed REAL NOT NULL,
                    stock_out_duration INTEGER NOT NULL,
                    final_balance REAL NOT NULL,
                    maximum_quantity REAL NOT NULL,
                    expiry_date TEXT,
                    calculated_requested_quantity REAL NOT NULL,
                    low_stock TEXT NOT NULL DEFAULT 'OK',
                    entered_requested_quantity REAL,
                    comment TEXT,
                    confirmed BOOLEAN NOT NULL DEFAULT FALSE
                , minimum_quantity REAL NOT NULL DEFAULT 0.0, entered_losses REAL);
CREATE TABLE demographic (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL
                , population_percentage REAL NOT NULL DEFAULT 0);
CREATE TABLE reason_option (
                    id TEXT NOT NULL PRIMARY KEY,
                    type TEXT NOT NULL DEFAULT 'POSITIVE_INVENTORY_ADJUSTMENT',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    reason TEXT NOT NULL
                );
CREATE TABLE IF NOT EXISTS "location_type" (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    min_temperature REAL,
                    max_temperature REAL
                );
CREATE TABLE item_variant (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                item_link_id TEXT NOT NULL REFERENCES item_link(id),
                location_type_id TEXT REFERENCES "location_type"(id),
                manufacturer_link_id TEXT REFERENCES name_link(id),
                deleted_datetime TEXT
            , vvm_type TEXT, created_datetime TEXT NOT NULL DEFAULT 0, created_by TEXT);
CREATE TABLE packaging_variant (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                item_variant_id TEXT NOT NULL REFERENCES item_variant(id),
                packaging_level INT NOT NULL,
                pack_size REAL,
                volume_per_unit REAL,
                deleted_datetime TEXT
            );
CREATE TABLE program_indicator (
                id TEXT PRIMARY KEY NOT NULL,
                program_id TEXT NOT NULL REFERENCES program(id),
                code TEXT,
                is_active BOOLEAN NOT NULL DEFAULT TRUE           
            );
CREATE TABLE indicator_column (
                id TEXT PRIMARY KEY NOT NULL,
                program_indicator_id TEXT NOT NULL REFERENCES program_indicator(id),
                column_number INTEGER NOT NULL,
                header TEXT NOT NULL,
                value_type TEXT,
                default_value TEXT NOT NULL,
                is_active BOOLEAN NOT NULL       
            );
CREATE TABLE indicator_line (
                id TEXT PRIMARY KEY NOT NULL,
                program_indicator_id TEXT NOT NULL REFERENCES program_indicator(id),
                line_number INTEGER NOT NULL,
                description TEXT NOT NULL,
                code TEXT NOT NULL,
                value_type TEXT,
                default_value TEXT NOT NULL,
                is_required BOOLEAN NOT NULL,
                is_active BOOLEAN NOT NULL  
            );
CREATE TABLE indicator_value (
                id TEXT PRIMARY KEY NOT NULL,
                customer_name_link_id TEXT NOT NULL REFERENCES name_link(id),
                store_id TEXT NOT NULL REFERENCES store(id),
                period_id TEXT NOT NULL REFERENCES period(id),
                indicator_line_id TEXT NOT NULL REFERENCES indicator_line(id),
                indicator_column_id TEXT NOT NULL REFERENCES indicator_column(id),
                value TEXT NOT NULL
            );
CREATE TABLE bundled_item (
                    id TEXT NOT NULL PRIMARY KEY,
                    principal_item_variant_id TEXT NOT NULL REFERENCES item_variant(id),
                    bundled_item_variant_id TEXT NOT NULL REFERENCES item_variant(id),
                    ratio REAL NOT NULL,
                    deleted_datetime TEXT
                );
CREATE TABLE category (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                parent_id TEXT, -- REFERENCES category_id (Not added as referential constraint due to circular dependency during sync integration)
                deleted_datetime TEXT
            );
CREATE TABLE item_category_join (
                id TEXT PRIMARY KEY NOT NULL,
                item_id TEXT NOT NULL REFERENCES item(id),
                category_id TEXT NOT NULL REFERENCES category(id),
                deleted_datetime TEXT
            );
CREATE TABLE system_log (
                    id TEXT NOT NULL PRIMARY KEY,
                    type TEXT NOT NULL, 
                    sync_site_id INTEGER,
                    datetime TEXT NOT NULL,
                    message TEXT,
                    is_error BOOLEAN NOT NULL DEFAULT FALSE
                );
CREATE TABLE IF NOT EXISTS "temperature_breach_config" (
                    id TEXT NOT NULL PRIMARY KEY,
                    duration_milliseconds INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    is_active BOOLEAN,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    minimum_temperature REAL NOT NULL,
                    maximum_temperature REAL NOT NULL
                );
CREATE TABLE abbreviation (
                id TEXT NOT NULL PRIMARY KEY,
                text TEXT NOT NULL,
                expansion TEXT NOT NULL
            );
CREATE TABLE item_direction (
                id TEXT NOT NULL PRIMARY KEY,
                item_link_id TEXT NOT NULL REFERENCES item_link(id),
                directions TEXT NOT NULL,
                priority BIGINT NOT NULL
            );
CREATE TABLE diagnosis (
                id TEXT NOT NULL PRIMARY KEY,
                code TEXT NOT NULL,
                description TEXT NOT NULL,
                notes TEXT,
                valid_till DATE
            );
CREATE TABLE email_queue (
                    id TEXT NOT NULL PRIMARY KEY,
                    to_address TEXT NOT NULL,
                    subject TEXT NOT NULL,
                    html_body TEXT NOT NULL,
                    text_body TEXT NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL,
                    sent_at TIMESTAMP,
                    retries INTEGER NOT NULL DEFAULT 0,
                    error TEXT
                , retry_at TIMESTAMP);
CREATE TABLE IF NOT EXISTS "contact_form" (
                    id TEXT NOT NULL PRIMARY KEY,
                    reply_email TEXT NOT NULL,
                    body TEXT NOT NULL,
                    created_datetime TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    contact_type TEXT NOT NULL
                , username TEXT NOT NULL DEFAULT '');
CREATE TABLE backend_plugin (
                    id TEXT NOT NULL PRIMARY KEY,
                    code TEXT NOT NULL,
                    bundle_base64 TEXT NOT NULL,
                    types TEXT NOT NULL,
                    variant_type TEXT NOT NULL
                );
CREATE TABLE insurance_provider (
                    id TEXT NOT NULL PRIMARY KEY,
                    provider_name TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    prescription_validity_days INTEGER,
                    comment TEXT
                );
CREATE TABLE plugin_data (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT  REFERENCES store(id),
                plugin_code TEXT NOT NULL,
                related_record_id TEXT,
                data_identifier TEXT NOT NULL,
                data TEXT NOT NULL
            );
CREATE TABLE frontend_plugin (
                    id TEXT NOT NULL PRIMARY KEY,
                    code TEXT NOT NULL,
                    entry_point TEXT NOT NULL,
                    types TEXT NOT NULL,
                    files TEXT NOT NULL
                );
CREATE TABLE name_insurance_join (
                    id TEXT NOT NULL PRIMARY KEY,
                    name_link_id TEXT NOT NULL REFERENCES name_link(id),
                    insurance_provider_id TEXT NOT NULL REFERENCES insurance_provider(id),
                    policy_number_person TEXT,
                    policy_number_family TEXT,
                    policy_number TEXT NOT NULL,
                    policy_type TEXT NOT NULL,
                    discount_percentage REAL NOT NULL,
                    expiry_date DATE NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    entered_by_id TEXT
                , name_of_insured TEXT);
CREATE TABLE printer (
                id TEXT NOT NULL PRIMARY KEY,
                description TEXT NOT NULL,
                address TEXT NOT NULL,
                port INTEGER NOT NULL,
                label_width INTEGER NOT NULL,
                label_height INTEGER NOT NULL
            );
CREATE TABLE report (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    template TEXT NOT NULL,
                    comment TEXT,
                    sub_context TEXT,
                    argument_schema_id TEXT REFERENCES form_schema(id),
                    context TEXT NOT NULL,
                    is_custom BOOLEAN NOT NULL DEFAULT true,
                    version TEXT NOT NULL DEFAULT 1.0,
                    code TEXT NOT NULL DEFAULT ''
                , is_active BOOL NOT NULL DEFAULT true, excel_template_buffer BLOB);
CREATE TABLE preference (
                    id TEXT NOT NULL PRIMARY KEY,
                    key TEXT NOT NULL,
                    value TEXT NOT NULL,
                    store_id TEXT REFERENCES store(id)
                );
CREATE TABLE vaccination (
                        id TEXT NOT NULL PRIMARY KEY,
                        store_id TEXT NOT NULL,
                        program_enrolment_id TEXT NOT NULL,
                        patient_link_id TEXT NOT NULL DEFAULT '',
                        encounter_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        vaccine_course_dose_id TEXT NOT NULL REFERENCES vaccine_course_dose(id),
                        created_datetime TEXT NOT NULL,
                        facility_name_link_id TEXT,
                        facility_free_text TEXT,
                        invoice_id TEXT,
                        stock_line_id TEXT,
                        clinician_link_id TEXT,
                        vaccination_date TEXT NOT NULL,
                        given BOOLEAN NOT NULL,
                        not_given_reason TEXT,
                        comment TEXT
                    , given_store_id TEXT, item_link_id TEXT);
CREATE TABLE encounter (
                    id TEXT NOT NULL PRIMARY KEY,
                    document_name TEXT NOT NULL,
                    created_datetime TEXT NOT NULL,
                    start_datetime TEXT NOT NULL,
                    end_datetime TEXT,
                    status TEXT NULL,
                    store_id TEXT,
                    document_type TEXT NOT NULL,
                    program_id TEXT,
                    patient_link_id TEXT NOT NULL,
                    clinician_link_id TEXT
                );
CREATE TABLE warning (
                    id TEXT NOT NULL PRIMARY KEY,
                    warning_text TEXT NOT NULL,
                    code TEXT NOT NULL
                );
CREATE TABLE item_warning_join (
                    id TEXT NOT NULL PRIMARY KEY,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    warning_id TEXT NOT NULL REFERENCES warning(id),
                    priority BOOLEAN not null
                );
CREATE TABLE sync_message (
                id TEXT PRIMARY KEY,
                to_store_id TEXT REFERENCES store(id),
                from_store_id TEXT REFERENCES store(id),
                body TEXT NOT NULL,
                created_datetime TEXT NOT NULL,
                status TEXT NOT NULL,
                type TEXT,
                error_message TEXT
            );
CREATE TABLE vvm_status (
                    id TEXT NOT NULL PRIMARY KEY,
                    description TEXT NOT NULL,
                    code TEXT NOT NULL,
                    priority INT NOT NULL,
                    is_active BOOL NOT NULL,
                    unusable BOOL NOT NULL DEFAULT false,
                    reason_id TEXT
                );
CREATE TABLE campaign (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    start_date TEXT,
                    end_date TEXT,
                    deleted_datetime TEXT
                );
CREATE TABLE invoice_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    invoice_id TEXT NOT NULL REFERENCES invoice(id),
                    item_name TEXT NOT NULL,
                    item_code TEXT NOT NULL,
                    stock_line_id TEXT REFERENCES stock_line(id),
                    location_id TEXT REFERENCES location(id),
                    batch TEXT,
                    expiry_date TEXT,
                    cost_price_per_pack REAL NOT NULL,
                    sell_price_per_pack REAL NOT NULL,
                    total_before_tax REAL NOT NULL,
                    total_after_tax REAL NOT NULL,
                    tax_percentage REAL,
                    type TEXT NOT NULL,
                    number_of_packs REAL NOT NULL,
                    pack_size REAL NOT NULL,
                    note TEXT,
                    foreign_currency_price_before_tax REAL,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    item_variant_id TEXT REFERENCES item_variant(id),
                    prescribed_quantity REAL,
                    linked_invoice_id TEXT,
                    reason_option_id REFERENCES reason_option(id)
                , vvm_status_id TEXT REFERENCES vvm_status (id), donor_link_id TEXT REFERENCES name_link(id), campaign_id TEXT REFERENCES campaign(id), shipped_number_of_packs REAL, shipped_pack_size REAL, volume_per_pack REAL NOT NULL DEFAULT 0.0, program_id TEXT REFERENCES program(id));
CREATE TABLE stocktake_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    stocktake_id TEXT NOT NULL REFERENCES stocktake(id),
                    stock_line_id TEXT REFERENCES stock_line(id),
                    location_id TEXT REFERENCES location(id),
                    comment TEXT,
                    snapshot_number_of_packs REAL NOT NULL,
                    counted_number_of_packs REAL,
                    batch TEXT,
                    expiry_date TEXT,
                    pack_size REAL,
                    cost_price_per_pack REAL,
                    sell_price_per_pack REAL,
                    note TEXT,
                    item_link_id TEXT NOT NULL REFERENCES item_link(id),
                    item_name TEXT NOT NULL,
                    item_variant_id TEXT REFERENCES item_variant(id),
                    donor_link_id TEXT,
                    reason_option_id TEXT REFERENCES reason_option(id)
                , volume_per_pack REAL NOT NULL DEFAULT 0.0, campaign_id TEXT REFERENCES campaign(id), program_id TEXT REFERENCES program(id), vvm_status_id TEXT);
CREATE TABLE vvm_status_log (
                    id TEXT NOT NULL PRIMARY KEY,
                    status_id TEXT NOT NULL,
                    created_datetime TEXT NOT NULL,
                    stock_line_id TEXT NOT NULL REFERENCES stock_line(id),
                    comment TEXT, 
                    created_by TEXT NOT NULL, 
                    invoice_line_id TEXT REFERENCES invoice_line(id),
                    store_id TEXT NOT NULL REFERENCES store(id)
                );
CREATE TABLE contact (
                    id TEXT NOT NULL PRIMARY KEY,
                    name_link_id TEXT NOT NULL REFERENCES name_link (id),
                    first_name TEXT NOT NULL,
                    position TEXT,
                    comment TEXT,
                    last_name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    category_1 TEXT,
                    category_2 TEXT,
                    category_3 TEXT,
                    address_1 TEXT,
                    address_2 TEXT,
                    country TEXT
                );
CREATE TABLE purchase_order (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    created_by TEXT,
                    supplier_name_link_id TEXT NOT NULL REFERENCES name_link(id),
                    purchase_order_number BIGINT NOT NULL,
                    status TEXT NOT NULL,
                    created_datetime TEXT NOT NULL,
                    confirmed_datetime TEXT,
                    target_months REAL,
                    comment TEXT,
                    donor_link_id TEXT REFERENCES name_link(id),
                    reference TEXT,
                    currency_id TEXT REFERENCES currency(id),
                    foreign_exchange_rate REAL NOT NULL DEFAULT 1.0,
                    shipping_method TEXT,
                    sent_datetime TEXT,
                    contract_signed_date TEXT,
                    advance_paid_date TEXT,
                    received_at_port_date TEXT,
                    requested_delivery_date TEXT,
                    supplier_agent TEXT,
                    authorising_officer_1 TEXT,
                    authorising_officer_2 TEXT,
                    additional_instructions TEXT,
                    heading_message TEXT,
                    agent_commission REAL,
                    document_charge REAL,
                    communications_charge REAL,
                    insurance_charge REAL,
                    freight_charge REAL,
                    freight_conditions TEXT
                    , supplier_discount_percentage REAL, request_approval_datetime TEXT, finalised_datetime TEXT);
CREATE TABLE purchase_order_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    purchase_order_id TEXT REFERENCES purchase_order(id) NOT NULL,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    line_number BIGINT NOT NULL,
                    item_link_id TEXT REFERENCES item_link(id) NOT NULL,
                    item_name TEXT NOT NULL,
                    requested_pack_size REAL NOT NULL DEFAULT 1.0,
                    requested_number_of_units REAL NOT NULL DEFAULT 0.0,
                    adjusted_number_of_units REAL,
                    received_number_of_units REAL,
                    requested_delivery_date TEXT,
                    expected_delivery_date TEXT,
                    stock_on_hand_in_units REAL NOT NULL DEFAULT 0.0,
                    supplier_item_code TEXT,
                    price_per_pack_before_discount REAL NOT NULL DEFAULT 0.0,
                    price_per_pack_after_discount REAL NOT NULL DEFAULT 0.0
                , comment TEXT, manufacturer_link_id TEXT REFERENCES name_link(id), note TEXT, unit TEXT, status TEXT NOT NULL DEFAULT 'NEW');
CREATE TABLE item_store_join (
                    id TEXT NOT NULL PRIMARY KEY,
                    item_link_id TEXT NOT NULL REFERENCES item_link (id),
                    store_id TEXT NOT NULL REFERENCES store (id),
                    default_sell_price_per_pack REAL NOT NULL
                , ignore_for_orders BOOLEAN NOT NULL DEFAULT FALSE, margin REAL NOT NULL DEFAULT 0.0);
CREATE TABLE goods_received (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    purchase_order_id TEXT REFERENCES purchase_order(id),
                    inbound_shipment_id TEXT REFERENCES invoice(id),
                    goods_received_number BIGINT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'NEW',
                    received_date TEXT,
                    comment TEXT,
                    supplier_reference TEXT,
                    donor_link_id TEXT, -- references name(id) via name_link(id)
                    created_datetime TEXT NOT NULL, -- corresponds to OG "entry_date"
                    finalised_datetime TEXT,
                    created_by TEXT -- corresponds to OG "user_id_created"
                );
CREATE TABLE goods_received_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    goods_received_id TEXT NOT NULL REFERENCES goods_received(id),
                    purchase_order_line_id TEXT NOT NULL REFERENCES purchase_order_line(id),
                    received_pack_size REAL NOT NULL,
                    number_of_packs_received REAL NOT NULL DEFAULT 0.0,
                    batch TEXT,
                    weight_per_pack REAL,
                    expiry_date TEXT,
                    line_number BIGINT NOT NULL,
                    item_link_id TEXT REFERENCES item_link(id) NOT NULL,
                    item_name TEXT NOT NULL,
                    location_id TEXT REFERENCES location(id),
                    volume_per_pack REAL,
                    manufacturer_link_id TEXT REFERENCES name_link(id),
                    status TEXT NOT NULL DEFAULT 'UNAUTHORISED',
                    comment TEXT
                );
CREATE TABLE shipping_method (
                    id TEXT NOT NULL PRIMARY KEY, 
                    method TEXT NOT NULL, 
                    deleted_datetime TEXT
                );
CREATE TABLE IF NOT EXISTS "asset_internal_location" (
                        id TEXT PRIMARY KEY NOT NULL,
                        asset_id TEXT NOT NULL REFERENCES asset (id),-- this one is safe to keep as both asset and asset_internal_location are synced to OMS Central
                        location_id TEXT NOT NULL,
                        UNIQUE (location_id) -- Locations can only be assigned to be inside a single asset, this isn't tracking where the asset is, just what locations exist within it
                    );
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('changelog',181);
CREATE UNIQUE INDEX ix_number_store_type_unique ON number(store_id, type);
CREATE INDEX "index_name_first_name" ON "name"("first_name");
CREATE INDEX "index_name_last_name" ON "name"("last_name");
CREATE INDEX "index_name_code" ON "name"("code");
CREATE INDEX "index_name_national_health_number" ON "name"("national_health_number");
CREATE INDEX "index_activity_log_store_id_fkey" ON "activity_log" ("store_id");
CREATE INDEX "index_stocktake_inventory_addition_id_fkey" ON "stocktake" ("inventory_addition_id");
CREATE INDEX "index_stocktake_inventory_reduction_id_fkey" ON "stocktake" ("inventory_reduction_id");
CREATE INDEX "index_stocktake_store_id_fkey" ON "stocktake" ("store_id");
CREATE INDEX "index_location_store_id_fkey" ON "location" ("store_id");
CREATE INDEX "index_user_permission_store_id_fkey" ON "user_permission" ("store_id");
CREATE INDEX "index_user_permission_user_id_fkey" ON "user_permission" ("user_id");
CREATE INDEX "index_user_store_join_store_id_fkey" ON "user_store_join" ("store_id");
CREATE INDEX "index_user_store_join_user_id_fkey" ON "user_store_join" ("user_id");
CREATE INDEX "index_invoice_store_id_fkey" ON "invoice" ("store_id");
CREATE INDEX "index_invoice_name_store_id_fkey" ON "invoice" ("name_store_id");
CREATE INDEX "index_location_movement_stock_line_id_fkey" ON "location_movement" ("stock_line_id");
CREATE INDEX "index_location_movement_location_id_fkey" ON "location_movement" ("location_id");
CREATE INDEX "index_location_movement_store_id_fkey" ON "location_movement" ("store_id");
CREATE INDEX "index_item_unit_id_fkey" ON "item" ("unit_id");
CREATE INDEX "index_name_store_join_store_id_fkey" ON "name_store_join" ("store_id");
CREATE INDEX "index_stock_line_location_id_fkey" ON "stock_line" ("location_id");
CREATE INDEX "index_stock_line_store_id_fkey" ON "stock_line" ("store_id");
CREATE INDEX "index_requisition_line_requisition_id_fkey" ON "requisition_line" ("requisition_id");
CREATE INDEX "index_requisition_store_id_fkey" ON "requisition" ("store_id");
CREATE INDEX "index_stock_line_available_number_of_packs" ON "stock_line" ("available_number_of_packs");
CREATE INDEX "index_stock_line_total_number_of_packs" ON "stock_line" ("total_number_of_packs");
CREATE INDEX "index_stock_line_expiry_date" ON "stock_line" ("expiry_date");
CREATE INDEX "index_requisition_requisition_number" ON "requisition" ("requisition_number");
CREATE INDEX "index_requisition_type" ON "requisition" ("type");
CREATE INDEX "index_requisition_status" ON "requisition" ("status");
CREATE INDEX "index_requisition_linked_requisition_id" ON "requisition" ("linked_requisition_id");
CREATE INDEX "index_requisition_created_datetime" ON "requisition" ("created_datetime");
CREATE INDEX "index_invoice_invoice_number" ON "invoice" ("invoice_number");
CREATE INDEX "index_invoice_type" ON "invoice" ("type");
CREATE INDEX "index_invoice_status" ON "invoice" ("status");
CREATE INDEX "index_invoice_created_datetime" ON "invoice" ("created_datetime");
CREATE INDEX "index_invoice_requisition_id" ON "invoice" ("requisition_id");
CREATE INDEX "index_invoice_linked_invoice_id" ON "invoice" ("linked_invoice_id");
CREATE INDEX "index_sync_buffer_integration_datetime" ON "sync_buffer" ("integration_datetime");
CREATE INDEX "index_sync_buffer_integration_error" ON "sync_buffer" ("integration_error");
CREATE INDEX "index_sync_buffer_action" ON "sync_buffer" ("action");
CREATE INDEX "index_stocktake_stocktake_number" ON "stocktake" ("stocktake_number");
CREATE INDEX "index_stocktake_created_datetime" ON "stocktake" ("created_datetime");
CREATE INDEX "index_activity_log_record_id_fkey" ON "activity_log" ("record_id");
CREATE INDEX index_temperature_log_datetime ON temperature_log (datetime);
CREATE INDEX index_document_form_schema_id ON document (form_schema_id);
CREATE INDEX index_document_context_id ON document (context_id);
CREATE INDEX index_contact_trace_program_id ON contact_trace (program_id);
CREATE INDEX index_contact_trace_document_id ON contact_trace (document_id);
CREATE INDEX index_contact_trace_store_id ON contact_trace (store_id);
CREATE INDEX index_stock_line_barcode_id ON stock_line (barcode_id);
CREATE INDEX index_sensor_store_id ON sensor (store_id);
CREATE INDEX index_sensor_location_id ON sensor (location_id);
CREATE INDEX index_barcode_item_id ON barcode (item_id);
CREATE INDEX index_temperature_log_sensor_id ON temperature_log (sensor_id);
CREATE INDEX index_temperature_log_store_id ON temperature_log (store_id);
CREATE INDEX index_temperature_log_location_id ON temperature_log (location_id);
CREATE INDEX index_temperature_log_temperature_breach_id ON temperature_log (temperature_breach_id);
CREATE INDEX i_program_requisition_ot_program_requisition_settings ON program_requisition_order_type (program_requisition_settings_id);
CREATE INDEX index_name_tag_join_name_tag_id ON name_tag_join (name_tag_id);
CREATE INDEX index_temperature_breach_sensor_id ON temperature_breach (sensor_id);
CREATE INDEX index_temperature_breach_store_id ON temperature_breach (store_id);
CREATE INDEX index_temperature_breach_location_id ON temperature_breach (location_id);
CREATE INDEX index_user_permission_context_id ON user_permission (context_id);
CREATE INDEX index_requisition_period_id ON requisition (period_id);
CREATE INDEX index_period_period_schedule_id ON period (period_schedule_id);
CREATE INDEX index_document_registry_form_schema_id ON document_registry (form_schema_id);
CREATE INDEX index_document_registry_context_id ON document_registry (context_id);
CREATE INDEX index_program_requisition_settings_name_tag_id ON program_requisition_settings (name_tag_id);
CREATE INDEX index_program_requisition_settings_program_id ON program_requisition_settings (program_id);
CREATE INDEX index_program_requisition_settings_period_schedule_id ON program_requisition_settings (period_schedule_id);
CREATE INDEX index_program_enrolment_program_id ON program_enrolment (program_id);
CREATE INDEX index_clinician_store_join_store_id ON clinician_store_join (store_id);
CREATE INDEX "index_item_is_active" ON "item" ("is_active");
CREATE INDEX "index_unit_is_active" ON "unit" ("is_active");
CREATE INDEX "index_item_link_item_id_fkey" ON "item_link" ("item_id");
CREATE INDEX "index_stock_line_item_link_id_fkey" ON "stock_line" ("item_link_id");
CREATE INDEX "index_master_list_line_item_link_id_fkey" on "master_list_line" (item_link_id);
CREATE INDEX "index_name_link_name_id_fkey" ON "name_link" ("name_id");
CREATE INDEX "index_changelog_name_link_id_fkey" ON "changelog" ("name_link_id");
CREATE INDEX index_changelog_record_id ON changelog (record_id);
CREATE INDEX "index_invoice_name_link_id_fkey" ON "invoice" ("name_link_id");
CREATE INDEX "index_name_store_join_name_link_id_fkey" ON "name_store_join" ("name_link_id");
CREATE INDEX "index_master_list_name_join_name_link_id_fkey" on "master_list_name_join" (name_link_id);
CREATE INDEX "index_name_tag_join_name_link_id_fkey" ON "name_tag_join" ("name_link_id");
CREATE INDEX "index_requisition_name_link_id_fkey" ON "requisition" ("name_link_id");
CREATE INDEX "index_stock_line_supplier_link_id_fkey" ON "stock_line" ("supplier_link_id");
CREATE INDEX "index_barcode_manufacturer_link_id_fkey" ON "barcode" ("manufacturer_link_id");
CREATE INDEX "index_document_name" ON "document" ("name");
CREATE INDEX "index_document_owner_name_link_id" ON "document" ("owner_name_link_id");
CREATE INDEX "index_program_event_patient_link_id" ON "program_event" ("patient_link_id");
CREATE INDEX "index_program_enrolment_patient_link_id_fkey" ON "program_enrolment" ("patient_link_id");
CREATE INDEX "index_clinician_link_clinician_id_fkey" ON "clinician_link" ("clinician_id");
CREATE INDEX "index_clinician_store_join_clinician_link_id_fkey" ON "clinician_store_join" ("clinician_link_id");
CREATE INDEX "index_invoice_clinician_link_id_fkey" ON "invoice" ("clinician_link_id");
CREATE INDEX "index_contact_trace_patient_link_id" ON "contact_trace" ("patient_link_id");
CREATE INDEX "index_contact_trace_contact_patient_link_id" ON "contact_trace" ("contact_patient_link_id");
CREATE INDEX asset_catalogue_item_id ON asset (asset_catalogue_item_id);
CREATE INDEX asset_serial_number ON asset (serial_number);
CREATE INDEX asset_asset_number ON asset (asset_number);
CREATE INDEX asset_deleted_datetime ON asset (deleted_datetime);
CREATE INDEX ix_asset_log_asset_id_log_datetime ON asset_log (asset_id, log_datetime);
CREATE INDEX "index_item_is_vaccine" ON "item" ("is_vaccine");
CREATE INDEX program_indicator_program_id ON program_indicator(program_id);
CREATE INDEX indicator_column_program_indicator_id ON indicator_column(program_indicator_id);
CREATE INDEX indicator_line_program_indicator_id ON indicator_line(program_indicator_id);
CREATE INDEX indicator_value_customer_name_link_id ON indicator_value(customer_name_link_id);
CREATE INDEX indicator_value_store_id ON indicator_value(store_id);
CREATE INDEX indicator_value_period_id ON indicator_value(period_id);
CREATE INDEX indicator_value_indicator_line_id ON indicator_value(indicator_line_id);
CREATE INDEX indicator_value_indicator_column_id ON indicator_value(indicator_column_id);
CREATE INDEX "index_sync_buffer_combined_index" ON "sync_buffer" (action, table_name, integration_datetime, source_site_id);
CREATE INDEX idx_purchase_order_line_status 
                ON purchase_order_line (status);
CREATE VIEW invoice_line_stock_movement AS
    SELECT
        invoice_line.id,
        invoice_line.invoice_id,
        invoice_line.item_name,
        invoice_line.item_code,
        invoice_line.stock_line_id,
        invoice_line.location_id,
        invoice_line.batch,
        invoice_line.expiry_date,
        invoice_line.cost_price_per_pack,
        invoice_line.sell_price_per_pack,
        invoice_line.total_before_tax,
        invoice_line.total_after_tax,
        invoice_line.tax_percentage,
        invoice_line.number_of_packs,
        invoice_line.pack_size,
        invoice_line.note,
        invoice_line.type,
        invoice_line.reason_option_id,
        invoice_line.foreign_currency_price_before_tax,
        invoice_line.item_link_id,
        item_link.item_id AS item_id,
        CASE
            WHEN "type" = 'STOCK_IN' THEN (number_of_packs * pack_size)
            WHEN "type" = 'STOCK_OUT' THEN (number_of_packs * pack_size) * -1
        END AS quantity_movement
    FROM
        invoice_line
        JOIN item_link ON item_link.id = invoice_line.item_link_id
    WHERE
        number_of_packs > 0
        AND "type" IN ('STOCK_IN', 'STOCK_OUT');
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
        received_datetime as datetime
    FROM invoice_line_stock_movement
    JOIN invoice
        ON invoice_line_stock_movement.invoice_id = invoice.id
    WHERE invoice.type = 'INBOUND_SHIPMENT'
        AND received_datetime IS NOT NULL;
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
CREATE VIEW stock_movement AS
    WITH all_movements AS (
      SELECT
        invoice_line_stock_movement.id AS id,
        quantity_movement AS quantity,
        invoice_line_stock_movement.item_id AS item_id,
        invoice.store_id as store_id,
        CASE WHEN invoice.type IN (
            'OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN',
            'PRESCRIPTION'
        ) THEN picked_datetime
                    WHEN invoice.type IN (
            'INBOUND_SHIPMENT', 'CUSTOMER_RETURN'
        ) THEN received_datetime
                    WHEN invoice.type IN (
            'INVENTORY_ADDITION', 'INVENTORY_REDUCTION', 'REPACK'
        ) THEN verified_datetime
            END AS datetime,
        name,
        invoice.type AS invoice_type,
        invoice.invoice_number AS invoice_number,
        invoice.id AS invoice_id,
        invoice.linked_invoice_id AS linked_invoice_id,
        name.id AS name_id,
        name.properties AS name_properties,
        reason_option.reason AS reason,
        stock_line_id,
        invoice_line_stock_movement.expiry_date AS expiry_date,
        invoice_line_stock_movement.batch AS batch,
        invoice_line_stock_movement.cost_price_per_pack AS cost_price_per_pack,
        invoice_line_stock_movement.sell_price_per_pack AS sell_price_per_pack,
        invoice.status AS invoice_status,
        invoice_line_stock_movement.total_before_tax AS total_before_tax,
        invoice_line_stock_movement.pack_size as pack_size,
        invoice_line_stock_movement.number_of_packs as number_of_packs
    FROM
        invoice_line_stock_movement
        LEFT JOIN reason_option ON invoice_line_stock_movement.reason_option_id = reason_option.id
        LEFT JOIN stock_line ON stock_line.id = invoice_line_stock_movement.stock_line_id
        JOIN invoice ON invoice.id = invoice_line_stock_movement.invoice_id
        JOIN name_link ON invoice.name_link_id = name_link.id
        JOIN name ON name_link.name_id = name.id
    )
    SELECT * FROM all_movements
    WHERE datetime IS NOT NULL;
CREATE VIEW stock_line_ledger AS
    WITH movements_with_precedence AS (
      SELECT *,
        CASE
          WHEN invoice_type IN ('INBOUND_SHIPMENT', 'CUSTOMER_RETURN', 'INVENTORY_ADDITION') THEN 1
          WHEN invoice_type IN ('OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN', 'PRESCRIPTION', 'INVENTORY_REDUCTION') THEN 2
          ELSE 3
        END AS type_precedence
      FROM stock_movement
      WHERE stock_line_id IS NOT NULL
    )
    SELECT *,
      SUM(quantity) OVER (
        PARTITION BY store_id, stock_line_id
        ORDER BY datetime, type_precedence
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS running_balance
    FROM movements_with_precedence
    ORDER BY datetime, type_precedence;
CREATE VIEW stock_line_ledger_discrepancy AS 
  WITH
	allocated_not_picked AS (
		SELECT
			stock_line_id,
			SUM(number_of_packs * pack_size) AS q
		FROM
			invoice_line
			JOIN invoice ON invoice.id = invoice_line.invoice_id
		WHERE
			invoice_line.type = 'STOCK_OUT'
			AND invoice.status IN ('NEW', 'ALLOCATED')
		GROUP BY
			1
	),
	max_ledger_datetime AS (
		SELECT
			stock_line_id,
			MAX(datetime) AS dt
		FROM
			stock_movement
		GROUP BY
			1
	),
	running_balance AS (
		SELECT
			stock_line_ledger.stock_line_id,
			running_balance AS q
		FROM
			stock_line_ledger
			JOIN max_ledger_datetime ON stock_line_ledger.stock_line_id = max_ledger_datetime.stock_line_id
			AND stock_line_ledger.datetime = max_ledger_datetime.dt
	),
	current_balance AS (
		SELECT
			stock_line.id AS stock_line_id,
			available_number_of_packs * pack_size AS a_q,
			total_number_of_packs * pack_size AS t_q
		FROM
			stock_line
	)
  SELECT DISTINCT
    stock_line_id
  FROM
    stock_line_ledger
  WHERE
    stock_line_ledger.running_balance < 0
  UNION
  SELECT
    current_balance.stock_line_id
  FROM
    current_balance
    LEFT JOIN running_balance ON running_balance.stock_line_id = current_balance.stock_line_id
    LEFT JOIN allocated_not_picked ON allocated_not_picked.stock_line_id = current_balance.stock_line_id
  WHERE
    NOT (
      running_balance.q = current_balance.t_q
      AND (
        (
          allocated_not_picked.q IS NULL
          AND current_balance.t_q = current_balance.a_q
        )
        OR (
          allocated_not_picked.q IS NOT NULL
          AND current_balance.a_q + allocated_not_picked.q = current_balance.t_q
        )
      )
    )
    OR running_balance.q IS NULL AND (current_balance.t_q != 0 OR current_balance.a_q != 0);
CREATE VIEW item_ledger AS
    WITH all_movements AS (
      SELECT
        invoice_line_stock_movement.id AS id,
        quantity_movement AS movement_in_units,
        invoice_line_stock_movement.item_id AS item_id,
        invoice.store_id as store_id,
        CASE WHEN invoice.type IN (
          'OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN', 'PRESCRIPTION'
        ) THEN picked_datetime
          WHEN invoice.type IN (
            'INBOUND_SHIPMENT', 'CUSTOMER_RETURN'
        ) THEN received_datetime
          WHEN invoice.type IN (
            'INVENTORY_ADDITION', 'INVENTORY_REDUCTION', 'REPACK'
        ) THEN verified_datetime
        ELSE NULL
        END AS datetime,
        name.name AS name,
        name.id AS name_id,
        invoice.type AS invoice_type,
        invoice.invoice_number AS invoice_number,
        invoice.id AS invoice_id,
        reason_option.reason AS reason,
        stock_line_id,
        invoice_line_stock_movement.expiry_date AS expiry_date,
        invoice_line_stock_movement.batch AS batch,
        invoice_line_stock_movement.cost_price_per_pack AS cost_price_per_pack,
        invoice_line_stock_movement.sell_price_per_pack AS sell_price_per_pack,
        invoice.status AS invoice_status,
        invoice_line_stock_movement.total_before_tax AS total_before_tax,
        invoice_line_stock_movement.pack_size as pack_size,
        invoice_line_stock_movement.number_of_packs as number_of_packs,
        CASE
          WHEN invoice.type IN ('INBOUND_SHIPMENT', 'CUSTOMER_RETURN', 'INVENTORY_ADDITION') THEN 1
          WHEN invoice.type IN ('OUTBOUND_SHIPMENT', 'SUPPLIER_RETURN', 'PRESCRIPTION', 'INVENTORY_REDUCTION') THEN 2
          ELSE 3
        END AS type_precedence
    FROM
        invoice_line_stock_movement
        LEFT JOIN reason_option ON invoice_line_stock_movement.reason_option_id = reason_option.id
        LEFT JOIN stock_line ON stock_line.id = invoice_line_stock_movement.stock_line_id
        JOIN invoice ON invoice.id = invoice_line_stock_movement.invoice_id
        JOIN name_link ON invoice.name_link_id = name_link.id
        JOIN name ON name_link.name_id = name.id
    )
    SELECT *,
      SUM(movement_in_units) OVER (
        PARTITION BY store_id, item_id
        ORDER BY datetime, id, type_precedence
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      ) AS running_balance
    FROM all_movements
    WHERE datetime IS NOT NULL  
    ORDER BY datetime, id, type_precedence;
CREATE VIEW replenishment AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        abs(COALESCE(stock_movement.quantity, 0)) AS quantity,
        date(stock_movement.datetime) AS date
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='INBOUND_SHIPMENT';
CREATE VIEW adjustments AS
    SELECT
        'n/a' as id,
        items_and_stores.item_id AS item_id,
        items_and_stores.store_id AS store_id,
        stock_movement.quantity AS quantity,
        date(stock_movement.datetime) AS date
    FROM
        (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
    LEFT OUTER JOIN stock_movement
        ON stock_movement.item_id = items_and_stores.item_id
            AND stock_movement.store_id = items_and_stores.store_id
    WHERE invoice_type='CUSTOMER_RETURN'
      OR invoice_type='SUPPLIER_RETURN'
      OR invoice_type='INVENTORY_ADDITION'
      OR invoice_type='INVENTORY_REDUCTION';
CREATE VIEW consumption AS
                SELECT
                    'n/a' as id,
                    items_and_stores.item_id AS item_id,
                    items_and_stores.store_id AS store_id,
                    abs(COALESCE(stock_movement.quantity, 0)) AS quantity,
                    date(stock_movement.datetime) AS date,
                    stock_movement.invoice_type AS invoice_type,
                    stock_movement.name_id AS name_id,
                    stock_movement.name_properties AS name_properties
            FROM (SELECT item.id AS item_id, store.id AS store_id FROM item, store) as items_and_stores
                LEFT OUTER JOIN stock_movement
                ON stock_movement.item_id = items_and_stores.item_id
                AND stock_movement.store_id = items_and_stores.store_id
            WHERE invoice_type='OUTBOUND_SHIPMENT' OR invoice_type='PRESCRIPTION';
CREATE VIEW store_items AS
    SELECT i.id as item_id, sl.store_id, sl.pack_size, sl.available_number_of_packs, sl.total_number_of_packs
    FROM
      item i
      LEFT JOIN item_link il ON il.item_id = i.id
      LEFT JOIN stock_line sl ON sl.item_link_id = il.id
      LEFT JOIN store s ON s.id = sl.store_id;
CREATE VIEW stock_on_hand AS
    SELECT
      'n/a' AS id,
      items_and_stores.item_id AS item_id,
      items_and_stores.item_name AS item_name,
      items_and_stores.store_id AS store_id,
      COALESCE(stock.available_stock_on_hand, 0) AS available_stock_on_hand,
      COALESCE(stock.total_stock_on_hand, 0) AS total_stock_on_hand
    FROM
      (
        SELECT
          item.id AS item_id,
          item.name AS item_name,
          store.id AS store_id
        FROM
          item,
          store
      ) AS items_and_stores
      LEFT OUTER JOIN (
        SELECT
          item_id,
          store_id,
          SUM(pack_size * available_number_of_packs) AS available_stock_on_hand,
          SUM(pack_size * total_number_of_packs) AS total_stock_on_hand
        FROM
          store_items
        WHERE
          store_items.available_number_of_packs > 0 OR store_items.total_number_of_packs > 0
        GROUP BY
          item_id,
          store_id
      ) AS stock ON stock.item_id = items_and_stores.item_id
      AND stock.store_id = items_and_stores.store_id;
CREATE VIEW changelog_deduped AS
    SELECT c.cursor,
        c.table_name,
        c.record_id,
        c.row_action,
        c.name_link_id,
        c.store_id,
        c.is_sync_update,
        c.source_site_id
    FROM (
        SELECT record_id, store_id, MAX(cursor) AS max_cursor
        FROM changelog
        GROUP BY record_id, store_id
    ) grouped
    INNER JOIN changelog c
        ON c.record_id = grouped.record_id 
        AND (c.store_id = grouped.store_id OR (c.store_id IS NULL AND grouped.store_id IS NULL))
        AND c.cursor = grouped.max_cursor
    ORDER BY c.cursor;
CREATE VIEW latest_document
    AS
        SELECT d.*
        FROM (
        SELECT name, MAX(datetime) AS datetime
            FROM document
            GROUP BY name
    ) grouped
    INNER JOIN document d
    ON d.name = grouped.name AND d.datetime = grouped.datetime;
CREATE VIEW latest_asset_log AS
    SELECT al.id,
      al.asset_id,
      al.user_id,
      al.comment,
      al.type,
      al.log_datetime,
      al.status,
      al.reason_id
    FROM (
      SELECT asset_id, MAX(log_datetime) AS latest_log_datetime
      FROM asset_log
      GROUP BY asset_id
    ) grouped
    INNER JOIN asset_log al
      ON al.asset_id = grouped.asset_id AND al.log_datetime = grouped.latest_log_datetime;
CREATE VIEW report_document AS
    SELECT
        d.name,
        d.datetime,
        d.type,
        d.data,
        nl.name_id as owner_name_id
    FROM (
        SELECT name as doc_name, MAX(datetime) AS doc_time
        FROM document
        GROUP BY name
    ) grouped
    INNER JOIN document d ON d.name = grouped.doc_name AND d.datetime = grouped.doc_time
    LEFT JOIN name_link nl ON nl.id = d.owner_name_link_id
    WHERE d.status != 'DELETED';
CREATE VIEW report_encounter AS
    SELECT
      encounter.id,
      encounter.created_datetime,
      encounter.start_datetime,
      encounter.end_datetime,
      encounter.status,
      encounter.store_id,
      nl.name_id as patient_id,
      encounter.document_type,
      doc.data as document_data
    FROM encounter
    LEFT JOIN name_link nl ON nl.id = encounter.patient_link_id
    LEFT JOIN report_document doc ON doc.name = encounter.document_name;
CREATE VIEW report_store AS
    SELECT
        store.id,
        store.code,
        store.store_mode,
        store.logo,
        name.name
    FROM store
    JOIN name_link ON store.name_link_id = name_link.id
    JOIN name ON name_link.name_id = name.id;
CREATE VIEW report_patient AS
                SELECT
                    id,
                    code,
                    national_health_number AS code_2,
                    first_name,
                    last_name,
                    gender,
                    date_of_birth,
                    address1,
                    phone,
                    date_of_death,
                    is_deceased
                FROM name;
CREATE VIEW report_program_event AS
    SELECT
        e.id,
        nl.name_id as patient_id,
        e.datetime,
        e.active_start_datetime,
        e.active_end_datetime,
        e.document_type,
        e.document_name,
        e.type,
        e.data
    FROM program_event e
    LEFT JOIN name_link nl ON nl.id = e.patient_link_id;
CREATE VIEW report_program_enrolment AS
    SELECT
        program_enrolment.id,
        program_enrolment.document_type,
        program_enrolment.enrolment_datetime,
        program_enrolment.program_enrolment_id,
        program_enrolment.status,
        nl.name_id as patient_id,
        doc.data as document_data
    FROM program_enrolment
    LEFT JOIN name_link nl ON nl.id = program_enrolment.patient_link_id
    LEFT JOIN report_document doc ON doc.name = program_enrolment.document_name;
CREATE VIEW requisitions_in_period AS
                SELECT
                'n/a' as id,
                r.program_id,
                r.period_id,
                r.store_id,
                r.order_type,
                r.type,
                n.id AS other_party_id,
                count(*) as count
                FROM requisition r
                INNER JOIN name_link nl ON r.name_link_id = nl.id
                INNER JOIN name n ON nl.name_id = n.id
                WHERE r.order_type IS NOT NULL
                GROUP BY 1,2,3,4,5,6,7;
CREATE VIEW vaccination_card AS
    SELECT
      vcd.id || '_' || pe.id AS id,
      vcd.id as vaccine_course_dose_id,
      vcd.label,
      vcd.min_interval_days,
      vcd.min_age,
      vcd.max_age,
      vcd.custom_age_label,
      vc.id as vaccine_course_id,
      vc.can_skip_dose,
      v.id as vaccination_id,
      v.vaccination_date,
      v.given,
      v.stock_line_id,
      n.id AS facility_name_id,
      v.facility_free_text,
      s.batch,
      pe.id as program_enrolment_id
    FROM vaccine_course_dose vcd
    JOIN vaccine_course vc
      ON vcd.vaccine_course_id = vc.id
    JOIN program_enrolment pe
      ON pe.program_id = vc.program_id
    LEFT JOIN vaccination v
      ON v.vaccine_course_dose_id = vcd.id AND v.program_enrolment_id = pe.id
    LEFT JOIN name_link nl
      ON v.facility_name_link_id = nl.id
    LEFT JOIN name n
      ON nl.name_id = n.id
    LEFT JOIN stock_line s
      ON v.stock_line_id = s.id
    -- Only show doses that haven't been deleted, unless they have a vaccination
    WHERE vcd.deleted_datetime IS NULL OR v.id IS NOT NULL
;
CREATE VIEW vaccination_course AS
    SELECT
      vc.id,
      vc.name AS vaccine_course_name,
      coverage_rate,
      wastage_rate,
      vcd.id AS vaccine_course_dose_id,
      label AS dose_label,
      min_interval_days,
      min_age,
      max_age,
      custom_age_label,
      vci.id AS vaccine_course_item_id,
      item.id AS item_id,
      il.id AS item_link_id,
      item.name AS item_name,
      item.code AS item_code,
      item.type AS item_type,
      item.default_pack_size,
      item.is_vaccine AS is_vaccine_item,
      item.vaccine_doses,
      item.unit_id AS unit_id,
      unit.name AS unit,
      unit."index" AS unit_index,
      d.id AS demographic_id,
      d.name AS demographic_name,
      d.population_percentage AS population_percentage,
      p.id AS program_id,
      p.name AS program_name
    FROM
      vaccine_course vc
      JOIN vaccine_course_dose vcd ON vc.id = vcd.vaccine_course_id
      JOIN vaccine_course_item vci ON vci.vaccine_course_id = vc.id
      JOIN item_link il ON vci.item_link_id = il.id
      JOIN item ON item.id = il.item_id
      LEFT JOIN unit ON item.unit_id = unit.id
      LEFT JOIN demographic d ON d.id = vc.demographic_id
      JOIN PROGRAM p ON p.id = vc.program_id
    WHERE
      vc.deleted_datetime IS NULL
      AND vcd.deleted_datetime IS NULL
      AND vci.deleted_datetime IS NULL;
CREATE VIEW purchase_order_stats AS
                SELECT
                    po.id AS purchase_order_id,
                    COALESCE(SUM(
                        CASE
                            WHEN pol.adjusted_number_of_units IS NOT NULL
                            THEN (pol.adjusted_number_of_units / NULLIF(pol.requested_pack_size, 0)) * pol.price_per_pack_after_discount
                            ELSE (pol.requested_number_of_units / NULLIF(pol.requested_pack_size, 0)) * pol.price_per_pack_after_discount
                        END
                    ), 0) AS order_total_before_discount,
                    COALESCE(SUM(
                        CASE
                            WHEN pol.adjusted_number_of_units IS NOT NULL
                            THEN (pol.adjusted_number_of_units / NULLIF(pol.requested_pack_size, 0)) * pol.price_per_pack_after_discount
                            ELSE (pol.requested_number_of_units / NULLIF(pol.requested_pack_size, 0)) * pol.price_per_pack_after_discount
                        END
                    ), 0) * (1-(COALESCE(po.supplier_discount_percentage, 0)/100)) AS order_total_after_discount 

                FROM
                    purchase_order po JOIN purchase_order_line pol on po.id = pol.purchase_order_id
                GROUP BY
                    po.id;
CREATE VIEW invoice_stats AS
                    SELECT
                        invoice_line.invoice_id,
                        SUM(invoice_line.total_before_tax) AS total_before_tax,
                        SUM(invoice_line.total_after_tax) AS total_after_tax,
                        (SUM(invoice_line.total_after_tax) / SUM(invoice_line.total_before_tax) - 1) * 100 AS tax_percentage,
                        SUM(invoice_line.foreign_currency_price_before_tax) + (SUM(invoice_line.foreign_currency_price_before_tax) * COALESCE(invoice_line.tax_percentage, 0) / 100) AS foreign_currency_total_after_tax,
                        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_before_tax,
                        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type = 'SERVICE'), 0) AS service_total_after_tax,
                        COALESCE(SUM(invoice_line.total_before_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_before_tax,
                        COALESCE(SUM(invoice_line.total_after_tax) FILTER(WHERE invoice_line.type IN ('STOCK_IN','STOCK_OUT')), 0) AS stock_total_after_tax
                    FROM
                        invoice_line
                    GROUP BY
                        invoice_line.invoice_id;
CREATE VIEW contact_trace_name_link_view AS
                    SELECT
                        ct.id AS id,
                        ct.program_id AS program_id,
                        ct.document_id AS document_id,
                        ct.datetime AS datetime,
                        ct.contact_trace_id AS contact_trace_id,
                        patient_name_link.name_id AS patient_id,
                        contact_patient_name_link.name_id AS contact_patient_id,
                        ct.first_name AS first_name,
                        ct.last_name AS last_name,
                        ct.gender AS gender,
                        ct.date_of_birth AS date_of_birth,
                        ct.store_id AS store_id,
                        ct.relationship AS relationship
                    FROM contact_trace ct
                    INNER JOIN name_link as patient_name_link
                        ON ct.patient_link_id = patient_name_link.id
                    LEFT JOIN name_link as contact_patient_name_link
                        ON ct.contact_patient_link_id = contact_patient_name_link.id;
COMMIT;
