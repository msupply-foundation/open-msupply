--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2 (Postgres.app)
-- Dumped by pg_dump version 17.2 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: nocase; Type: COLLATION; Schema: public; Owner: postgres
--

CREATE COLLATION public.nocase (provider = icu, deterministic = false, locale = 'pg-catalog');


ALTER COLLATION public.nocase OWNER TO postgres;

--
-- Name: activity_log_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_log_type AS ENUM (
    'USER_LOGGED_IN',
    'INVOICE_CREATED',
    'INVOICE_DELETED',
    'INVOICE_STATUS_ALLOCATED',
    'INVOICE_STATUS_PICKED',
    'INVOICE_STATUS_SHIPPED',
    'INVOICE_STATUS_DELIVERED',
    'INVOICE_STATUS_VERIFIED',
    'STOCKTAKE_CREATED',
    'STOCKTAKE_DELETED',
    'STOCKTAKE_STATUS_FINALISED',
    'REQUISITION_CREATED',
    'REQUISITION_DELETED',
    'REQUISITION_STATUS_SENT',
    'REQUISITION_STATUS_FINALISED',
    'STOCK_LOCATION_CHANGE',
    'STOCK_COST_PRICE_CHANGE',
    'STOCK_SELL_PRICE_CHANGE',
    'STOCK_EXPIRY_DATE_CHANGE',
    'STOCK_BATCH_CHANGE',
    'STOCK_ON_HOLD',
    'STOCK_OFF_HOLD',
    'INVOICE_NUMBER_ALLOCATED',
    'REQUISITION_NUMBER_ALLOCATED',
    'REPACK',
    'PRESCRIPTION_CREATED',
    'PRESCRIPTION_DELETED',
    'PRESCRIPTION_STATUS_PICKED',
    'PRESCRIPTION_STATUS_VERIFIED',
    'PRESCRIPTION_STATUS_CANCELLED',
    'SENSOR_LOCATION_CHANGED',
    'ASSET_CATALOGUE_ITEM_CREATED',
    'ASSET_LOG_REASON_CREATED',
    'ASSET_LOG_REASON_DELETED',
    'ASSET_CREATED',
    'ASSET_UPDATED',
    'ASSET_DELETED',
    'ASSET_LOG_CREATED',
    'ASSET_CATALOGUE_ITEM_PROPERTY_CREATED',
    'QUANTITY_FOR_LINE_HAS_BEEN_SET_TO_ZERO',
    'INVENTORY_ADJUSTMENT',
    'ASSET_PROPERTY_CREATED',
    'ASSET_PROPERTY_UPDATED',
    'VACCINE_COURSE_CREATED',
    'VACCINE_COURSE_UPDATED',
    'PROGRAM_CREATED',
    'PROGRAM_UPDATED',
    'RNR_FORM_CREATED',
    'RNR_FORM_UPDATED',
    'RNR_FORM_FINALISED',
    'REQUISITION_APPROVED',
    'VACCINATION_CREATED',
    'VACCINATION_UPDATED',
    'VACCINATION_DELETED',
    'DEMOGRAPHIC_INDICATOR_CREATED',
    'DEMOGRAPHIC_INDICATOR_UPDATED',
    'DEMOGRAPHIC_PROJECTION_CREATED',
    'DEMOGRAPHIC_PROJECTION_UPDATED'
);


ALTER TYPE public.activity_log_type OWNER TO postgres;

--
-- Name: approval_status_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.approval_status_type AS ENUM (
    'NONE',
    'APPROVED',
    'PENDING',
    'DENIED',
    'AUTO_APPROVED',
    'APPROVED_BY_ANOTHER',
    'DENIED_BY_ANOTHER'
);


ALTER TYPE public.approval_status_type OWNER TO postgres;

--
-- Name: asset_log_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.asset_log_status AS ENUM (
    'NOT_IN_USE',
    'FUNCTIONING',
    'FUNCTIONING_BUT_NEEDS_ATTENTION',
    'NOT_FUNCTIONING',
    'DECOMMISSIONED',
    'UNSERVICEABLE'
);


ALTER TYPE public.asset_log_status OWNER TO postgres;

--
-- Name: changelog_table_name; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.changelog_table_name AS ENUM (
    'number',
    'location',
    'stock_line',
    'name',
    'name_store_join',
    'invoice',
    'invoice_line',
    'stocktake',
    'stocktake_line',
    'requisition',
    'requisition_line',
    'activity_log',
    'clinician',
    'clinician_store_join',
    'document',
    'barcode',
    'location_movement',
    'sensor',
    'temperature_breach',
    'temperature_log',
    'temperature_breach_config',
    'currency',
    'asset_catalogue_item_property',
    'asset_catalogue_property',
    'asset_log_reason',
    'asset',
    'asset_log',
    'asset_class',
    'asset_category',
    'asset_catalogue_type',
    'asset_catalogue_item',
    'pack_variant',
    'sync_file_reference',
    'asset_property',
    'property',
    'name_property',
    'name_oms_fields',
    'asset_internal_location',
    'rnr_form',
    'rnr_form_line',
    'demographic_indicator',
    'vaccine_course',
    'vaccine_course_dose',
    'vaccine_course_item',
    'vaccination',
    'demographic',
    'item_variant',
    'packaging_variant',
    'indicator_value',
    'bundled_item',
    'item',
    'system_log',
    'contact_form',
    'backend_plugin',
    'insurance_provider',
    'frontend_plugin',
    'name_insurance_join',
    'report',
    'form_schema',
    'plugin_data',
    'preference'
);


ALTER TYPE public.changelog_table_name OWNER TO postgres;

--
-- Name: contact_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contact_type_enum AS ENUM (
    'FEEDBACK',
    'SUPPORT'
);


ALTER TYPE public.contact_type_enum OWNER TO postgres;

--
-- Name: context_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.context_type AS ENUM (
    'ASSET',
    'INBOUND_SHIPMENT',
    'OUTBOUND_SHIPMENT',
    'REQUISITION',
    'STOCKTAKE',
    'RESOURCE',
    'PATIENT',
    'DISPENSARY',
    'REPACK',
    'CUSTOMER_RETURN',
    'SUPPLIER_RETURN',
    'REPORT',
    'PRESCRIPTION',
    'OUTBOUND_RETURN',
    'INBOUND_RETURN',
    'INTERNAL_ORDER'
);


ALTER TYPE public.context_type OWNER TO postgres;

--
-- Name: document_registry_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_registry_category AS ENUM (
    'PATIENT',
    'PROGRAM_ENROLMENT',
    'ENCOUNTER',
    'CUSTOM',
    'CONTACT_TRACE'
);


ALTER TYPE public.document_registry_category OWNER TO postgres;

--
-- Name: document_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.document_status AS ENUM (
    'ACTIVE',
    'DELETED'
);


ALTER TYPE public.document_status OWNER TO postgres;

--
-- Name: email_queue_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.email_queue_status_enum AS ENUM (
    'QUEUED',
    'SENT',
    'ERRORED',
    'FAILED'
);


ALTER TYPE public.email_queue_status_enum OWNER TO postgres;

--
-- Name: encounter_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.encounter_status AS ENUM (
    'PENDING',
    'VISITED',
    'CANCELLED',
    'DELETED'
);


ALTER TYPE public.encounter_status OWNER TO postgres;

--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.gender_type AS ENUM (
    'FEMALE',
    'MALE',
    'TRANSGENDER',
    'TRANSGENDER_MALE',
    'TRANSGENDER_MALE_HORMONE',
    'TRANSGENDER_MALE_SURGICAL',
    'TRANSGENDER_FEMALE',
    'TRANSGENDER_FEMALE_HORMONE',
    'TRANSGENDER_FEMALE_SURGICAL',
    'UNKNOWN',
    'NON_BINARY'
);


ALTER TYPE public.gender_type OWNER TO postgres;

--
-- Name: indicator_value_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.indicator_value_type AS ENUM (
    'STRING',
    'NUMBER'
);


ALTER TYPE public.indicator_value_type OWNER TO postgres;

--
-- Name: insurance_policy_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.insurance_policy_type AS ENUM (
    'PERSONAL',
    'BUSINESS'
);


ALTER TYPE public.insurance_policy_type OWNER TO postgres;

--
-- Name: inventory_adjustment_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.inventory_adjustment_type AS ENUM (
    'POSITIVE',
    'NEGATIVE'
);


ALTER TYPE public.inventory_adjustment_type OWNER TO postgres;

--
-- Name: invoice_line_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_line_type AS ENUM (
    'STOCK_IN',
    'STOCK_OUT',
    'UNALLOCATED_STOCK',
    'SERVICE'
);


ALTER TYPE public.invoice_line_type OWNER TO postgres;

--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_status AS ENUM (
    'NEW',
    'ALLOCATED',
    'PICKED',
    'SHIPPED',
    'DELIVERED',
    'VERIFIED',
    'CANCELLED'
);


ALTER TYPE public.invoice_status OWNER TO postgres;

--
-- Name: invoice_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.invoice_type AS ENUM (
    'OUTBOUND_SHIPMENT',
    'INBOUND_SHIPMENT',
    'INVENTORY_ADDITION',
    'INVENTORY_REDUCTION',
    'REPACK',
    'PRESCRIPTION',
    'CUSTOMER_RETURN',
    'SUPPLIER_RETURN'
);


ALTER TYPE public.invoice_type OWNER TO postgres;

--
-- Name: item_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.item_type AS ENUM (
    'STOCK',
    'SERVICE',
    'NON_STOCK'
);


ALTER TYPE public.item_type OWNER TO postgres;

--
-- Name: key_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.key_type AS ENUM (
    'CENTRAL_SYNC_PULL_CURSOR',
    'REMOTE_SYNC_PUSH_CURSOR',
    'SETTINGS_SYNC_URL',
    'SETTINGS_SYNC_USERNAME',
    'SETTINGS_SYNC_PASSWORD_SHA256',
    'SETTINGS_SYNC_INTERVAL_SECONDS',
    'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID',
    'SETTINGS_SYNC_SITE_ID',
    'SETTINGS_SYNC_SITE_UUID',
    'SETTINGS_SYNC_IS_DISABLED',
    'SETTINGS_TOKEN_SECRET',
    'SHIPMENT_TRANSFER_PROCESSOR_CURSOR',
    'REQUISITION_TRANSFER_PROCESSOR_CURSOR',
    'SETTINGS_DISPLAY_CUSTOM_THEME',
    'SETTINGS_DISPLAY_CUSTOM_THEME_HASH',
    'SETTINGS_DISPLAY_CUSTOM_LOGO',
    'SETTINGS_DISPLAY_CUSTOM_LOGO_HASH',
    'SETTINGS_DISPLAY_DEFAULT_LANGUAGE',
    'SETTINGS_DISPLAY_DEFAULT_LANGUAGE_HASH',
    'DATABASE_VERSION',
    'LOG_LEVEL',
    'LOG_DIRECTORY',
    'LOG_FILE_NAME',
    'SYNC_PULL_CURSOR_V6',
    'SYNC_PUSH_CURSOR_V6',
    'SETTINGS_LABEL_PRINTER',
    'CONTACT_FORM_PROCESSOR_CURSOR',
    'LOAD_PLUGIN_PROCESSOR_CURSOR'
);


ALTER TYPE public.key_type OWNER TO postgres;

--
-- Name: language_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.language_type AS ENUM (
    'ENGLISH',
    'FRENCH',
    'SPANISH',
    'LAOS',
    'KHMER',
    'PORTUGUESE',
    'RUSSIAN',
    'TETUM'
);


ALTER TYPE public.language_type OWNER TO postgres;

--
-- Name: name_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.name_type AS ENUM (
    'FACILITY',
    'PATIENT',
    'BUILD',
    'INVAD',
    'REPACK',
    'STORE',
    'OTHERS'
);


ALTER TYPE public.name_type OWNER TO postgres;

--
-- Name: number_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.number_type AS ENUM (
    'INBOUND_SHIPMENT',
    'OUTBOUND_SHIPMENT',
    'INVENTORY_ADJUSTMENT',
    'STOCKTAKE',
    'REQUEST_REQUISITION',
    'RESPONSE_REQUISITION',
    'REPACK',
    'PRESCRIPTION',
    'CUSTOMER_RETURN',
    'SUPPLIER_RETURN'
);


ALTER TYPE public.number_type OWNER TO postgres;

--
-- Name: permission_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.permission_type AS ENUM (
    'STORE_ACCESS',
    'LOCATION_MUTATE',
    'STOCK_LINE_QUERY',
    'STOCKTAKE_QUERY',
    'STOCKTAKE_MUTATE',
    'REQUISITION_QUERY',
    'REQUISITION_MUTATE',
    'OUTBOUND_SHIPMENT_QUERY',
    'OUTBOUND_SHIPMENT_MUTATE',
    'INBOUND_SHIPMENT_QUERY',
    'INBOUND_SHIPMENT_MUTATE',
    'REPORT',
    'LOG_QUERY',
    'SERVER_ADMIN',
    'STOCK_LINE_MUTATE',
    'PATIENT_QUERY',
    'PATIENT_MUTATE',
    'DOCUMENT_QUERY',
    'DOCUMENT_MUTATE',
    'ITEM_MUTATE',
    'REQUISITION_SEND',
    'CREATE_REPACK',
    'PRESCRIPTION_QUERY',
    'PRESCRIPTION_MUTATE',
    'SENSOR_QUERY',
    'SENSOR_MUTATE',
    'TEMPERATURE_BREACH_QUERY',
    'TEMPERATURE_LOG_QUERY',
    'COLD_CHAIN_API',
    'ITEM_NAMES_CODES_AND_UNITS_MUTATE',
    'ASSET_MUTATE',
    'ASSET_CATALOGUE_ITEM_MUTATE',
    'ASSET_QUERY',
    'SUPPLIER_RETURN_QUERY',
    'SUPPLIER_RETURN_MUTATE',
    'CUSTOMER_RETURN_QUERY',
    'CUSTOMER_RETURN_MUTATE',
    'INVENTORY_ADJUSTMENT_MUTATE',
    'EDIT_CENTRAL_DATA',
    'NAME_PROPERTIES_MUTATE',
    'RNR_FORM_QUERY',
    'RNR_FORM_MUTATE',
    'REQUISITION_CREATE_OUTBOUND_SHIPMENT'
);


ALTER TYPE public.permission_type OWNER TO postgres;

--
-- Name: plugin_variant_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.plugin_variant_type AS ENUM (
    'BOA_JS'
);


ALTER TYPE public.plugin_variant_type OWNER TO postgres;

--
-- Name: property_value_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.property_value_type AS ENUM (
    'STRING',
    'BOOLEAN',
    'INTEGER',
    'FLOAT'
);


ALTER TYPE public.property_value_type OWNER TO postgres;

--
-- Name: reason_option_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reason_option_type AS ENUM (
    'POSITIVE_INVENTORY_ADJUSTMENT',
    'NEGATIVE_INVENTORY_ADJUSTMENT',
    'RETURN_REASON',
    'REQUISITION_LINE_VARIANCE'
);


ALTER TYPE public.reason_option_type OWNER TO postgres;

--
-- Name: related_record_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.related_record_type AS ENUM (
    'STOCK_LINE'
);


ALTER TYPE public.related_record_type OWNER TO postgres;

--
-- Name: report_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.report_type AS ENUM (
    'OM_SUPPLY'
);


ALTER TYPE public.report_type OWNER TO postgres;

--
-- Name: requisition_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.requisition_status AS ENUM (
    'DRAFT',
    'NEW',
    'SENT',
    'FINALISED'
);


ALTER TYPE public.requisition_status OWNER TO postgres;

--
-- Name: requisition_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.requisition_type AS ENUM (
    'REQUEST',
    'RESPONSE'
);


ALTER TYPE public.requisition_type OWNER TO postgres;

--
-- Name: rn_r_form_low_stock; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rn_r_form_low_stock AS ENUM (
    'OK',
    'BELOW_HALF',
    'BELOW_QUARTER'
);


ALTER TYPE public.rn_r_form_low_stock OWNER TO postgres;

--
-- Name: rn_r_form_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.rn_r_form_status AS ENUM (
    'DRAFT',
    'FINALISED'
);


ALTER TYPE public.rn_r_form_status OWNER TO postgres;

--
-- Name: row_action_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.row_action_type AS ENUM (
    'UPSERT',
    'DELETE'
);


ALTER TYPE public.row_action_type OWNER TO postgres;

--
-- Name: sensor_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sensor_type AS ENUM (
    'BLUE_MAESTRO',
    'LAIRD',
    'BERLINGER'
);


ALTER TYPE public.sensor_type OWNER TO postgres;

--
-- Name: stocktake_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.stocktake_status AS ENUM (
    'NEW',
    'FINALISED'
);


ALTER TYPE public.stocktake_status OWNER TO postgres;

--
-- Name: store_mode; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.store_mode AS ENUM (
    'STORE',
    'DISPENSARY'
);


ALTER TYPE public.store_mode OWNER TO postgres;

--
-- Name: store_preference_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.store_preference_type AS ENUM (
    'STORE_PREFERENCES'
);


ALTER TYPE public.store_preference_type OWNER TO postgres;

--
-- Name: sync_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_action AS ENUM (
    'UPSERT',
    'DELETE',
    'MERGE'
);


ALTER TYPE public.sync_action OWNER TO postgres;

--
-- Name: sync_api_error_code; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_api_error_code AS ENUM (
    'CONNECTION_ERROR',
    'SITE_UUID_IS_BEING_CHANGED',
    'SITE_NAME_NOT_FOUND',
    'INCORRECT_PASSWORD',
    'HARDWARE_ID_MISMATCH',
    'SITE_HAS_NO_STORE',
    'SITE_AUTH_TIMEOUT',
    'INTEGRATION_TIMEOUT_REACHED',
    'API_VERSION_INCOMPATIBLE',
    'INTEGRATION_ERROR',
    'CENTRAL_V6_NOT_CONFIGURED',
    'V6_API_VERSION_INCOMPATIBLE'
);


ALTER TYPE public.sync_api_error_code OWNER TO postgres;

--
-- Name: sync_file_direction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_file_direction AS ENUM (
    'UPLOAD',
    'DOWNLOAD'
);


ALTER TYPE public.sync_file_direction OWNER TO postgres;

--
-- Name: sync_file_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_file_status AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'ERROR',
    'DONE',
    'PERMANENT_FAILURE'
);


ALTER TYPE public.sync_file_status OWNER TO postgres;

--
-- Name: system_log_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.system_log_type AS ENUM (
    'PROCESSOR_ERROR'
);


ALTER TYPE public.system_log_type OWNER TO postgres;

--
-- Name: temperature_breach_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.temperature_breach_type AS ENUM (
    'COLD_CONSECUTIVE',
    'COLD_CUMULATIVE',
    'HOT_CONSECUTIVE',
    'HOT_CUMULATIVE',
    'EXCURSION'
);


ALTER TYPE public.temperature_breach_type OWNER TO postgres;

--
-- Name: ven_category; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.ven_category AS ENUM (
    'V',
    'E',
    'N',
    'NOT_ASSIGNED'
);


ALTER TYPE public.ven_category OWNER TO postgres;

--
-- Name: diesel_manage_updated_at(regclass); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.diesel_manage_updated_at(_tbl regclass) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
                    FOR EACH ROW EXECUTE PROCEDURE diesel_set_updated_at()', _tbl);
END;
$$;


ALTER FUNCTION public.diesel_manage_updated_at(_tbl regclass) OWNER TO postgres;

--
-- Name: diesel_set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.diesel_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (
        NEW IS DISTINCT FROM OLD AND
        NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at
    ) THEN
        NEW.updated_at := current_timestamp;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.diesel_set_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __diesel_schema_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.__diesel_schema_migrations (
    version character varying(50) NOT NULL,
    run_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.__diesel_schema_migrations OWNER TO postgres;

--
-- Name: abbreviation; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.abbreviation (
    id text NOT NULL,
    text text NOT NULL,
    expansion text NOT NULL
);


ALTER TABLE public.abbreviation OWNER TO postgres;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id text NOT NULL,
    type public.activity_log_type,
    user_id text,
    store_id text,
    record_id text,
    datetime timestamp without time zone NOT NULL,
    changed_from text,
    changed_to text
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: inventory_adjustment_reason; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_adjustment_reason (
    id text NOT NULL,
    type public.inventory_adjustment_type,
    is_active boolean,
    reason text NOT NULL
);


ALTER TABLE public.inventory_adjustment_reason OWNER TO postgres;

--
-- Name: invoice; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice (
    id text NOT NULL,
    name_store_id text,
    user_id text,
    store_id text NOT NULL,
    invoice_number bigint NOT NULL,
    type public.invoice_type NOT NULL,
    status public.invoice_status NOT NULL,
    on_hold boolean NOT NULL,
    comment text,
    their_reference text,
    transport_reference text,
    created_datetime timestamp without time zone NOT NULL,
    allocated_datetime timestamp without time zone,
    picked_datetime timestamp without time zone,
    shipped_datetime timestamp without time zone,
    delivered_datetime timestamp without time zone,
    verified_datetime timestamp without time zone,
    colour text,
    requisition_id text,
    linked_invoice_id text,
    tax_percentage double precision,
    currency_id text,
    currency_rate double precision DEFAULT 1.0 NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    clinician_link_id text,
    original_shipment_id text,
    backdated_datetime timestamp without time zone,
    diagnosis_id text,
    program_id text,
    name_insurance_join_id text,
    insurance_discount_amount double precision,
    insurance_discount_percentage double precision,
    is_cancellation boolean DEFAULT false NOT NULL,
    cancelled_datetime timestamp without time zone
);


ALTER TABLE public.invoice OWNER TO postgres;

--
-- Name: invoice_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_line (
    id text NOT NULL,
    invoice_id text NOT NULL,
    item_name text NOT NULL,
    item_code text NOT NULL,
    stock_line_id text,
    location_id text,
    batch text,
    expiry_date date,
    cost_price_per_pack double precision NOT NULL,
    sell_price_per_pack double precision NOT NULL,
    total_before_tax double precision NOT NULL,
    total_after_tax double precision NOT NULL,
    tax_percentage double precision,
    type public.invoice_line_type NOT NULL,
    number_of_packs double precision NOT NULL,
    pack_size double precision NOT NULL,
    note text,
    inventory_adjustment_reason_id text,
    foreign_currency_price_before_tax double precision,
    item_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    return_reason_id text,
    item_variant_id text,
    prescribed_quantity double precision,
    linked_invoice_id text
);


ALTER TABLE public.invoice_line OWNER TO postgres;

--
-- Name: item_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_link (
    id text NOT NULL,
    item_id text NOT NULL
);


ALTER TABLE public.item_link OWNER TO postgres;

--
-- Name: invoice_line_stock_movement; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.invoice_line_stock_movement AS
 SELECT invoice_line.id,
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
    invoice_line.inventory_adjustment_reason_id,
    invoice_line.foreign_currency_price_before_tax,
    invoice_line.item_link_id,
    invoice_line.return_reason_id,
    item_link.item_id,
        CASE
            WHEN (invoice_line.type = 'STOCK_IN'::public.invoice_line_type) THEN (invoice_line.number_of_packs * invoice_line.pack_size)
            WHEN (invoice_line.type = 'STOCK_OUT'::public.invoice_line_type) THEN ((invoice_line.number_of_packs * invoice_line.pack_size) * ('-1'::integer)::double precision)
            ELSE NULL::double precision
        END AS quantity_movement
   FROM (public.invoice_line
     JOIN public.item_link ON ((item_link.id = invoice_line.item_link_id)))
  WHERE ((invoice_line.number_of_packs > (0)::double precision) AND (invoice_line.type = ANY (ARRAY['STOCK_IN'::public.invoice_line_type, 'STOCK_OUT'::public.invoice_line_type])));


ALTER VIEW public.invoice_line_stock_movement OWNER TO postgres;

--
-- Name: item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    unit_id text,
    type public.item_type NOT NULL,
    default_pack_size double precision NOT NULL,
    legacy_record text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_vaccine boolean DEFAULT false NOT NULL,
    strength text,
    ven_category public.ven_category DEFAULT 'NOT_ASSIGNED'::public.ven_category NOT NULL,
    vaccine_doses integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.item OWNER TO postgres;

--
-- Name: name; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    type public.name_type NOT NULL,
    is_customer boolean NOT NULL,
    is_supplier boolean NOT NULL,
    supplying_store_id text,
    first_name text,
    last_name text,
    gender public.gender_type,
    date_of_birth date,
    phone text,
    charge_code text,
    comment text,
    country text,
    address1 text,
    address2 text,
    email text,
    website text,
    is_manufacturer boolean,
    is_donor boolean,
    on_hold boolean,
    created_datetime timestamp without time zone,
    is_deceased boolean DEFAULT false NOT NULL,
    national_health_number text,
    is_sync_update boolean DEFAULT false NOT NULL,
    date_of_death date,
    custom_data text,
    deleted_datetime timestamp without time zone,
    properties text,
    next_of_kin_id text,
    next_of_kin_name text
);


ALTER TABLE public.name OWNER TO postgres;

--
-- Name: name_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name_link (
    id text NOT NULL,
    name_id text NOT NULL
);


ALTER TABLE public.name_link OWNER TO postgres;

--
-- Name: return_reason; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.return_reason (
    id text NOT NULL,
    is_active boolean,
    reason text NOT NULL
);


ALTER TABLE public.return_reason OWNER TO postgres;

--
-- Name: stock_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stock_line (
    id text NOT NULL,
    store_id text NOT NULL,
    location_id text,
    batch text,
    expiry_date date,
    cost_price_per_pack double precision NOT NULL,
    sell_price_per_pack double precision NOT NULL,
    available_number_of_packs double precision NOT NULL,
    total_number_of_packs double precision NOT NULL,
    pack_size double precision NOT NULL,
    on_hold boolean NOT NULL,
    note text,
    barcode_id text,
    item_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    supplier_link_id text,
    item_variant_id text
);


ALTER TABLE public.stock_line OWNER TO postgres;

--
-- Name: stock_movement; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.stock_movement AS
 WITH all_movements AS (
         SELECT invoice_line_stock_movement.id,
            invoice_line_stock_movement.quantity_movement AS quantity,
            invoice_line_stock_movement.item_link_id AS item_id,
            invoice.store_id,
                CASE
                    WHEN (invoice.type = ANY (ARRAY['OUTBOUND_SHIPMENT'::public.invoice_type, 'SUPPLIER_RETURN'::public.invoice_type, 'PRESCRIPTION'::public.invoice_type])) THEN invoice.picked_datetime
                    WHEN (invoice.type = ANY (ARRAY['INBOUND_SHIPMENT'::public.invoice_type, 'CUSTOMER_RETURN'::public.invoice_type])) THEN invoice.delivered_datetime
                    WHEN (invoice.type = ANY (ARRAY['INVENTORY_ADDITION'::public.invoice_type, 'INVENTORY_REDUCTION'::public.invoice_type, 'REPACK'::public.invoice_type])) THEN invoice.verified_datetime
                    ELSE NULL::timestamp without time zone
                END AS datetime,
            name.name,
            invoice.type AS invoice_type,
            invoice.invoice_number,
            inventory_adjustment_reason.reason AS inventory_adjustment_reason,
            return_reason.reason AS return_reason,
            invoice_line_stock_movement.stock_line_id,
            invoice_line_stock_movement.expiry_date,
            invoice_line_stock_movement.batch,
            invoice_line_stock_movement.cost_price_per_pack,
            invoice_line_stock_movement.sell_price_per_pack,
            invoice.status AS invoice_status,
            invoice_line_stock_movement.total_before_tax,
            invoice_line_stock_movement.pack_size,
            invoice_line_stock_movement.number_of_packs
           FROM ((((((public.invoice_line_stock_movement
             LEFT JOIN public.inventory_adjustment_reason ON ((invoice_line_stock_movement.inventory_adjustment_reason_id = inventory_adjustment_reason.id)))
             LEFT JOIN public.return_reason ON ((invoice_line_stock_movement.return_reason_id = return_reason.id)))
             LEFT JOIN public.stock_line ON ((stock_line.id = invoice_line_stock_movement.stock_line_id)))
             JOIN public.invoice ON ((invoice.id = invoice_line_stock_movement.invoice_id)))
             JOIN public.name_link ON ((invoice.name_link_id = name_link.id)))
             JOIN public.name ON ((name_link.name_id = name.id)))
        )
 SELECT id,
    quantity,
    item_id,
    store_id,
    datetime,
    name,
    invoice_type,
    invoice_number,
    inventory_adjustment_reason,
    return_reason,
    stock_line_id,
    expiry_date,
    batch,
    cost_price_per_pack,
    sell_price_per_pack,
    invoice_status,
    total_before_tax,
    pack_size,
    number_of_packs
   FROM all_movements
  WHERE (datetime IS NOT NULL);


ALTER VIEW public.stock_movement OWNER TO postgres;

--
-- Name: store; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store (
    id text NOT NULL,
    code text NOT NULL,
    site_id integer NOT NULL,
    store_mode public.store_mode DEFAULT 'STORE'::public.store_mode NOT NULL,
    logo text,
    created_date date,
    name_link_id text,
    is_disabled boolean DEFAULT false NOT NULL
);


ALTER TABLE public.store OWNER TO postgres;

--
-- Name: adjustments; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.adjustments AS
 SELECT 'n/a'::text AS id,
    items_and_stores.item_id,
    items_and_stores.store_id,
    stock_movement.quantity,
    date(stock_movement.datetime) AS date
   FROM (( SELECT item.id AS item_id,
            store.id AS store_id
           FROM public.item,
            public.store) items_and_stores
     LEFT JOIN public.stock_movement ON (((stock_movement.item_id = items_and_stores.item_id) AND (stock_movement.store_id = items_and_stores.store_id))))
  WHERE ((stock_movement.invoice_type = 'CUSTOMER_RETURN'::public.invoice_type) OR (stock_movement.invoice_type = 'SUPPLIER_RETURN'::public.invoice_type) OR (stock_movement.invoice_type = 'INVENTORY_ADDITION'::public.invoice_type) OR (stock_movement.invoice_type = 'INVENTORY_REDUCTION'::public.invoice_type));


ALTER VIEW public.adjustments OWNER TO postgres;

--
-- Name: asset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset (
    id text NOT NULL,
    store_id text,
    notes text,
    asset_number text,
    serial_number text,
    asset_catalogue_item_id text,
    asset_category_id text,
    asset_class_id text,
    asset_catalogue_type_id text,
    installation_date date,
    replacement_date date,
    deleted_datetime timestamp without time zone,
    created_datetime timestamp without time zone NOT NULL,
    modified_datetime timestamp without time zone NOT NULL,
    properties text,
    donor_name_id text,
    warranty_start date,
    warranty_end date,
    needs_replacement boolean
);


ALTER TABLE public.asset OWNER TO postgres;

--
-- Name: asset_catalogue_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_catalogue_item (
    id text NOT NULL,
    code text NOT NULL,
    sub_catalogue text NOT NULL,
    asset_class_id text NOT NULL,
    asset_category_id text NOT NULL,
    asset_catalogue_type_id text NOT NULL,
    manufacturer text,
    model text NOT NULL,
    deleted_datetime timestamp without time zone,
    properties text
);


ALTER TABLE public.asset_catalogue_item OWNER TO postgres;

--
-- Name: asset_catalogue_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_catalogue_type (
    id text NOT NULL,
    name text NOT NULL,
    asset_category_id text NOT NULL
);


ALTER TABLE public.asset_catalogue_type OWNER TO postgres;

--
-- Name: asset_category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_category (
    id text NOT NULL,
    name text NOT NULL,
    asset_class_id text NOT NULL
);


ALTER TABLE public.asset_category OWNER TO postgres;

--
-- Name: asset_class; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_class (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.asset_class OWNER TO postgres;

--
-- Name: asset_internal_location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_internal_location (
    id text NOT NULL,
    asset_id text NOT NULL,
    location_id text NOT NULL
);


ALTER TABLE public.asset_internal_location OWNER TO postgres;

--
-- Name: asset_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_log (
    id text NOT NULL,
    asset_id text NOT NULL,
    user_id text NOT NULL,
    status public.asset_log_status,
    reason_id text,
    comment text,
    type text,
    log_datetime timestamp without time zone NOT NULL
);


ALTER TABLE public.asset_log OWNER TO postgres;

--
-- Name: asset_log_reason; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_log_reason (
    id text NOT NULL,
    reason text NOT NULL,
    deleted_datetime timestamp without time zone,
    asset_log_status public.asset_log_status DEFAULT 'NOT_IN_USE'::public.asset_log_status NOT NULL
);


ALTER TABLE public.asset_log_reason OWNER TO postgres;

--
-- Name: asset_property; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.asset_property (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    asset_class_id text,
    asset_category_id text,
    asset_type_id text,
    value_type public.property_value_type NOT NULL,
    allowed_values text
);


ALTER TABLE public.asset_property OWNER TO postgres;

--
-- Name: backend_plugin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.backend_plugin (
    id text NOT NULL,
    code text NOT NULL,
    bundle_base64 text NOT NULL,
    types text NOT NULL,
    variant_type public.plugin_variant_type NOT NULL
);


ALTER TABLE public.backend_plugin OWNER TO postgres;

--
-- Name: barcode; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.barcode (
    id text NOT NULL,
    gtin text NOT NULL,
    item_id text NOT NULL,
    pack_size double precision,
    parent_id text,
    is_sync_update boolean DEFAULT false NOT NULL,
    manufacturer_link_id text
);


ALTER TABLE public.barcode OWNER TO postgres;

--
-- Name: bundled_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bundled_item (
    id text NOT NULL,
    principal_item_variant_id text NOT NULL,
    bundled_item_variant_id text NOT NULL,
    ratio double precision NOT NULL,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.bundled_item OWNER TO postgres;

--
-- Name: category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.category (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    parent_id text,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.category OWNER TO postgres;

--
-- Name: changelog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.changelog (
    cursor bigint NOT NULL,
    table_name public.changelog_table_name NOT NULL,
    record_id text NOT NULL,
    row_action public.row_action_type NOT NULL,
    name_link_id text,
    store_id text,
    is_sync_update boolean DEFAULT false NOT NULL,
    source_site_id integer
);


ALTER TABLE public.changelog OWNER TO postgres;

--
-- Name: changelog_cursor_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.changelog_cursor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.changelog_cursor_seq OWNER TO postgres;

--
-- Name: changelog_cursor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.changelog_cursor_seq OWNED BY public.changelog.cursor;


--
-- Name: changelog_deduped; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.changelog_deduped AS
 SELECT c.cursor,
    c.table_name,
    c.record_id,
    c.row_action,
    c.name_link_id,
    c.store_id,
    c.is_sync_update,
    c.source_site_id
   FROM (( SELECT changelog.record_id,
            max(changelog.cursor) AS max_cursor
           FROM public.changelog
          GROUP BY changelog.record_id) grouped
     JOIN public.changelog c ON (((c.record_id = grouped.record_id) AND (c.cursor = grouped.max_cursor))))
  ORDER BY c.cursor;


ALTER VIEW public.changelog_deduped OWNER TO postgres;

--
-- Name: clinician; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinician (
    id text NOT NULL,
    code text NOT NULL,
    last_name text NOT NULL,
    initials text NOT NULL,
    first_name text,
    address1 text,
    address2 text,
    phone text,
    mobile text,
    email text,
    gender public.gender_type,
    is_active boolean NOT NULL,
    is_sync_update boolean DEFAULT false NOT NULL
);


ALTER TABLE public.clinician OWNER TO postgres;

--
-- Name: clinician_link; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinician_link (
    id text NOT NULL,
    clinician_id text NOT NULL
);


ALTER TABLE public.clinician_link OWNER TO postgres;

--
-- Name: clinician_store_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clinician_store_join (
    id text NOT NULL,
    store_id text NOT NULL,
    is_sync_update boolean DEFAULT false NOT NULL,
    clinician_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


ALTER TABLE public.clinician_store_join OWNER TO postgres;

--
-- Name: cold_storage_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cold_storage_type (
    id text NOT NULL,
    name text NOT NULL,
    min_temperature double precision,
    max_temperature double precision
);


ALTER TABLE public.cold_storage_type OWNER TO postgres;

--
-- Name: consumption; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.consumption AS
 SELECT 'n/a'::text AS id,
    items_and_stores.item_id,
    items_and_stores.store_id,
    (@ COALESCE(stock_movement.quantity, (0)::double precision)) AS quantity,
    date(stock_movement.datetime) AS date
   FROM (( SELECT item.id AS item_id,
            store.id AS store_id
           FROM public.item,
            public.store) items_and_stores
     LEFT JOIN public.stock_movement ON (((stock_movement.item_id = items_and_stores.item_id) AND (stock_movement.store_id = items_and_stores.store_id))))
  WHERE ((stock_movement.invoice_type = 'OUTBOUND_SHIPMENT'::public.invoice_type) OR (stock_movement.invoice_type = 'PRESCRIPTION'::public.invoice_type));


ALTER VIEW public.consumption OWNER TO postgres;

--
-- Name: contact_form; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_form (
    id text NOT NULL,
    reply_email text NOT NULL,
    body text NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    contact_type public.contact_type_enum NOT NULL,
    username text DEFAULT ''::text NOT NULL
);


ALTER TABLE public.contact_form OWNER TO postgres;

--
-- Name: contact_trace; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_trace (
    id text NOT NULL,
    program_id text NOT NULL,
    document_id text NOT NULL,
    datetime timestamp without time zone,
    contact_trace_id text,
    first_name text,
    last_name text,
    gender public.gender_type,
    date_of_birth timestamp without time zone,
    store_id text,
    relationship text,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    contact_patient_link_id text
);


ALTER TABLE public.contact_trace OWNER TO postgres;

--
-- Name: contact_trace_name_link_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.contact_trace_name_link_view AS
 SELECT ct.id,
    ct.program_id,
    ct.document_id,
    ct.datetime,
    ct.contact_trace_id,
    patient_name_link.name_id AS patient_id,
    contact_patient_name_link.name_id AS contact_patient_id,
    ct.first_name,
    ct.last_name,
    ct.gender,
    (ct.date_of_birth)::date AS date_of_birth,
    ct.store_id,
    ct.relationship
   FROM ((public.contact_trace ct
     JOIN public.name_link patient_name_link ON ((ct.patient_link_id = patient_name_link.id)))
     LEFT JOIN public.name_link contact_patient_name_link ON ((ct.contact_patient_link_id = contact_patient_name_link.id)));


ALTER VIEW public.contact_trace_name_link_view OWNER TO postgres;

--
-- Name: context; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.context (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.context OWNER TO postgres;

--
-- Name: currency; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.currency (
    id text NOT NULL,
    rate double precision NOT NULL,
    code text NOT NULL,
    is_home_currency boolean DEFAULT false NOT NULL,
    date_updated date,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.currency OWNER TO postgres;

--
-- Name: demographic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demographic (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.demographic OWNER TO postgres;

--
-- Name: demographic_indicator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demographic_indicator (
    id text NOT NULL,
    name text NOT NULL,
    base_year integer NOT NULL,
    base_population integer,
    population_percentage double precision NOT NULL,
    year_1_projection integer NOT NULL,
    year_2_projection integer NOT NULL,
    year_3_projection integer NOT NULL,
    year_4_projection integer NOT NULL,
    year_5_projection integer NOT NULL,
    demographic_id text
);


ALTER TABLE public.demographic_indicator OWNER TO postgres;

--
-- Name: demographic_projection; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demographic_projection (
    id text NOT NULL,
    base_year integer NOT NULL,
    year_1 double precision NOT NULL,
    year_2 double precision NOT NULL,
    year_3 double precision NOT NULL,
    year_4 double precision NOT NULL,
    year_5 double precision NOT NULL
);


ALTER TABLE public.demographic_projection OWNER TO postgres;

--
-- Name: diagnosis; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diagnosis (
    id text NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    notes text,
    valid_till date
);


ALTER TABLE public.diagnosis OWNER TO postgres;

--
-- Name: document; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document (
    id text NOT NULL,
    name text NOT NULL,
    parent_ids text NOT NULL,
    user_id text NOT NULL,
    datetime timestamp without time zone NOT NULL,
    type text NOT NULL,
    data text NOT NULL,
    form_schema_id text,
    status public.document_status NOT NULL,
    is_sync_update boolean DEFAULT false NOT NULL,
    context_id text NOT NULL,
    owner_name_link_id text
);


ALTER TABLE public.document OWNER TO postgres;

--
-- Name: document_registry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_registry (
    id text NOT NULL,
    category public.document_registry_category NOT NULL,
    document_type text NOT NULL,
    context_id text NOT NULL,
    name text,
    form_schema_id text,
    config text
);


ALTER TABLE public.document_registry OWNER TO postgres;

--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.email_queue (
    id text NOT NULL,
    to_address text NOT NULL,
    subject text NOT NULL,
    html_body text NOT NULL,
    text_body text NOT NULL,
    status public.email_queue_status_enum NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    sent_at timestamp without time zone,
    retries integer DEFAULT 0 NOT NULL,
    error text,
    retry_at timestamp without time zone
);


ALTER TABLE public.email_queue OWNER TO postgres;

--
-- Name: encounter; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.encounter (
    id text NOT NULL,
    document_name text NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    start_datetime timestamp without time zone NOT NULL,
    end_datetime timestamp without time zone,
    status public.encounter_status,
    store_id text,
    document_type text NOT NULL,
    program_id text NOT NULL,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    clinician_link_id text
);


ALTER TABLE public.encounter OWNER TO postgres;

--
-- Name: form_schema; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_schema (
    id text NOT NULL,
    type text NOT NULL,
    json_schema text NOT NULL,
    ui_schema text NOT NULL
);


ALTER TABLE public.form_schema OWNER TO postgres;

--
-- Name: frontend_plugin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.frontend_plugin (
    id text NOT NULL,
    code text NOT NULL,
    entry_point text NOT NULL,
    types text NOT NULL,
    files text NOT NULL
);


ALTER TABLE public.frontend_plugin OWNER TO postgres;

--
-- Name: inbound_shipment_stock_movement; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.inbound_shipment_stock_movement AS
 SELECT 'n/a'::text AS id,
    invoice_line_stock_movement.quantity_movement AS quantity,
    invoice_line_stock_movement.item_id,
    invoice.store_id,
    invoice.delivered_datetime AS datetime
   FROM (public.invoice_line_stock_movement
     JOIN public.invoice ON ((invoice_line_stock_movement.invoice_id = invoice.id)))
  WHERE ((invoice.type = 'INBOUND_SHIPMENT'::public.invoice_type) AND (invoice.delivered_datetime IS NOT NULL));


ALTER VIEW public.inbound_shipment_stock_movement OWNER TO postgres;

--
-- Name: indicator_column; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.indicator_column (
    id text NOT NULL,
    program_indicator_id text NOT NULL,
    column_number integer NOT NULL,
    header text NOT NULL,
    value_type public.indicator_value_type,
    default_value text NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.indicator_column OWNER TO postgres;

--
-- Name: indicator_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.indicator_line (
    id text NOT NULL,
    program_indicator_id text NOT NULL,
    line_number integer NOT NULL,
    description text NOT NULL,
    code text NOT NULL,
    value_type public.indicator_value_type,
    default_value text NOT NULL,
    is_required boolean NOT NULL,
    is_active boolean NOT NULL
);


ALTER TABLE public.indicator_line OWNER TO postgres;

--
-- Name: indicator_value; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.indicator_value (
    id text NOT NULL,
    customer_name_link_id text NOT NULL,
    store_id text NOT NULL,
    period_id text NOT NULL,
    indicator_line_id text NOT NULL,
    indicator_column_id text NOT NULL,
    value text NOT NULL
);


ALTER TABLE public.indicator_value OWNER TO postgres;

--
-- Name: insurance_provider; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.insurance_provider (
    id text NOT NULL,
    provider_name text NOT NULL,
    is_active boolean NOT NULL,
    prescription_validity_days integer,
    comment text
);


ALTER TABLE public.insurance_provider OWNER TO postgres;

--
-- Name: inventory_adjustment_stock_movement; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.inventory_adjustment_stock_movement AS
 SELECT 'n/a'::text AS id,
    invoice_line_stock_movement.quantity_movement AS quantity,
    invoice_line_stock_movement.item_id,
    invoice.store_id,
    invoice.verified_datetime AS datetime
   FROM (public.invoice_line_stock_movement
     JOIN public.invoice ON ((invoice_line_stock_movement.invoice_id = invoice.id)))
  WHERE ((invoice.type = ANY (ARRAY['INVENTORY_REDUCTION'::public.invoice_type, 'INVENTORY_ADDITION'::public.invoice_type])) AND (invoice.verified_datetime IS NOT NULL));


ALTER VIEW public.inventory_adjustment_stock_movement OWNER TO postgres;

--
-- Name: invoice_stats; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.invoice_stats AS
 SELECT invoice_id,
    sum(total_before_tax) AS total_before_tax,
    sum(total_after_tax) AS total_after_tax,
    (COALESCE(((sum(total_after_tax) / NULLIF(sum(total_before_tax), (0)::double precision)) - (1)::double precision), (0)::double precision) * (100)::double precision) AS tax_percentage,
    (COALESCE(sum(foreign_currency_price_before_tax), (0)::double precision) + (COALESCE(sum(foreign_currency_price_before_tax), (0)::double precision) * COALESCE(((sum(total_after_tax) / NULLIF(sum(total_before_tax), (0)::double precision)) - (1)::double precision), (0)::double precision))) AS foreign_currency_total_after_tax,
    COALESCE(sum(total_before_tax) FILTER (WHERE (type = 'SERVICE'::public.invoice_line_type)), (0)::double precision) AS service_total_before_tax,
    COALESCE(sum(total_after_tax) FILTER (WHERE (type = 'SERVICE'::public.invoice_line_type)), (0)::double precision) AS service_total_after_tax,
    COALESCE(sum(total_before_tax) FILTER (WHERE (type = ANY (ARRAY['STOCK_IN'::public.invoice_line_type, 'STOCK_OUT'::public.invoice_line_type]))), (0)::double precision) AS stock_total_before_tax,
    COALESCE(sum(total_after_tax) FILTER (WHERE (type = ANY (ARRAY['STOCK_IN'::public.invoice_line_type, 'STOCK_OUT'::public.invoice_line_type]))), (0)::double precision) AS stock_total_after_tax
   FROM public.invoice_line
  GROUP BY invoice_id;


ALTER VIEW public.invoice_stats OWNER TO postgres;

--
-- Name: item_category_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_category_join (
    id text NOT NULL,
    item_id text NOT NULL,
    category_id text NOT NULL,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.item_category_join OWNER TO postgres;

--
-- Name: item_direction; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_direction (
    id text NOT NULL,
    item_link_id text NOT NULL,
    directions text NOT NULL,
    priority bigint NOT NULL
);


ALTER TABLE public.item_direction OWNER TO postgres;

--
-- Name: item_variant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item_variant (
    id text NOT NULL,
    name text NOT NULL,
    item_link_id text NOT NULL,
    cold_storage_type_id text,
    manufacturer_link_id text,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.item_variant OWNER TO postgres;

--
-- Name: key_value_store; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.key_value_store (
    id public.key_type NOT NULL,
    value_string text,
    value_int integer,
    value_bigint bigint,
    value_float double precision,
    value_bool boolean
);


ALTER TABLE public.key_value_store OWNER TO postgres;

--
-- Name: latest_asset_log; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.latest_asset_log AS
 SELECT al.id,
    al.asset_id,
    al.user_id,
    al.comment,
    al.type,
    al.log_datetime,
    al.status,
    al.reason_id
   FROM (( SELECT asset_log.asset_id,
            max(asset_log.log_datetime) AS latest_log_datetime
           FROM public.asset_log
          GROUP BY asset_log.asset_id) grouped
     JOIN public.asset_log al ON (((al.asset_id = grouped.asset_id) AND (al.log_datetime = grouped.latest_log_datetime))));


ALTER VIEW public.latest_asset_log OWNER TO postgres;

--
-- Name: latest_document; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.latest_document AS
 SELECT d.id,
    d.name,
    d.parent_ids,
    d.user_id,
    d.datetime,
    d.type,
    d.data,
    d.form_schema_id,
    d.status,
    d.is_sync_update,
    d.context_id,
    d.owner_name_link_id
   FROM (( SELECT document.name,
            max(document.datetime) AS datetime
           FROM public.document
          GROUP BY document.name) grouped
     JOIN public.document d ON (((d.name = grouped.name) AND (d.datetime = grouped.datetime))));


ALTER VIEW public.latest_document OWNER TO postgres;

--
-- Name: location; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    on_hold boolean NOT NULL,
    store_id text NOT NULL,
    cold_storage_type_id text
);


ALTER TABLE public.location OWNER TO postgres;

--
-- Name: location_movement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.location_movement (
    id text NOT NULL,
    store_id text,
    location_id text,
    stock_line_id text,
    enter_datetime timestamp without time zone,
    exit_datetime timestamp without time zone
);


ALTER TABLE public.location_movement OWNER TO postgres;

--
-- Name: master_list; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_list (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_default_price_list boolean DEFAULT false,
    discount_percentage double precision
);


ALTER TABLE public.master_list OWNER TO postgres;

--
-- Name: master_list_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_list_line (
    id text NOT NULL,
    master_list_id text NOT NULL,
    item_link_id text DEFAULT 'temp for migration'::text NOT NULL,
    price_per_unit double precision
);


ALTER TABLE public.master_list_line OWNER TO postgres;

--
-- Name: master_list_name_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.master_list_name_join (
    id text NOT NULL,
    master_list_id text NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


ALTER TABLE public.master_list_name_join OWNER TO postgres;

--
-- Name: migration_fragment_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migration_fragment_log (
    version_and_identifier text NOT NULL,
    datetime timestamp without time zone
);


ALTER TABLE public.migration_fragment_log OWNER TO postgres;

--
-- Name: name_insurance_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name_insurance_join (
    id text NOT NULL,
    name_link_id text NOT NULL,
    insurance_provider_id text NOT NULL,
    policy_number_person text,
    policy_number_family text,
    policy_number text NOT NULL,
    policy_type public.insurance_policy_type NOT NULL,
    discount_percentage double precision NOT NULL,
    expiry_date date NOT NULL,
    is_active boolean NOT NULL,
    entered_by_id text
);


ALTER TABLE public.name_insurance_join OWNER TO postgres;

--
-- Name: name_property; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name_property (
    id text NOT NULL,
    property_id text NOT NULL,
    remote_editable boolean NOT NULL
);


ALTER TABLE public.name_property OWNER TO postgres;

--
-- Name: name_store_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name_store_join (
    id text NOT NULL,
    store_id text NOT NULL,
    name_is_customer boolean NOT NULL,
    name_is_supplier boolean NOT NULL,
    is_sync_update boolean DEFAULT false NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


ALTER TABLE public.name_store_join OWNER TO postgres;

--
-- Name: name_tag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name_tag (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.name_tag OWNER TO postgres;

--
-- Name: name_tag_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.name_tag_join (
    id text NOT NULL,
    name_tag_id text NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


ALTER TABLE public.name_tag_join OWNER TO postgres;

--
-- Name: number; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.number (
    id text NOT NULL,
    value bigint NOT NULL,
    store_id text NOT NULL,
    type text NOT NULL
);


ALTER TABLE public.number OWNER TO postgres;

--
-- Name: outbound_shipment_stock_movement; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.outbound_shipment_stock_movement AS
 SELECT 'n/a'::text AS id,
    invoice_line_stock_movement.quantity_movement AS quantity,
    invoice_line_stock_movement.item_id,
    invoice.store_id,
    invoice.picked_datetime AS datetime
   FROM (public.invoice_line_stock_movement
     JOIN public.invoice ON ((invoice_line_stock_movement.invoice_id = invoice.id)))
  WHERE ((invoice.type = 'OUTBOUND_SHIPMENT'::public.invoice_type) AND (invoice.picked_datetime IS NOT NULL));


ALTER VIEW public.outbound_shipment_stock_movement OWNER TO postgres;

--
-- Name: packaging_variant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.packaging_variant (
    id text NOT NULL,
    name text NOT NULL,
    item_variant_id text NOT NULL,
    packaging_level integer NOT NULL,
    pack_size double precision,
    volume_per_unit double precision,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.packaging_variant OWNER TO postgres;

--
-- Name: period; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period (
    id text NOT NULL,
    period_schedule_id text NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);


ALTER TABLE public.period OWNER TO postgres;

--
-- Name: period_schedule; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.period_schedule (
    id text NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.period_schedule OWNER TO postgres;

--
-- Name: plugin_data; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plugin_data (
    id text NOT NULL,
    store_id text,
    plugin_code text NOT NULL,
    related_record_id text,
    data_identifier text NOT NULL,
    data text NOT NULL
);


ALTER TABLE public.plugin_data OWNER TO postgres;

--
-- Name: preference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.preference (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    store_id text
);


ALTER TABLE public.preference OWNER TO postgres;

--
-- Name: printer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printer (
    id text NOT NULL,
    description text NOT NULL,
    address text NOT NULL,
    port integer NOT NULL,
    label_width integer NOT NULL,
    label_height integer NOT NULL
);


ALTER TABLE public.printer OWNER TO postgres;

--
-- Name: program; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program (
    id text NOT NULL,
    master_list_id text,
    name text NOT NULL,
    context_id text DEFAULT ''::text NOT NULL,
    is_immunisation boolean DEFAULT false NOT NULL,
    elmis_code text,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.program OWNER TO postgres;

--
-- Name: program_enrolment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_enrolment (
    id text NOT NULL,
    document_name text NOT NULL,
    enrolment_datetime timestamp without time zone NOT NULL,
    program_enrolment_id text,
    program_id text NOT NULL,
    document_type text NOT NULL,
    status text,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    store_id text
);


ALTER TABLE public.program_enrolment OWNER TO postgres;

--
-- Name: program_event; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_event (
    id text NOT NULL,
    datetime timestamp without time zone NOT NULL,
    active_start_datetime timestamp without time zone NOT NULL,
    active_end_datetime timestamp without time zone NOT NULL,
    document_type text NOT NULL,
    document_name text,
    type text NOT NULL,
    data text,
    context_id text NOT NULL,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    CONSTRAINT program_event_check CHECK ((datetime <= active_start_datetime)),
    CONSTRAINT program_event_check1 CHECK ((datetime <= active_end_datetime))
);


ALTER TABLE public.program_event OWNER TO postgres;

--
-- Name: program_indicator; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_indicator (
    id text NOT NULL,
    program_id text NOT NULL,
    code text,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.program_indicator OWNER TO postgres;

--
-- Name: program_requisition_order_type; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_requisition_order_type (
    id text NOT NULL,
    program_requisition_settings_id text NOT NULL,
    name text NOT NULL,
    threshold_mos double precision NOT NULL,
    max_mos double precision NOT NULL,
    max_order_per_period integer NOT NULL,
    is_emergency boolean DEFAULT false NOT NULL,
    max_items_in_emergency_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.program_requisition_order_type OWNER TO postgres;

--
-- Name: program_requisition_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.program_requisition_settings (
    id text NOT NULL,
    name_tag_id text NOT NULL,
    program_id text NOT NULL,
    period_schedule_id text NOT NULL
);


ALTER TABLE public.program_requisition_settings OWNER TO postgres;

--
-- Name: property; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.property (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    value_type public.property_value_type NOT NULL,
    allowed_values text
);


ALTER TABLE public.property OWNER TO postgres;

--
-- Name: reason_option; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reason_option (
    id text NOT NULL,
    type public.reason_option_type DEFAULT 'POSITIVE_INVENTORY_ADJUSTMENT'::public.reason_option_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    reason text NOT NULL
);


ALTER TABLE public.reason_option OWNER TO postgres;

--
-- Name: replenishment; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.replenishment AS
 SELECT 'n/a'::text AS id,
    items_and_stores.item_id,
    items_and_stores.store_id,
    (@ COALESCE(stock_movement.quantity, (0)::double precision)) AS quantity,
    date(stock_movement.datetime) AS date
   FROM (( SELECT item.id AS item_id,
            store.id AS store_id
           FROM public.item,
            public.store) items_and_stores
     LEFT JOIN public.stock_movement ON (((stock_movement.item_id = items_and_stores.item_id) AND (stock_movement.store_id = items_and_stores.store_id))))
  WHERE (stock_movement.invoice_type = 'INBOUND_SHIPMENT'::public.invoice_type);


ALTER VIEW public.replenishment OWNER TO postgres;

--
-- Name: report; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report (
    id text NOT NULL,
    name text NOT NULL,
    template text NOT NULL,
    comment text,
    sub_context text,
    argument_schema_id text,
    context public.context_type NOT NULL,
    is_custom boolean DEFAULT true NOT NULL,
    version text DEFAULT 1.0 NOT NULL,
    code text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.report OWNER TO postgres;

--
-- Name: report_document; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.report_document AS
 SELECT d.name,
    d.datetime,
    d.type,
    d.data,
    nl.name_id AS owner_name_id
   FROM ((( SELECT document.name AS doc_name,
            max(document.datetime) AS doc_time
           FROM public.document
          GROUP BY document.name) grouped
     JOIN public.document d ON (((d.name = grouped.doc_name) AND (d.datetime = grouped.doc_time))))
     LEFT JOIN public.name_link nl ON ((nl.id = d.owner_name_link_id)))
  WHERE (d.status <> 'DELETED'::public.document_status);


ALTER VIEW public.report_document OWNER TO postgres;

--
-- Name: report_encounter; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.report_encounter AS
 SELECT encounter.id,
    encounter.created_datetime,
    encounter.start_datetime,
    encounter.end_datetime,
    encounter.status,
    encounter.store_id,
    nl.name_id AS patient_id,
    encounter.document_type,
    doc.data AS document_data
   FROM ((public.encounter
     LEFT JOIN public.name_link nl ON ((nl.id = encounter.patient_link_id)))
     LEFT JOIN public.report_document doc ON ((doc.name = encounter.document_name)));


ALTER VIEW public.report_encounter OWNER TO postgres;

--
-- Name: report_patient; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.report_patient AS
 SELECT id,
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
   FROM public.name;


ALTER VIEW public.report_patient OWNER TO postgres;

--
-- Name: report_program_enrolment; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.report_program_enrolment AS
 SELECT program_enrolment.id,
    program_enrolment.document_type,
    program_enrolment.enrolment_datetime,
    program_enrolment.program_enrolment_id,
    program_enrolment.status,
    nl.name_id AS patient_id,
    doc.data AS document_data
   FROM ((public.program_enrolment
     LEFT JOIN public.name_link nl ON ((nl.id = program_enrolment.patient_link_id)))
     LEFT JOIN public.report_document doc ON ((doc.name = program_enrolment.document_name)));


ALTER VIEW public.report_program_enrolment OWNER TO postgres;

--
-- Name: report_program_event; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.report_program_event AS
 SELECT e.id,
    nl.name_id AS patient_id,
    e.datetime,
    e.active_start_datetime,
    e.active_end_datetime,
    e.document_type,
    e.document_name,
    e.type,
    e.data
   FROM (public.program_event e
     LEFT JOIN public.name_link nl ON ((nl.id = e.patient_link_id)));


ALTER VIEW public.report_program_event OWNER TO postgres;

--
-- Name: report_store; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.report_store AS
 SELECT store.id,
    store.code,
    store.store_mode,
    store.logo,
    name.name
   FROM ((public.store
     JOIN public.name_link ON ((store.name_link_id = name_link.id)))
     JOIN public.name ON ((name_link.name_id = name.id)));


ALTER VIEW public.report_store OWNER TO postgres;

--
-- Name: requisition; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requisition (
    id text NOT NULL,
    requisition_number bigint NOT NULL,
    store_id text NOT NULL,
    user_id text,
    type public.requisition_type NOT NULL,
    status public.requisition_status NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    sent_datetime timestamp without time zone,
    finalised_datetime timestamp without time zone,
    expected_delivery_date date,
    colour text,
    comment text,
    their_reference text,
    max_months_of_stock double precision NOT NULL,
    min_months_of_stock double precision NOT NULL,
    linked_requisition_id text,
    approval_status public.approval_status_type,
    is_sync_update boolean DEFAULT false NOT NULL,
    program_id text,
    period_id text,
    order_type text,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    is_emergency boolean DEFAULT false NOT NULL
);


ALTER TABLE public.requisition OWNER TO postgres;

--
-- Name: requisition_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requisition_line (
    id text NOT NULL,
    requisition_id text NOT NULL,
    requested_quantity double precision NOT NULL,
    suggested_quantity double precision NOT NULL,
    supply_quantity double precision NOT NULL,
    available_stock_on_hand double precision NOT NULL,
    average_monthly_consumption double precision NOT NULL,
    snapshot_datetime timestamp without time zone,
    comment text,
    approved_quantity double precision DEFAULT 0 NOT NULL,
    approval_comment text,
    is_sync_update boolean DEFAULT false NOT NULL,
    item_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    item_name text DEFAULT ''::text NOT NULL,
    initial_stock_on_hand_units double precision DEFAULT 0 NOT NULL,
    incoming_units double precision DEFAULT 0 NOT NULL,
    outgoing_units double precision DEFAULT 0 NOT NULL,
    loss_in_units double precision DEFAULT 0 NOT NULL,
    addition_in_units double precision DEFAULT 0 NOT NULL,
    expiring_units double precision DEFAULT 0 NOT NULL,
    days_out_of_stock double precision DEFAULT 0 NOT NULL,
    option_id text
);


ALTER TABLE public.requisition_line OWNER TO postgres;

--
-- Name: requisitions_in_period; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.requisitions_in_period AS
 SELECT 'n/a'::text AS id,
    r.program_id,
    r.period_id,
    r.store_id,
    r.order_type,
    r.type,
    n.id AS other_party_id,
    count(*) AS count
   FROM ((public.requisition r
     JOIN public.name_link nl ON ((r.name_link_id = nl.id)))
     JOIN public.name n ON ((nl.name_id = n.id)))
  WHERE (r.order_type IS NOT NULL)
  GROUP BY 'n/a'::text, r.program_id, r.period_id, r.store_id, r.order_type, r.type, n.id;


ALTER VIEW public.requisitions_in_period OWNER TO postgres;

--
-- Name: rnr_form; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rnr_form (
    id text NOT NULL,
    store_id text NOT NULL,
    name_link_id text NOT NULL,
    period_id text NOT NULL,
    program_id text NOT NULL,
    status public.rn_r_form_status NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    finalised_datetime timestamp without time zone,
    linked_requisition_id text,
    their_reference text,
    comment text
);


ALTER TABLE public.rnr_form OWNER TO postgres;

--
-- Name: rnr_form_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rnr_form_line (
    id text NOT NULL,
    rnr_form_id text NOT NULL,
    item_link_id text NOT NULL,
    requisition_line_id text,
    average_monthly_consumption double precision NOT NULL,
    previous_monthly_consumption_values text NOT NULL,
    initial_balance double precision NOT NULL,
    snapshot_quantity_received double precision NOT NULL,
    snapshot_quantity_consumed double precision NOT NULL,
    snapshot_adjustments double precision NOT NULL,
    entered_quantity_received double precision,
    entered_quantity_consumed double precision,
    entered_adjustments double precision,
    adjusted_quantity_consumed double precision NOT NULL,
    stock_out_duration integer NOT NULL,
    final_balance double precision NOT NULL,
    maximum_quantity double precision NOT NULL,
    expiry_date date,
    calculated_requested_quantity double precision NOT NULL,
    low_stock public.rn_r_form_low_stock DEFAULT 'OK'::public.rn_r_form_low_stock NOT NULL,
    entered_requested_quantity double precision,
    comment text,
    confirmed boolean DEFAULT false NOT NULL,
    entered_losses double precision DEFAULT 0.0,
    minimum_quantity double precision DEFAULT 0.0 NOT NULL
);


ALTER TABLE public.rnr_form_line OWNER TO postgres;

--
-- Name: sensor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sensor (
    id text NOT NULL,
    serial text NOT NULL,
    name text NOT NULL,
    is_active boolean,
    store_id text NOT NULL,
    location_id text,
    battery_level integer,
    log_interval integer,
    last_connection_datetime timestamp without time zone,
    type public.sensor_type
);


ALTER TABLE public.sensor OWNER TO postgres;

--
-- Name: store_items; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.store_items AS
 SELECT i.id AS item_id,
    sl.store_id,
    sl.pack_size,
    sl.available_number_of_packs,
    sl.total_number_of_packs
   FROM (((public.item i
     LEFT JOIN public.item_link il ON ((il.item_id = i.id)))
     LEFT JOIN public.stock_line sl ON ((sl.item_link_id = il.id)))
     LEFT JOIN public.store s ON ((s.id = sl.store_id)));


ALTER VIEW public.store_items OWNER TO postgres;

--
-- Name: stock_on_hand; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.stock_on_hand AS
 SELECT 'n/a'::text AS id,
    items_and_stores.item_id,
    items_and_stores.item_name,
    items_and_stores.store_id,
    COALESCE(stock.available_stock_on_hand, (0)::double precision) AS available_stock_on_hand,
    COALESCE(stock.total_stock_on_hand, (0)::double precision) AS total_stock_on_hand
   FROM (( SELECT item.id AS item_id,
            item.name AS item_name,
            store.id AS store_id
           FROM public.item,
            public.store) items_and_stores
     LEFT JOIN ( SELECT store_items.item_id,
            store_items.store_id,
            sum((store_items.pack_size * store_items.available_number_of_packs)) AS available_stock_on_hand,
            sum((store_items.pack_size * store_items.total_number_of_packs)) AS total_stock_on_hand
           FROM public.store_items
          WHERE ((store_items.available_number_of_packs > (0)::double precision) OR (store_items.total_number_of_packs > (0)::double precision))
          GROUP BY store_items.item_id, store_items.store_id) stock ON (((stock.item_id = items_and_stores.item_id) AND (stock.store_id = items_and_stores.store_id))));


ALTER VIEW public.stock_on_hand OWNER TO postgres;

--
-- Name: stocktake; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktake (
    id text NOT NULL,
    store_id text NOT NULL,
    user_id text NOT NULL,
    stocktake_number bigint NOT NULL,
    comment text,
    description text,
    status public.stocktake_status NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    stocktake_date date,
    finalised_datetime timestamp without time zone,
    is_locked boolean,
    inventory_addition_id text,
    inventory_reduction_id text,
    program_id text
);


ALTER TABLE public.stocktake OWNER TO postgres;

--
-- Name: stocktake_line; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.stocktake_line (
    id text NOT NULL,
    stocktake_id text NOT NULL,
    stock_line_id text,
    location_id text,
    comment text,
    snapshot_number_of_packs double precision NOT NULL,
    counted_number_of_packs double precision,
    batch text,
    expiry_date date,
    pack_size double precision,
    cost_price_per_pack double precision,
    sell_price_per_pack double precision,
    note text,
    inventory_adjustment_reason_id text,
    item_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    item_name text DEFAULT ''::text NOT NULL,
    item_variant_id text
);


ALTER TABLE public.stocktake_line OWNER TO postgres;

--
-- Name: store_preference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_preference (
    id text NOT NULL,
    type public.store_preference_type DEFAULT 'STORE_PREFERENCES'::public.store_preference_type,
    pack_to_one boolean DEFAULT false NOT NULL,
    response_requisition_requires_authorisation boolean DEFAULT false NOT NULL,
    request_requisition_requires_authorisation boolean DEFAULT false NOT NULL,
    om_program_module boolean DEFAULT false NOT NULL,
    vaccine_module boolean DEFAULT false NOT NULL,
    issue_in_foreign_currency boolean DEFAULT false NOT NULL,
    monthly_consumption_look_back_period double precision DEFAULT 0.0,
    months_lead_time double precision DEFAULT 0.0,
    months_overstock double precision DEFAULT 6.0,
    months_understock double precision DEFAULT 3.0,
    months_items_expire double precision DEFAULT 3.0,
    stocktake_frequency double precision DEFAULT 1.0,
    extra_fields_in_requisition boolean DEFAULT false NOT NULL,
    keep_requisition_lines_with_zero_requested_quantity_on_finalise boolean DEFAULT false NOT NULL,
    use_consumption_and_stock_from_customers_for_internal_orders boolean DEFAULT false NOT NULL,
    manually_link_internal_order_to_inbound_shipment boolean DEFAULT false NOT NULL,
    edit_prescribed_quantity_on_prescription boolean DEFAULT false NOT NULL
);


ALTER TABLE public.store_preference OWNER TO postgres;

--
-- Name: sync_buffer; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_buffer (
    record_id text NOT NULL,
    received_datetime timestamp without time zone NOT NULL,
    integration_datetime timestamp without time zone,
    integration_error text,
    table_name text NOT NULL,
    action public.sync_action NOT NULL,
    data text NOT NULL,
    source_site_id integer
);


ALTER TABLE public.sync_buffer OWNER TO postgres;

--
-- Name: sync_file_reference; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_file_reference (
    id text NOT NULL,
    table_name text NOT NULL,
    record_id text NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    uploaded_bytes integer DEFAULT 0 NOT NULL,
    downloaded_bytes integer DEFAULT 0 NOT NULL,
    total_bytes integer DEFAULT 0 NOT NULL,
    retries integer DEFAULT 0 NOT NULL,
    retry_at timestamp without time zone,
    direction public.sync_file_direction NOT NULL,
    status public.sync_file_status NOT NULL,
    error text,
    created_datetime timestamp without time zone NOT NULL,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.sync_file_reference OWNER TO postgres;

--
-- Name: sync_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_log (
    id text NOT NULL,
    started_datetime timestamp without time zone NOT NULL,
    finished_datetime timestamp without time zone,
    prepare_initial_started_datetime timestamp without time zone,
    prepare_initial_finished_datetime timestamp without time zone,
    push_started_datetime timestamp without time zone,
    push_finished_datetime timestamp without time zone,
    push_progress_total integer,
    push_progress_done integer,
    pull_central_started_datetime timestamp without time zone,
    pull_central_finished_datetime timestamp without time zone,
    pull_central_progress_total integer,
    pull_central_progress_done integer,
    pull_remote_started_datetime timestamp without time zone,
    pull_remote_finished_datetime timestamp without time zone,
    pull_remote_progress_total integer,
    pull_remote_progress_done integer,
    integration_started_datetime timestamp without time zone,
    integration_finished_datetime timestamp without time zone,
    error_message text,
    error_code public.sync_api_error_code,
    integration_progress_total integer,
    integration_progress_done integer,
    pull_v6_started_datetime timestamp without time zone,
    pull_v6_finished_datetime timestamp without time zone,
    pull_v6_progress_total integer,
    pull_v6_progress_done integer,
    push_v6_started_datetime timestamp without time zone,
    push_v6_finished_datetime timestamp without time zone,
    push_v6_progress_total integer,
    push_v6_progress_done integer,
    duration_in_seconds integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.sync_log OWNER TO postgres;

--
-- Name: system_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_log (
    id text NOT NULL,
    type public.system_log_type NOT NULL,
    sync_site_id integer,
    datetime timestamp without time zone NOT NULL,
    message text,
    is_error boolean DEFAULT false NOT NULL
);


ALTER TABLE public.system_log OWNER TO postgres;

--
-- Name: temperature_breach; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.temperature_breach (
    id text NOT NULL,
    duration_milliseconds integer NOT NULL,
    type public.temperature_breach_type NOT NULL,
    sensor_id text NOT NULL,
    store_id text NOT NULL,
    location_id text,
    start_datetime timestamp without time zone NOT NULL,
    end_datetime timestamp without time zone,
    unacknowledged boolean,
    threshold_minimum double precision NOT NULL,
    threshold_maximum double precision NOT NULL,
    threshold_duration_milliseconds integer NOT NULL,
    comment text
);


ALTER TABLE public.temperature_breach OWNER TO postgres;

--
-- Name: temperature_breach_config; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.temperature_breach_config (
    id text NOT NULL,
    duration_milliseconds integer NOT NULL,
    type public.temperature_breach_type NOT NULL,
    description text NOT NULL,
    is_active boolean,
    store_id text NOT NULL,
    minimum_temperature double precision NOT NULL,
    maximum_temperature double precision NOT NULL
);


ALTER TABLE public.temperature_breach_config OWNER TO postgres;

--
-- Name: temperature_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.temperature_log (
    id text NOT NULL,
    temperature double precision NOT NULL,
    sensor_id text NOT NULL,
    store_id text NOT NULL,
    location_id text,
    datetime timestamp without time zone NOT NULL,
    temperature_breach_id text
);


ALTER TABLE public.temperature_log OWNER TO postgres;

--
-- Name: unit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unit (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    index integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.unit OWNER TO postgres;

--
-- Name: user_account; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_account (
    id text NOT NULL,
    username text NOT NULL,
    hashed_password text NOT NULL,
    email text,
    language public.language_type DEFAULT 'ENGLISH'::public.language_type NOT NULL,
    first_name text,
    last_name text,
    phone_number text,
    job_title text,
    last_successful_sync timestamp without time zone
);


ALTER TABLE public.user_account OWNER TO postgres;

--
-- Name: user_permission; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_permission (
    id text NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    permission public.permission_type NOT NULL,
    context_id text
);


ALTER TABLE public.user_permission OWNER TO postgres;

--
-- Name: user_store_join; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_store_join (
    id text NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    is_default boolean NOT NULL
);


ALTER TABLE public.user_store_join OWNER TO postgres;

--
-- Name: vaccination; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vaccination (
    id text NOT NULL,
    program_enrolment_id text NOT NULL,
    encounter_id text NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    user_id text NOT NULL,
    vaccine_course_dose_id text NOT NULL,
    store_id text NOT NULL,
    clinician_link_id text,
    invoice_id text,
    stock_line_id text,
    vaccination_date date,
    given boolean NOT NULL,
    not_given_reason text,
    comment text,
    facility_name_link_id text,
    facility_free_text text
);


ALTER TABLE public.vaccination OWNER TO postgres;

--
-- Name: vaccine_course; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vaccine_course (
    id text NOT NULL,
    name text NOT NULL,
    program_id text NOT NULL,
    coverage_rate double precision DEFAULT 100 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    wastage_rate double precision DEFAULT 0 NOT NULL,
    deleted_datetime timestamp without time zone,
    demographic_id text
);


ALTER TABLE public.vaccine_course OWNER TO postgres;

--
-- Name: vaccine_course_dose; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vaccine_course_dose (
    id text NOT NULL,
    vaccine_course_id text NOT NULL,
    label text NOT NULL,
    min_interval_days integer DEFAULT 0 NOT NULL,
    min_age double precision DEFAULT 0.0 NOT NULL,
    max_age double precision DEFAULT 0 NOT NULL,
    deleted_datetime timestamp without time zone,
    custom_age_label text
);


ALTER TABLE public.vaccine_course_dose OWNER TO postgres;

--
-- Name: vaccination_card; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.vaccination_card AS
 SELECT ((vcd.id || '_'::text) || pe.id) AS id,
    vcd.id AS vaccine_course_dose_id,
    vcd.label,
    vcd.min_interval_days,
    vcd.min_age,
    vcd.max_age,
    vcd.custom_age_label,
    vc.id AS vaccine_course_id,
    v.id AS vaccination_id,
    v.vaccination_date,
    v.given,
    v.stock_line_id,
    n.id AS facility_name_id,
    v.facility_free_text,
    s.batch,
    pe.id AS program_enrolment_id
   FROM ((((((public.vaccine_course_dose vcd
     JOIN public.vaccine_course vc ON ((vcd.vaccine_course_id = vc.id)))
     JOIN public.program_enrolment pe ON ((pe.program_id = vc.program_id)))
     LEFT JOIN public.vaccination v ON (((v.vaccine_course_dose_id = vcd.id) AND (v.program_enrolment_id = pe.id))))
     LEFT JOIN public.name_link nl ON ((v.facility_name_link_id = nl.id)))
     LEFT JOIN public.name n ON ((nl.name_id = n.id)))
     LEFT JOIN public.stock_line s ON ((v.stock_line_id = s.id)))
  WHERE ((vcd.deleted_datetime IS NULL) OR (v.id IS NOT NULL));


ALTER VIEW public.vaccination_card OWNER TO postgres;

--
-- Name: vaccine_course_item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.vaccine_course_item (
    id text NOT NULL,
    vaccine_course_id text NOT NULL,
    item_link_id text NOT NULL,
    deleted_datetime timestamp without time zone
);


ALTER TABLE public.vaccine_course_item OWNER TO postgres;

--
-- Name: changelog cursor; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changelog ALTER COLUMN cursor SET DEFAULT nextval('public.changelog_cursor_seq'::regclass);


--
-- Name: __diesel_schema_migrations __diesel_schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.__diesel_schema_migrations
    ADD CONSTRAINT __diesel_schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: abbreviation abbreviation_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.abbreviation
    ADD CONSTRAINT abbreviation_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: asset_catalogue_item asset_catalogue_item_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_code_key UNIQUE (code);


--
-- Name: asset_catalogue_item asset_catalogue_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_pkey PRIMARY KEY (id);


--
-- Name: asset_catalogue_type asset_catalogue_type_asset_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_type
    ADD CONSTRAINT asset_catalogue_type_asset_category_id_name_key UNIQUE (asset_category_id, name);


--
-- Name: asset_catalogue_type asset_catalogue_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_type
    ADD CONSTRAINT asset_catalogue_type_pkey PRIMARY KEY (id);


--
-- Name: asset_category asset_category_asset_class_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_category
    ADD CONSTRAINT asset_category_asset_class_id_name_key UNIQUE (asset_class_id, name);


--
-- Name: asset_category asset_category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_category
    ADD CONSTRAINT asset_category_pkey PRIMARY KEY (id);


--
-- Name: asset_class asset_class_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_class
    ADD CONSTRAINT asset_class_name_key UNIQUE (name);


--
-- Name: asset_class asset_class_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_class
    ADD CONSTRAINT asset_class_pkey PRIMARY KEY (id);


--
-- Name: asset_internal_location asset_internal_location_location_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_location_id_key UNIQUE (location_id);


--
-- Name: asset_internal_location asset_internal_location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_pkey PRIMARY KEY (id);


--
-- Name: asset_log asset_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_log
    ADD CONSTRAINT asset_log_pkey PRIMARY KEY (id);


--
-- Name: asset_log_reason asset_log_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_log_reason
    ADD CONSTRAINT asset_log_reason_pkey PRIMARY KEY (id);


--
-- Name: asset asset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_pkey PRIMARY KEY (id);


--
-- Name: asset_property asset_property_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_property
    ADD CONSTRAINT asset_property_pkey PRIMARY KEY (id);


--
-- Name: backend_plugin backend_plugin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.backend_plugin
    ADD CONSTRAINT backend_plugin_pkey PRIMARY KEY (id);


--
-- Name: barcode barcode_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_pkey PRIMARY KEY (id);


--
-- Name: barcode barcode_value_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_value_key UNIQUE (gtin);


--
-- Name: bundled_item bundled_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundled_item
    ADD CONSTRAINT bundled_item_pkey PRIMARY KEY (id);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);


--
-- Name: changelog changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_pkey PRIMARY KEY (cursor);


--
-- Name: clinician_link clinician_link_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinician_link
    ADD CONSTRAINT clinician_link_pkey PRIMARY KEY (id);


--
-- Name: clinician clinician_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinician
    ADD CONSTRAINT clinician_pkey PRIMARY KEY (id);


--
-- Name: clinician_store_join clinician_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_pkey PRIMARY KEY (id);


--
-- Name: cold_storage_type cold_storage_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cold_storage_type
    ADD CONSTRAINT cold_storage_type_pkey PRIMARY KEY (id);


--
-- Name: contact_form contact_form_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_form
    ADD CONSTRAINT contact_form_pkey PRIMARY KEY (id);


--
-- Name: contact_trace contact_trace_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_pkey PRIMARY KEY (id);


--
-- Name: context context_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.context
    ADD CONSTRAINT context_pkey PRIMARY KEY (id);


--
-- Name: currency currency_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_pkey PRIMARY KEY (id);


--
-- Name: demographic_indicator demographic_indicator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demographic_indicator
    ADD CONSTRAINT demographic_indicator_pkey PRIMARY KEY (id);


--
-- Name: demographic demographic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demographic
    ADD CONSTRAINT demographic_pkey PRIMARY KEY (id);


--
-- Name: demographic_projection demographic_projection_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demographic_projection
    ADD CONSTRAINT demographic_projection_pkey PRIMARY KEY (id);


--
-- Name: diagnosis diagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnosis
    ADD CONSTRAINT diagnosis_pkey PRIMARY KEY (id);


--
-- Name: document document_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);


--
-- Name: document_registry document_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_pkey PRIMARY KEY (id);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);


--
-- Name: encounter encounter_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_pkey PRIMARY KEY (id);


--
-- Name: form_schema form_schema_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_schema
    ADD CONSTRAINT form_schema_pkey PRIMARY KEY (id);


--
-- Name: frontend_plugin frontend_plugin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.frontend_plugin
    ADD CONSTRAINT frontend_plugin_pkey PRIMARY KEY (id);


--
-- Name: indicator_column indicator_column_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_column
    ADD CONSTRAINT indicator_column_pkey PRIMARY KEY (id);


--
-- Name: indicator_line indicator_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_line
    ADD CONSTRAINT indicator_line_pkey PRIMARY KEY (id);


--
-- Name: indicator_value indicator_value_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_pkey PRIMARY KEY (id);


--
-- Name: insurance_provider insurance_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.insurance_provider
    ADD CONSTRAINT insurance_provider_pkey PRIMARY KEY (id);


--
-- Name: inventory_adjustment_reason inventory_adjustment_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_adjustment_reason
    ADD CONSTRAINT inventory_adjustment_reason_pkey PRIMARY KEY (id);


--
-- Name: invoice_line invoice_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_pkey PRIMARY KEY (id);


--
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (id);


--
-- Name: item_category_join item_category_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_category_join
    ADD CONSTRAINT item_category_join_pkey PRIMARY KEY (id);


--
-- Name: item_direction item_direction_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_direction
    ADD CONSTRAINT item_direction_pkey PRIMARY KEY (id);


--
-- Name: item_link item_link_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_link
    ADD CONSTRAINT item_link_pkey PRIMARY KEY (id);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- Name: item_variant item_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_pkey PRIMARY KEY (id);


--
-- Name: key_value_store key_value_store_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.key_value_store
    ADD CONSTRAINT key_value_store_pkey PRIMARY KEY (id);


--
-- Name: location_movement location_movement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_pkey PRIMARY KEY (id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: master_list_line master_list_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_pkey PRIMARY KEY (id);


--
-- Name: master_list_name_join master_list_name_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_pkey PRIMARY KEY (id);


--
-- Name: master_list master_list_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list
    ADD CONSTRAINT master_list_pkey PRIMARY KEY (id);


--
-- Name: migration_fragment_log migration_fragment_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migration_fragment_log
    ADD CONSTRAINT migration_fragment_log_pkey PRIMARY KEY (version_and_identifier);


--
-- Name: name_insurance_join name_insurance_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_insurance_join
    ADD CONSTRAINT name_insurance_join_pkey PRIMARY KEY (id);


--
-- Name: name_link name_link_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_link
    ADD CONSTRAINT name_link_pkey PRIMARY KEY (id);


--
-- Name: name name_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name
    ADD CONSTRAINT name_pkey PRIMARY KEY (id);


--
-- Name: name_property name_property_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_property
    ADD CONSTRAINT name_property_pkey PRIMARY KEY (id);


--
-- Name: name_store_join name_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_pkey PRIMARY KEY (id);


--
-- Name: name_tag_join name_tag_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_tag_join
    ADD CONSTRAINT name_tag_join_pkey PRIMARY KEY (id);


--
-- Name: name_tag name_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_tag
    ADD CONSTRAINT name_tag_pkey PRIMARY KEY (id);


--
-- Name: number number_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number
    ADD CONSTRAINT number_pkey PRIMARY KEY (id);


--
-- Name: packaging_variant packaging_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packaging_variant
    ADD CONSTRAINT packaging_variant_pkey PRIMARY KEY (id);


--
-- Name: period period_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period
    ADD CONSTRAINT period_pkey PRIMARY KEY (id);


--
-- Name: period_schedule period_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period_schedule
    ADD CONSTRAINT period_schedule_pkey PRIMARY KEY (id);


--
-- Name: plugin_data plugin_data_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plugin_data
    ADD CONSTRAINT plugin_data_pkey PRIMARY KEY (id);


--
-- Name: preference preference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preference
    ADD CONSTRAINT preference_pkey PRIMARY KEY (id);


--
-- Name: printer printer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printer
    ADD CONSTRAINT printer_pkey PRIMARY KEY (id);


--
-- Name: program_enrolment program_enrolment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_pkey PRIMARY KEY (id);


--
-- Name: program_event program_event_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_pkey PRIMARY KEY (id);


--
-- Name: program_indicator program_indicator_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_indicator
    ADD CONSTRAINT program_indicator_pkey PRIMARY KEY (id);


--
-- Name: program program_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_pkey PRIMARY KEY (id);


--
-- Name: program_requisition_order_type program_requisition_order_type_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_requisition_order_type
    ADD CONSTRAINT program_requisition_order_type_pkey PRIMARY KEY (id);


--
-- Name: program_requisition_settings program_requisition_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_pkey PRIMARY KEY (id);


--
-- Name: property property_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.property
    ADD CONSTRAINT property_pkey PRIMARY KEY (id);


--
-- Name: reason_option reason_option_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reason_option
    ADD CONSTRAINT reason_option_pkey PRIMARY KEY (id);


--
-- Name: report report_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_pkey PRIMARY KEY (id);


--
-- Name: requisition_line requisition_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_pkey PRIMARY KEY (id);


--
-- Name: requisition requisition_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_pkey PRIMARY KEY (id);


--
-- Name: return_reason return_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.return_reason
    ADD CONSTRAINT return_reason_pkey PRIMARY KEY (id);


--
-- Name: rnr_form_line rnr_form_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form_line
    ADD CONSTRAINT rnr_form_line_pkey PRIMARY KEY (id);


--
-- Name: rnr_form rnr_form_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_pkey PRIMARY KEY (id);


--
-- Name: sensor sensor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_pkey PRIMARY KEY (id);


--
-- Name: stock_line stock_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_pkey PRIMARY KEY (id);


--
-- Name: stocktake_line stocktake_line_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_pkey PRIMARY KEY (id);


--
-- Name: stocktake stocktake_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_pkey PRIMARY KEY (id);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (id);


--
-- Name: store_preference store_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_preference
    ADD CONSTRAINT store_preference_pkey PRIMARY KEY (id);


--
-- Name: sync_buffer sync_buffer_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_buffer
    ADD CONSTRAINT sync_buffer_pkey PRIMARY KEY (record_id);


--
-- Name: sync_file_reference sync_file_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_file_reference
    ADD CONSTRAINT sync_file_reference_pkey PRIMARY KEY (id);


--
-- Name: sync_log sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_log
    ADD CONSTRAINT sync_log_pkey PRIMARY KEY (id);


--
-- Name: system_log system_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_log
    ADD CONSTRAINT system_log_pkey PRIMARY KEY (id);


--
-- Name: temperature_breach_config temperature_breach_config_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_breach_config
    ADD CONSTRAINT temperature_breach_config_pkey PRIMARY KEY (id);


--
-- Name: temperature_breach temperature_breach_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_pkey PRIMARY KEY (id);


--
-- Name: temperature_log temperature_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_pkey PRIMARY KEY (id);


--
-- Name: unit unit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_pkey PRIMARY KEY (id);


--
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);


--
-- Name: user_permission user_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permission
    ADD CONSTRAINT user_permission_pkey PRIMARY KEY (id);


--
-- Name: user_store_join user_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_store_join
    ADD CONSTRAINT user_store_join_pkey PRIMARY KEY (id);


--
-- Name: vaccination vaccination_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccination
    ADD CONSTRAINT vaccination_pkey PRIMARY KEY (id);


--
-- Name: vaccine_course_item vaccine_course_item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course_item
    ADD CONSTRAINT vaccine_course_item_pkey PRIMARY KEY (id);


--
-- Name: vaccine_course vaccine_course_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course
    ADD CONSTRAINT vaccine_course_pkey PRIMARY KEY (id);


--
-- Name: vaccine_course_dose vaccine_course_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course_dose
    ADD CONSTRAINT vaccine_course_schedule_pkey PRIMARY KEY (id);


--
-- Name: asset_asset_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asset_asset_number ON public.asset USING btree (asset_number);


--
-- Name: asset_catalogue_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asset_catalogue_item_id ON public.asset USING btree (asset_catalogue_item_id);


--
-- Name: asset_deleted_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asset_deleted_datetime ON public.asset USING btree (deleted_datetime);


--
-- Name: asset_internal_location_asset_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asset_internal_location_asset_id ON public.asset_internal_location USING btree (asset_id);


--
-- Name: asset_serial_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX asset_serial_number ON public.asset USING btree (serial_number);


--
-- Name: i_program_requisition_ot_program_requisition_settings; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX i_program_requisition_ot_program_requisition_settings ON public.program_requisition_order_type USING btree (program_requisition_settings_id);


--
-- Name: index_activity_log_record_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_activity_log_record_id_fkey ON public.activity_log USING btree (record_id);


--
-- Name: index_activity_log_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_activity_log_store_id_fkey ON public.activity_log USING btree (store_id);


--
-- Name: index_barcode_item_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_barcode_item_id ON public.barcode USING btree (item_id);


--
-- Name: index_barcode_manufacturer_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_barcode_manufacturer_link_id_fkey ON public.barcode USING btree (manufacturer_link_id);


--
-- Name: index_changelog_name_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_changelog_name_link_id_fkey ON public.changelog USING btree (name_link_id);


--
-- Name: index_changelog_record_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_changelog_record_id ON public.changelog USING btree (record_id);


--
-- Name: index_changelog_row_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_changelog_row_action ON public.changelog USING btree (row_action);


--
-- Name: index_changelog_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_changelog_store_id_fkey ON public.changelog USING btree (store_id);


--
-- Name: index_changelog_table_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_changelog_table_name ON public.changelog USING btree (table_name);


--
-- Name: index_clinician_link_clinician_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_clinician_link_clinician_id_fkey ON public.clinician_link USING btree (clinician_id);


--
-- Name: index_clinician_store_join_clinician_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_clinician_store_join_clinician_link_id_fkey ON public.clinician_store_join USING btree (clinician_link_id);


--
-- Name: index_clinician_store_join_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_clinician_store_join_store_id ON public.clinician_store_join USING btree (store_id);


--
-- Name: index_contact_trace_contact_patient_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_contact_trace_contact_patient_link_id ON public.contact_trace USING btree (contact_patient_link_id);


--
-- Name: index_contact_trace_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_contact_trace_document_id ON public.contact_trace USING btree (document_id);


--
-- Name: index_contact_trace_patient_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_contact_trace_patient_link_id ON public.contact_trace USING btree (patient_link_id);


--
-- Name: index_contact_trace_program_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_contact_trace_program_id ON public.contact_trace USING btree (program_id);


--
-- Name: index_contact_trace_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_contact_trace_store_id ON public.contact_trace USING btree (store_id);


--
-- Name: index_document_context_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_document_context_id ON public.document USING btree (context_id);


--
-- Name: index_document_form_schema_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_document_form_schema_id ON public.document USING btree (form_schema_id);


--
-- Name: index_document_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_document_name ON public.document USING btree (name);


--
-- Name: index_document_owner_name_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_document_owner_name_link_id ON public.document USING btree (owner_name_link_id);


--
-- Name: index_document_registry_context_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_document_registry_context_id ON public.document_registry USING btree (context_id);


--
-- Name: index_document_registry_form_schema_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_document_registry_form_schema_id ON public.document_registry USING btree (form_schema_id);


--
-- Name: index_encounter_clinician_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_encounter_clinician_link_id_fkey ON public.encounter USING btree (clinician_link_id);


--
-- Name: index_encounter_enrolment_program_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_encounter_enrolment_program_id ON public.encounter USING btree (program_id);


--
-- Name: index_encounter_patient_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_encounter_patient_link_id_fkey ON public.encounter USING btree (patient_link_id);


--
-- Name: index_invoice_clinician_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_clinician_link_id_fkey ON public.invoice USING btree (clinician_link_id);


--
-- Name: index_invoice_created_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_created_datetime ON public.invoice USING btree (created_datetime);


--
-- Name: index_invoice_invoice_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_invoice_number ON public.invoice USING btree (invoice_number);


--
-- Name: index_invoice_line_inventory_adjustment_reason_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_inventory_adjustment_reason_id ON public.invoice_line USING btree (inventory_adjustment_reason_id);


--
-- Name: index_invoice_line_invoice_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_invoice_id_fkey ON public.invoice_line USING btree (invoice_id);


--
-- Name: index_invoice_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_item_link_id_fkey ON public.invoice_line USING btree (item_link_id);


--
-- Name: index_invoice_line_location_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_location_id_fkey ON public.invoice_line USING btree (location_id);


--
-- Name: index_invoice_line_number_of_packs; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_number_of_packs ON public.invoice_line USING btree (number_of_packs);


--
-- Name: index_invoice_line_return_reason_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_return_reason_id ON public.invoice_line USING btree (return_reason_id);


--
-- Name: index_invoice_line_stock_line_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_stock_line_id_fkey ON public.invoice_line USING btree (stock_line_id);


--
-- Name: index_invoice_line_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_line_type ON public.invoice_line USING btree (type);


--
-- Name: index_invoice_linked_invoice_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_linked_invoice_id ON public.invoice USING btree (linked_invoice_id);


--
-- Name: index_invoice_name_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_name_link_id_fkey ON public.invoice USING btree (name_link_id);


--
-- Name: index_invoice_name_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_name_store_id_fkey ON public.invoice USING btree (name_store_id);


--
-- Name: index_invoice_requisition_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_requisition_id ON public.invoice USING btree (requisition_id);


--
-- Name: index_invoice_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_status ON public.invoice USING btree (status);


--
-- Name: index_invoice_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_store_id_fkey ON public.invoice USING btree (store_id);


--
-- Name: index_invoice_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_invoice_type ON public.invoice USING btree (type);


--
-- Name: index_item_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_item_is_active ON public.item USING btree (is_active);


--
-- Name: index_item_is_vaccine; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_item_is_vaccine ON public.item USING btree (is_vaccine);


--
-- Name: index_item_link_item_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_item_link_item_id_fkey ON public.item_link USING btree (item_id);


--
-- Name: index_item_unit_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_item_unit_id_fkey ON public.item USING btree (unit_id);


--
-- Name: index_location_movement_location_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_location_movement_location_id_fkey ON public.location_movement USING btree (location_id);


--
-- Name: index_location_movement_stock_line_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_location_movement_stock_line_id_fkey ON public.location_movement USING btree (stock_line_id);


--
-- Name: index_location_movement_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_location_movement_store_id_fkey ON public.location_movement USING btree (store_id);


--
-- Name: index_location_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_location_store_id_fkey ON public.location USING btree (store_id);


--
-- Name: index_master_list_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_master_list_line_item_link_id_fkey ON public.master_list_line USING btree (item_link_id);


--
-- Name: index_master_list_line_master_list_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_master_list_line_master_list_id_fkey ON public.master_list_line USING btree (master_list_id);


--
-- Name: index_master_list_name_join_master_list_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_master_list_name_join_master_list_id_fkey ON public.master_list_name_join USING btree (master_list_id);


--
-- Name: index_name_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_code ON public.name USING btree (code);


--
-- Name: index_name_first_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_first_name ON public.name USING btree (first_name);


--
-- Name: index_name_last_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_last_name ON public.name USING btree (last_name);


--
-- Name: index_name_link_name_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_link_name_id_fkey ON public.name_link USING btree (name_id);


--
-- Name: index_name_national_health_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_national_health_number ON public.name USING btree (national_health_number);


--
-- Name: index_name_store_join_name_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_store_join_name_link_id_fkey ON public.name_store_join USING btree (name_link_id);


--
-- Name: index_name_store_join_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_store_join_store_id_fkey ON public.name_store_join USING btree (store_id);


--
-- Name: index_name_tag_join_name_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_tag_join_name_link_id_fkey ON public.name_tag_join USING btree (name_link_id);


--
-- Name: index_name_tag_join_name_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_name_tag_join_name_tag_id ON public.name_tag_join USING btree (name_tag_id);


--
-- Name: index_period_period_schedule_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_period_period_schedule_id ON public.period USING btree (period_schedule_id);


--
-- Name: index_program_context_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_context_id ON public.program USING btree (context_id);


--
-- Name: index_program_enrolment_patient_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_enrolment_patient_link_id_fkey ON public.program_enrolment USING btree (patient_link_id);


--
-- Name: index_program_enrolment_program_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_enrolment_program_id ON public.program_enrolment USING btree (program_id);


--
-- Name: index_program_event_context_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_event_context_id ON public.program_event USING btree (context_id);


--
-- Name: index_program_event_patient_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_event_patient_link_id ON public.program_event USING btree (patient_link_id);


--
-- Name: index_program_master_list_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_master_list_id ON public.program USING btree (master_list_id);


--
-- Name: index_program_requisition_settings_name_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_requisition_settings_name_tag_id ON public.program_requisition_settings USING btree (name_tag_id);


--
-- Name: index_program_requisition_settings_period_schedule_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_requisition_settings_period_schedule_id ON public.program_requisition_settings USING btree (period_schedule_id);


--
-- Name: index_program_requisition_settings_program_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_program_requisition_settings_program_id ON public.program_requisition_settings USING btree (program_id);


--
-- Name: index_requisition_created_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_created_datetime ON public.requisition USING btree (created_datetime);


--
-- Name: index_requisition_line_requisition_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_line_requisition_id_fkey ON public.requisition_line USING btree (requisition_id);


--
-- Name: index_requisition_linked_requisition_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_linked_requisition_id ON public.requisition USING btree (linked_requisition_id);


--
-- Name: index_requisition_name_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_name_link_id_fkey ON public.requisition USING btree (name_link_id);


--
-- Name: index_requisition_period_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_period_id ON public.requisition USING btree (period_id);


--
-- Name: index_requisition_requisition_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_requisition_number ON public.requisition USING btree (requisition_number);


--
-- Name: index_requisition_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_status ON public.requisition USING btree (status);


--
-- Name: index_requisition_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_store_id_fkey ON public.requisition USING btree (store_id);


--
-- Name: index_requisition_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_requisition_type ON public.requisition USING btree (type);


--
-- Name: index_sensor_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_sensor_location_id ON public.sensor USING btree (location_id);


--
-- Name: index_sensor_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_sensor_store_id ON public.sensor USING btree (store_id);


--
-- Name: index_stock_line_available_number_of_packs; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_available_number_of_packs ON public.stock_line USING btree (available_number_of_packs);


--
-- Name: index_stock_line_barcode_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_barcode_id ON public.stock_line USING btree (barcode_id);


--
-- Name: index_stock_line_expiry_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_expiry_date ON public.stock_line USING btree (expiry_date);


--
-- Name: index_stock_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_item_link_id_fkey ON public.stock_line USING btree (item_link_id);


--
-- Name: index_stock_line_location_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_location_id_fkey ON public.stock_line USING btree (location_id);


--
-- Name: index_stock_line_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_store_id_fkey ON public.stock_line USING btree (store_id);


--
-- Name: index_stock_line_supplier_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_supplier_link_id_fkey ON public.stock_line USING btree (supplier_link_id);


--
-- Name: index_stock_line_total_number_of_packs; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stock_line_total_number_of_packs ON public.stock_line USING btree (total_number_of_packs);


--
-- Name: index_stocktake_created_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_created_datetime ON public.stocktake USING btree (created_datetime);


--
-- Name: index_stocktake_inventory_addition_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_inventory_addition_id_fkey ON public.stocktake USING btree (inventory_addition_id);


--
-- Name: index_stocktake_inventory_reduction_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_inventory_reduction_id_fkey ON public.stocktake USING btree (inventory_reduction_id);


--
-- Name: index_stocktake_line_inventory_adjustment_reason_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_line_inventory_adjustment_reason_id ON public.stocktake_line USING btree (inventory_adjustment_reason_id);


--
-- Name: index_stocktake_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_line_item_link_id_fkey ON public.stocktake_line USING btree (item_link_id);


--
-- Name: index_stocktake_line_location_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_line_location_id_fkey ON public.stocktake_line USING btree (location_id);


--
-- Name: index_stocktake_line_stock_line_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_line_stock_line_id_fkey ON public.stocktake_line USING btree (stock_line_id);


--
-- Name: index_stocktake_line_stocktake_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_line_stocktake_id_fkey ON public.stocktake_line USING btree (stocktake_id);


--
-- Name: index_stocktake_stocktake_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_stocktake_number ON public.stocktake USING btree (stocktake_number);


--
-- Name: index_stocktake_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_stocktake_store_id_fkey ON public.stocktake USING btree (store_id);


--
-- Name: index_store_site_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_store_site_id ON public.store USING btree (site_id);


--
-- Name: index_sync_buffer_action; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_sync_buffer_action ON public.sync_buffer USING btree (action);


--
-- Name: index_sync_buffer_combined_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_sync_buffer_combined_index ON public.sync_buffer USING btree (action, table_name, integration_datetime, source_site_id);


--
-- Name: index_sync_buffer_integration_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_sync_buffer_integration_datetime ON public.sync_buffer USING btree (integration_datetime);


--
-- Name: index_sync_buffer_integration_error; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_sync_buffer_integration_error ON public.sync_buffer USING btree (integration_error);


--
-- Name: index_temperature_breach_config_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_breach_config_store_id ON public.temperature_breach_config USING btree (store_id);


--
-- Name: index_temperature_breach_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_breach_location_id ON public.temperature_breach USING btree (location_id);


--
-- Name: index_temperature_breach_sensor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_breach_sensor_id ON public.temperature_breach USING btree (sensor_id);


--
-- Name: index_temperature_breach_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_breach_store_id ON public.temperature_breach USING btree (store_id);


--
-- Name: index_temperature_log_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_log_datetime ON public.temperature_log USING btree (datetime);


--
-- Name: index_temperature_log_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_log_location_id ON public.temperature_log USING btree (location_id);


--
-- Name: index_temperature_log_sensor_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_log_sensor_id ON public.temperature_log USING btree (sensor_id);


--
-- Name: index_temperature_log_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_log_store_id ON public.temperature_log USING btree (store_id);


--
-- Name: index_temperature_log_temperature_breach_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_temperature_log_temperature_breach_id ON public.temperature_log USING btree (temperature_breach_id);


--
-- Name: index_unit_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_unit_is_active ON public.unit USING btree (is_active);


--
-- Name: index_user_permission_context_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_user_permission_context_id ON public.user_permission USING btree (context_id);


--
-- Name: index_user_permission_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_user_permission_store_id_fkey ON public.user_permission USING btree (store_id);


--
-- Name: index_user_permission_user_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_user_permission_user_id_fkey ON public.user_permission USING btree (user_id);


--
-- Name: index_user_store_join_store_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_user_store_join_store_id_fkey ON public.user_store_join USING btree (store_id);


--
-- Name: index_user_store_join_user_id_fkey; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_user_store_join_user_id_fkey ON public.user_store_join USING btree (user_id);


--
-- Name: indicator_column_program_indicator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_column_program_indicator_id ON public.indicator_column USING btree (program_indicator_id);


--
-- Name: indicator_line_program_indicator_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_line_program_indicator_id ON public.indicator_line USING btree (program_indicator_id);


--
-- Name: indicator_value_customer_name_link_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_value_customer_name_link_id ON public.indicator_value USING btree (customer_name_link_id);


--
-- Name: indicator_value_indicator_column_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_value_indicator_column_id ON public.indicator_value USING btree (indicator_column_id);


--
-- Name: indicator_value_indicator_line_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_value_indicator_line_id ON public.indicator_value USING btree (indicator_line_id);


--
-- Name: indicator_value_period_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_value_period_id ON public.indicator_value USING btree (period_id);


--
-- Name: indicator_value_store_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX indicator_value_store_id ON public.indicator_value USING btree (store_id);


--
-- Name: ix_asset_log_asset_id_log_datetime; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_asset_log_asset_id_log_datetime ON public.asset_log USING btree (asset_id, log_datetime);


--
-- Name: ix_number_store_type_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_number_store_type_unique ON public.number USING btree (store_id, type);


--
-- Name: program_indicator_program_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX program_indicator_program_id ON public.program_indicator USING btree (program_id);


--
-- Name: activity_log activity_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: asset asset_asset_catalogue_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_catalogue_item_id_fkey FOREIGN KEY (asset_catalogue_item_id) REFERENCES public.asset_catalogue_item(id);


--
-- Name: asset asset_asset_catalogue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_catalogue_type_id_fkey FOREIGN KEY (asset_catalogue_type_id) REFERENCES public.asset_catalogue_type(id);


--
-- Name: asset asset_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.asset_category(id);


--
-- Name: asset asset_asset_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_class_id_fkey FOREIGN KEY (asset_class_id) REFERENCES public.asset_class(id);


--
-- Name: asset_catalogue_item asset_catalogue_item_asset_catalogue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_asset_catalogue_type_id_fkey FOREIGN KEY (asset_catalogue_type_id) REFERENCES public.asset_catalogue_type(id);


--
-- Name: asset_catalogue_item asset_catalogue_item_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.asset_category(id);


--
-- Name: asset_catalogue_item asset_catalogue_item_asset_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_asset_class_id_fkey FOREIGN KEY (asset_class_id) REFERENCES public.asset_class(id);


--
-- Name: asset_catalogue_type asset_catalogue_type_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_catalogue_type
    ADD CONSTRAINT asset_catalogue_type_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.asset_category(id);


--
-- Name: asset_category asset_category_asset_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_category
    ADD CONSTRAINT asset_category_asset_class_id_fkey FOREIGN KEY (asset_class_id) REFERENCES public.asset_class(id);


--
-- Name: asset asset_donor_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_donor_name_id_fkey FOREIGN KEY (donor_name_id) REFERENCES public.name_link(id);


--
-- Name: asset_internal_location asset_internal_location_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(id);


--
-- Name: asset_internal_location asset_internal_location_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: asset_log asset_log_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_log
    ADD CONSTRAINT asset_log_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(id);


--
-- Name: asset_log asset_log_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset_log
    ADD CONSTRAINT asset_log_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.asset_log_reason(id);


--
-- Name: asset asset_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: barcode barcode_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: barcode barcode_manufacturer_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_manufacturer_link_id_fkey FOREIGN KEY (manufacturer_link_id) REFERENCES public.name_link(id);


--
-- Name: bundled_item bundled_item_bundled_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundled_item
    ADD CONSTRAINT bundled_item_bundled_item_variant_id_fkey FOREIGN KEY (bundled_item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: bundled_item bundled_item_principal_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bundled_item
    ADD CONSTRAINT bundled_item_principal_item_variant_id_fkey FOREIGN KEY (principal_item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: changelog changelog_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: clinician_link clinician_link_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinician_link
    ADD CONSTRAINT clinician_link_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.clinician(id);


--
-- Name: clinician_store_join clinician_store_join_clinician_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES public.clinician_link(id);


--
-- Name: clinician_store_join clinician_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: contact_form contact_form_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_form
    ADD CONSTRAINT contact_form_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: contact_trace contact_trace_contact_patient_link_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_contact_patient_link_id FOREIGN KEY (contact_patient_link_id) REFERENCES public.name_link(id);


--
-- Name: contact_trace contact_trace_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document(id);


--
-- Name: contact_trace contact_trace_patient_link_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_patient_link_id FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: contact_trace contact_trace_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: contact_trace contact_trace_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: demographic_indicator demographic_indicator_demographic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demographic_indicator
    ADD CONSTRAINT demographic_indicator_demographic_id_fkey FOREIGN KEY (demographic_id) REFERENCES public.demographic(id);


--
-- Name: document document_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: document document_form_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_form_schema_id_fkey FOREIGN KEY (form_schema_id) REFERENCES public.form_schema(id);


--
-- Name: document document_owner_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_owner_name_link_id_fkey FOREIGN KEY (owner_name_link_id) REFERENCES public.name_link(id);


--
-- Name: document_registry document_registry_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: document_registry document_registry_form_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_form_schema_id_fkey FOREIGN KEY (form_schema_id) REFERENCES public.form_schema(id);


--
-- Name: encounter encounter_clinician_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES public.clinician_link(id);


--
-- Name: encounter encounter_enrolment_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_enrolment_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: encounter encounter_patient_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: indicator_column indicator_column_program_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_column
    ADD CONSTRAINT indicator_column_program_indicator_id_fkey FOREIGN KEY (program_indicator_id) REFERENCES public.program_indicator(id);


--
-- Name: indicator_line indicator_line_program_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_line
    ADD CONSTRAINT indicator_line_program_indicator_id_fkey FOREIGN KEY (program_indicator_id) REFERENCES public.program_indicator(id);


--
-- Name: indicator_value indicator_value_customer_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_customer_name_link_id_fkey FOREIGN KEY (customer_name_link_id) REFERENCES public.name_link(id);


--
-- Name: indicator_value indicator_value_indicator_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_indicator_column_id_fkey FOREIGN KEY (indicator_column_id) REFERENCES public.indicator_column(id);


--
-- Name: indicator_value indicator_value_indicator_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_indicator_line_id_fkey FOREIGN KEY (indicator_line_id) REFERENCES public.indicator_line(id);


--
-- Name: indicator_value indicator_value_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: indicator_value indicator_value_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: invoice invoice_clinician_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES public.clinician_link(id);


--
-- Name: invoice invoice_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(id);


--
-- Name: invoice invoice_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis(id);


--
-- Name: invoice_line invoice_line_inventory_adjustment_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_inventory_adjustment_reason_id_fkey FOREIGN KEY (inventory_adjustment_reason_id) REFERENCES public.inventory_adjustment_reason(id);


--
-- Name: invoice_line invoice_line_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice(id);


--
-- Name: invoice_line invoice_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: invoice_line invoice_line_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: invoice_line invoice_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: invoice_line invoice_line_return_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_return_reason_id_fkey FOREIGN KEY (return_reason_id) REFERENCES public.return_reason(id);


--
-- Name: invoice_line invoice_line_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: invoice invoice_name_insurance_join_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_insurance_join_id_fkey FOREIGN KEY (name_insurance_join_id) REFERENCES public.name_insurance_join(id);


--
-- Name: invoice invoice_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: invoice invoice_name_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_store_id_fkey FOREIGN KEY (name_store_id) REFERENCES public.store(id);


--
-- Name: invoice invoice_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: invoice invoice_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: item_category_join item_category_join_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_category_join
    ADD CONSTRAINT item_category_join_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id);


--
-- Name: item_category_join item_category_join_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_category_join
    ADD CONSTRAINT item_category_join_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: item_direction item_direction_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_direction
    ADD CONSTRAINT item_direction_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: item_link item_link_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_link
    ADD CONSTRAINT item_link_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: item item_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id);


--
-- Name: item_variant item_variant_cold_storage_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_cold_storage_type_id_fkey FOREIGN KEY (cold_storage_type_id) REFERENCES public.cold_storage_type(id);


--
-- Name: item_variant item_variant_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: item_variant item_variant_manufacturer_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_manufacturer_link_id_fkey FOREIGN KEY (manufacturer_link_id) REFERENCES public.name_link(id);


--
-- Name: location location_cold_storage_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_cold_storage_type_id_fkey FOREIGN KEY (cold_storage_type_id) REFERENCES public.cold_storage_type(id);


--
-- Name: location_movement location_movement_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: location_movement location_movement_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: location_movement location_movement_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: location location_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: master_list_line master_list_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: master_list_line master_list_line_master_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_master_list_id_fkey FOREIGN KEY (master_list_id) REFERENCES public.master_list(id);


--
-- Name: master_list_name_join master_list_name_join_master_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_master_list_id_fkey FOREIGN KEY (master_list_id) REFERENCES public.master_list(id);


--
-- Name: master_list_name_join master_list_name_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_insurance_join name_insurance_join_insurance_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_insurance_join
    ADD CONSTRAINT name_insurance_join_insurance_provider_id_fkey FOREIGN KEY (insurance_provider_id) REFERENCES public.insurance_provider(id);


--
-- Name: name_insurance_join name_insurance_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_insurance_join
    ADD CONSTRAINT name_insurance_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_link name_link_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_link
    ADD CONSTRAINT name_link_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


--
-- Name: name_property name_property_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_property
    ADD CONSTRAINT name_property_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.property(id);


--
-- Name: name_store_join name_store_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_store_join name_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: name_tag_join name_tag_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_tag_join
    ADD CONSTRAINT name_tag_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_tag_join name_tag_join_name_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.name_tag_join
    ADD CONSTRAINT name_tag_join_name_tag_id_fkey FOREIGN KEY (name_tag_id) REFERENCES public.name_tag(id);


--
-- Name: number number_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number
    ADD CONSTRAINT number_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: packaging_variant packaging_variant_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.packaging_variant
    ADD CONSTRAINT packaging_variant_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: period period_period_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.period
    ADD CONSTRAINT period_period_schedule_id_fkey FOREIGN KEY (period_schedule_id) REFERENCES public.period_schedule(id);


--
-- Name: plugin_data plugin_data_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plugin_data
    ADD CONSTRAINT plugin_data_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: preference preference_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.preference
    ADD CONSTRAINT preference_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: program program_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: program_enrolment program_enrolment_patient_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: program_enrolment program_enrolment_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: program_enrolment program_enrolment_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: program_event program_event_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: program_event program_event_patient_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: program_indicator program_indicator_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_indicator
    ADD CONSTRAINT program_indicator_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: program program_master_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_master_list_id_fkey FOREIGN KEY (master_list_id) REFERENCES public.master_list(id);


--
-- Name: program_requisition_order_type program_requisition_order_typ_program_requisition_settings_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_requisition_order_type
    ADD CONSTRAINT program_requisition_order_typ_program_requisition_settings_fkey FOREIGN KEY (program_requisition_settings_id) REFERENCES public.program_requisition_settings(id);


--
-- Name: program_requisition_settings program_requisition_settings_name_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_name_tag_id_fkey FOREIGN KEY (name_tag_id) REFERENCES public.name_tag(id);


--
-- Name: program_requisition_settings program_requisition_settings_period_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_period_schedule_id_fkey FOREIGN KEY (period_schedule_id) REFERENCES public.period_schedule(id);


--
-- Name: program_requisition_settings program_requisition_settings_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: report report_argument_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_argument_schema_id_fkey FOREIGN KEY (argument_schema_id) REFERENCES public.form_schema(id);


--
-- Name: requisition_line requisition_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: requisition_line requisition_line_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.reason_option(id);


--
-- Name: requisition_line requisition_line_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.requisition(id);


--
-- Name: requisition requisition_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: requisition requisition_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: requisition requisition_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: rnr_form_line rnr_form_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form_line
    ADD CONSTRAINT rnr_form_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: rnr_form_line rnr_form_line_rnr_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form_line
    ADD CONSTRAINT rnr_form_line_rnr_form_id_fkey FOREIGN KEY (rnr_form_id) REFERENCES public.rnr_form(id);


--
-- Name: rnr_form rnr_form_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: rnr_form rnr_form_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: rnr_form rnr_form_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: rnr_form rnr_form_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: sensor sensor_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: sensor sensor_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: stock_line stock_line_barcode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_barcode_id_fkey FOREIGN KEY (barcode_id) REFERENCES public.barcode(id);


--
-- Name: stock_line stock_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: stock_line stock_line_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: stock_line stock_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: stock_line stock_line_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: stock_line stock_line_supplier_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_supplier_link_id_fkey FOREIGN KEY (supplier_link_id) REFERENCES public.name_link(id);


--
-- Name: stocktake stocktake_inventory_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_inventory_adjustment_id_fkey FOREIGN KEY (inventory_addition_id) REFERENCES public.invoice(id);


--
-- Name: stocktake stocktake_inventory_reduction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_inventory_reduction_id_fkey FOREIGN KEY (inventory_reduction_id) REFERENCES public.invoice(id);


--
-- Name: stocktake_line stocktake_line_inventory_adjustment_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_inventory_adjustment_reason_id_fkey FOREIGN KEY (inventory_adjustment_reason_id) REFERENCES public.inventory_adjustment_reason(id);


--
-- Name: stocktake_line stocktake_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: stocktake_line stocktake_line_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: stocktake_line stocktake_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: stocktake_line stocktake_line_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: stocktake_line stocktake_line_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktake(id);


--
-- Name: stocktake stocktake_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: stocktake stocktake_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: store store_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: temperature_breach_config temperature_breach_config_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_breach_config
    ADD CONSTRAINT temperature_breach_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: temperature_breach temperature_breach_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: temperature_breach temperature_breach_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id);


--
-- Name: temperature_breach temperature_breach_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: temperature_log temperature_log_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: temperature_log temperature_log_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id);


--
-- Name: temperature_log temperature_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: temperature_log temperature_log_temperature_breach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_temperature_breach_id_fkey FOREIGN KEY (temperature_breach_id) REFERENCES public.temperature_breach(id);


--
-- Name: user_permission user_permission_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permission
    ADD CONSTRAINT user_permission_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: user_permission user_permission_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_permission
    ADD CONSTRAINT user_permission_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: user_store_join user_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_store_join
    ADD CONSTRAINT user_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: user_store_join user_store_join_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_store_join
    ADD CONSTRAINT user_store_join_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id);


--
-- Name: vaccination vaccination_facility_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccination
    ADD CONSTRAINT vaccination_facility_name_link_id_fkey FOREIGN KEY (facility_name_link_id) REFERENCES public.name(id);


--
-- Name: vaccination vaccination_vaccine_course_dose_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccination
    ADD CONSTRAINT vaccination_vaccine_course_dose_id_fkey FOREIGN KEY (vaccine_course_dose_id) REFERENCES public.vaccine_course_dose(id);


--
-- Name: vaccine_course vaccine_course_demographic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course
    ADD CONSTRAINT vaccine_course_demographic_id_fkey FOREIGN KEY (demographic_id) REFERENCES public.demographic(id);


--
-- Name: vaccine_course_item vaccine_course_item_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course_item
    ADD CONSTRAINT vaccine_course_item_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: vaccine_course_item vaccine_course_item_vaccine_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course_item
    ADD CONSTRAINT vaccine_course_item_vaccine_course_id_fkey FOREIGN KEY (vaccine_course_id) REFERENCES public.vaccine_course(id);


--
-- Name: vaccine_course vaccine_course_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course
    ADD CONSTRAINT vaccine_course_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: vaccine_course_dose vaccine_course_schedule_vaccine_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vaccine_course_dose
    ADD CONSTRAINT vaccine_course_schedule_vaccine_course_id_fkey FOREIGN KEY (vaccine_course_id) REFERENCES public.vaccine_course(id);


--
-- PostgreSQL database dump complete
--

