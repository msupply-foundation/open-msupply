--
-- PostgreSQL database dump
--


-- Dumped from database version 18.1 (Postgres.app)
-- Dumped by pg_dump version 18.1 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: nocase; Type: COLLATION; Schema: public; Owner: -
--

CREATE COLLATION public.nocase (provider = icu, deterministic = false, locale = pg_catalog."default");


--
-- Name: activity_log_type; Type: TYPE; Schema: public; Owner: -
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
    'DEMOGRAPHIC_PROJECTION_UPDATED',
    'ITEM_VARIANT_CREATED',
    'ITEM_VARIANT_DELETED',
    'ITEM_VARIANT_UPDATED_NAME',
    'ITEM_VARIANT_UPDATE_LOCATION_TYPE',
    'ITEM_VARIANT_UPDATE_MANUFACTURER',
    'ITEM_VARIANT_UPDATE_DOSE_PER_UNIT',
    'ITEM_VARIANT_UPDATE_VVM_TYPE',
    'VVM_STATUS_LOG_UPDATED',
    'INVOICE_STATUS_RECEIVED',
    'RNR_FORM_DELETED',
    'VOLUME_PER_PACK_CHANGED',
    'GOODS_RECEIVED_CREATED',
    'GOODS_RECEIVED_DELETED',
    'GOODS_RECEIVED_STATUS_FINALISED',
    'PURCHASE_ORDER_CREATED',
    'PURCHASE_ORDER_REQUEST_APPROVAL',
    'PURCHASE_ORDER_UNAUTHORISED',
    'PURCHASE_ORDER_CONFIRMED',
    'PURCHASE_ORDER_FINALISED',
    'PURCHASE_ORDER_DELETED',
    'PURCHASE_ORDER_LINE_CREATED',
    'PURCHASE_ORDER_LINE_UPDATED',
    'PURCHASE_ORDER_LINE_DELETED',
    'INVOICE_STATUS_CANCELLED',
    'PATIENT_UPDATED',
    'PATIENT_CREATED',
    'PURCHASE_ORDER_SENT',
    'PURCHASE_ORDER_STATUS_CHANGED_FROM_SENT_TO_CONFIRMED',
    'PURCHASE_ORDER_LINE_STATUS_CHANGED_FROM_SENT_TO_NEW',
    'PURCHASE_ORDER_LINE_STATUS_CLOSED'
);


--
-- Name: approval_status_type; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: asset_log_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_log_status AS ENUM (
    'NOT_IN_USE',
    'FUNCTIONING',
    'FUNCTIONING_BUT_NEEDS_ATTENTION',
    'NOT_FUNCTIONING',
    'DECOMMISSIONED',
    'UNSERVICEABLE'
);


--
-- Name: changelog_table_name; Type: TYPE; Schema: public; Owner: -
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
    'preference',
    'sync_message',
    'vvm_status_log',
    'campaign',
    'purchase_order',
    'purchase_order_line',
    'goods_received',
    'goods_received_line',
    'master_list',
    'encounter'
);


--
-- Name: contact_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.contact_type_enum AS ENUM (
    'FEEDBACK',
    'SUPPORT'
);


--
-- Name: context_type; Type: TYPE; Schema: public; Owner: -
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
    'INTERNAL_ORDER',
    'PURCHASE_ORDER',
    'GOODS_RECEIVED'
);


--
-- Name: document_registry_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_registry_category AS ENUM (
    'PATIENT',
    'PROGRAM_ENROLMENT',
    'ENCOUNTER',
    'CUSTOM',
    'CONTACT_TRACE'
);


--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'ACTIVE',
    'DELETED'
);


--
-- Name: email_queue_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.email_queue_status_enum AS ENUM (
    'QUEUED',
    'SENT',
    'ERRORED',
    'FAILED'
);


--
-- Name: encounter_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.encounter_status AS ENUM (
    'PENDING',
    'VISITED',
    'CANCELLED',
    'DELETED'
);


--
-- Name: gender_type; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: goods_received_line_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goods_received_line_status AS ENUM (
    'UNAUTHORISED',
    'AUTHORISED'
);


--
-- Name: goods_received_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goods_received_status AS ENUM (
    'NEW',
    'FINALISED'
);


--
-- Name: indicator_value_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.indicator_value_type AS ENUM (
    'STRING',
    'NUMBER'
);


--
-- Name: insurance_policy_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.insurance_policy_type AS ENUM (
    'PERSONAL',
    'BUSINESS'
);


--
-- Name: inventory_adjustment_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.inventory_adjustment_type AS ENUM (
    'POSITIVE',
    'NEGATIVE'
);


--
-- Name: invoice_line_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_line_type AS ENUM (
    'STOCK_IN',
    'STOCK_OUT',
    'UNALLOCATED_STOCK',
    'SERVICE'
);


--
-- Name: invoice_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_status AS ENUM (
    'NEW',
    'ALLOCATED',
    'PICKED',
    'SHIPPED',
    'DELIVERED',
    'VERIFIED',
    'CANCELLED',
    'RECEIVED'
);


--
-- Name: invoice_type; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: item_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.item_type AS ENUM (
    'STOCK',
    'SERVICE',
    'NON_STOCK'
);


--
-- Name: key_type; Type: TYPE; Schema: public; Owner: -
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
    'LOAD_PLUGIN_PROCESSOR_CURSOR',
    'ASSIGN_REQUISITION_NUMBER_PROCESSOR_CURSOR',
    'ADD_CENTRAL_PATIENT_VISIBILITY_PROCESSOR_CURSOR',
    'DYNAMIC_CURSOR',
    'LAST_LEDGER_FIX_RUN',
    'REQUISITION_AUTO_FINALISE_PROCESSOR_CURSOR'
);


--
-- Name: language_type; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: name_type; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: number_type; Type: TYPE; Schema: public; Owner: -
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
    'SUPPLIER_RETURN',
    'PURCHASE_ORDER',
    'GOODS_RECEIVED',
    'GOODS_RECEIVED_LINE'
);


--
-- Name: permission_type; Type: TYPE; Schema: public; Owner: -
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
    'REQUISITION_CREATE_OUTBOUND_SHIPMENT',
    'ASSET_MUTATE_VIA_DATA_MATRIX',
    'VIEW_AND_EDIT_VVM_STATUS',
    'MUTATE_CLINICIAN',
    'CANCEL_FINALISED_INVOICES',
    'PURCHASE_ORDER_QUERY',
    'PURCHASE_ORDER_MUTATE',
    'PURCHASE_ORDER_AUTHORISE',
    'GOODS_RECEIVED_QUERY',
    'GOODS_RECEIVED_MUTATE',
    'GOODS_RECEIVED_AUTHORISE',
    'INBOUND_SHIPMENT_VERIFY',
    'ASSET_STATUS_MUTATE'
);


--
-- Name: plugin_variant_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.plugin_variant_type AS ENUM (
    'BOA_JS'
);


--
-- Name: property_value_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.property_value_type AS ENUM (
    'STRING',
    'BOOLEAN',
    'INTEGER',
    'FLOAT'
);


--
-- Name: purchase_order_line_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchase_order_line_status AS ENUM (
    'NEW',
    'SENT',
    'CLOSED'
);


--
-- Name: purchase_order_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.purchase_order_status AS ENUM (
    'NEW',
    'CONFIRMED',
    'REQUEST_APPROVAL',
    'FINALISED',
    'SENT'
);


--
-- Name: reason_option_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.reason_option_type AS ENUM (
    'POSITIVE_INVENTORY_ADJUSTMENT',
    'NEGATIVE_INVENTORY_ADJUSTMENT',
    'OPEN_VIAL_WASTAGE',
    'CLOSED_VIAL_WASTAGE',
    'RETURN_REASON',
    'REQUISITION_LINE_VARIANCE'
);


--
-- Name: related_record_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.related_record_type AS ENUM (
    'STOCK_LINE'
);


--
-- Name: report_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.report_type AS ENUM (
    'OM_SUPPLY'
);


--
-- Name: requisition_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requisition_status AS ENUM (
    'DRAFT',
    'NEW',
    'SENT',
    'FINALISED'
);


--
-- Name: requisition_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.requisition_type AS ENUM (
    'REQUEST',
    'RESPONSE'
);


--
-- Name: rn_r_form_low_stock; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rn_r_form_low_stock AS ENUM (
    'OK',
    'BELOW_HALF',
    'BELOW_QUARTER'
);


--
-- Name: rn_r_form_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.rn_r_form_status AS ENUM (
    'DRAFT',
    'FINALISED'
);


--
-- Name: row_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.row_action_type AS ENUM (
    'UPSERT',
    'DELETE'
);


--
-- Name: sensor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sensor_type AS ENUM (
    'BLUE_MAESTRO',
    'LAIRD',
    'BERLINGER'
);


--
-- Name: stocktake_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.stocktake_status AS ENUM (
    'NEW',
    'FINALISED'
);


--
-- Name: store_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.store_mode AS ENUM (
    'STORE',
    'DISPENSARY'
);


--
-- Name: store_preference_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.store_preference_type AS ENUM (
    'STORE_PREFERENCES'
);


--
-- Name: sync_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_action AS ENUM (
    'UPSERT',
    'DELETE',
    'MERGE'
);


--
-- Name: sync_api_error_code; Type: TYPE; Schema: public; Owner: -
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


--
-- Name: sync_file_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_file_direction AS ENUM (
    'UPLOAD',
    'DOWNLOAD'
);


--
-- Name: sync_file_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_file_status AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'ERROR',
    'DONE',
    'PERMANENT_FAILURE'
);


--
-- Name: sync_message_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_message_status AS ENUM (
    'NEW',
    'PROCESSED',
    'ERROR'
);


--
-- Name: system_log_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.system_log_type AS ENUM (
    'PROCESSOR_ERROR',
    'LEDGER_FIX_ERROR',
    'LEDGER_FIX'
);


--
-- Name: temperature_breach_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.temperature_breach_type AS ENUM (
    'COLD_CONSECUTIVE',
    'COLD_CUMULATIVE',
    'HOT_CONSECUTIVE',
    'HOT_CUMULATIVE',
    'EXCURSION'
);


--
-- Name: ven_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ven_category AS ENUM (
    'V',
    'E',
    'N',
    'NOT_ASSIGNED'
);


--
-- Name: diesel_manage_updated_at(regclass); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.diesel_manage_updated_at(_tbl regclass) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %s
                    FOR EACH ROW EXECUTE PROCEDURE diesel_set_updated_at()', _tbl);
END;
$$;


--
-- Name: diesel_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
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


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __diesel_schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.__diesel_schema_migrations (
    version character varying(50) NOT NULL,
    run_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: abbreviation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.abbreviation (
    id text NOT NULL,
    text text NOT NULL,
    expansion text NOT NULL
);


--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: asset; Type: TABLE; Schema: public; Owner: -
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
    needs_replacement boolean,
    locked_fields_json text
);


--
-- Name: asset_catalogue_item; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: asset_catalogue_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_catalogue_type (
    id text NOT NULL,
    name text NOT NULL,
    asset_category_id text NOT NULL
);


--
-- Name: asset_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_category (
    id text NOT NULL,
    name text NOT NULL,
    asset_class_id text NOT NULL
);


--
-- Name: asset_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_class (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: asset_internal_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_internal_location (
    id text NOT NULL,
    asset_id text NOT NULL,
    location_id text NOT NULL
);


--
-- Name: asset_log; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: asset_log_reason; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_log_reason (
    id text NOT NULL,
    reason text NOT NULL,
    deleted_datetime timestamp without time zone,
    asset_log_status public.asset_log_status DEFAULT 'NOT_IN_USE'::public.asset_log_status CONSTRAINT asset_log_reason_asset_log_status_not_null1 NOT NULL
);


--
-- Name: asset_property; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: backend_plugin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.backend_plugin (
    id text NOT NULL,
    code text NOT NULL,
    bundle_base64 text NOT NULL,
    types text NOT NULL,
    variant_type public.plugin_variant_type NOT NULL
);


--
-- Name: barcode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.barcode (
    id text NOT NULL,
    gtin text CONSTRAINT barcode_value_not_null NOT NULL,
    item_id text NOT NULL,
    pack_size double precision,
    parent_id text,
    is_sync_update boolean DEFAULT false NOT NULL,
    manufacturer_link_id text
);


--
-- Name: bundled_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bundled_item (
    id text NOT NULL,
    principal_item_variant_id text NOT NULL,
    bundled_item_variant_id text NOT NULL,
    ratio double precision NOT NULL,
    deleted_datetime timestamp without time zone
);


--
-- Name: campaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign (
    id text NOT NULL,
    name text NOT NULL,
    start_date date,
    end_date date,
    deleted_datetime timestamp without time zone
);


--
-- Name: category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    parent_id text,
    deleted_datetime timestamp without time zone
);


--
-- Name: changelog; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: changelog_cursor_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.changelog_cursor_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: changelog_cursor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.changelog_cursor_seq OWNED BY public.changelog.cursor;


--
-- Name: clinician; Type: TABLE; Schema: public; Owner: -
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
    is_sync_update boolean DEFAULT false NOT NULL,
    store_id text
);


--
-- Name: clinician_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinician_link (
    id text NOT NULL,
    clinician_id text NOT NULL
);


--
-- Name: clinician_store_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinician_store_join (
    id text NOT NULL,
    store_id text NOT NULL,
    is_sync_update boolean DEFAULT false NOT NULL,
    clinician_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


--
-- Name: contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact (
    id text NOT NULL,
    name_link_id text NOT NULL,
    first_name text NOT NULL,
    "position" text,
    comment text,
    last_name text NOT NULL,
    phone text,
    email text,
    category_1 text,
    category_2 text,
    category_3 text,
    address_1 text,
    address_2 text,
    country text
);


--
-- Name: contact_form; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: contact_trace; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: context; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.context (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currency (
    id text NOT NULL,
    rate double precision NOT NULL,
    code text NOT NULL,
    is_home_currency boolean DEFAULT false NOT NULL,
    date_updated date,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: demographic; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demographic (
    id text NOT NULL,
    name text NOT NULL,
    population_percentage double precision DEFAULT 0 NOT NULL
);


--
-- Name: demographic_indicator; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: demographic_projection; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: diagnosis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.diagnosis (
    id text NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    notes text,
    valid_till date
);


--
-- Name: document; Type: TABLE; Schema: public; Owner: -
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
    context_id text CONSTRAINT document_context_not_null NOT NULL,
    owner_name_link_id text
);


--
-- Name: document_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_registry (
    id text NOT NULL,
    category public.document_registry_category CONSTRAINT document_registry_type_not_null NOT NULL,
    document_type text NOT NULL,
    context_id text CONSTRAINT document_registry_document_context_not_null NOT NULL,
    name text,
    form_schema_id text,
    config text
);


--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: encounter; Type: TABLE; Schema: public; Owner: -
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
    program_id text CONSTRAINT encounter_context_not_null NOT NULL,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    clinician_link_id text
);


--
-- Name: form_schema; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.form_schema (
    id text NOT NULL,
    type text NOT NULL,
    json_schema text NOT NULL,
    ui_schema text NOT NULL
);


--
-- Name: frontend_plugin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.frontend_plugin (
    id text NOT NULL,
    code text NOT NULL,
    entry_point text NOT NULL,
    types text NOT NULL,
    files text NOT NULL
);


--
-- Name: goods_received; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_received (
    id text NOT NULL,
    store_id text NOT NULL,
    purchase_order_id text,
    inbound_shipment_id text,
    goods_received_number bigint NOT NULL,
    status public.goods_received_status DEFAULT 'NEW'::public.goods_received_status NOT NULL,
    received_date date,
    comment text,
    supplier_reference text,
    donor_link_id text,
    created_datetime timestamp without time zone NOT NULL,
    finalised_datetime timestamp without time zone,
    created_by text
);


--
-- Name: goods_received_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_received_line (
    id text NOT NULL,
    goods_received_id text NOT NULL,
    purchase_order_line_id text NOT NULL,
    received_pack_size double precision NOT NULL,
    number_of_packs_received double precision DEFAULT 0.0 NOT NULL,
    batch text,
    weight_per_pack double precision,
    expiry_date date,
    line_number bigint NOT NULL,
    item_link_id text NOT NULL,
    item_name text NOT NULL,
    location_id text,
    volume_per_pack double precision,
    manufacturer_link_id text,
    status public.goods_received_line_status DEFAULT 'UNAUTHORISED'::public.goods_received_line_status NOT NULL,
    comment text
);


--
-- Name: indicator_column; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: indicator_line; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: indicator_value; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: insurance_provider; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insurance_provider (
    id text NOT NULL,
    provider_name text NOT NULL,
    is_active boolean NOT NULL,
    prescription_validity_days integer,
    comment text
);


--
-- Name: invoice; Type: TABLE; Schema: public; Owner: -
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
    cancelled_datetime timestamp without time zone,
    expected_delivery_date date,
    default_donor_link_id text,
    received_datetime timestamp without time zone,
    goods_received_id text
);


--
-- Name: invoice_line; Type: TABLE; Schema: public; Owner: -
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
    foreign_currency_price_before_tax double precision,
    item_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    item_variant_id text,
    prescribed_quantity double precision,
    linked_invoice_id text,
    reason_option_id text,
    vvm_status_id text,
    donor_link_id text,
    campaign_id text,
    shipped_number_of_packs double precision,
    shipped_pack_size double precision,
    volume_per_pack double precision DEFAULT 0.0 NOT NULL,
    program_id text
);


--
-- Name: item; Type: TABLE; Schema: public; Owner: -
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
    vaccine_doses integer DEFAULT 0 NOT NULL,
    restricted_location_type_id text
);


--
-- Name: item_category_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_category_join (
    id text NOT NULL,
    item_id text NOT NULL,
    category_id text NOT NULL,
    deleted_datetime timestamp without time zone
);


--
-- Name: item_direction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_direction (
    id text NOT NULL,
    item_link_id text NOT NULL,
    directions text NOT NULL,
    priority bigint NOT NULL
);


--
-- Name: item_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_link (
    id text NOT NULL,
    item_id text NOT NULL
);


--
-- Name: item_store_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_store_join (
    id text NOT NULL,
    item_link_id text NOT NULL,
    store_id text NOT NULL,
    default_sell_price_per_pack double precision NOT NULL,
    ignore_for_orders boolean DEFAULT false NOT NULL,
    margin double precision DEFAULT 0.0 NOT NULL
);


--
-- Name: item_variant; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_variant (
    id text NOT NULL,
    name text NOT NULL,
    item_link_id text NOT NULL,
    location_type_id text,
    manufacturer_link_id text,
    deleted_datetime timestamp without time zone,
    vvm_type text,
    created_datetime timestamp without time zone DEFAULT '1970-01-01 00:00:00'::timestamp without time zone NOT NULL,
    created_by text
);


--
-- Name: item_warning_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item_warning_join (
    id text NOT NULL,
    item_link_id text NOT NULL,
    warning_id text NOT NULL,
    priority boolean NOT NULL
);


--
-- Name: key_value_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.key_value_store (
    id public.key_type NOT NULL,
    value_string text,
    value_int integer,
    value_bigint bigint,
    value_float double precision,
    value_bool boolean
);


--
-- Name: location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    on_hold boolean NOT NULL,
    store_id text NOT NULL,
    location_type_id text,
    volume double precision DEFAULT 0.0 NOT NULL
);


--
-- Name: location_movement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_movement (
    id text NOT NULL,
    store_id text,
    location_id text,
    stock_line_id text,
    enter_datetime timestamp without time zone,
    exit_datetime timestamp without time zone
);


--
-- Name: location_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location_type (
    id text CONSTRAINT cold_storage_type_id_not_null NOT NULL,
    name text CONSTRAINT cold_storage_type_name_not_null NOT NULL,
    min_temperature double precision,
    max_temperature double precision
);


--
-- Name: master_list; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: master_list_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_list_line (
    id text NOT NULL,
    master_list_id text NOT NULL,
    item_link_id text DEFAULT 'temp for migration'::text NOT NULL,
    price_per_unit double precision
);


--
-- Name: master_list_name_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_list_name_join (
    id text NOT NULL,
    master_list_id text NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


--
-- Name: migration_fragment_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migration_fragment_log (
    version_and_identifier text NOT NULL,
    datetime timestamp without time zone
);


--
-- Name: name; Type: TABLE; Schema: public; Owner: -
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
    next_of_kin_name text,
    hsh_code text,
    hsh_name text,
    margin double precision,
    freight_factor double precision,
    currency_id text
);


--
-- Name: name_insurance_join; Type: TABLE; Schema: public; Owner: -
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
    entered_by_id text,
    name_of_insured text
);


--
-- Name: name_link; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.name_link (
    id text NOT NULL,
    name_id text NOT NULL
);


--
-- Name: name_property; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.name_property (
    id text NOT NULL,
    property_id text NOT NULL,
    remote_editable boolean NOT NULL
);


--
-- Name: name_store_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.name_store_join (
    id text NOT NULL,
    store_id text NOT NULL,
    name_is_customer boolean NOT NULL,
    name_is_supplier boolean NOT NULL,
    is_sync_update boolean DEFAULT false NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


--
-- Name: name_tag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.name_tag (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: name_tag_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.name_tag_join (
    id text NOT NULL,
    name_tag_id text NOT NULL,
    name_link_id text DEFAULT 'temp_for_migration'::text NOT NULL
);


--
-- Name: number; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.number (
    id text NOT NULL,
    value bigint NOT NULL,
    store_id text NOT NULL,
    type text NOT NULL
);


--
-- Name: packaging_variant; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: period; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.period (
    id text NOT NULL,
    period_schedule_id text NOT NULL,
    name text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL
);


--
-- Name: period_schedule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.period_schedule (
    id text NOT NULL,
    name text NOT NULL
);


--
-- Name: plugin_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plugin_data (
    id text NOT NULL,
    store_id text,
    plugin_code text NOT NULL,
    related_record_id text,
    data_identifier text NOT NULL,
    data text NOT NULL
);


--
-- Name: preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preference (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    store_id text
);


--
-- Name: printer; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.printer (
    id text NOT NULL,
    description text NOT NULL,
    address text NOT NULL,
    port integer NOT NULL,
    label_width integer NOT NULL,
    label_height integer NOT NULL
);


--
-- Name: program; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: program_enrolment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_enrolment (
    id text NOT NULL,
    document_name text NOT NULL,
    enrolment_datetime timestamp without time zone NOT NULL,
    program_enrolment_id text,
    program_id text CONSTRAINT program_enrolment_context_not_null NOT NULL,
    document_type text NOT NULL,
    status text,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    store_id text
);


--
-- Name: program_event; Type: TABLE; Schema: public; Owner: -
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
    context_id text CONSTRAINT program_event_context_not_null NOT NULL,
    patient_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    CONSTRAINT program_event_check CHECK ((datetime <= active_start_datetime)),
    CONSTRAINT program_event_check1 CHECK ((datetime <= active_end_datetime))
);


--
-- Name: program_indicator; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_indicator (
    id text NOT NULL,
    program_id text NOT NULL,
    code text,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: program_requisition_order_type; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_requisition_order_type (
    id text NOT NULL,
    program_requisition_settings_id text CONSTRAINT program_requisition_order_t_program_requisition_settin_not_null NOT NULL,
    name text NOT NULL,
    threshold_mos double precision NOT NULL,
    max_mos double precision NOT NULL,
    max_order_per_period integer NOT NULL,
    is_emergency boolean DEFAULT false NOT NULL,
    max_items_in_emergency_order integer DEFAULT 0 CONSTRAINT program_requisition_order_t_max_items_in_emergency_ord_not_null NOT NULL
);


--
-- Name: program_requisition_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_requisition_settings (
    id text NOT NULL,
    name_tag_id text NOT NULL,
    program_id text NOT NULL,
    period_schedule_id text NOT NULL
);


--
-- Name: property; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.property (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    value_type public.property_value_type NOT NULL,
    allowed_values text
);


--
-- Name: purchase_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order (
    id text NOT NULL,
    store_id text NOT NULL,
    created_by text,
    supplier_name_link_id text NOT NULL,
    purchase_order_number bigint NOT NULL,
    status public.purchase_order_status NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    confirmed_datetime timestamp without time zone,
    target_months double precision,
    comment text,
    donor_link_id text,
    reference text,
    currency_id text,
    foreign_exchange_rate double precision DEFAULT 1.0 NOT NULL,
    shipping_method text,
    sent_datetime timestamp without time zone,
    contract_signed_date date,
    advance_paid_date date,
    received_at_port_date date,
    requested_delivery_date date,
    supplier_agent text,
    authorising_officer_1 text,
    authorising_officer_2 text,
    additional_instructions text,
    heading_message text,
    agent_commission double precision,
    document_charge double precision,
    communications_charge double precision,
    insurance_charge double precision,
    freight_charge double precision,
    freight_conditions text,
    supplier_discount_percentage double precision,
    request_approval_datetime timestamp without time zone,
    finalised_datetime timestamp without time zone
);


--
-- Name: purchase_order_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_line (
    id text NOT NULL,
    purchase_order_id text NOT NULL,
    store_id text NOT NULL,
    line_number bigint NOT NULL,
    item_link_id text NOT NULL,
    item_name text NOT NULL,
    requested_pack_size double precision DEFAULT 1.0 NOT NULL,
    requested_number_of_units double precision DEFAULT 0.0 NOT NULL,
    adjusted_number_of_units double precision,
    received_number_of_units double precision,
    requested_delivery_date date,
    expected_delivery_date date,
    stock_on_hand_in_units double precision DEFAULT 0.0 NOT NULL,
    supplier_item_code text,
    price_per_pack_before_discount double precision DEFAULT 0.0 CONSTRAINT purchase_order_line_price_per_unit_before_discount_not_null NOT NULL,
    price_per_pack_after_discount double precision DEFAULT 0.0 CONSTRAINT purchase_order_line_price_per_unit_after_discount_not_null NOT NULL,
    comment text,
    manufacturer_link_id text,
    note text,
    unit text,
    status public.purchase_order_line_status DEFAULT 'NEW'::public.purchase_order_line_status NOT NULL
);


--
-- Name: reason_option; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reason_option (
    id text NOT NULL,
    type public.reason_option_type DEFAULT 'POSITIVE_INVENTORY_ADJUSTMENT'::public.reason_option_type NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    reason text NOT NULL
);


--
-- Name: report; Type: TABLE; Schema: public; Owner: -
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
    is_active boolean DEFAULT true NOT NULL,
    excel_template_buffer bytea
);


--
-- Name: requisition; Type: TABLE; Schema: public; Owner: -
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
    is_emergency boolean DEFAULT false NOT NULL,
    created_from_requisition_id text,
    original_customer_id text
);


--
-- Name: requisition_line; Type: TABLE; Schema: public; Owner: -
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
    option_id text,
    price_per_unit double precision
);


--
-- Name: rnr_form; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: rnr_form_line; Type: TABLE; Schema: public; Owner: -
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
    entered_losses double precision,
    minimum_quantity double precision DEFAULT 0.0 NOT NULL
);


--
-- Name: sensor; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: shipping_method; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_method (
    id text NOT NULL,
    method text NOT NULL,
    deleted_datetime timestamp without time zone
);


--
-- Name: stock_line; Type: TABLE; Schema: public; Owner: -
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
    item_variant_id text,
    vvm_status_id text,
    campaign_id text,
    donor_link_id text,
    total_volume double precision DEFAULT 0.0 NOT NULL,
    volume_per_pack double precision DEFAULT 0.0 NOT NULL,
    program_id text
);


--
-- Name: stocktake; Type: TABLE; Schema: public; Owner: -
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
    program_id text,
    counted_by text,
    verified_by text,
    is_initial_stocktake boolean DEFAULT false NOT NULL
);


--
-- Name: stocktake_line; Type: TABLE; Schema: public; Owner: -
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
    item_link_id text DEFAULT 'temp_for_migration'::text NOT NULL,
    item_name text DEFAULT ''::text NOT NULL,
    item_variant_id text,
    donor_link_id text,
    reason_option_id text,
    volume_per_pack double precision DEFAULT 0.0 NOT NULL,
    campaign_id text,
    program_id text,
    vvm_status_id text
);


--
-- Name: store; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: store_preference; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_preference (
    id text NOT NULL,
    type public.store_preference_type DEFAULT 'STORE_PREFERENCES'::public.store_preference_type,
    pack_to_one boolean DEFAULT false NOT NULL,
    response_requisition_requires_authorisation boolean DEFAULT false CONSTRAINT store_preference_response_requisition_requires_authori_not_null NOT NULL,
    request_requisition_requires_authorisation boolean DEFAULT false CONSTRAINT store_preference_request_requisition_requires_authoris_not_null NOT NULL,
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
    keep_requisition_lines_with_zero_requested_quantity_on_finalise boolean DEFAULT false CONSTRAINT store_preference_keep_requisition_lines_with_zero_requ_not_null NOT NULL,
    use_consumption_and_stock_from_customers_for_internal_orders boolean DEFAULT false CONSTRAINT store_preference_use_consumption_and_stock_from_custom_not_null NOT NULL,
    manually_link_internal_order_to_inbound_shipment boolean DEFAULT false CONSTRAINT store_preference_manually_link_internal_order_to_inbou_not_null NOT NULL,
    edit_prescribed_quantity_on_prescription boolean DEFAULT false CONSTRAINT store_preference_edit_prescribed_quantity_on_prescript_not_null NOT NULL
);


--
-- Name: sync_buffer; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sync_file_reference; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sync_log; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: sync_message; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sync_message (
    id text NOT NULL,
    to_store_id text,
    from_store_id text,
    body text NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    status public.sync_message_status NOT NULL,
    type text,
    error_message text
);


--
-- Name: system_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_log (
    id text NOT NULL,
    type public.system_log_type NOT NULL,
    sync_site_id integer,
    datetime timestamp without time zone NOT NULL,
    message text,
    is_error boolean DEFAULT false NOT NULL
);


--
-- Name: temperature_breach; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: temperature_breach_config; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: temperature_log; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    index integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: user_account; Type: TABLE; Schema: public; Owner: -
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


--
-- Name: user_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permission (
    id text NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    permission public.permission_type NOT NULL,
    context_id text
);


--
-- Name: user_store_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_store_join (
    id text NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    is_default boolean NOT NULL
);


--
-- Name: vaccination; Type: TABLE; Schema: public; Owner: -
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
    vaccination_date date NOT NULL,
    given boolean NOT NULL,
    not_given_reason text,
    comment text,
    facility_name_link_id text,
    facility_free_text text,
    patient_link_id text DEFAULT ''::text NOT NULL,
    given_store_id text,
    item_link_id text
);


--
-- Name: vaccine_course; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vaccine_course (
    id text NOT NULL,
    name text NOT NULL,
    program_id text NOT NULL,
    coverage_rate double precision DEFAULT 100 NOT NULL,
    use_in_gaps_calculations boolean DEFAULT true CONSTRAINT vaccine_course_is_active_not_null NOT NULL,
    wastage_rate double precision DEFAULT 0 NOT NULL,
    deleted_datetime timestamp without time zone,
    demographic_id text,
    can_skip_dose boolean DEFAULT false
);


--
-- Name: vaccine_course_dose; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vaccine_course_dose (
    id text CONSTRAINT vaccine_course_schedule_id_not_null NOT NULL,
    vaccine_course_id text CONSTRAINT vaccine_course_schedule_vaccine_course_id_not_null NOT NULL,
    label text CONSTRAINT vaccine_course_schedule_label_not_null NOT NULL,
    min_interval_days integer DEFAULT 0 NOT NULL,
    min_age double precision DEFAULT 0.0 NOT NULL,
    max_age double precision DEFAULT 0 NOT NULL,
    deleted_datetime timestamp without time zone,
    custom_age_label text
);


--
-- Name: vaccine_course_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vaccine_course_item (
    id text NOT NULL,
    vaccine_course_id text NOT NULL,
    item_link_id text NOT NULL,
    deleted_datetime timestamp without time zone
);


--
-- Name: vvm_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vvm_status (
    id text NOT NULL,
    description text NOT NULL,
    code text NOT NULL,
    priority integer CONSTRAINT vvm_status_level_not_null NOT NULL,
    is_active boolean NOT NULL,
    unusable boolean DEFAULT false NOT NULL,
    reason_id text
);


--
-- Name: vvm_status_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vvm_status_log (
    id text NOT NULL,
    status_id text NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    stock_line_id text NOT NULL,
    comment text,
    created_by text NOT NULL,
    invoice_line_id text,
    store_id text NOT NULL
);


--
-- Name: warning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warning (
    id text NOT NULL,
    warning_text text NOT NULL,
    code text NOT NULL
);


--
-- Name: changelog cursor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog ALTER COLUMN cursor SET DEFAULT nextval('public.changelog_cursor_seq'::regclass);


--
-- Data for Name: __diesel_schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.__diesel_schema_migrations VALUES ('20210705T1000', '2026-01-08 02:41:35.194613');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210710T1000', '2026-01-08 02:41:35.195592');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210805T1000', '2026-01-08 02:41:35.19615');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210810T1000', '2026-01-08 02:41:35.197059');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210815T1000', '2026-01-08 02:41:35.197814');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210825T1000', '2026-01-08 02:41:35.198977');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210905T1000', '2026-01-08 02:41:35.200014');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210910T1000', '2026-01-08 02:41:35.20102');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210915T1000', '2026-01-08 02:41:35.201877');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210917T1000', '2026-01-08 02:41:35.203169');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210918T1000', '2026-01-08 02:41:35.204474');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210920T1000', '2026-01-08 02:41:35.205529');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210925T1000', '2026-01-08 02:41:35.207417');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211005T1000', '2026-01-08 02:41:35.208762');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211105T1000', '2026-01-08 02:41:35.20965');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211110T1000', '2026-01-08 02:41:35.210572');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211115T1000', '2026-01-08 02:41:35.211276');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211120T1000', '2026-01-08 02:41:35.212224');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211125T1000', '2026-01-08 02:41:35.213225');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211210T1000', '2026-01-08 02:41:35.214182');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211215T1000', '2026-01-08 02:41:35.215237');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211220T1000', '2026-01-08 02:41:35.216314');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211225T1000', '2026-01-08 02:41:35.217452');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220127T0800', '2026-01-08 02:41:35.219878');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220211T1500', '2026-01-08 02:41:35.22137');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1015', '2026-01-08 02:41:35.222213');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1030', '2026-01-08 02:41:35.222443');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1130', '2026-01-08 02:41:35.222631');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1200', '2026-01-08 02:41:35.222921');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1230', '2026-01-08 02:41:35.223203');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1300', '2026-01-08 02:41:35.223387');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1330', '2026-01-08 02:41:35.223588');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1400', '2026-01-08 02:41:35.223887');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220315T1000', '2026-01-08 02:41:35.224187');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220325T1400', '2026-01-08 02:41:35.225103');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220325T1430', '2026-01-08 02:41:35.226017');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220401T1000', '2026-01-08 02:41:35.227011');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220401T1100', '2026-01-08 02:41:35.227895');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220427T1000', '2026-01-08 02:41:35.228779');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220427T1300', '2026-01-08 02:41:35.229503');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1500', '2026-01-08 02:41:35.231188');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1600', '2026-01-08 02:41:35.232139');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1700', '2026-01-08 02:41:35.232891');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1800', '2026-01-08 02:41:35.233935');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220621013225', '2026-01-08 02:41:35.234973');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220831235556', '2026-01-08 02:41:35.235886');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221010220020', '2026-01-08 02:41:35.236848');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221011T1022', '2026-01-08 02:41:35.237221');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221027T0915', '2026-01-08 02:41:35.237455');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221106232001', '2026-01-08 02:41:35.23788');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221114012026', '2026-01-08 02:41:35.239091');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221116021440', '2026-01-08 02:41:35.239406');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221117221434', '2026-01-08 02:41:35.239767');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221201194340', '2026-01-08 02:41:35.240102');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230116T1000', '2026-01-08 02:41:35.240453');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230327T1000', '2026-01-08 02:41:35.240855');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230330220342', '2026-01-08 02:41:35.241221');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230421T1000', '2026-01-08 02:41:35.241528');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230421T1100', '2026-01-08 02:41:35.241913');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230620T1000', '2026-01-08 02:41:35.242696');


--
-- Data for Name: abbreviation; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: asset; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: asset_catalogue_item; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.asset_catalogue_item VALUES ('f7db1278-a70c-4bcc-8e3c-f670b9965aea', 'E001/001-C', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Porkka Finland Oy', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R404A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('5c3be815-6377-4d2a-ba56-bee5e5307e64', 'E001/001-F', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Porkka Finland Oy', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R404A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('1cabed40-4c27-49f5-b7d2-b8305fca4802', 'E001/002-C', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'SN Zhendre', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R134A, R452A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('b6de9c26-797d-49ad-a4ba-4553d5d8bd2c', 'E001/002-F', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'SN Zhendre', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R134A, R452A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('99206b1c-d1fc-41af-9d41-9151c1382407', 'E001/003-C', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Qingdao Haier Biomedical Co., Ltd', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R448A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('2e57aa44-8f93-476f-8bdb-235b84464752', 'E001/003-F', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Qingdao Haier Biomedical Co., Ltd', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R448A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('0df0ff5d-d328-4c92-94ab-e8b4d69608ee', 'E001/004-C', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Foster Refrigerator', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R404A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('c316a7bf-b09c-4af6-93bb-0af0d8f0eaa6', 'E001/004-F', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Foster Refrigerator', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R404A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('f53ba4fe-50ce-408f-a4cb-83067a767b5e', 'E001/005-C', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '9a4ad0dd-138a-41b2-81df-08772635085e', 'Viessmann Kuhlsysteme GmbH', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R134A, R407A, R452A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('4866491b-3385-41bb-803e-c04002693929', 'E001/005-F', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', '6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Viessmann Kuhlsysteme GmbH', 'Custom', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R134A, R407A, R452A", "expected_lifespan": 10}');
INSERT INTO public.asset_catalogue_item VALUES ('c7d48b5c-74b2-4077-94f5-2b25d67a447b', 'E003/002', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Haier Biomedical Co., Ltd', 'HBD 116', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 2.5, "refrigerant_type": "R134A", "expected_lifespan": 10, "external_dimensions": "82 x 67 x 63", "storage_capacity_5c": 0.0, "storage_capacity_20c": 121.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.38, "waterpack_storage_capacity": 81.6, "energy_consumption_freezing": 3.77, "waterpack_freezing_capacity": 12.0}');
INSERT INTO public.asset_catalogue_item VALUES ('23bcee45-886e-42c3-8661-4e56b9bb6ff0', 'E003/003', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Haier Biomedical Co., Ltd', 'HBD 286', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 4.15, "refrigerant_type": "R134A", "expected_lifespan": 10, "external_dimensions": "81.8 x 124 x 63", "storage_capacity_5c": 0.0, "storage_capacity_20c": 298.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 4.36, "waterpack_storage_capacity": 186.0, "waterpack_freezing_capacity": 16.8}');
INSERT INTO public.asset_catalogue_item VALUES ('9d77cc99-6098-438a-8242-0bb55a450b49', 'E003/007', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'MK 304', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "hold_over_time": 25.6, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "84 x 69 x 126", "storage_capacity_5c": 105.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 3.2, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('e5dc3c5e-bc12-4ea4-a3d2-c4c3b30cb753', 'E003/011', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'MK 204', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 20.1, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "84 x 70 x 92", "storage_capacity_5c": 75.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.89, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('981c12f8-b054-4793-aab1-4f8363b4191c', 'E003/022', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'MK 144', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 43.13, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "88 x 96.5 x 71", "storage_capacity_5c": 48.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 2.3, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('a067b53b-ca3e-4de9-ae5e-a19d91ce1cc5', 'E003/023', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Vestfrost Solutions', 'MF 314', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 4.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "external_dimensions": "84 x 156 x 70", "storage_capacity_5c": 0.0, "storage_capacity_20c": 281.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 4.23, "waterpack_storage_capacity": 153.6, "energy_consumption_freezing": 4.24, "waterpack_freezing_capacity": 7.2}');
INSERT INTO public.asset_catalogue_item VALUES ('b1278bbb-e818-4bb5-9839-2b8b287c637e', 'E003/024', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Vestfrost Solutions', 'MF 114', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 2.8, "refrigerant_type": "R600A", "expected_lifespan": 10, "external_dimensions": "84 x 72 x 70", "storage_capacity_5c": 0.0, "storage_capacity_20c": 105.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 2.24, "waterpack_storage_capacity": 38.4, "energy_consumption_freezing": 3.33, "waterpack_freezing_capacity": 7.2}');
INSERT INTO public.asset_catalogue_item VALUES ('33cad6a0-4e2c-4b0f-8bb0-c1961aba8740', 'E003/025', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Vestfrost Solutions', 'MF 214', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 2.9, "refrigerant_type": "R600A", "expected_lifespan": 10, "external_dimensions": "84 x 113 x 70", "storage_capacity_5c": 0.0, "storage_capacity_20c": 171.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 3.0, "waterpack_storage_capacity": 96.0, "energy_consumption_freezing": 3.56, "waterpack_freezing_capacity": 7.2}');
INSERT INTO public.asset_catalogue_item VALUES ('5752325d-f156-45d2-ae37-3905edf43690', 'E003/030', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 3000 SDD', NULL, '{"climate_zone": "Temperate", "energy_source": "Solar", "hold_over_time": 94.08, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91 x 127 x 78", "storage_capacity_5c": 156.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 9.6, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('783da0b3-f157-46a2-9b78-1430b8680753', 'E003/035', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW 2000 SDD', NULL, '{"climate_zone": "Temperate", "energy_source": "Solar", "hold_over_time": 94.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "127 x 78 x 91", "storage_capacity_5c": 99.0, "storage_capacity_20c": 42.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 14.4, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('bcf6e728-1df6-4b30-bd24-300981eecbaa', 'E003/073', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '525b614e-f9f5-4866-9553-24bad2b7b826', 'B Medical Systems Sarl', 'TFW 40 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "90 x 103 78", "storage_capacity_5c": 0.0, "storage_capacity_20c": 64.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 11.24, "waterpack_freezing_capacity": 2.16}');
INSERT INTO public.asset_catalogue_item VALUES ('b5c76f4d-c0ef-4260-897c-f8e661ec1b68', 'E003/037', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Zero Appliances (Pty) Ltd', 'ZLF 100 DC (SureChill ®)', NULL, '{"climate_zone": "Temperate", "energy_source": "Solar", "hold_over_time": 125.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "180 x 85 x 73", "storage_capacity_5c": 93.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('d3239141-6073-4fb0-b3ea-55664a415917', 'E003/040', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC200SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "98 x 128.2 x 74", "storage_capacity_5c": 132.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('7b54d581-13c6-4f70-8a2f-a736fb12c881', 'E003/042', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW 40 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 94.4, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "90 x 78 x 103", "storage_capacity_5c": 36.0, "storage_capacity_20c": 4.8, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 3.6, "waterpack_freezing_capacity": 1.89}');
INSERT INTO public.asset_catalogue_item VALUES ('6ff0747c-1639-403b-95e9-7e1dbca8a917', 'E003/043', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW 2043 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 79.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91 x 127 x 78", "storage_capacity_5c": 70.0, "storage_capacity_20c": 42.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 10.5, "waterpack_freezing_capacity": 2.5}');
INSERT INTO public.asset_catalogue_item VALUES ('53a49c7e-168d-4599-8a5e-5da9281914c4', 'E003/044', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Zero Appliances (Pty) Ltd', 'ZLF 150 AC (SureChill ®)', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 128.2, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "190 x 85 x 72", "storage_capacity_5c": 128.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.98, "waterpack_storage_capacity": 0.0, "energy_consumption_freezing": 2.03, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('48a73892-0391-48e6-bea7-a2c5e7963ad3', 'E003/045', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 3043 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 124.8, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91 x 127 x 78", "storage_capacity_5c": 89.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('222111ec-4aa3-41ce-8c35-b86f3fa08d23', 'E003/048', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Dulas Ltd', 'VC150SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 83.7, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "98 x 128.2 x 74", "storage_capacity_5c": 102.0, "storage_capacity_20c": 42.9, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 8.1, "waterpack_freezing_capacity": 2.04}');
INSERT INTO public.asset_catalogue_item VALUES ('4b40f057-a760-4944-9672-cd4f34810fae', 'E003/049', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 50DC SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 119.2, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "121.5 x 79.5 x75", "storage_capacity_5c": 46.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('1b3c5ed3-3dc5-4a94-b70b-bbc7442fa173', 'E003/050', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 100 DC (SureChill®)', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "182 x 79.5 x 75", "storage_capacity_5c": 99.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('aee18a7b-0b1f-4448-a08d-37b9d61c240c', 'E003/051', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Zero Appliances (Pty) Ltd', 'ZLF30 AC (SureChill ®)', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 77.2, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "102.8 x 61.9 x 56.3", "storage_capacity_5c": 27.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.68, "waterpack_storage_capacity": 0.0, "energy_consumption_freezing": 2.56, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('ca835a1e-984d-46b5-b7e0-67d26dbbd630', 'E003/052', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Zero Appliances (Pty) Ltd', 'ZLF 150 DC (SureChill ®)', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 167.9, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "189 x 83 x 71", "storage_capacity_5c": 128.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('3f2f5cb5-11f7-4f70-8cf3-1facf6e81ef0', 'E003/055', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Zero Appliances (Pty) Ltd', 'ZLF 30DC SDD (SureChill ®)', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 87.27, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "102.5 x 56 x 60", "storage_capacity_5c": 27.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('61fd9f8f-fa2c-4b91-b67c-aa4810ad089c', 'E004/005', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'B Medical Systems Sarl', 'RCW25', NULL, '{"expected_lifespan": 10, "external_dimensions": "40.6 x 25.2 x 20.2"}');
INSERT INTO public.asset_catalogue_item VALUES ('1b2c352a-5c69-4b76-a411-d93be56cc05a', 'E003/057', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Qingdao Haier Biomedical Co., Ltd', 'HTCD-160-SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "169.5 x 86.5 x 82.5", "storage_capacity_5c": 100.0, "storage_capacity_20c": 40.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 10.68, "waterpack_freezing_capacity": 2.08}');
INSERT INTO public.asset_catalogue_item VALUES ('f1d7348d-f38d-4a74-ab0a-45227b89d314', 'E003/058', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'Dulas VC110SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 91.65, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "98 x 128.2 x 74", "storage_capacity_5c": 110.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('03a22d21-658c-4b4d-92f7-ae0b5e5f96ce', 'E003/059', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC88SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 1.65, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "98 x 128.2 x 74", "storage_capacity_5c": 88.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('7d73bfdb-76ca-4cfa-ac52-6215048bebbb', 'E003/060', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Aucma Global Medical Co.,Ltd.', 'DW-25W147', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 6.73, "refrigerant_type": "R600A", "expected_lifespan": 10, "external_dimensions": "79 X 59.5 X 880", "storage_capacity_5c": 0.0, "storage_capacity_20c": 96.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 3.31, "waterpack_storage_capacity": 19.4, "energy_consumption_freezing": 2.81, "waterpack_freezing_capacity": 14.5}');
INSERT INTO public.asset_catalogue_item VALUES ('9a4f0ebf-a9cf-4e73-b8fc-5aede8fa88c3', 'E003/061', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Aucma Global Medical Co.,Ltd.', 'DW-25W300', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 58.6, "refrigerant_type": "R134A", "expected_lifespan": 10, "external_dimensions": "122.6 x 79 x 945", "storage_capacity_5c": 0.0, "storage_capacity_20c": 240.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 3.37, "waterpack_storage_capacity": 44.3, "energy_consumption_freezing": 3.54, "waterpack_freezing_capacity": 38.3}');
INSERT INTO public.asset_catalogue_item VALUES ('2f74670b-5081-42d5-852c-8ce392b6a536', 'E003/066', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'B Medical Systems Sarl', 'TCW 4000 AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 77.3, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91.5 x 162.5 x 78", "storage_capacity_5c": 240.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.85, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('af28530e-b31a-4359-9209-fdf1d7b38f1e', 'E003/067', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 15R SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 7.7, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "95 x 73 x 73", "storage_capacity_5c": 16.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('589736aa-d375-4905-9ff7-4faae9eedece', 'E003/068', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 40R SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 93.4, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "90 x 103 78", "storage_capacity_5c": 36.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('a00dffee-a550-44d8-b473-1d512f6c9995', 'E003/069', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 024 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 91.28, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "83 x 55.5 x 64.5", "storage_capacity_5c": 25.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('f17c924d-cb72-431d-8a00-514a50570449', 'E003/070', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'Vestfrost Solutions', 'VLS 064 RF AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 45.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "84.5 x 72.5 x 71", "storage_capacity_5c": 52.5, "storage_capacity_20c": 5.1, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.63, "waterpack_storage_capacity": 3.6, "energy_consumption_freezing": 1.8, "waterpack_freezing_capacity": 1.6}');
INSERT INTO public.asset_catalogue_item VALUES ('e6be81b8-151f-4e90-87e9-f8af776c7252', 'E003/071', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'B Medical Systems Sarl', 'TFW 3000 AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91 x 127 x 78", "storage_capacity_5c": 0.0, "storage_capacity_20c": 204.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 2.15, "waterpack_storage_capacity": 97.2, "waterpack_freezing_capacity": 32.4}');
INSERT INTO public.asset_catalogue_item VALUES ('f1ba0107-8465-44f2-aa3b-36944dce498a', 'E003/072', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Dulas Ltd', 'VC225ILR', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 94.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "98 x 128.2 x 74", "storage_capacity_5c": 184.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 803.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('55042f99-370b-407b-9155-d4a594595abc', 'E004/007', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'AOV International LLP', 'ADVC-24', NULL, '{"expected_lifespan": 10, "external_dimensions": "17.3 x 10.3 x 4.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('f400cd20-29f2-42c6-9805-df6458eba554', 'E003/074', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Qingdao Haier Biomedical Co., Ltd', 'HTCD 90 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "72 x 87.5 x 112.8", "storage_capacity_5c": 37.5, "storage_capacity_20c": 32.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 12.0, "waterpack_freezing_capacity": 2.43}');
INSERT INTO public.asset_catalogue_item VALUES ('cf2569d8-e3cf-4e00-b11c-e1088555bb7a', 'E003/075', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC 40 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "72 x 87.5 x 78.8", "storage_capacity_5c": 22.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('8db398a9-3640-4675-81d9-19f5ab3f25de', 'E003/076', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC 110 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "72 x 87.5 x 112.8", "storage_capacity_5c": 59.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('5005ff6c-6f9c-44ce-bd5f-4fd3c9b5fc84', 'E003/077', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW15 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "95 x 73 x 73", "storage_capacity_5c": 16.0, "storage_capacity_20c": 2.4, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.0, "waterpack_storage_capacity": 2.4, "waterpack_freezing_capacity": 1.97}');
INSERT INTO public.asset_catalogue_item VALUES ('676d2697-c7f5-4ea6-a2e9-b6f8bce2bd4e', 'E003/078', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC50SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 74.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "97.5 x 100 x 74", "storage_capacity_5c": 52.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('6f9f4cf0-7d70-4448-8b0a-57ecf3361912', 'E003/079', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Aucma Global Medical Co.,Ltd.', 'CFD-50', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 120.0, "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "158.8 x 54.5 x 65.5", "storage_capacity_5c": 50.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.54, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('d3920fb9-7927-4549-ab3b-fd13498fb570', 'E003/080', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 51 LITE AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 89.72, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "151.5 x 61.8 x 77.4", "storage_capacity_5c": 51.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.63, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('59a197c5-76ab-47ec-84fc-8a2802f1d1be', 'E003/081', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 75 Lite', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 81.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "151.5 x 61.8 x 77.4", "storage_capacity_5c": 72.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.47, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('5f5b435f-8520-4dbf-84db-4db43f0ebbd0', 'E003/082', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 99 Lite', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 59.56, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "170 x 61.8 x 77.4", "storage_capacity_5c": 98.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.23, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('92a77272-d0c0-43f6-85ec-647c9447f194', 'E003/083', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 225 AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 55.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "183 x 79.5 x 75", "storage_capacity_5c": 225.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 2.04, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('4151bc4d-598d-4334-86b6-668f4ee5e5e9', 'E003/084', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC60SDD-1', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 94.18, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "98 x 128.2 x 74", "storage_capacity_5c": 57.0, "storage_capacity_20c": 24.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 13.8, "waterpack_freezing_capacity": 2.4}');
INSERT INTO public.asset_catalogue_item VALUES ('cc2404af-1863-438d-8ff9-38d66e4f6796', 'E003/085', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Dulas Ltd', 'VC30SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "97.5 x 89 x 74", "storage_capacity_5c": 25.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('f04d5fd1-150d-4ee7-8011-151f74dc42e2', 'E003/116', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC-120-SDD', NULL, '{"energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "86.5 x 82.5 x 142.5", "storage_capacity_5c": 100.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('4901660d-315f-4c1c-9550-db33e8bed04f', 'E003/086', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '525b614e-f9f5-4866-9553-24bad2b7b826', 'Qingdao Haier Biomedical Co., Ltd', 'HTD-40', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 120.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "72 x 87.5 x 78.8", "storage_capacity_5c": 0.0, "storage_capacity_20c": 48.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 20.0, "waterpack_freezing_capacity": 2.4}');
INSERT INTO public.asset_catalogue_item VALUES ('f7270d64-1680-4928-9fa4-a0ab01af698c', 'E003/087', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-260', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 62.23, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "94 x 164.7 x 71.7", "storage_capacity_5c": 211.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.62, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('087e7310-8781-412f-99b6-f3b0c0afd7eb', 'E003/088', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-150', NULL, '{"energy_source": "Electricity", "hold_over_time": 60.83, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "87.2 x 112.8 x 71.7", "storage_capacity_5c": 122.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.54, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('6baa49bf-4412-42d0-a50d-c4758f96a071', 'E003/089', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-80', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 59.85, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "87.2 x 112.8 x 71.7", "storage_capacity_5c": 61.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.57, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('1a85c145-29d2-4343-9010-d52d981bd009', 'E003/090', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'Ultra 16 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "113 x 78 x 85", "storage_capacity_5c": 24.2, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('eda9ae25-6184-4141-80a0-e1b0940f7f1d', 'E003/091', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 026 RF SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "88 x 111 x 65", "storage_capacity_5c": 20.0, "storage_capacity_20c": 34.3, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 17.4, "waterpack_freezing_capacity": 1.8}');
INSERT INTO public.asset_catalogue_item VALUES ('fff04c75-2f70-45e2-ac3b-89c054240ca7', 'E003/092', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 056 RF SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "88 x 111 x 65", "storage_capacity_5c": 36.0, "storage_capacity_20c": 34.3, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 17.4, "waterpack_freezing_capacity": 1.8}');
INSERT INTO public.asset_catalogue_item VALUES ('27852f5c-a5db-4b1f-a311-9ff67e74cb88', 'E003/093', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW 4000 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91.5 x 162.5 x 78", "storage_capacity_5c": 220.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('8a64271b-011d-4320-a1da-66c6bed2befa', 'E003/095', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 55 FF DC', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "183 x 79.5 x 75", "storage_capacity_5c": 58.0, "storage_capacity_20c": 44.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 14.4, "waterpack_freezing_capacity": 2.4}');
INSERT INTO public.asset_catalogue_item VALUES ('9ba05fbe-3a24-4f1b-af33-d45dd9de8fa8', 'E003/096', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Zero Appliances (Pty) Ltd', 'ZLF80AC (SureChill®)', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 105.28, "refrigerant_type": "R134A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "167 x 85 x 71", "storage_capacity_5c": 77.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.4, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('57a4b8f7-0863-4a8d-a24a-1ee81dc61648', 'E003/097', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0e58c7e6-e603-4513-a088-79fe9f08e22f', 'Qingdao Haier Biomedical Co., Ltd', 'HBCD-90', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 63.8, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "87.2 x 112.8 x 71.7", "storage_capacity_5c": 30.0, "storage_capacity_20c": 32.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.7, "waterpack_storage_capacity": 16.0, "energy_consumption_freezing": 0.97, "waterpack_freezing_capacity": 4.0}');
INSERT INTO public.asset_catalogue_item VALUES ('0fbb3210-3c90-41df-b39e-eefe032f738a', 'E003/098', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Aucma Global Medical Co.,Ltd.', 'CFD-50 SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "158.8 x 54.5 x 65.5", "storage_capacity_5c": 50.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('8948b544-8283-4d19-b523-bfff7ef10967', 'E003/099', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '525b614e-f9f5-4866-9553-24bad2b7b826', 'Vestfrost Solutions', 'VFS 048 SDD', NULL, '{"energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "external_dimensions": "85 x 55.5 x 65", "storage_capacity_5c": 0.0, "storage_capacity_20c": 34.3, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 17.4, "waterpack_freezing_capacity": 1.6}');
INSERT INTO public.asset_catalogue_item VALUES ('c6ee8e1f-1219-4455-83a2-dd991a89d6a0', 'E004/008', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'AOV International LLP', 'AVC-44', NULL, '{"expected_lifespan": 10, "external_dimensions": "9 x 9.1 x 16.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('b50409f4-89d5-4cef-a6e0-6185e2df9ce7', 'E003/100', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'B Medical Systems Sarl', 'TCW 40R AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 121.9, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "103 x 78 x 89", "storage_capacity_5c": 36.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.8, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('9cb9524f-b96d-4750-8d1d-28a3f239ef2b', 'E003/101', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'B Medical Systems Sarl', 'TCW 80 AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 72.15, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "103 x 78 x 90", "storage_capacity_5c": 80.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.16, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('407d4a90-c403-46c3-bf57-31c2fe1ad0e0', 'E003/102', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC-112', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "72 x 87.5 x 112.8", "storage_capacity_5c": 75.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('1cf5fa83-4fd0-4e23-a5ac-dec720f52fcd', 'E003/103', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0e58c7e6-e603-4513-a088-79fe9f08e22f', 'Godrej & Boyce MFG. Co. Ltd.', 'GVR 55 FF AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 113.62, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "182 x 79.5 x 75", "storage_capacity_5c": 58.0, "storage_capacity_20c": 44.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.91, "waterpack_storage_capacity": 14.4, "energy_consumption_freezing": 1.91, "waterpack_freezing_capacity": 2.4}');
INSERT INTO public.asset_catalogue_item VALUES ('de7bf4b4-52f4-4bbe-8155-7f0d08aa01f5', 'E003/106', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 054A SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 89.32, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "85 x 72 x 60", "storage_capacity_5c": 55.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('460fd161-1f25-40dd-aafa-39dac9f8690b', 'E003/107', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 094A SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "86 x 93 x 70", "storage_capacity_5c": 92.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('e2285ed2-1492-41c2-8933-79591c179ec5', 'E003/108', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Vestfrost Solutions', 'VLS 154A SDD Greenline', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 77.75, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "86 x 127 x 70", "storage_capacity_5c": 170.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('781f4e20-e317-4e8a-b7c8-263c95d6b675', 'E003/109', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'fd79171f-5da8-4801-b299-9426f34310a8', 'Vestfrost Solutions', 'VLS 204A', NULL, '{"energy_source": "Electricity", "hold_over_time": 54.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "85 x 73 x 70", "storage_capacity_5c": 60.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.57, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('a1e4b0e1-f1e2-4217-b8c9-906ef901b14c', 'E003/110', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 304A AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 55.5, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "85 x 92 x 70", "storage_capacity_5c": 98.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.6, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('a609ed46-7cc3-4c3f-bf6e-de406fdac81a', 'E003/111', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 354A AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 54.7, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "85 x 113 x 70", "storage_capacity_5c": 127.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.62, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('c19638fd-cefc-4369-9284-6fd67e4830ab', 'E003/112', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 404A AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 55.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "86 x 127 x 70", "storage_capacity_5c": 145.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.67, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('f6011b71-4590-4d4a-bf12-0bd04cd79d4a', 'E003/113', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 504A AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 55.27, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "84.5 x 156.3 x 70", "storage_capacity_5c": 242.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 638.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('e8bfd677-cd75-4344-bf3f-696abe951c71', 'E003/114', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-120', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 128.8, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "89 x 82.9 x 142.5", "storage_capacity_5c": 100.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.4, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('5bf69a09-f734-4689-b1b6-2856155f3546', 'E003/115', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Qingdao Haier Biomedical Co., Ltd', 'HBC-240', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 87.23, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "89 x 82.9 x 182", "storage_capacity_5c": 200.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.44, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('1487cb9b-7766-4936-a296-c70bc284712d', 'E004/015', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'AOV International LLP', 'ACB-503L', NULL, '{"expected_lifespan": 10, "external_dimensions": "77 x 61 x 51"}');
INSERT INTO public.asset_catalogue_item VALUES ('c6ba691e-c574-4031-9ba7-65c8df849e61', 'E003/117', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTC-240-SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "86.5 x 82.5 x 181.5", "storage_capacity_5c": 200.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('b38f7ece-a922-4dbf-9000-f78854a55a17', 'E003/118', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Aucma Global Medical Co.,Ltd.', 'ARKTEK YBC-10 SDD', NULL, '{"energy_source": "Solar", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "52.8 x 86", "storage_capacity_5c": 10.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('7964fff0-ea1d-46ff-88fd-4e9c9eacc685', 'E003/119', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 076 RF SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "96 x 128 x 65", "storage_capacity_5c": 61.25, "storage_capacity_20c": 34.3, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 17.4, "waterpack_freezing_capacity": 1.8}');
INSERT INTO public.asset_catalogue_item VALUES ('2ce1032f-311e-420e-a854-bef87c3147e5', 'E003/120', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Vestfrost Solutions', 'VLS 174A AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 57.52, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "95 x 55 x 65", "storage_capacity_5c": 38.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 504.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('eae13af2-4e0a-4438-8594-89a350a96cdd', 'E003/121', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'B Medical Systems Sarl', 'TCW80-SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 192.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "90 x 103 x 78", "storage_capacity_5c": 80.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('cd9caec3-bf95-4ce3-a1f6-64e3e11b390a', 'E003/122', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Coolfinity Medical B.V.', 'IceVolt 300P', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 25.0, "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "67 x 73 x 199.9", "storage_capacity_5c": 241.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 2.98, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('3721143e-6aca-4686-b94b-a09ab064b9c4', 'E003/123', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'B Medical Systems Sarl', 'TCW120AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 72.0, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91 x 162 x 79", "storage_capacity_5c": 0.0, "storage_capacity_20c": 120.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 1.6}');
INSERT INTO public.asset_catalogue_item VALUES ('e2e9d099-5eea-422c-95b6-e1dfc536b9eb', 'E003/124', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'B Medical Systems Sarl', 'TCW120SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "91 x 162 x 79", "storage_capacity_5c": 120.0, "storage_capacity_20c": 28.0, "storage_capacity_70c": 0.0, "waterpack_freezing_capacity": 1.6}');
INSERT INTO public.asset_catalogue_item VALUES ('42fe34c3-9f9d-4a2a-b15d-6177f7586e43', 'E003/125', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '05d9a49a-4d94-4e00-9728-2549ad323544', 'B Medical Systems Sarl', 'U201', NULL, '{"energy_source": "Electricity", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "129.3 x 69.9 x 103.9", "storage_capacity_5c": 0.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 214.0, "energy_consumption_stable": 13.5}');
INSERT INTO public.asset_catalogue_item VALUES ('8cd56b7f-6f4e-478e-be9b-33b54d8a0c97', 'E003/126', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Qingdao Haier Biomedical Co., Ltd', 'HBD-86', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 7.32, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "78.8 x 71.7 x 87.2", "storage_capacity_5c": 0.0, "storage_capacity_20c": 61.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.95}');
INSERT INTO public.asset_catalogue_item VALUES ('0bbf332d-52bd-41aa-ba7d-d7709f08eeed', 'E003/127', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Western Refrigeration Private Limited', 'VFW140H-HC', NULL, '{"energy_source": "Electricity", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "71 x 72 x 95.5", "storage_capacity_5c": 0.0, "storage_capacity_20c": 68.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.94, "waterpack_storage_capacity": 72.5, "waterpack_freezing_capacity": 16.2}');
INSERT INTO public.asset_catalogue_item VALUES ('536d23cd-f797-4558-8fa8-c509077a229e', 'E003/128', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Western Refrigeration Private Limited', 'VFW310H-HC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "123 x 72 x 96.5", "storage_capacity_5c": 0.0, "storage_capacity_20c": 166.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 2.27, "waterpack_storage_capacity": 203.0, "waterpack_freezing_capacity": 28.2}');
INSERT INTO public.asset_catalogue_item VALUES ('beb89f3c-e33b-4ab2-9032-69f313681c24', 'E003/129', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Qingdao Aucma Global Medical Co.,Ltd.', 'TCD-100', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "105 x 75 x 97.5", "storage_capacity_5c": 48.0, "storage_capacity_20c": 38.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 10.7, "waterpack_freezing_capacity": 2.0}');
INSERT INTO public.asset_catalogue_item VALUES ('e779cf64-d940-4500-98f2-171fbd0f3ec9', 'E003/130', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Godrej & Boyce MFG. Co. Ltd.', 'GMF 200 ECO lite', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 9.82, "refrigerant_type": "R290", "expected_lifespan": 10, "external_dimensions": "76.2 x 82.5 x 85", "storage_capacity_5c": 0.0, "storage_capacity_20c": 153.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 4.13, "waterpack_storage_capacity": 130.8, "waterpack_freezing_capacity": 20.91}');
INSERT INTO public.asset_catalogue_item VALUES ('08b04f35-6026-4ddf-b141-2eaefac25307', 'E004/017', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'AOV International LLP', 'ACB 246LS', NULL, '{"expected_lifespan": 10, "external_dimensions": "39.9 x 39.6 x 14.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('db64a976-85cd-497e-a960-476a50753a21', 'E003/131', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'Qingdao Haier Biomedical Co., Ltd', 'HBD265', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 11.42, "refrigerant_type": "R600A", "expected_lifespan": 10, "external_dimensions": "164.7 x 71.7 x 94", "storage_capacity_5c": 0.0, "storage_capacity_20c": 211.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.42, "energy_consumption_freezing": 1.4}');
INSERT INTO public.asset_catalogue_item VALUES ('92076de4-2dc7-4c6f-9c7d-b7c1141aa8e7', 'E003/132', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Vestfrost Solutions', 'VLS 096A RF SDD', NULL, '{"climate_zone": "Hot", "energy_source": "Solar", "hold_over_time": 114.33, "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "87 x 151 x 74", "storage_capacity_5c": 110.0, "storage_capacity_20c": 50.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 17.4, "waterpack_freezing_capacity": 2.4}');
INSERT INTO public.asset_catalogue_item VALUES ('d087d824-efa1-494a-90a8-f3a9d1519c61', 'E003/133', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Western Refrigeration Private Limited', 'I425H120', NULL, '{"climate_zone": "Hot, Temperate, Cold", "energy_source": "Electricity", "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "132 x 80.5 x 97", "storage_capacity_5c": 192.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.5, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('b7899fc3-972e-439b-9289-8421d344d1df', 'E003/134', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'BlackFrog Technologies Private Limited', 'Emvolio Plus', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 12.0, "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "30 x 20 x 41", "storage_capacity_5c": 1.55, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 0.84, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('051009da-3162-487c-b7da-e6f7be61ca53', 'E003/135', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', 'd4434727-dc35-437d-a5fa-739a491381b7', 'Qingdao Haier Biomedical Co., Ltd', 'HTCD-160B', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "refrigerant_type": "R600A", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "169.5 x 86.5 x 82.5", "storage_capacity_5c": 100.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "waterpack_storage_capacity": 22.4, "waterpack_freezing_capacity": 2.0}');
INSERT INTO public.asset_catalogue_item VALUES ('08b2711a-912b-4023-a94c-62f2f7ff15da', 'E003/136', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GHR 200 AC', NULL, '{"energy_source": "Electricity", "hold_over_time": 34.99, "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "126 x 84.6 x 84.7", "storage_capacity_5c": 226.4, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.67, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('bb658a06-2699-43ca-a700-cd5604838a60', 'E003/137', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GHR 90 AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 25.95, "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "76.2 x 84.6 x 84.7", "storage_capacity_5c": 103.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.64, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('cb1167ed-683f-4bb0-a67b-129231af7dda', 'E003/138', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '0e58c7e6-e603-4513-a088-79fe9f08e22f', 'B Medical Systems Sarl', 'TVW4000AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 50.15, "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Not tested", "external_dimensions": "160 x 78 x 91.5", "storage_capacity_5c": 240.0, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 4.45, "waterpack_storage_capacity": 252.0, "energy_consumption_freezing": 4.45, "waterpack_freezing_capacity": 24.0}');
INSERT INTO public.asset_catalogue_item VALUES ('869ff8de-9c4b-4425-a894-0b0c6cd3bf14', 'E003/139', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', '4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Godrej & Boyce MFG. Co. Ltd.', 'GHR 150 AC', NULL, '{"climate_zone": "Hot", "energy_source": "Electricity", "hold_over_time": 40.22, "refrigerant_type": "R290", "expected_lifespan": 10, "freeze_protection": "Grade A", "external_dimensions": "10.1 x 84.2 x 84.5", "storage_capacity_5c": 164.5, "storage_capacity_20c": 0.0, "storage_capacity_70c": 0.0, "energy_consumption_stable": 1.77, "waterpack_storage_capacity": 0.0, "waterpack_freezing_capacity": 0.0}');
INSERT INTO public.asset_catalogue_item VALUES ('c74a3f72-fda6-4bb8-a08f-5f79a20a8716', 'E004/002', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'B Medical Systems Sarl', 'RCW4', NULL, '{"expected_lifespan": 10, "external_dimensions": "36.2 x 28.3 x 29.9"}');
INSERT INTO public.asset_catalogue_item VALUES ('86dbb025-30ab-457a-981f-9d34841f9188', 'E004/003', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'B Medical Systems Sarl', 'RCW8', NULL, '{"expected_lifespan": 10, "external_dimensions": "32.6 x 10.7 x 20.2"}');
INSERT INTO public.asset_catalogue_item VALUES ('4f13efbe-4349-4fc3-ac22-584728003e63', 'E004/004', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'B Medical Systems Sarl', 'RCW12', NULL, '{"expected_lifespan": 10, "external_dimensions": "25.1 x 17.6 x 20.9"}');
INSERT INTO public.asset_catalogue_item VALUES ('40f215fb-3eb9-4fa4-9c80-b08f275db34f', 'E004/009', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'AOV International LLP', 'AVC-46', NULL, '{"expected_lifespan": 10, "external_dimensions": "11.38 x 11.38 x 19"}');
INSERT INTO public.asset_catalogue_item VALUES ('88ebf779-dce3-4814-b4d4-38fbbd7d3437', 'E004/010', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB-444L', NULL, '{"expected_lifespan": 10, "external_dimensions": "76.1 x 61.1 x 51.3"}');
INSERT INTO public.asset_catalogue_item VALUES ('32181403-62bc-4895-b5eb-4d76cd566920', 'E004/011', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Apex International', 'AIDVC-24', NULL, '{"expected_lifespan": 10, "external_dimensions": "25 x 18 x 12"}');
INSERT INTO public.asset_catalogue_item VALUES ('6b472fc0-41dd-4aa1-857c-905a2e882f0b', 'E004/013', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB-444L', NULL, '{"expected_lifespan": 10, "external_dimensions": "77.4 x 61.6 x 53"}');
INSERT INTO public.asset_catalogue_item VALUES ('5e65703e-edd7-4af4-ac01-2467c4d463e6', 'E004/018', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Blowkings', 'CB-12-CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "61 x 60 x 56"}');
INSERT INTO public.asset_catalogue_item VALUES ('1b92ae8c-2841-4040-bda8-3412b52adcff', 'E004/019', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Blowkings', 'CB-55-CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "49 x 44 x 39.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('d1f6c228-72ed-477c-adf8-bf72b8b875f1', 'E004/020', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'BK-VC 2.6-CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "26 x 26 32"}');
INSERT INTO public.asset_catalogue_item VALUES ('f3e9c894-ab61-4513-a26b-efc7f8056026', 'E004/021', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'BK-VC 1.7-CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "26 x 25 x 28.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('edd6ccce-437c-4d1c-97c8-e24001929e9c', 'E004/022', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'VDC-24-CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "2.5 x 16 x 25"}');
INSERT INTO public.asset_catalogue_item VALUES ('b748254f-c741-4e85-8fe1-2f11a6345b08', 'E004/023', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'AOV International LLP', 'ACB-264SL', NULL, '{"expected_lifespan": 10, "external_dimensions": "62.4 x 50.2 x 42.6"}');
INSERT INTO public.asset_catalogue_item VALUES ('8934933b-cfc1-46d3-a799-f44561b5f6b4', 'E004/024', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'AOV International LLP', 'ACB-316L', NULL, '{"expected_lifespan": 10, "external_dimensions": "77 x 61.8 x 51.3"}');
INSERT INTO public.asset_catalogue_item VALUES ('0e5164dc-eb2d-4b8f-bfb0-f622de78385b', 'E004/025', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Blowkings', 'CB-20-CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "79.5 x 58.2 x 56.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('dfda32ea-1f5b-4d42-8526-d64ec68f80fe', 'E004/026', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Nilkamal Limited', 'RCB246LS', NULL, '{"expected_lifespan": 10, "external_dimensions": "65 x 65 x 37"}');
INSERT INTO public.asset_catalogue_item VALUES ('01bd1a67-ee4e-4c0b-aa52-5821bf721bdd', 'E004/027', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Nilkamal Limited', 'RCB324SS', NULL, '{"expected_lifespan": 10, "external_dimensions": "65 x 65 x 37"}');
INSERT INTO public.asset_catalogue_item VALUES ('5a3bf0db-4ba3-456a-8ae0-a63e1503caa1', 'E004/028', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BBVC23', NULL, '{"expected_lifespan": 10, "external_dimensions": "24.6 x 18 x 21.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('b08b1aba-3b41-470c-846a-c6d61514d547', 'E004/029', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BCVC43', NULL, '{"expected_lifespan": 10, "external_dimensions": "28 x 28 x 31.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('fa0b89b9-9cae-4840-882b-d04c63f28cc6', 'E004/030', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Apex International', 'AICB-243s', NULL, '{"expected_lifespan": 10, "external_dimensions": "54.4 x 44.5 x 42"}');
INSERT INTO public.asset_catalogue_item VALUES ('ade1062d-cbcc-4cfc-ad11-4b4645458070', 'E004/031', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB 503L', NULL, '{"expected_lifespan": 10, "external_dimensions": "76.5 x 61.2 x 51.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('661abdb9-2782-459f-ab37-924c757851f9', 'E004/032', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Giostyle SpA', 'GioStyle VC 2.6L', NULL, '{"expected_lifespan": 10, "external_dimensions": "29 x 24 x 32"}');
INSERT INTO public.asset_catalogue_item VALUES ('8c6da895-1b20-4089-9a4d-d91d5038b471', 'E004/034', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB 264SL', NULL, '{"expected_lifespan": 10, "external_dimensions": "65 x 53 x 46"}');
INSERT INTO public.asset_catalogue_item VALUES ('7b4ef131-10fa-4e35-a70c-ccc9ef76478e', 'E004/036', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB 444L-A', NULL, '{"expected_lifespan": 10, "external_dimensions": "77 x 62 x 53.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('d8fe26dc-7dfd-4bcd-96e3-034ff73387b4', 'E004/040', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'Vaccine carrier LR BCVC46', NULL, '{"expected_lifespan": 10, "external_dimensions": "27 x 27 x 32"}');
INSERT INTO public.asset_catalogue_item VALUES ('bc0bad9a-744a-46f4-bb65-bc317897cd0b', 'E004/041', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'f2f2756e-0c15-49fd-bb01-3f45886e4870', 'Qingdao Aucma Global Medical Co.,Ltd.', 'ARKTEK™ model YBC-5 (P6)', NULL, '{"expected_lifespan": 10, "external_dimensions": "52.8 x 74.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('3f5a5232-77b6-4bbe-bbfc-017155c3b3db', 'E004/042', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'EBAC CO. Ltd.', 'EBT-30', NULL, '{"expected_lifespan": 10, "external_dimensions": "50 x 37 x 38"}');
INSERT INTO public.asset_catalogue_item VALUES ('cad62a7b-9765-4a43-b82e-a2e2ffb8fdc3', 'E004/043', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Blowkings', 'BK-VC 3.4 -CF', NULL, '{"expected_lifespan": 10, "external_dimensions": "28.8 x 28.9 x 33.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('d6ea93ba-4346-434a-a024-7984bb125b2c', 'E004/044', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Apex International', 'AIVC-44LR', NULL, '{"expected_lifespan": 10, "external_dimensions": "25 x 25 x 30"}');
INSERT INTO public.asset_catalogue_item VALUES ('38651428-95be-4d16-8b2a-5e779f47f91a', 'E004/045', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB-156L', NULL, '{"expected_lifespan": 10, "external_dimensions": "54 x 44.5 x 41.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('28b111ca-9243-48e3-8f2d-6c67a8019e23', 'E004/046', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Apex International', 'AICB-316L', NULL, '{"expected_lifespan": 10, "external_dimensions": "77 x 61.5 x 51.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('d167df7b-c6e3-41f2-8b02-86254ee0d4f6', 'E004/047', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Apex International', 'AIVC-46', NULL, '{"expected_lifespan": 10, "external_dimensions": "29 x 29 x 32.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('c8c517f8-9371-493f-8c5a-417e1db0f23f', 'E004/049', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BCVC43A', NULL, '{"expected_lifespan": 10, "external_dimensions": "25.2 x 25.2 x 30.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('39d90134-a7d3-4c1e-860b-95d11de90fcc', 'E004/050', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'AOV International LLP', 'AFVC-46', NULL, '{"expected_lifespan": 10, "external_dimensions": "31 x 31 x 30"}');
INSERT INTO public.asset_catalogue_item VALUES ('ce5edb48-84e0-4ccb-beb6-518c4de86b47', 'E004/051', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Qingdao Leff International Trading Co Ltd', 'FFVC-1.7L', NULL, '{"expected_lifespan": 10, "external_dimensions": "30.8 x 30.8 x 30"}');
INSERT INTO public.asset_catalogue_item VALUES ('aaaf4b4b-803f-4ab5-83e5-eea2dc43250f', 'E004/052', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Blowkings', 'BK-FF-VC-1.6L', NULL, '{"expected_lifespan": 10, "external_dimensions": "28.5 28.5 x 33.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('8580876d-6ba4-4c62-8e37-51bb16ce9bca', 'E004/053', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BCVC44B', NULL, '{"expected_lifespan": 10, "external_dimensions": "25.3 x 25.3 x 30.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('6b3f1728-e4fd-49d1-a4f4-36ade1416b49', 'E004/054', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BDVC44', NULL, '{"expected_lifespan": 10, "external_dimensions": "25.2 x 26 x 30.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('b8ce710a-a07f-4818-857b-eb6e1e27147e', 'E004/055', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Nilkamal Limited', 'BDVC46', NULL, '{"expected_lifespan": 10, "external_dimensions": "29.5 x 29.5 x 33.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('6f360126-45fa-41a3-8439-2cb5aa45cc8b', 'E004/056', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'bbab79fe-8112-4f90-aabc-726f88a15410', 'Nilkamal Limited', 'RCB244SS', NULL, '{"expected_lifespan": 10, "external_dimensions": "49.3 x 45.5 x 39.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('cd83c1f9-8d64-46bb-afde-23ef64abfc81', 'E004/057', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Qingdao Leff International Trading Co Ltd', 'FFCB-15L', NULL, '{"expected_lifespan": 10, "external_dimensions": "77 x 54 x 47"}');
INSERT INTO public.asset_catalogue_item VALUES ('58cd1449-95cb-40da-b33a-17bd25f62b7e', 'E004/058', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Nilkamal Limited', 'BCVC46LFF', NULL, '{"expected_lifespan": 10, "external_dimensions": "31.8 x 31.8 x 29.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('e68c1615-70e4-4753-8814-5d2c54ad4d1b', 'E004/059', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'B Medical Systems Sarl', 'RCW1', NULL, '{"expected_lifespan": 10, "external_dimensions": "34.7 x 28.1 x 43"}');
INSERT INTO public.asset_catalogue_item VALUES ('f63dddb0-eb02-43ed-9ae5-e13ad2632542', 'E004/060', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Rajas Enterprises', 'RE0333VC', NULL, '{"expected_lifespan": 10, "external_dimensions": "24.8 x 29 x 24.6"}');
INSERT INTO public.asset_catalogue_item VALUES ('56744764-b8af-40c1-a370-f8e34c99cb6a', 'E004/061', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'PARACOAT PRODUCTS LTD', '2CPCPVC-001', NULL, '{"expected_lifespan": 10, "external_dimensions": "24.6 x 30.5 x 24.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('4d7c245f-5d10-4bac-b37b-e61eba497f3e', 'E004/063', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'AOV International LLP', 'AFVC44', NULL, '{"expected_lifespan": 10, "external_dimensions": "28.5 x 28.5 x 27"}');
INSERT INTO public.asset_catalogue_item VALUES ('e30e1f14-2957-4336-8a08-229f044f67ec', 'E004/064', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Qingdao Leff International Trading Co Ltd', 'FFCB-20L', NULL, '{"expected_lifespan": 10, "external_dimensions": "77.5 x 54.5 x 47.3"}');
INSERT INTO public.asset_catalogue_item VALUES ('3ce28e4d-6d28-41d8-b6a2-1c94ea0c1866', 'E004/065', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Blowkings', 'BK-VC-FF 2.4 L', NULL, '{"expected_lifespan": 10, "external_dimensions": "32.5 x 32.5 x 32.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('c6136467-58b1-4904-a82b-81427fef4ad8', 'E004/066', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'TRIMURTI PLAST CONTAINERS PRIVATE LIMITED', 'TPVC 46 LFF', NULL, '{"expected_lifespan": 10, "external_dimensions": "31 x 31 x 30.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('9894255b-fcea-43fb-b3a4-01291aabe2af', 'E004/067', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB503L', NULL, '{"expected_lifespan": 10, "external_dimensions": "78.5 x 63.2 x 53.3"}');
INSERT INTO public.asset_catalogue_item VALUES ('05a85d7b-9a25-40ce-a11e-a8a88e18a873', 'E004/068', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Nilkamal Limited', 'RCB316L', NULL, '{"expected_lifespan": 10, "external_dimensions": "78.5 x 63.2 x 53.3"}');
INSERT INTO public.asset_catalogue_item VALUES ('50f9769d-a042-49ab-8433-b1d9e63d2345', 'E004/069', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', '99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Qingdao Leff International Trading Co Ltd', 'FHCB23-0624', NULL, '{"expected_lifespan": 10, "external_dimensions": "77.5 x 54.5 x 48.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('440df6fb-dc3b-4ce7-b7c3-3b034c74e1d2', 'E004/070', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Gobi Technologies', 'FF001A Eclipse 1.8L', NULL, '{"expected_lifespan": 10, "external_dimensions": "22 x 38.7"}');
INSERT INTO public.asset_catalogue_item VALUES ('a3f03639-4a5a-4393-801c-639d73dba762', 'E004/071', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'GKS Healthsol LLP', 'GKS FFVC-44LR', NULL, '{"expected_lifespan": 10, "external_dimensions": "28.5 x 30.5 x 29.5"}');
INSERT INTO public.asset_catalogue_item VALUES ('189ef51c-d232-4da7-b090-ca3a53d31f58', 'E004/072', 'WHO PQS', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'GKS Healthsol LLP', 'FFVC 44SR', NULL, '{"expected_lifespan": 10, "external_dimensions": "29 x 28.5 x 27.8"}');


--
-- Data for Name: asset_catalogue_type; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.asset_catalogue_type VALUES ('99906787-bd32-4ec2-bd2d-ba5547622bb0', 'Cold box - long range', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO public.asset_catalogue_type VALUES ('bbab79fe-8112-4f90-aabc-726f88a15410', 'Cold box - short range', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO public.asset_catalogue_type VALUES ('c9017d0b-ce3c-40f1-9986-e4afe0185ddd', 'Combined ice-lined refrigerator / freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('0e58c7e6-e603-4513-a088-79fe9f08e22f', 'Combined refrigerator / freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('710194ce-8c6c-47ab-b7fe-13ba8cf091f6', 'Freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('05d9a49a-4d94-4e00-9728-2549ad323544', 'Ultralow freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('4d7302b8-e47b-42fd-ac5e-4645376aa349', 'Ice-lined refrigerator', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('f2f2756e-0c15-49fd-bb01-3f45886e4870', 'Long-term passive storage device', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO public.asset_catalogue_type VALUES ('fd79171f-5da8-4801-b299-9426f34310a8', 'Refrigerator', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('8b32f63b-28ac-4c31-94dc-55ddb5aa131a', 'Solar direct drive combined refrigerator / freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('525b614e-f9f5-4866-9553-24bad2b7b826', 'Solar direct drive freezer', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('d4434727-dc35-437d-a5fa-739a491381b7', 'Solar direct drive refrigerator', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('0b7ac91d-6cfa-49bb-bac2-35e7cb31564b', 'Vaccine carrier', '02cbea92-d5bf-4832-863b-c04e093a7760');
INSERT INTO public.asset_catalogue_type VALUES ('ad3405e1-ef3f-4159-b693-0e7d5fa6a814', 'Vaccine carrier - freeze-free', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d');
INSERT INTO public.asset_catalogue_type VALUES ('9a4ad0dd-138a-41b2-81df-08772635085e', 'Cold room', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad');
INSERT INTO public.asset_catalogue_type VALUES ('6d49edfd-a12b-43c8-99fb-3300d67e0192', 'Freezer room', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad');


--
-- Data for Name: asset_category; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.asset_category VALUES ('b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', 'Insulated containers', 'fad280b6-8384-41af-84cf-c7b6b4526ef0');
INSERT INTO public.asset_category VALUES ('02cbea92-d5bf-4832-863b-c04e093a7760', 'Refrigerators and freezers', 'fad280b6-8384-41af-84cf-c7b6b4526ef0');
INSERT INTO public.asset_category VALUES ('7db32eb6-5929-4dd1-a5e9-01e36baa73ad', 'Cold rooms and freezer rooms', 'fad280b6-8384-41af-84cf-c7b6b4526ef0');


--
-- Data for Name: asset_class; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.asset_class VALUES ('fad280b6-8384-41af-84cf-c7b6b4526ef0', 'Cold chain equipment');


--
-- Data for Name: asset_internal_location; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: asset_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: asset_log_reason; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.asset_log_reason VALUES ('020a3b04-4a29-46ca-9afd-140edcc15b7c', 'Awaiting installation', NULL, 'NOT_IN_USE');
INSERT INTO public.asset_log_reason VALUES ('44f648e9-2ff1-4010-be84-6bb6befce2d7', 'Stored', NULL, 'NOT_IN_USE');
INSERT INTO public.asset_log_reason VALUES ('772231c3-d715-4a80-868b-57afb58f7e89', 'Offsite for repairs', NULL, 'NOT_IN_USE');
INSERT INTO public.asset_log_reason VALUES ('6c79d05f-ebd0-4a1d-9d7e-fcea52fb24e4', 'Awaiting decommissioning', NULL, 'NOT_IN_USE');
INSERT INTO public.asset_log_reason VALUES ('325c1a24-97eb-4597-885d-253a52430125', 'Needs servicing', NULL, 'FUNCTIONING_BUT_NEEDS_ATTENTION');
INSERT INTO public.asset_log_reason VALUES ('2f734462-c76d-4b08-b8d2-40b250538d46', 'Multiple temperature breaches', NULL, 'NOT_IN_USE');
INSERT INTO public.asset_log_reason VALUES ('d37a8d80-aaa7-4585-a1fc-0c69f7770129', 'Unknown', NULL, 'NOT_IN_USE');
INSERT INTO public.asset_log_reason VALUES ('b4ae8758-27d8-440c-8f23-08d5423748e8', 'Needs spare parts', NULL, 'NOT_FUNCTIONING');
INSERT INTO public.asset_log_reason VALUES ('290ed6c8-20ef-469d-bf6c-dd944ae24e8f', 'Lack of power', NULL, 'NOT_FUNCTIONING');


--
-- Data for Name: asset_property; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.asset_property VALUES ('external_dimensions', 'external_dimensions', 'External dimensions - WxDxH (in cm)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', NULL, NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('storage_capacity_5c-cr', 'storage_capacity_5c', 'Storage capacity +5 °C (litres)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('storage_capacity_20c-cr', 'storage_capacity_20c', 'Storage capacity -20 °C (litres)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('storage_capacity_70c-cr', 'storage_capacity_70c', 'Storage capacity -70 °C (litres)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('waterpack_storage_capacity-cr', 'waterpack_storage_capacity', 'Waterpack storage capacity (Kg)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('waterpack_freezing_capacity-cr', 'waterpack_freezing_capacity', 'Waterpack freezing capacity per 24 hours (Kg)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('energy_consumption_stable-cr', 'energy_consumption_stable', 'Energy consumption (stable running, continuous power) (KW per day)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('energy_consumption_freezing-cr', 'energy_consumption_freezing', 'Energy consumption during freezing (KW per day)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('hold_over_time-cr', 'hold_over_time', 'Hold over time (hours)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('climate_zone-cr', 'climate_zone', 'Climate zone', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('freeze_protection-cr', 'freeze_protection', 'Freeze protection', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('temperature_monitoring_device-cr', 'temperature_monitoring_device', 'Temperature monitoring device', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'STRING', 'Integrated, External, None');
INSERT INTO public.asset_property VALUES ('voltage_stabilizer-cr', 'voltage_stabilizer', 'Voltage stabilizer', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'STRING', 'Integrated, External, None');
INSERT INTO public.asset_property VALUES ('energy_source-cr', 'energy_source', 'Energy Source', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('refrigerant_type-cr', 'refrigerant_type', 'Refrigerant Type(s)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '7db32eb6-5929-4dd1-a5e9-01e36baa73ad', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('storage_capacity_5c-fr', 'storage_capacity_5c', 'Storage capacity +5 °C (litres)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('storage_capacity_20c-fr', 'storage_capacity_20c', 'Storage capacity -20 °C (litres)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('storage_capacity_70c-fr', 'storage_capacity_70c', 'Storage capacity -70 °C (litres)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('waterpack_storage_capacity-fr', 'waterpack_storage_capacity', 'Waterpack storage capacity (Kg)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('waterpack_freezing_capacity-fr', 'waterpack_freezing_capacity', 'Waterpack freezing capacity per 24 hours (Kg)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('energy_consumption_stable-fr', 'energy_consumption_stable', 'Energy consumption (stable running, continuous power) (KW per day)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('energy_consumption_freezing-fr', 'energy_consumption_freezing', 'Energy consumption during freezing (KW per day)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('hold_over_time-fr', 'hold_over_time', 'Hold over time (hours)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'FLOAT', NULL);
INSERT INTO public.asset_property VALUES ('climate_zone-fr', 'climate_zone', 'Climate zone', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('freeze_protection-fr', 'freeze_protection', 'Freeze protection', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('temperature_monitoring_device-fr', 'temperature_monitoring_device', 'Temperature monitoring device', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'STRING', 'Integrated, External, None');
INSERT INTO public.asset_property VALUES ('voltage_stabilizer-fr', 'voltage_stabilizer', 'Voltage stabilizer', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'STRING', 'Integrated, External, None');
INSERT INTO public.asset_property VALUES ('energy_source-fr', 'energy_source', 'Energy Source', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('refrigerant_type-fr', 'refrigerant_type', 'Refrigerant Type(s)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', '02cbea92-d5bf-4832-863b-c04e093a7760', NULL, 'STRING', NULL);
INSERT INTO public.asset_property VALUES ('temperature_monitoring_device-ic', 'temperature_monitoring_device', 'Temperature monitoring device', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', 'b7eea921-5a14-44cc-b5e0-ea59f2e9cb8d', NULL, 'STRING', 'Integrated, External, None');
INSERT INTO public.asset_property VALUES ('expected_lifespan', 'expected_lifespan', 'Expected Lifespan (in years)', 'fad280b6-8384-41af-84cf-c7b6b4526ef0', NULL, NULL, 'FLOAT', NULL);


--
-- Data for Name: backend_plugin; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: barcode; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: bundled_item; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: campaign; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: category; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: changelog; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clinician; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clinician_link; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clinician_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contact; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contact_form; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: contact_trace; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: context; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.context VALUES ('Patient', 'Patient context');
INSERT INTO public.context VALUES ('Immunisation', 'Immunisation context');
INSERT INTO public.context VALUES ('missing_program', 'missing_program');


--
-- Data for Name: currency; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: demographic; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: demographic_indicator; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: demographic_projection; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: diagnosis; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: document_registry; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: email_queue; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: encounter; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: form_schema; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: frontend_plugin; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: goods_received; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: goods_received_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: indicator_column; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: indicator_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: indicator_value; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: insurance_provider; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: invoice; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: invoice_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item_category_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item_direction; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item_link; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item_variant; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: item_warning_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: key_value_store; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.key_value_store VALUES ('DATABASE_VERSION', '2.15.0', NULL, NULL, NULL, NULL);


--
-- Data for Name: location; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: location_movement; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: location_type; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: master_list; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.master_list VALUES ('missing_program', 'missing_program', 'missing_program', 'missing_program', false, false, NULL);


--
-- Data for Name: master_list_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: master_list_name_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: migration_fragment_log; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.migration_fragment_log VALUES ('2.2.0-add_low_stock_and_requisition_line_id', '2026-01-08 02:41:35.455415');
INSERT INTO public.migration_fragment_log VALUES ('2.2.0-requisitions_in_period', '2026-01-08 02:41:35.456207');
INSERT INTO public.migration_fragment_log VALUES ('2.2.0-add_requisition_approved_activity_type', '2026-01-08 02:41:35.456488');
INSERT INTO public.migration_fragment_log VALUES ('2.2.0-fix_rnr_form_line_columns', '2026-01-08 02:41:35.458781');
INSERT INTO public.migration_fragment_log VALUES ('2.2.1-add_store_ids_to_existing_rnr_form_changelogs', '2026-01-08 02:41:35.459561');
INSERT INTO public.migration_fragment_log VALUES ('2.2.2-master_list_default_price_list', '2026-01-08 02:41:35.460202');
INSERT INTO public.migration_fragment_log VALUES ('2.2.2-master_list_line_price_per_unit', '2026-01-08 02:41:35.460561');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-drop_program_deleted_datetime', '2026-01-08 02:41:35.465379');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-rename_vaccine_course_schedule_to_dose', '2026-01-08 02:41:35.465762');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-remove_num_doses_from_vaccine_course', '2026-01-08 02:41:35.465977');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-remove_vaccine_course_dose_dose_number', '2026-01-08 02:41:35.466179');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccine_course_changelog_table_names', '2026-01-08 02:41:35.466392');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccinations_table', '2026-01-08 02:41:35.467676');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccination_activity_log_type', '2026-01-08 02:41:35.467892');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccine_doses_to_item', '2026-01-08 02:41:35.468315');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_max_age_to_vaccine_dose', '2026-01-08 02:41:35.468625');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_report_version_fields', '2026-01-08 02:41:35.469237');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_facility_to_vaccination', '2026-01-08 02:41:35.469596');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccine_course_dose_deleted_datetime', '2026-01-08 02:41:35.469871');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccine_course_dose_custom_age_label', '2026-01-08 02:41:35.470075');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_backdated_datetime', '2026-01-08 02:41:35.470408');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_vaccine_course_item_deleted_datetime', '2026-01-08 02:41:35.470655');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-add_store_id_to_program_enrolment', '2026-01-08 02:41:35.471065');
INSERT INTO public.migration_fragment_log VALUES ('2.3.0-remove_stops_from_report_ids', '2026-01-08 02:41:35.471292');
INSERT INTO public.migration_fragment_log VALUES ('2.3.1-add_demographic_table', '2026-01-08 02:41:35.472824');
INSERT INTO public.migration_fragment_log VALUES ('2.3.1-move_vaccine_course_to_demographic', '2026-01-08 02:41:35.47342');
INSERT INTO public.migration_fragment_log VALUES ('2.3.1-add_reference_and_comment_to_rnr_form', '2026-01-08 02:41:35.473777');
INSERT INTO public.migration_fragment_log VALUES ('2.3.1-add_rnr_columns', '2026-01-08 02:41:35.474156');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-delete_pack_variant', '2026-01-08 02:41:35.475213');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_reason_option_table', '2026-01-08 02:41:35.476309');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_manual_requisition_line_fields', '2026-01-08 02:41:35.478334');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_unserviceable_status_to_asset_status_enum', '2026-01-08 02:41:35.478569');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_expected_lifespan_to_assets', '2026-01-08 02:41:35.480977');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_cold_storage_type_table', '2026-01-08 02:41:35.482161');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-item_variant', '2026-01-08 02:41:35.484311');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-program_indicator_create_table', '2026-01-08 02:41:35.48526');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_item_variant_id_to_stock_line_and_invoice_line', '2026-01-08 02:41:35.485818');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-indicator_column_create_table', '2026-01-08 02:41:35.487748');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-indicator_value_create_table', '2026-01-08 02:41:35.489319');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_bundled_item_table', '2026-01-08 02:41:35.490497');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_demographic_indicator_types_to_activity_log', '2026-01-08 02:41:35.490779');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-indicator_indexes', '2026-01-08 02:41:35.492232');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_store_pref_use_extra_fields', '2026-01-08 02:41:35.49264');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-add_item_variant_id_to_stocktake_line', '2026-01-08 02:41:35.492997');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-item_changelog', '2026-01-08 02:41:35.493199');
INSERT INTO public.migration_fragment_log VALUES ('2.4.0-fix_asset_log_reasons_postgres', '2026-01-08 02:41:35.493704');
INSERT INTO public.migration_fragment_log VALUES ('2.4.1-item_categories', '2026-01-08 02:41:35.495871');
INSERT INTO public.migration_fragment_log VALUES ('2.4.1-system_log_table', '2026-01-08 02:41:35.49734');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_contact_form_table', '2026-01-08 02:41:35.499317');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-new_store_preferences', '2026-01-08 02:41:35.499995');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-remove_unique_description_on_tmp_breach', '2026-01-08 02:41:35.500378');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_emergency_orders', '2026-01-08 02:41:35.500813');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-abbreviation_create_table', '2026-01-08 02:41:35.501586');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-remove_contact_form_site_id', '2026-01-08 02:41:35.501826');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-item_direction_create_table', '2026-01-08 02:41:35.502715');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-diagnosis_create_table', '2026-01-08 02:41:35.503608');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_email_queue_table', '2026-01-08 02:41:35.504608');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_elmis_code_to_program', '2026-01-08 02:41:35.504837');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-diagnosis_add_to_invoice', '2026-01-08 02:41:35.505229');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_email_retry_at', '2026-01-08 02:41:35.505435');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-remove_contact_form_user_account_fk', '2026-01-08 02:41:35.50589');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_contact_form_processor_pg_enum_type', '2026-01-08 02:41:35.506083');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-remove_vaccination_user_account_fk', '2026-01-08 02:41:35.506415');
INSERT INTO public.migration_fragment_log VALUES ('2.5.0-add_requisition_is_emergency', '2026-01-08 02:41:35.506815');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_index_to_sync_buffer', '2026-01-08 02:41:35.507608');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_invoice_line_prescribed_quantity', '2026-01-08 02:41:35.507908');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_program_deleted_datetime', '2026-01-08 02:41:35.50816');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-backend_plugin', '2026-01-08 02:41:35.509483');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_create_invoice_from_requisition_permission', '2026-01-08 02:41:35.509668');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_name_next_of_kin_id', '2026-01-08 02:41:35.510349');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_load_plugin_processor_pg_enum_type', '2026-01-08 02:41:35.510532');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_program_id_to_invoice', '2026-01-08 02:41:35.51095');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_insurance_provider', '2026-01-08 02:41:35.511908');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-plugin_data_update', '2026-01-08 02:41:35.513429');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-frontend_plugins', '2026-01-08 02:41:35.514396');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-prescribed_quantity_store_pref', '2026-01-08 02:41:35.515744');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_name_next_of_kin_name', '2026-01-08 02:41:35.516169');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_program_id_to_stocktake', '2026-01-08 02:41:35.516752');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_name_insurance_join', '2026-01-08 02:41:35.518675');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-printer_configuration_create_table', '2026-01-08 02:41:35.534205');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_insurance_fields_to_invoice', '2026-01-08 02:41:35.534888');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_cancelled_status_to_invoice', '2026-01-08 02:41:35.535205');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-report_add_prescription_context', '2026-01-08 02:41:35.535493');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_cancellation_fields_to_invoice', '2026-01-08 02:41:35.536056');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-reinitialise_reports_updated', '2026-01-08 02:41:35.538732');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-report', '2026-01-08 02:41:35.539005');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-om_form_schema', '2026-01-08 02:41:35.539246');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-add_report_is_active', '2026-01-08 02:41:35.539545');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-plugin_data_changelog', '2026-01-08 02:41:35.539751');
INSERT INTO public.migration_fragment_log VALUES ('2.6.0-report_fix_prescriptions_report_code_updated', '2026-01-08 02:41:35.540158');
INSERT INTO public.migration_fragment_log VALUES ('2.6.1-change_vaccination_date_to_nullable', '2026-01-08 02:41:35.540803');
INSERT INTO public.migration_fragment_log VALUES ('2.6.1-remove_plugins', '2026-01-08 02:41:35.541124');
INSERT INTO public.migration_fragment_log VALUES ('2.6.1-report_add_internal_order_context', '2026-01-08 02:41:35.541333');
INSERT INTO public.migration_fragment_log VALUES ('2.6.2-store_reintegrate_for_created_date', '2026-01-08 02:41:35.541765');
INSERT INTO public.migration_fragment_log VALUES ('2.6.2-add_assign_requisition_number_processor_cursor_pg_enum_type', '2026-01-08 02:41:35.541972');
INSERT INTO public.migration_fragment_log VALUES ('2.6.3-remove_non_custom_standard_reports', '2026-01-08 02:41:35.542461');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_preference_table', '2026-01-08 02:41:35.543669');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_linked_invoice_id_to_invoice_line', '2026-01-08 02:41:35.543951');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_expected_delivery_date', '2026-01-08 02:41:35.544212');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-new_stocktake_fields', '2026-01-08 02:41:35.544464');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-asset_data_matrix_permission', '2026-01-08 02:41:35.544652');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-asset_data_matrix_locked_fields', '2026-01-08 02:41:35.544874');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_patient_link_id_to_vaccination', '2026-01-08 02:41:35.545478');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-change_vaccination_date_to_not_nullable', '2026-01-08 02:41:35.545844');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-remove_encounter_clinician_link_constraint2', '2026-01-08 02:41:35.546167');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_warning_table', '2026-01-08 02:41:35.546869');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_item_warning_join_table', '2026-01-08 02:41:35.547795');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_given_store_id_to_vaccination', '2026-01-08 02:41:35.548321');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-trigger_patient_visibility_sync', '2026-01-08 02:41:35.548825');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-add_central_patient_visibility_processor_pg_enum_type', '2026-01-08 02:41:35.549107');
INSERT INTO public.migration_fragment_log VALUES ('2.7.0-drop_encounters_report', '2026-01-08 02:41:35.549302');
INSERT INTO public.migration_fragment_log VALUES ('2.7.4-create_dynamic_cursor_key', '2026-01-08 02:41:35.549737');
INSERT INTO public.migration_fragment_log VALUES ('2.7.4-create_sync_message_table', '2026-01-08 02:41:35.554451');
INSERT INTO public.migration_fragment_log VALUES ('2.7.4-create_plugin_user', '2026-01-08 02:41:35.554795');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_vvm_status_table', '2026-01-08 02:41:35.556062');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_doses_columns_to_item_variant', '2026-01-08 02:41:35.556438');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_initial_stocktake_field', '2026-01-08 02:41:35.556795');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_created_fields_to_item_variant', '2026-01-08 02:41:35.557135');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_item_variant_enums_to_activity_log', '2026-01-08 02:41:35.557472');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_vvm_status_log_change_log_table_name', '2026-01-08 02:41:35.557736');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_view_and_edit_vvm_status_permission', '2026-01-08 02:41:35.557964');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_donor_id_to_invoice_and_invoice_lines', '2026-01-08 02:41:35.558378');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_vvm_status_log_update_to_activity_log', '2026-01-08 02:41:35.558593');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_vvm_status_id_to_stock_line', '2026-01-08 02:41:35.559006');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_campaign_table', '2026-01-08 02:41:35.559785');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_campaign_change_log_table_name', '2026-01-08 02:41:35.560021');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_donor_id_to_stock_lines', '2026-01-08 02:41:35.560272');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_donor_id_to_stocktake_line', '2026-01-08 02:41:35.560525');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-migrate_reason_option_ids', '2026-01-08 02:41:35.563408');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_vvm_status_log_table', '2026-01-08 02:41:35.564615');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_vvm_status_id_to_invoice_line', '2026-01-08 02:41:35.565048');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_open_vial_wastage_to_reason_option_type', '2026-01-08 02:41:35.565298');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_campaign_id_to_stock_line', '2026-01-08 02:41:35.56569');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-reintegrate_options_sync_buffer_records', '2026-01-08 02:41:35.565914');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-donor_id_to_donor_link_id', '2026-01-08 02:41:35.567192');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_campaign_id_to_invoice_line_row', '2026-01-08 02:41:35.567632');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-add_population_percentage_to_demographic', '2026-01-08 02:41:35.568329');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-rename_vaccine_course_is_active_to_use_in_gaps', '2026-01-08 02:41:35.568578');
INSERT INTO public.migration_fragment_log VALUES ('2.8.0-sync_donor_id_to_existing_stock_and_invoice_lines', '2026-01-08 02:41:35.568982');
INSERT INTO public.migration_fragment_log VALUES ('2.8.3-invoice_received_status', '2026-01-08 02:41:35.56975');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-process_clinician_store_join_deletes', '2026-01-08 02:41:35.570128');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-add_mutate_clinician_permission', '2026-01-08 02:41:35.570341');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-add_store_id_to_clinician', '2026-01-08 02:41:35.570735');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-extend_name_table_fields', '2026-01-08 02:41:35.571243');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-resync_existing_vaccine_course_records', '2026-01-08 02:41:35.571505');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-resync_existing_vaccine_course_dose_and_item', '2026-01-08 02:41:35.571807');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-add_shipped_number_of_packs_to_invoice_line', '2026-01-08 02:41:35.572062');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-add_shipped_number_of_packs_to_invoice_line_legacy', '2026-01-08 02:41:35.572322');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-add_excel_template_to_report', '2026-01-08 02:41:35.572557');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-resync_existing_vaccination_records', '2026-01-08 02:41:35.57278');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-remove_item_variant_doses_column', '2026-01-08 02:41:35.573077');
INSERT INTO public.migration_fragment_log VALUES ('2.9.0-reintegrate_clinician_gender', '2026-01-08 02:41:35.573354');
INSERT INTO public.migration_fragment_log VALUES ('2.9.1-add_can_cancel_finalised_invoices_user_permission', '2026-01-08 02:41:35.573795');
INSERT INTO public.migration_fragment_log VALUES ('2.9.1-add_delete_rnr_form_activity_log_enum', '2026-01-08 02:41:35.574127');
INSERT INTO public.migration_fragment_log VALUES ('2.9.1-remove_rnr_form_line_entered_losses_default', '2026-01-08 02:41:35.574407');
INSERT INTO public.migration_fragment_log VALUES ('2.9.1-add_invoice_line_shipped_pack_size', '2026-01-08 02:41:35.574707');
INSERT INTO public.migration_fragment_log VALUES ('2.9.1-invoice_line_shipped_pack_size_sync_buffer', '2026-01-08 02:41:35.574969');
INSERT INTO public.migration_fragment_log VALUES ('2.9.2-add_last_fix_ledger_run_key_value_store', '2026-01-08 02:41:35.57544');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_contact_table', '2026-01-08 02:41:35.576604');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_purchase_order_tables', '2026-01-08 02:41:35.579635');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_purchase_order_to_number_type', '2026-01-08 02:41:35.579929');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_purchase_order_report_context', '2026-01-08 02:41:35.580143');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_item_store_join', '2026-01-08 02:41:35.58111');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_purchase_order_permission_enum_values', '2026-01-08 02:41:35.58138');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-rename_cold_storage_type_to_location_type', '2026-01-08 02:41:35.581651');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-delete_unused_number_type', '2026-01-08 02:41:35.581819');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_restricted_location_type_id_to_item', '2026-01-08 02:41:35.582207');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_goods_received_table', '2026-01-08 02:41:35.583635');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_supplier_discount_percentage_to_purchase_order', '2026-01-08 02:41:35.583848');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_stock_volume', '2026-01-08 02:41:35.58458');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-stock_volume_sync_buffer', '2026-01-08 02:41:35.584933');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_item_variant_enums_to_activity_log', '2026-01-08 02:41:35.585126');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_more_dates_to_purchase_order', '2026-01-08 02:41:35.585345');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_goods_received_line_table', '2026-01-08 02:41:35.587167');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_closed_vial_wastage_reason_option_type', '2026-01-08 02:41:35.587465');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_campaign_and_program_to_stocktake_line_row', '2026-01-08 02:41:35.588022');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-rename_vvm_status_level_to_priority', '2026-01-08 02:41:35.588225');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_program_id_to_stock_and_invoice_lines', '2026-01-08 02:41:35.588849');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_volume_to_location', '2026-01-08 02:41:35.58918');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-reintegrate_location_volume', '2026-01-08 02:41:35.589457');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-rename_cold_storage_type_fk.rs', '2026-01-08 02:41:35.590506');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_vvm_status_to_stocktake_line', '2026-01-08 02:41:35.590731');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_comment_to_purchase_order_line', '2026-01-08 02:41:35.590938');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_goods_received_permission_enum_values', '2026-01-08 02:41:35.591163');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-rename_authorised_to_adjusted_number_of_units', '2026-01-08 02:41:35.591353');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-remove_use_campaigns_pref', '2026-01-08 02:41:35.59155');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-activity_log_goods_received', '2026-01-08 02:41:35.591766');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_purchase_order_activity_logs', '2026-01-08 02:41:35.592076');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_goods_received_report_context', '2026-01-08 02:41:35.592303');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_extra_purchase_order_fields', '2026-01-08 02:41:35.592686');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-add_goods_received_id_to_invoice', '2026-01-08 02:41:35.592929');
INSERT INTO public.migration_fragment_log VALUES ('2.10.0-rename_cold_storage_type_activity_log_enum', '2026-01-08 02:41:35.593126');
INSERT INTO public.migration_fragment_log VALUES ('2.10.1-add_name_of_insured_to_name_insurance_join', '2026-01-08 02:41:35.593516');
INSERT INTO public.migration_fragment_log VALUES ('2.11.0-add_permission_to_verify_inbound_shipment', '2026-01-08 02:41:35.593876');
INSERT INTO public.migration_fragment_log VALUES ('2.11.0-update_goods_received_report_context', '2026-01-08 02:41:35.594073');
INSERT INTO public.migration_fragment_log VALUES ('2.11.0-add_purchase_order_line_status_enums', '2026-01-08 02:41:35.594832');
INSERT INTO public.migration_fragment_log VALUES ('2.11.0-add_ignore_for_orders_to_item_store_join', '2026-01-08 02:41:35.595187');
INSERT INTO public.migration_fragment_log VALUES ('2.11.2-add_patient_updated_to_activity_log', '2026-01-08 02:41:35.595609');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-update_purchase_order_status_enum', '2026-01-08 02:41:35.595927');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-update_purchase_order_activity_log_type_enum', '2026-01-08 02:41:35.596227');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-rename_authorised_datetime_to_request_approval_datetime', '2026-01-08 02:41:35.596445');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-add_shipping_method_table', '2026-01-08 02:41:35.597268');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-add_purchase_order_status_logs_to_activity_log_type_enum', '2026-01-08 02:41:35.597516');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-rename_purchase_order_line_price_per_unit_per_pack', '2026-01-08 02:41:35.597717');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-add_skip_dose_option_to_vaccine_course', '2026-01-08 02:41:35.597965');
INSERT INTO public.migration_fragment_log VALUES ('2.12.0-add_requisition_auto_finalise_processor_cursor_pg_enum', '2026-01-08 02:41:35.598146');
INSERT INTO public.migration_fragment_log VALUES ('2.13.0-add_created_from_req_ids_to_requisition', '2026-01-08 02:41:35.598775');
INSERT INTO public.migration_fragment_log VALUES ('2.13.0-add_master_list_to_changelog', '2026-01-08 02:41:35.598997');
INSERT INTO public.migration_fragment_log VALUES ('2.13.0-add_margin_to_item_store_join', '2026-01-08 02:41:35.599309');
INSERT INTO public.migration_fragment_log VALUES ('2.13.1-reintegrate asset tables', '2026-01-08 02:41:35.599645');
INSERT INTO public.migration_fragment_log VALUES ('2.13.1-can_edit_asset_status_permission', '2026-01-08 02:41:35.599824');
INSERT INTO public.migration_fragment_log VALUES ('2.13.1-remove_fk_on_asset_internal_location', '2026-01-08 02:41:35.600112');
INSERT INTO public.migration_fragment_log VALUES ('2.13.1-update_store_id_for_asset_internal_location_changelog', '2026-01-08 02:41:35.60066');
INSERT INTO public.migration_fragment_log VALUES ('2.14.0-add_encounter_changelog_table_name', '2026-01-08 02:41:35.601023');
INSERT INTO public.migration_fragment_log VALUES ('2.14.0-requisition_line_add_price_per_unit', '2026-01-08 02:41:35.601273');
INSERT INTO public.migration_fragment_log VALUES ('2.14.0-resync_existing_vaccination_encounter_records', '2026-01-08 02:41:35.601678');
INSERT INTO public.migration_fragment_log VALUES ('2.15.0-remove_skip_immediate_statuses_in_outbound_pref', '2026-01-08 02:41:35.602007');


--
-- Data for Name: name; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_insurance_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_link; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_property; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_tag; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_tag_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: number; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: packaging_variant; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: period; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: period_schedule; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: plugin_data; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: preference; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: printer; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.program VALUES ('missing_program', 'missing_program', 'missing_program', 'missing_program', false, NULL, NULL);


--
-- Data for Name: program_enrolment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program_event; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program_indicator; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program_requisition_order_type; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program_requisition_settings; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: property; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: purchase_order; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: purchase_order_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: reason_option; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: report; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: requisition; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: requisition_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: rnr_form; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: rnr_form_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sensor; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: shipping_method; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: stock_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: stocktake; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: stocktake_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: store; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: store_preference; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sync_buffer; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sync_file_reference; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sync_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sync_message; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: system_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: temperature_breach; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: temperature_breach_config; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: temperature_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: unit; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_account; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.user_account VALUES ('omsupply_system', 'omsupply_system', '', NULL, 'ENGLISH', NULL, NULL, NULL, NULL, NULL);
INSERT INTO public.user_account VALUES ('omsupply_plugin', 'omsupply_plugin', '', NULL, 'ENGLISH', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: user_permission; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: vaccination; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: vaccine_course; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: vaccine_course_dose; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: vaccine_course_item; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: vvm_status; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: vvm_status_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: warning; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: changelog_cursor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.changelog_cursor_seq', 181, true);


--
-- Name: __diesel_schema_migrations __diesel_schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__diesel_schema_migrations
    ADD CONSTRAINT __diesel_schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: abbreviation abbreviation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.abbreviation
    ADD CONSTRAINT abbreviation_pkey PRIMARY KEY (id);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: asset_catalogue_item asset_catalogue_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_code_key UNIQUE (code);


--
-- Name: asset_catalogue_item asset_catalogue_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_pkey PRIMARY KEY (id);


--
-- Name: asset_catalogue_type asset_catalogue_type_asset_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_type
    ADD CONSTRAINT asset_catalogue_type_asset_category_id_name_key UNIQUE (asset_category_id, name);


--
-- Name: asset_catalogue_type asset_catalogue_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_type
    ADD CONSTRAINT asset_catalogue_type_pkey PRIMARY KEY (id);


--
-- Name: asset_category asset_category_asset_class_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_category
    ADD CONSTRAINT asset_category_asset_class_id_name_key UNIQUE (asset_class_id, name);


--
-- Name: asset_category asset_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_category
    ADD CONSTRAINT asset_category_pkey PRIMARY KEY (id);


--
-- Name: asset_class asset_class_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_class
    ADD CONSTRAINT asset_class_name_key UNIQUE (name);


--
-- Name: asset_class asset_class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_class
    ADD CONSTRAINT asset_class_pkey PRIMARY KEY (id);


--
-- Name: asset_internal_location asset_internal_location_location_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_location_id_key UNIQUE (location_id);


--
-- Name: asset_internal_location asset_internal_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_pkey PRIMARY KEY (id);


--
-- Name: asset_log asset_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_log
    ADD CONSTRAINT asset_log_pkey PRIMARY KEY (id);


--
-- Name: asset_log_reason asset_log_reason_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_log_reason
    ADD CONSTRAINT asset_log_reason_pkey PRIMARY KEY (id);


--
-- Name: asset asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_pkey PRIMARY KEY (id);


--
-- Name: asset_property asset_property_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_property
    ADD CONSTRAINT asset_property_pkey PRIMARY KEY (id);


--
-- Name: backend_plugin backend_plugin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.backend_plugin
    ADD CONSTRAINT backend_plugin_pkey PRIMARY KEY (id);


--
-- Name: barcode barcode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_pkey PRIMARY KEY (id);


--
-- Name: barcode barcode_value_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_value_key UNIQUE (gtin);


--
-- Name: bundled_item bundled_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundled_item
    ADD CONSTRAINT bundled_item_pkey PRIMARY KEY (id);


--
-- Name: campaign campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign
    ADD CONSTRAINT campaign_pkey PRIMARY KEY (id);


--
-- Name: category category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category
    ADD CONSTRAINT category_pkey PRIMARY KEY (id);


--
-- Name: changelog changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_pkey PRIMARY KEY (cursor);


--
-- Name: clinician_link clinician_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_link
    ADD CONSTRAINT clinician_link_pkey PRIMARY KEY (id);


--
-- Name: clinician clinician_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician
    ADD CONSTRAINT clinician_pkey PRIMARY KEY (id);


--
-- Name: clinician_store_join clinician_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_pkey PRIMARY KEY (id);


--
-- Name: location_type cold_storage_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_type
    ADD CONSTRAINT cold_storage_type_pkey PRIMARY KEY (id);


--
-- Name: contact_form contact_form_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_form
    ADD CONSTRAINT contact_form_pkey PRIMARY KEY (id);


--
-- Name: contact contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_pkey PRIMARY KEY (id);


--
-- Name: contact_trace contact_trace_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_pkey PRIMARY KEY (id);


--
-- Name: context context_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.context
    ADD CONSTRAINT context_pkey PRIMARY KEY (id);


--
-- Name: currency currency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_pkey PRIMARY KEY (id);


--
-- Name: demographic_indicator demographic_indicator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_indicator
    ADD CONSTRAINT demographic_indicator_pkey PRIMARY KEY (id);


--
-- Name: demographic demographic_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic
    ADD CONSTRAINT demographic_pkey PRIMARY KEY (id);


--
-- Name: demographic_projection demographic_projection_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_projection
    ADD CONSTRAINT demographic_projection_pkey PRIMARY KEY (id);


--
-- Name: diagnosis diagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.diagnosis
    ADD CONSTRAINT diagnosis_pkey PRIMARY KEY (id);


--
-- Name: document document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);


--
-- Name: document_registry document_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_pkey PRIMARY KEY (id);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);


--
-- Name: encounter encounter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_pkey PRIMARY KEY (id);


--
-- Name: form_schema form_schema_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.form_schema
    ADD CONSTRAINT form_schema_pkey PRIMARY KEY (id);


--
-- Name: frontend_plugin frontend_plugin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.frontend_plugin
    ADD CONSTRAINT frontend_plugin_pkey PRIMARY KEY (id);


--
-- Name: goods_received_line goods_received_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_line
    ADD CONSTRAINT goods_received_line_pkey PRIMARY KEY (id);


--
-- Name: goods_received goods_received_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received
    ADD CONSTRAINT goods_received_pkey PRIMARY KEY (id);


--
-- Name: indicator_column indicator_column_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_column
    ADD CONSTRAINT indicator_column_pkey PRIMARY KEY (id);


--
-- Name: indicator_line indicator_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_line
    ADD CONSTRAINT indicator_line_pkey PRIMARY KEY (id);


--
-- Name: indicator_value indicator_value_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_pkey PRIMARY KEY (id);


--
-- Name: insurance_provider insurance_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insurance_provider
    ADD CONSTRAINT insurance_provider_pkey PRIMARY KEY (id);


--
-- Name: invoice_line invoice_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_pkey PRIMARY KEY (id);


--
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (id);


--
-- Name: item_category_join item_category_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_category_join
    ADD CONSTRAINT item_category_join_pkey PRIMARY KEY (id);


--
-- Name: item_direction item_direction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_direction
    ADD CONSTRAINT item_direction_pkey PRIMARY KEY (id);


--
-- Name: item_link item_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_link
    ADD CONSTRAINT item_link_pkey PRIMARY KEY (id);


--
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


--
-- Name: item_store_join item_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_store_join
    ADD CONSTRAINT item_store_join_pkey PRIMARY KEY (id);


--
-- Name: item_variant item_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_pkey PRIMARY KEY (id);


--
-- Name: item_warning_join item_warning_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_warning_join
    ADD CONSTRAINT item_warning_join_pkey PRIMARY KEY (id);


--
-- Name: key_value_store key_value_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.key_value_store
    ADD CONSTRAINT key_value_store_pkey PRIMARY KEY (id);


--
-- Name: location_movement location_movement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_pkey PRIMARY KEY (id);


--
-- Name: location location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_pkey PRIMARY KEY (id);


--
-- Name: master_list_line master_list_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_pkey PRIMARY KEY (id);


--
-- Name: master_list_name_join master_list_name_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_pkey PRIMARY KEY (id);


--
-- Name: master_list master_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list
    ADD CONSTRAINT master_list_pkey PRIMARY KEY (id);


--
-- Name: migration_fragment_log migration_fragment_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migration_fragment_log
    ADD CONSTRAINT migration_fragment_log_pkey PRIMARY KEY (version_and_identifier);


--
-- Name: name_insurance_join name_insurance_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_insurance_join
    ADD CONSTRAINT name_insurance_join_pkey PRIMARY KEY (id);


--
-- Name: name_link name_link_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_link
    ADD CONSTRAINT name_link_pkey PRIMARY KEY (id);


--
-- Name: name name_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name
    ADD CONSTRAINT name_pkey PRIMARY KEY (id);


--
-- Name: name_property name_property_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_property
    ADD CONSTRAINT name_property_pkey PRIMARY KEY (id);


--
-- Name: name_store_join name_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_pkey PRIMARY KEY (id);


--
-- Name: name_tag_join name_tag_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_tag_join
    ADD CONSTRAINT name_tag_join_pkey PRIMARY KEY (id);


--
-- Name: name_tag name_tag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_tag
    ADD CONSTRAINT name_tag_pkey PRIMARY KEY (id);


--
-- Name: number number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.number
    ADD CONSTRAINT number_pkey PRIMARY KEY (id);


--
-- Name: packaging_variant packaging_variant_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packaging_variant
    ADD CONSTRAINT packaging_variant_pkey PRIMARY KEY (id);


--
-- Name: period period_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period
    ADD CONSTRAINT period_pkey PRIMARY KEY (id);


--
-- Name: period_schedule period_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period_schedule
    ADD CONSTRAINT period_schedule_pkey PRIMARY KEY (id);


--
-- Name: plugin_data plugin_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugin_data
    ADD CONSTRAINT plugin_data_pkey PRIMARY KEY (id);


--
-- Name: preference preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preference
    ADD CONSTRAINT preference_pkey PRIMARY KEY (id);


--
-- Name: printer printer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.printer
    ADD CONSTRAINT printer_pkey PRIMARY KEY (id);


--
-- Name: program_enrolment program_enrolment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_pkey PRIMARY KEY (id);


--
-- Name: program_event program_event_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_pkey PRIMARY KEY (id);


--
-- Name: program_indicator program_indicator_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_indicator
    ADD CONSTRAINT program_indicator_pkey PRIMARY KEY (id);


--
-- Name: program program_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_pkey PRIMARY KEY (id);


--
-- Name: program_requisition_order_type program_requisition_order_type_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_requisition_order_type
    ADD CONSTRAINT program_requisition_order_type_pkey PRIMARY KEY (id);


--
-- Name: program_requisition_settings program_requisition_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_pkey PRIMARY KEY (id);


--
-- Name: property property_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.property
    ADD CONSTRAINT property_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_line purchase_order_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_pkey PRIMARY KEY (id);


--
-- Name: purchase_order purchase_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_pkey PRIMARY KEY (id);


--
-- Name: reason_option reason_option_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reason_option
    ADD CONSTRAINT reason_option_pkey PRIMARY KEY (id);


--
-- Name: report report_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_pkey PRIMARY KEY (id);


--
-- Name: requisition_line requisition_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_pkey PRIMARY KEY (id);


--
-- Name: requisition requisition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_pkey PRIMARY KEY (id);


--
-- Name: rnr_form_line rnr_form_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form_line
    ADD CONSTRAINT rnr_form_line_pkey PRIMARY KEY (id);


--
-- Name: rnr_form rnr_form_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_pkey PRIMARY KEY (id);


--
-- Name: sensor sensor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_pkey PRIMARY KEY (id);


--
-- Name: shipping_method shipping_method_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method
    ADD CONSTRAINT shipping_method_pkey PRIMARY KEY (id);


--
-- Name: stock_line stock_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_pkey PRIMARY KEY (id);


--
-- Name: stocktake_line stocktake_line_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_pkey PRIMARY KEY (id);


--
-- Name: stocktake stocktake_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_pkey PRIMARY KEY (id);


--
-- Name: store store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_pkey PRIMARY KEY (id);


--
-- Name: store_preference store_preference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_preference
    ADD CONSTRAINT store_preference_pkey PRIMARY KEY (id);


--
-- Name: sync_buffer sync_buffer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_buffer
    ADD CONSTRAINT sync_buffer_pkey PRIMARY KEY (record_id);


--
-- Name: sync_file_reference sync_file_reference_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_file_reference
    ADD CONSTRAINT sync_file_reference_pkey PRIMARY KEY (id);


--
-- Name: sync_log sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_log
    ADD CONSTRAINT sync_log_pkey PRIMARY KEY (id);


--
-- Name: sync_message sync_message_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_message
    ADD CONSTRAINT sync_message_pkey PRIMARY KEY (id);


--
-- Name: system_log system_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_log
    ADD CONSTRAINT system_log_pkey PRIMARY KEY (id);


--
-- Name: temperature_breach_config temperature_breach_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_breach_config
    ADD CONSTRAINT temperature_breach_config_pkey PRIMARY KEY (id);


--
-- Name: temperature_breach temperature_breach_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_pkey PRIMARY KEY (id);


--
-- Name: temperature_log temperature_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_pkey PRIMARY KEY (id);


--
-- Name: unit unit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unit
    ADD CONSTRAINT unit_pkey PRIMARY KEY (id);


--
-- Name: user_account user_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_account
    ADD CONSTRAINT user_account_pkey PRIMARY KEY (id);


--
-- Name: user_permission user_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission
    ADD CONSTRAINT user_permission_pkey PRIMARY KEY (id);


--
-- Name: user_store_join user_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_store_join
    ADD CONSTRAINT user_store_join_pkey PRIMARY KEY (id);


--
-- Name: vaccination vaccination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination
    ADD CONSTRAINT vaccination_pkey PRIMARY KEY (id);


--
-- Name: vaccine_course_item vaccine_course_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course_item
    ADD CONSTRAINT vaccine_course_item_pkey PRIMARY KEY (id);


--
-- Name: vaccine_course vaccine_course_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course
    ADD CONSTRAINT vaccine_course_pkey PRIMARY KEY (id);


--
-- Name: vaccine_course_dose vaccine_course_schedule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course_dose
    ADD CONSTRAINT vaccine_course_schedule_pkey PRIMARY KEY (id);


--
-- Name: vvm_status_log vvm_status_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vvm_status_log
    ADD CONSTRAINT vvm_status_log_pkey PRIMARY KEY (id);


--
-- Name: vvm_status vvm_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vvm_status
    ADD CONSTRAINT vvm_status_pkey PRIMARY KEY (id);


--
-- Name: warning warning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warning
    ADD CONSTRAINT warning_pkey PRIMARY KEY (id);


--
-- Name: asset_asset_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_asset_number ON public.asset USING btree (asset_number);


--
-- Name: asset_catalogue_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_catalogue_item_id ON public.asset USING btree (asset_catalogue_item_id);


--
-- Name: asset_deleted_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_deleted_datetime ON public.asset USING btree (deleted_datetime);


--
-- Name: asset_internal_location_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_internal_location_asset_id ON public.asset_internal_location USING btree (asset_id);


--
-- Name: asset_serial_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX asset_serial_number ON public.asset USING btree (serial_number);


--
-- Name: i_program_requisition_ot_program_requisition_settings; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX i_program_requisition_ot_program_requisition_settings ON public.program_requisition_order_type USING btree (program_requisition_settings_id);


--
-- Name: idx_purchase_order_line_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchase_order_line_status ON public.purchase_order_line USING btree (status);


--
-- Name: index_activity_log_record_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_activity_log_record_id_fkey ON public.activity_log USING btree (record_id);


--
-- Name: index_activity_log_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_activity_log_store_id_fkey ON public.activity_log USING btree (store_id);


--
-- Name: index_barcode_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_barcode_item_id ON public.barcode USING btree (item_id);


--
-- Name: index_barcode_manufacturer_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_barcode_manufacturer_link_id_fkey ON public.barcode USING btree (manufacturer_link_id);


--
-- Name: index_changelog_name_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_changelog_name_link_id_fkey ON public.changelog USING btree (name_link_id);


--
-- Name: index_changelog_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_changelog_record_id ON public.changelog USING btree (record_id);


--
-- Name: index_changelog_row_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_changelog_row_action ON public.changelog USING btree (row_action);


--
-- Name: index_changelog_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_changelog_store_id_fkey ON public.changelog USING btree (store_id);


--
-- Name: index_changelog_table_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_changelog_table_name ON public.changelog USING btree (table_name);


--
-- Name: index_clinician_link_clinician_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_clinician_link_clinician_id_fkey ON public.clinician_link USING btree (clinician_id);


--
-- Name: index_clinician_store_join_clinician_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_clinician_store_join_clinician_link_id_fkey ON public.clinician_store_join USING btree (clinician_link_id);


--
-- Name: index_clinician_store_join_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_clinician_store_join_store_id ON public.clinician_store_join USING btree (store_id);


--
-- Name: index_contact_trace_contact_patient_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contact_trace_contact_patient_link_id ON public.contact_trace USING btree (contact_patient_link_id);


--
-- Name: index_contact_trace_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contact_trace_document_id ON public.contact_trace USING btree (document_id);


--
-- Name: index_contact_trace_patient_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contact_trace_patient_link_id ON public.contact_trace USING btree (patient_link_id);


--
-- Name: index_contact_trace_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contact_trace_program_id ON public.contact_trace USING btree (program_id);


--
-- Name: index_contact_trace_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_contact_trace_store_id ON public.contact_trace USING btree (store_id);


--
-- Name: index_document_context_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_context_id ON public.document USING btree (context_id);


--
-- Name: index_document_form_schema_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_form_schema_id ON public.document USING btree (form_schema_id);


--
-- Name: index_document_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_name ON public.document USING btree (name);


--
-- Name: index_document_owner_name_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_owner_name_link_id ON public.document USING btree (owner_name_link_id);


--
-- Name: index_document_registry_context_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_registry_context_id ON public.document_registry USING btree (context_id);


--
-- Name: index_document_registry_form_schema_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_document_registry_form_schema_id ON public.document_registry USING btree (form_schema_id);


--
-- Name: index_encounter_clinician_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_encounter_clinician_link_id_fkey ON public.encounter USING btree (clinician_link_id);


--
-- Name: index_encounter_enrolment_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_encounter_enrolment_program_id ON public.encounter USING btree (program_id);


--
-- Name: index_encounter_patient_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_encounter_patient_link_id_fkey ON public.encounter USING btree (patient_link_id);


--
-- Name: index_invoice_clinician_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_clinician_link_id_fkey ON public.invoice USING btree (clinician_link_id);


--
-- Name: index_invoice_created_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_created_datetime ON public.invoice USING btree (created_datetime);


--
-- Name: index_invoice_invoice_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_invoice_number ON public.invoice USING btree (invoice_number);


--
-- Name: index_invoice_line_invoice_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_invoice_id_fkey ON public.invoice_line USING btree (invoice_id);


--
-- Name: index_invoice_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_item_link_id_fkey ON public.invoice_line USING btree (item_link_id);


--
-- Name: index_invoice_line_location_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_location_id_fkey ON public.invoice_line USING btree (location_id);


--
-- Name: index_invoice_line_number_of_packs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_number_of_packs ON public.invoice_line USING btree (number_of_packs);


--
-- Name: index_invoice_line_stock_line_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_stock_line_id_fkey ON public.invoice_line USING btree (stock_line_id);


--
-- Name: index_invoice_line_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_line_type ON public.invoice_line USING btree (type);


--
-- Name: index_invoice_linked_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_linked_invoice_id ON public.invoice USING btree (linked_invoice_id);


--
-- Name: index_invoice_name_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_name_link_id_fkey ON public.invoice USING btree (name_link_id);


--
-- Name: index_invoice_name_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_name_store_id_fkey ON public.invoice USING btree (name_store_id);


--
-- Name: index_invoice_requisition_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_requisition_id ON public.invoice USING btree (requisition_id);


--
-- Name: index_invoice_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_status ON public.invoice USING btree (status);


--
-- Name: index_invoice_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_store_id_fkey ON public.invoice USING btree (store_id);


--
-- Name: index_invoice_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_invoice_type ON public.invoice USING btree (type);


--
-- Name: index_item_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_item_is_active ON public.item USING btree (is_active);


--
-- Name: index_item_is_vaccine; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_item_is_vaccine ON public.item USING btree (is_vaccine);


--
-- Name: index_item_link_item_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_item_link_item_id_fkey ON public.item_link USING btree (item_id);


--
-- Name: index_item_unit_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_item_unit_id_fkey ON public.item USING btree (unit_id);


--
-- Name: index_location_movement_location_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_location_movement_location_id_fkey ON public.location_movement USING btree (location_id);


--
-- Name: index_location_movement_stock_line_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_location_movement_stock_line_id_fkey ON public.location_movement USING btree (stock_line_id);


--
-- Name: index_location_movement_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_location_movement_store_id_fkey ON public.location_movement USING btree (store_id);


--
-- Name: index_location_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_location_store_id_fkey ON public.location USING btree (store_id);


--
-- Name: index_master_list_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_master_list_line_item_link_id_fkey ON public.master_list_line USING btree (item_link_id);


--
-- Name: index_master_list_line_master_list_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_master_list_line_master_list_id_fkey ON public.master_list_line USING btree (master_list_id);


--
-- Name: index_master_list_name_join_master_list_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_master_list_name_join_master_list_id_fkey ON public.master_list_name_join USING btree (master_list_id);


--
-- Name: index_name_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_code ON public.name USING btree (code);


--
-- Name: index_name_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_first_name ON public.name USING btree (first_name);


--
-- Name: index_name_last_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_last_name ON public.name USING btree (last_name);


--
-- Name: index_name_link_name_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_link_name_id_fkey ON public.name_link USING btree (name_id);


--
-- Name: index_name_national_health_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_national_health_number ON public.name USING btree (national_health_number);


--
-- Name: index_name_store_join_name_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_store_join_name_link_id_fkey ON public.name_store_join USING btree (name_link_id);


--
-- Name: index_name_store_join_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_store_join_store_id_fkey ON public.name_store_join USING btree (store_id);


--
-- Name: index_name_tag_join_name_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_tag_join_name_link_id_fkey ON public.name_tag_join USING btree (name_link_id);


--
-- Name: index_name_tag_join_name_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_tag_join_name_tag_id ON public.name_tag_join USING btree (name_tag_id);


--
-- Name: index_period_period_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_period_period_schedule_id ON public.period USING btree (period_schedule_id);


--
-- Name: index_program_context_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_context_id ON public.program USING btree (context_id);


--
-- Name: index_program_enrolment_patient_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_enrolment_patient_link_id_fkey ON public.program_enrolment USING btree (patient_link_id);


--
-- Name: index_program_enrolment_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_enrolment_program_id ON public.program_enrolment USING btree (program_id);


--
-- Name: index_program_event_context_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_event_context_id ON public.program_event USING btree (context_id);


--
-- Name: index_program_event_patient_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_event_patient_link_id ON public.program_event USING btree (patient_link_id);


--
-- Name: index_program_master_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_master_list_id ON public.program USING btree (master_list_id);


--
-- Name: index_program_requisition_settings_name_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_requisition_settings_name_tag_id ON public.program_requisition_settings USING btree (name_tag_id);


--
-- Name: index_program_requisition_settings_period_schedule_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_requisition_settings_period_schedule_id ON public.program_requisition_settings USING btree (period_schedule_id);


--
-- Name: index_program_requisition_settings_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_program_requisition_settings_program_id ON public.program_requisition_settings USING btree (program_id);


--
-- Name: index_requisition_created_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_created_datetime ON public.requisition USING btree (created_datetime);


--
-- Name: index_requisition_line_requisition_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_line_requisition_id_fkey ON public.requisition_line USING btree (requisition_id);


--
-- Name: index_requisition_linked_requisition_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_linked_requisition_id ON public.requisition USING btree (linked_requisition_id);


--
-- Name: index_requisition_name_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_name_link_id_fkey ON public.requisition USING btree (name_link_id);


--
-- Name: index_requisition_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_period_id ON public.requisition USING btree (period_id);


--
-- Name: index_requisition_requisition_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_requisition_number ON public.requisition USING btree (requisition_number);


--
-- Name: index_requisition_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_status ON public.requisition USING btree (status);


--
-- Name: index_requisition_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_store_id_fkey ON public.requisition USING btree (store_id);


--
-- Name: index_requisition_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_requisition_type ON public.requisition USING btree (type);


--
-- Name: index_sensor_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sensor_location_id ON public.sensor USING btree (location_id);


--
-- Name: index_sensor_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sensor_store_id ON public.sensor USING btree (store_id);


--
-- Name: index_stock_line_available_number_of_packs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_available_number_of_packs ON public.stock_line USING btree (available_number_of_packs);


--
-- Name: index_stock_line_barcode_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_barcode_id ON public.stock_line USING btree (barcode_id);


--
-- Name: index_stock_line_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_expiry_date ON public.stock_line USING btree (expiry_date);


--
-- Name: index_stock_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_item_link_id_fkey ON public.stock_line USING btree (item_link_id);


--
-- Name: index_stock_line_location_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_location_id_fkey ON public.stock_line USING btree (location_id);


--
-- Name: index_stock_line_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_store_id_fkey ON public.stock_line USING btree (store_id);


--
-- Name: index_stock_line_supplier_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_supplier_link_id_fkey ON public.stock_line USING btree (supplier_link_id);


--
-- Name: index_stock_line_total_number_of_packs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stock_line_total_number_of_packs ON public.stock_line USING btree (total_number_of_packs);


--
-- Name: index_stocktake_created_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_created_datetime ON public.stocktake USING btree (created_datetime);


--
-- Name: index_stocktake_inventory_addition_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_inventory_addition_id_fkey ON public.stocktake USING btree (inventory_addition_id);


--
-- Name: index_stocktake_inventory_reduction_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_inventory_reduction_id_fkey ON public.stocktake USING btree (inventory_reduction_id);


--
-- Name: index_stocktake_line_item_link_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_line_item_link_id_fkey ON public.stocktake_line USING btree (item_link_id);


--
-- Name: index_stocktake_line_location_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_line_location_id_fkey ON public.stocktake_line USING btree (location_id);


--
-- Name: index_stocktake_line_stock_line_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_line_stock_line_id_fkey ON public.stocktake_line USING btree (stock_line_id);


--
-- Name: index_stocktake_line_stocktake_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_line_stocktake_id_fkey ON public.stocktake_line USING btree (stocktake_id);


--
-- Name: index_stocktake_stocktake_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_stocktake_number ON public.stocktake USING btree (stocktake_number);


--
-- Name: index_stocktake_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_stocktake_store_id_fkey ON public.stocktake USING btree (store_id);


--
-- Name: index_store_site_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_store_site_id ON public.store USING btree (site_id);


--
-- Name: index_sync_buffer_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_buffer_action ON public.sync_buffer USING btree (action);


--
-- Name: index_sync_buffer_combined_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_buffer_combined_index ON public.sync_buffer USING btree (action, table_name, integration_datetime, source_site_id);


--
-- Name: index_sync_buffer_integration_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_buffer_integration_datetime ON public.sync_buffer USING btree (integration_datetime);


--
-- Name: index_sync_buffer_integration_error; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_sync_buffer_integration_error ON public.sync_buffer USING btree (integration_error);


--
-- Name: index_temperature_breach_config_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_breach_config_store_id ON public.temperature_breach_config USING btree (store_id);


--
-- Name: index_temperature_breach_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_breach_location_id ON public.temperature_breach USING btree (location_id);


--
-- Name: index_temperature_breach_sensor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_breach_sensor_id ON public.temperature_breach USING btree (sensor_id);


--
-- Name: index_temperature_breach_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_breach_store_id ON public.temperature_breach USING btree (store_id);


--
-- Name: index_temperature_log_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_log_datetime ON public.temperature_log USING btree (datetime);


--
-- Name: index_temperature_log_location_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_log_location_id ON public.temperature_log USING btree (location_id);


--
-- Name: index_temperature_log_sensor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_log_sensor_id ON public.temperature_log USING btree (sensor_id);


--
-- Name: index_temperature_log_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_log_store_id ON public.temperature_log USING btree (store_id);


--
-- Name: index_temperature_log_temperature_breach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_temperature_log_temperature_breach_id ON public.temperature_log USING btree (temperature_breach_id);


--
-- Name: index_unit_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_unit_is_active ON public.unit USING btree (is_active);


--
-- Name: index_user_permission_context_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_permission_context_id ON public.user_permission USING btree (context_id);


--
-- Name: index_user_permission_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_permission_store_id_fkey ON public.user_permission USING btree (store_id);


--
-- Name: index_user_permission_user_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_permission_user_id_fkey ON public.user_permission USING btree (user_id);


--
-- Name: index_user_store_join_store_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_store_join_store_id_fkey ON public.user_store_join USING btree (store_id);


--
-- Name: index_user_store_join_user_id_fkey; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_user_store_join_user_id_fkey ON public.user_store_join USING btree (user_id);


--
-- Name: indicator_column_program_indicator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_column_program_indicator_id ON public.indicator_column USING btree (program_indicator_id);


--
-- Name: indicator_line_program_indicator_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_line_program_indicator_id ON public.indicator_line USING btree (program_indicator_id);


--
-- Name: indicator_value_customer_name_link_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_value_customer_name_link_id ON public.indicator_value USING btree (customer_name_link_id);


--
-- Name: indicator_value_indicator_column_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_value_indicator_column_id ON public.indicator_value USING btree (indicator_column_id);


--
-- Name: indicator_value_indicator_line_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_value_indicator_line_id ON public.indicator_value USING btree (indicator_line_id);


--
-- Name: indicator_value_period_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_value_period_id ON public.indicator_value USING btree (period_id);


--
-- Name: indicator_value_store_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX indicator_value_store_id ON public.indicator_value USING btree (store_id);


--
-- Name: ix_asset_log_asset_id_log_datetime; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_asset_log_asset_id_log_datetime ON public.asset_log USING btree (asset_id, log_datetime);


--
-- Name: ix_number_store_type_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_number_store_type_unique ON public.number USING btree (store_id, type);


--
-- Name: program_indicator_program_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX program_indicator_program_id ON public.program_indicator USING btree (program_id);


--
-- Name: activity_log activity_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: asset asset_asset_catalogue_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_catalogue_item_id_fkey FOREIGN KEY (asset_catalogue_item_id) REFERENCES public.asset_catalogue_item(id);


--
-- Name: asset asset_asset_catalogue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_catalogue_type_id_fkey FOREIGN KEY (asset_catalogue_type_id) REFERENCES public.asset_catalogue_type(id);


--
-- Name: asset asset_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.asset_category(id);


--
-- Name: asset asset_asset_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_asset_class_id_fkey FOREIGN KEY (asset_class_id) REFERENCES public.asset_class(id);


--
-- Name: asset_catalogue_item asset_catalogue_item_asset_catalogue_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_asset_catalogue_type_id_fkey FOREIGN KEY (asset_catalogue_type_id) REFERENCES public.asset_catalogue_type(id);


--
-- Name: asset_catalogue_item asset_catalogue_item_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.asset_category(id);


--
-- Name: asset_catalogue_item asset_catalogue_item_asset_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_item
    ADD CONSTRAINT asset_catalogue_item_asset_class_id_fkey FOREIGN KEY (asset_class_id) REFERENCES public.asset_class(id);


--
-- Name: asset_catalogue_type asset_catalogue_type_asset_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_catalogue_type
    ADD CONSTRAINT asset_catalogue_type_asset_category_id_fkey FOREIGN KEY (asset_category_id) REFERENCES public.asset_category(id);


--
-- Name: asset_category asset_category_asset_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_category
    ADD CONSTRAINT asset_category_asset_class_id_fkey FOREIGN KEY (asset_class_id) REFERENCES public.asset_class(id);


--
-- Name: asset asset_donor_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_donor_name_id_fkey FOREIGN KEY (donor_name_id) REFERENCES public.name_link(id);


--
-- Name: asset_internal_location asset_internal_location_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_internal_location
    ADD CONSTRAINT asset_internal_location_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(id);


--
-- Name: asset_log asset_log_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_log
    ADD CONSTRAINT asset_log_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.asset(id);


--
-- Name: asset_log asset_log_reason_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_log
    ADD CONSTRAINT asset_log_reason_id_fkey FOREIGN KEY (reason_id) REFERENCES public.asset_log_reason(id);


--
-- Name: asset asset_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset
    ADD CONSTRAINT asset_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: barcode barcode_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: barcode barcode_manufacturer_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.barcode
    ADD CONSTRAINT barcode_manufacturer_link_id_fkey FOREIGN KEY (manufacturer_link_id) REFERENCES public.name_link(id);


--
-- Name: bundled_item bundled_item_bundled_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundled_item
    ADD CONSTRAINT bundled_item_bundled_item_variant_id_fkey FOREIGN KEY (bundled_item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: bundled_item bundled_item_principal_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bundled_item
    ADD CONSTRAINT bundled_item_principal_item_variant_id_fkey FOREIGN KEY (principal_item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: changelog changelog_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: clinician_link clinician_link_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_link
    ADD CONSTRAINT clinician_link_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.clinician(id);


--
-- Name: clinician clinician_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician
    ADD CONSTRAINT clinician_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: clinician_store_join clinician_store_join_clinician_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES public.clinician_link(id);


--
-- Name: clinician_store_join clinician_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: contact_form contact_form_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_form
    ADD CONSTRAINT contact_form_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: contact contact_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: contact_trace contact_trace_contact_patient_link_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_contact_patient_link_id FOREIGN KEY (contact_patient_link_id) REFERENCES public.name_link(id);


--
-- Name: contact_trace contact_trace_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document(id);


--
-- Name: contact_trace contact_trace_patient_link_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_patient_link_id FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: contact_trace contact_trace_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: contact_trace contact_trace_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_trace
    ADD CONSTRAINT contact_trace_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: demographic_indicator demographic_indicator_demographic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demographic_indicator
    ADD CONSTRAINT demographic_indicator_demographic_id_fkey FOREIGN KEY (demographic_id) REFERENCES public.demographic(id);


--
-- Name: document document_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: document document_form_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_form_schema_id_fkey FOREIGN KEY (form_schema_id) REFERENCES public.form_schema(id);


--
-- Name: document document_owner_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_owner_name_link_id_fkey FOREIGN KEY (owner_name_link_id) REFERENCES public.name_link(id);


--
-- Name: document_registry document_registry_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: document_registry document_registry_form_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_form_schema_id_fkey FOREIGN KEY (form_schema_id) REFERENCES public.form_schema(id);


--
-- Name: encounter encounter_enrolment_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_enrolment_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: encounter encounter_patient_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: goods_received goods_received_inbound_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received
    ADD CONSTRAINT goods_received_inbound_shipment_id_fkey FOREIGN KEY (inbound_shipment_id) REFERENCES public.invoice(id);


--
-- Name: goods_received_line goods_received_line_goods_received_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_line
    ADD CONSTRAINT goods_received_line_goods_received_id_fkey FOREIGN KEY (goods_received_id) REFERENCES public.goods_received(id);


--
-- Name: goods_received_line goods_received_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_line
    ADD CONSTRAINT goods_received_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: goods_received_line goods_received_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_line
    ADD CONSTRAINT goods_received_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: goods_received_line goods_received_line_manufacturer_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_line
    ADD CONSTRAINT goods_received_line_manufacturer_link_id_fkey FOREIGN KEY (manufacturer_link_id) REFERENCES public.name_link(id);


--
-- Name: goods_received_line goods_received_line_purchase_order_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received_line
    ADD CONSTRAINT goods_received_line_purchase_order_line_id_fkey FOREIGN KEY (purchase_order_line_id) REFERENCES public.purchase_order_line(id);


--
-- Name: goods_received goods_received_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received
    ADD CONSTRAINT goods_received_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(id);


--
-- Name: goods_received goods_received_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_received
    ADD CONSTRAINT goods_received_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: indicator_column indicator_column_program_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_column
    ADD CONSTRAINT indicator_column_program_indicator_id_fkey FOREIGN KEY (program_indicator_id) REFERENCES public.program_indicator(id);


--
-- Name: indicator_line indicator_line_program_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_line
    ADD CONSTRAINT indicator_line_program_indicator_id_fkey FOREIGN KEY (program_indicator_id) REFERENCES public.program_indicator(id);


--
-- Name: indicator_value indicator_value_customer_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_customer_name_link_id_fkey FOREIGN KEY (customer_name_link_id) REFERENCES public.name_link(id);


--
-- Name: indicator_value indicator_value_indicator_column_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_indicator_column_id_fkey FOREIGN KEY (indicator_column_id) REFERENCES public.indicator_column(id);


--
-- Name: indicator_value indicator_value_indicator_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_indicator_line_id_fkey FOREIGN KEY (indicator_line_id) REFERENCES public.indicator_line(id);


--
-- Name: indicator_value indicator_value_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: indicator_value indicator_value_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicator_value
    ADD CONSTRAINT indicator_value_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: invoice invoice_clinician_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_clinician_link_id_fkey FOREIGN KEY (clinician_link_id) REFERENCES public.clinician_link(id);


--
-- Name: invoice invoice_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(id);


--
-- Name: invoice invoice_default_donor_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_default_donor_link_id_fkey FOREIGN KEY (default_donor_link_id) REFERENCES public.name_link(id);


--
-- Name: invoice invoice_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.diagnosis(id);


--
-- Name: invoice_line invoice_line_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaign(id);


--
-- Name: invoice_line invoice_line_donor_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_donor_link_id_fkey FOREIGN KEY (donor_link_id) REFERENCES public.name_link(id);


--
-- Name: invoice_line invoice_line_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice(id);


--
-- Name: invoice_line invoice_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: invoice_line invoice_line_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: invoice_line invoice_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: invoice_line invoice_line_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: invoice_line invoice_line_reason_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_reason_option_id_fkey FOREIGN KEY (reason_option_id) REFERENCES public.reason_option(id);


--
-- Name: invoice_line invoice_line_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: invoice_line invoice_line_vvm_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_vvm_status_id_fkey FOREIGN KEY (vvm_status_id) REFERENCES public.vvm_status(id);


--
-- Name: invoice invoice_name_insurance_join_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_insurance_join_id_fkey FOREIGN KEY (name_insurance_join_id) REFERENCES public.name_insurance_join(id);


--
-- Name: invoice invoice_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: invoice invoice_name_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_store_id_fkey FOREIGN KEY (name_store_id) REFERENCES public.store(id);


--
-- Name: invoice invoice_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: invoice invoice_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: item_category_join item_category_join_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_category_join
    ADD CONSTRAINT item_category_join_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.category(id);


--
-- Name: item_category_join item_category_join_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_category_join
    ADD CONSTRAINT item_category_join_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: item_direction item_direction_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_direction
    ADD CONSTRAINT item_direction_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: item_link item_link_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_link
    ADD CONSTRAINT item_link_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: item item_restricted_location_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_restricted_location_type_id_fkey FOREIGN KEY (restricted_location_type_id) REFERENCES public.location_type(id);


--
-- Name: item_store_join item_store_join_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_store_join
    ADD CONSTRAINT item_store_join_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: item_store_join item_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_store_join
    ADD CONSTRAINT item_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: item item_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id);


--
-- Name: item_variant item_variant_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: item_variant item_variant_location_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES public.location_type(id);


--
-- Name: item_variant item_variant_manufacturer_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_variant
    ADD CONSTRAINT item_variant_manufacturer_link_id_fkey FOREIGN KEY (manufacturer_link_id) REFERENCES public.name_link(id);


--
-- Name: item_warning_join item_warning_join_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_warning_join
    ADD CONSTRAINT item_warning_join_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: item_warning_join item_warning_join_warning_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item_warning_join
    ADD CONSTRAINT item_warning_join_warning_id_fkey FOREIGN KEY (warning_id) REFERENCES public.warning(id);


--
-- Name: location location_location_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_location_type_id_fkey FOREIGN KEY (location_type_id) REFERENCES public.location_type(id);


--
-- Name: location_movement location_movement_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: location_movement location_movement_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: location_movement location_movement_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location_movement
    ADD CONSTRAINT location_movement_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: location location_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.location
    ADD CONSTRAINT location_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: master_list_line master_list_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: master_list_line master_list_line_master_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_master_list_id_fkey FOREIGN KEY (master_list_id) REFERENCES public.master_list(id);


--
-- Name: master_list_name_join master_list_name_join_master_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_master_list_id_fkey FOREIGN KEY (master_list_id) REFERENCES public.master_list(id);


--
-- Name: master_list_name_join master_list_name_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name name_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name
    ADD CONSTRAINT name_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(id);


--
-- Name: name_insurance_join name_insurance_join_insurance_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_insurance_join
    ADD CONSTRAINT name_insurance_join_insurance_provider_id_fkey FOREIGN KEY (insurance_provider_id) REFERENCES public.insurance_provider(id);


--
-- Name: name_insurance_join name_insurance_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_insurance_join
    ADD CONSTRAINT name_insurance_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_link name_link_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_link
    ADD CONSTRAINT name_link_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


--
-- Name: name_property name_property_property_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_property
    ADD CONSTRAINT name_property_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.property(id);


--
-- Name: name_store_join name_store_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_store_join name_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: name_tag_join name_tag_join_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_tag_join
    ADD CONSTRAINT name_tag_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: name_tag_join name_tag_join_name_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_tag_join
    ADD CONSTRAINT name_tag_join_name_tag_id_fkey FOREIGN KEY (name_tag_id) REFERENCES public.name_tag(id);


--
-- Name: number number_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.number
    ADD CONSTRAINT number_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: packaging_variant packaging_variant_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.packaging_variant
    ADD CONSTRAINT packaging_variant_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: period period_period_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.period
    ADD CONSTRAINT period_period_schedule_id_fkey FOREIGN KEY (period_schedule_id) REFERENCES public.period_schedule(id);


--
-- Name: plugin_data plugin_data_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plugin_data
    ADD CONSTRAINT plugin_data_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: preference preference_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preference
    ADD CONSTRAINT preference_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: program program_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: program_enrolment program_enrolment_patient_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: program_enrolment program_enrolment_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: program_enrolment program_enrolment_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_enrolment
    ADD CONSTRAINT program_enrolment_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: program_event program_event_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: program_event program_event_patient_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_patient_link_id_fkey FOREIGN KEY (patient_link_id) REFERENCES public.name_link(id);


--
-- Name: program_indicator program_indicator_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_indicator
    ADD CONSTRAINT program_indicator_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: program program_master_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program
    ADD CONSTRAINT program_master_list_id_fkey FOREIGN KEY (master_list_id) REFERENCES public.master_list(id);


--
-- Name: program_requisition_order_type program_requisition_order_typ_program_requisition_settings_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_requisition_order_type
    ADD CONSTRAINT program_requisition_order_typ_program_requisition_settings_fkey FOREIGN KEY (program_requisition_settings_id) REFERENCES public.program_requisition_settings(id);


--
-- Name: program_requisition_settings program_requisition_settings_name_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_name_tag_id_fkey FOREIGN KEY (name_tag_id) REFERENCES public.name_tag(id);


--
-- Name: program_requisition_settings program_requisition_settings_period_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_period_schedule_id_fkey FOREIGN KEY (period_schedule_id) REFERENCES public.period_schedule(id);


--
-- Name: program_requisition_settings program_requisition_settings_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_requisition_settings
    ADD CONSTRAINT program_requisition_settings_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: purchase_order purchase_order_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currency(id);


--
-- Name: purchase_order purchase_order_donor_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_donor_link_id_fkey FOREIGN KEY (donor_link_id) REFERENCES public.name_link(id);


--
-- Name: purchase_order_line purchase_order_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: purchase_order_line purchase_order_line_manufacturer_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_manufacturer_link_id_fkey FOREIGN KEY (manufacturer_link_id) REFERENCES public.name_link(id);


--
-- Name: purchase_order_line purchase_order_line_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_order(id);


--
-- Name: purchase_order_line purchase_order_line_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_line
    ADD CONSTRAINT purchase_order_line_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: purchase_order purchase_order_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: purchase_order purchase_order_supplier_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order
    ADD CONSTRAINT purchase_order_supplier_name_link_id_fkey FOREIGN KEY (supplier_name_link_id) REFERENCES public.name_link(id);


--
-- Name: report report_argument_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_argument_schema_id_fkey FOREIGN KEY (argument_schema_id) REFERENCES public.form_schema(id);


--
-- Name: requisition_line requisition_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: requisition_line requisition_line_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.reason_option(id);


--
-- Name: requisition_line requisition_line_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.requisition(id);


--
-- Name: requisition requisition_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: requisition requisition_original_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_original_customer_id_fkey FOREIGN KEY (original_customer_id) REFERENCES public.name(id);


--
-- Name: requisition requisition_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: requisition requisition_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: rnr_form_line rnr_form_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form_line
    ADD CONSTRAINT rnr_form_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: rnr_form_line rnr_form_line_rnr_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form_line
    ADD CONSTRAINT rnr_form_line_rnr_form_id_fkey FOREIGN KEY (rnr_form_id) REFERENCES public.rnr_form(id);


--
-- Name: rnr_form rnr_form_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: rnr_form rnr_form_period_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_period_id_fkey FOREIGN KEY (period_id) REFERENCES public.period(id);


--
-- Name: rnr_form rnr_form_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: rnr_form rnr_form_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rnr_form
    ADD CONSTRAINT rnr_form_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: sensor sensor_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: sensor sensor_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sensor
    ADD CONSTRAINT sensor_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: stock_line stock_line_barcode_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_barcode_id_fkey FOREIGN KEY (barcode_id) REFERENCES public.barcode(id);


--
-- Name: stock_line stock_line_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaign(id);


--
-- Name: stock_line stock_line_donor_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_donor_link_id_fkey FOREIGN KEY (donor_link_id) REFERENCES public.name_link(id);


--
-- Name: stock_line stock_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: stock_line stock_line_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: stock_line stock_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: stock_line stock_line_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: stock_line stock_line_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: stock_line stock_line_supplier_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_supplier_link_id_fkey FOREIGN KEY (supplier_link_id) REFERENCES public.name_link(id);


--
-- Name: stock_line stock_line_vvm_status_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_vvm_status_id_fkey FOREIGN KEY (vvm_status_id) REFERENCES public.vvm_status(id);


--
-- Name: stocktake stocktake_inventory_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_inventory_adjustment_id_fkey FOREIGN KEY (inventory_addition_id) REFERENCES public.invoice(id);


--
-- Name: stocktake stocktake_inventory_reduction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_inventory_reduction_id_fkey FOREIGN KEY (inventory_reduction_id) REFERENCES public.invoice(id);


--
-- Name: stocktake_line stocktake_line_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaign(id);


--
-- Name: stocktake_line stocktake_line_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: stocktake_line stocktake_line_item_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_item_variant_id_fkey FOREIGN KEY (item_variant_id) REFERENCES public.item_variant(id);


--
-- Name: stocktake_line stocktake_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: stocktake_line stocktake_line_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: stocktake_line stocktake_line_reason_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_reason_option_id_fkey FOREIGN KEY (reason_option_id) REFERENCES public.reason_option(id);


--
-- Name: stocktake_line stocktake_line_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: stocktake_line stocktake_line_stocktake_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_stocktake_id_fkey FOREIGN KEY (stocktake_id) REFERENCES public.stocktake(id);


--
-- Name: stocktake stocktake_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: stocktake stocktake_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: store store_name_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES public.name_link(id);


--
-- Name: sync_message sync_message_from_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_message
    ADD CONSTRAINT sync_message_from_store_id_fkey FOREIGN KEY (from_store_id) REFERENCES public.store(id);


--
-- Name: sync_message sync_message_to_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_message
    ADD CONSTRAINT sync_message_to_store_id_fkey FOREIGN KEY (to_store_id) REFERENCES public.store(id);


--
-- Name: temperature_breach_config temperature_breach_config_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_breach_config
    ADD CONSTRAINT temperature_breach_config_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: temperature_breach temperature_breach_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: temperature_breach temperature_breach_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id);


--
-- Name: temperature_breach temperature_breach_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_breach
    ADD CONSTRAINT temperature_breach_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: temperature_log temperature_log_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: temperature_log temperature_log_sensor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_sensor_id_fkey FOREIGN KEY (sensor_id) REFERENCES public.sensor(id);


--
-- Name: temperature_log temperature_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: temperature_log temperature_log_temperature_breach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temperature_log
    ADD CONSTRAINT temperature_log_temperature_breach_id_fkey FOREIGN KEY (temperature_breach_id) REFERENCES public.temperature_breach(id);


--
-- Name: user_permission user_permission_context_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission
    ADD CONSTRAINT user_permission_context_id_fkey FOREIGN KEY (context_id) REFERENCES public.context(id);


--
-- Name: user_permission user_permission_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_permission
    ADD CONSTRAINT user_permission_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: user_store_join user_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_store_join
    ADD CONSTRAINT user_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: user_store_join user_store_join_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_store_join
    ADD CONSTRAINT user_store_join_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_account(id);


--
-- Name: vaccination vaccination_vaccine_course_dose_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccination
    ADD CONSTRAINT vaccination_vaccine_course_dose_id_fkey FOREIGN KEY (vaccine_course_dose_id) REFERENCES public.vaccine_course_dose(id);


--
-- Name: vaccine_course vaccine_course_demographic_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course
    ADD CONSTRAINT vaccine_course_demographic_id_fkey FOREIGN KEY (demographic_id) REFERENCES public.demographic(id);


--
-- Name: vaccine_course_item vaccine_course_item_item_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course_item
    ADD CONSTRAINT vaccine_course_item_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES public.item_link(id);


--
-- Name: vaccine_course_item vaccine_course_item_vaccine_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course_item
    ADD CONSTRAINT vaccine_course_item_vaccine_course_id_fkey FOREIGN KEY (vaccine_course_id) REFERENCES public.vaccine_course(id);


--
-- Name: vaccine_course vaccine_course_program_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course
    ADD CONSTRAINT vaccine_course_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.program(id);


--
-- Name: vaccine_course_dose vaccine_course_schedule_vaccine_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccine_course_dose
    ADD CONSTRAINT vaccine_course_schedule_vaccine_course_id_fkey FOREIGN KEY (vaccine_course_id) REFERENCES public.vaccine_course(id);


--
-- Name: vvm_status_log vvm_status_log_invoice_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vvm_status_log
    ADD CONSTRAINT vvm_status_log_invoice_line_id_fkey FOREIGN KEY (invoice_line_id) REFERENCES public.invoice_line(id);


--
-- Name: vvm_status_log vvm_status_log_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vvm_status_log
    ADD CONSTRAINT vvm_status_log_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: vvm_status_log vvm_status_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vvm_status_log
    ADD CONSTRAINT vvm_status_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- PostgreSQL database dump complete
--


