--
-- PostgreSQL database dump
--


-- Dumped from database version 18.1 (Postgres.app)
-- Dumped by pg_dump version 18.1 (Postgres.app)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
    'STOCK_OFF_HOLD'
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
    'activity_log'
);


--
-- Name: context_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.context_type AS ENUM (
    'INBOUND_SHIPMENT',
    'OUTBOUND_SHIPMENT',
    'REQUISITION',
    'STOCKTAKE',
    'RESOURCE',
    'PATIENT',
    'DISPENSARY'
);


--
-- Name: document_registry_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_registry_type AS ENUM (
    'PATIENT',
    'PROGRAM_ENROLMENT',
    'ENCOUNTER',
    'CUSTOM'
);


--
-- Name: document_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.document_status AS ENUM (
    'ACTIVE',
    'DELETED'
);


--
-- Name: encounter_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.encounter_status AS ENUM (
    'PENDING',
    'VISITED',
    'CANCELLED'
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
    'VERIFIED'
);


--
-- Name: invoice_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.invoice_type AS ENUM (
    'OUTBOUND_SHIPMENT',
    'INBOUND_SHIPMENT',
    'INVENTORY_ADJUSTMENT'
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
    'DATABASE_VERSION'
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
    'RESPONSE_REQUISITION'
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
    'DOCUMENT_MUTATE'
);


--
-- Name: program_enrolment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.program_enrolment_status AS ENUM (
    'ACTIVE',
    'OPTED_OUT',
    'TRANSFERRED_OUT',
    'PAUSED'
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
-- Name: row_action_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.row_action_type AS ENUM (
    'UPSERT',
    'DELETE'
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
    'INTEGRATION_TIMEOUT_REACHED'
);


--
-- Name: delete_invoice_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_invoice_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
          VALUES ('invoice', OLD.id, 'DELETE', OLD.name_id, OLD.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: delete_invoice_line_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_invoice_line_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', OLD.id, 'DELETE', name_id, store_id FROM invoice WHERE id = OLD.invoice_id;
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: delete_requisition_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_requisition_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', OLD.id, 'DELETE', OLD.name_id, OLD.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: delete_requisition_line_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_requisition_line_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', OLD.id, 'DELETE', name_id, store_id FROM requisition WHERE id = OLD.requisition_id;
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


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


--
-- Name: update_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
     DECLARE
     BEGIN
        IF (TG_OP = 'DELETE') THEN
            INSERT INTO changelog (table_name, record_id, row_action)
              VALUES (TG_TABLE_NAME::changelog_table_name, OLD.id, 'DELETE');
            RETURN OLD;
        ELSIF (TG_OP = 'UPDATE') THEN
            INSERT INTO changelog (table_name, record_id, row_action)
              VALUES (TG_TABLE_NAME::changelog_table_name, NEW.id, 'UPSERT');
            RETURN NEW;
        ELSIF (TG_OP = 'INSERT') THEN
            INSERT INTO changelog (table_name, record_id, row_action)
              VALUES (TG_TABLE_NAME::changelog_table_name, NEW.id, 'UPSERT');
            RETURN NEW;
        END IF;
     END;
$$;


--
-- Name: upsert_activity_log_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_activity_log_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, store_id)
          VALUES ('activity_log', NEW.id, 'UPSERT', NEW.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: upsert_invoice_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_invoice_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
          VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: upsert_invoice_line_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_invoice_line_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'invoice_line', NEW.id, 'UPSERT', name_id, store_id FROM invoice WHERE id = NEW.invoice_id;
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: upsert_requisition_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_requisition_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      VALUES ('requisition', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id);
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
  END;
$$;


--
-- Name: upsert_requisition_line_changelog(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.upsert_requisition_line_changelog() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
  BEGIN
    INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id)
      SELECT 'requisition_line', NEW.id, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
    -- The return value is required, even though it is ignored for a row-level AFTER trigger
    RETURN NULL;
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
-- Name: activity_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_log (
    id text NOT NULL,
    type public.activity_log_type,
    user_id text,
    store_id text,
    record_id text,
    datetime timestamp without time zone NOT NULL,
    event text
);


--
-- Name: changelog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.changelog (
    cursor bigint NOT NULL,
    table_name public.changelog_table_name NOT NULL,
    record_id text NOT NULL,
    row_action public.row_action_type NOT NULL,
    name_id text,
    store_id text
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
-- Name: changelog_deduped; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.changelog_deduped AS
 SELECT cursor,
    table_name,
    record_id,
    row_action,
    name_id,
    store_id
   FROM public.changelog t1
  WHERE (cursor = ( SELECT max(t2.cursor) AS max
           FROM public.changelog t2
          WHERE (t2.record_id = t1.record_id)))
  ORDER BY cursor;


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
    is_active boolean NOT NULL
);


--
-- Name: clinician_store_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clinician_store_join (
    id text NOT NULL,
    clinician_id text NOT NULL,
    store_id text NOT NULL
);


--
-- Name: invoice; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice (
    id text NOT NULL,
    name_id text NOT NULL,
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
    tax double precision
);


--
-- Name: invoice_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoice_line (
    id text NOT NULL,
    invoice_id text NOT NULL,
    item_id text NOT NULL,
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
    tax double precision,
    type public.invoice_line_type NOT NULL,
    number_of_packs double precision NOT NULL,
    pack_size integer NOT NULL,
    note text
);


--
-- Name: invoice_line_stock_movement; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.invoice_line_stock_movement AS
 SELECT id,
    invoice_id,
    item_id,
    item_name,
    item_code,
    stock_line_id,
    location_id,
    batch,
    expiry_date,
    cost_price_per_pack,
    sell_price_per_pack,
    total_before_tax,
    total_after_tax,
    tax,
    type,
    number_of_packs,
    pack_size,
    note,
        CASE
            WHEN (type = 'STOCK_IN'::public.invoice_line_type) THEN ((number_of_packs * (pack_size)::double precision))::bigint
            WHEN (type = 'STOCK_OUT'::public.invoice_line_type) THEN (((number_of_packs * (pack_size)::double precision))::bigint * '-1'::integer)
            ELSE NULL::bigint
        END AS quantity_movement
   FROM public.invoice_line
  WHERE ((number_of_packs > (0)::double precision) AND (type = ANY (ARRAY['STOCK_IN'::public.invoice_line_type, 'STOCK_OUT'::public.invoice_line_type])));


--
-- Name: item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.item (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    unit_id text,
    type text NOT NULL,
    default_pack_size integer NOT NULL,
    legacy_record text NOT NULL
);


--
-- Name: outbound_shipment_stock_movement; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store (
    id text NOT NULL,
    name_id text NOT NULL,
    code text NOT NULL,
    site_id integer NOT NULL,
    store_mode public.store_mode DEFAULT 'STORE'::public.store_mode NOT NULL
);


--
-- Name: consumption; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.consumption AS
 SELECT 'n/a'::text AS id,
    items_and_stores.item_id,
    items_and_stores.store_id,
    (@ COALESCE(stock_movement.quantity, (0)::bigint)) AS quantity,
    (stock_movement.datetime)::date AS date
   FROM (( SELECT item.id AS item_id,
            store.id AS store_id
           FROM public.item,
            public.store) items_and_stores
     LEFT JOIN public.outbound_shipment_stock_movement stock_movement ON (((stock_movement.item_id = items_and_stores.item_id) AND (stock_movement.store_id = items_and_stores.store_id))));


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
    owner_name_id text,
    is_sync_update boolean DEFAULT false NOT NULL,
    context text NOT NULL
);


--
-- Name: document_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_registry (
    id text NOT NULL,
    type public.document_registry_type NOT NULL,
    document_type text NOT NULL,
    document_context text NOT NULL,
    name text,
    parent_id text,
    form_schema_id text,
    config text
);


--
-- Name: encounter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.encounter (
    id text NOT NULL,
    document_name text NOT NULL,
    patient_id text NOT NULL,
    created_datetime timestamp without time zone NOT NULL,
    start_datetime timestamp without time zone NOT NULL,
    end_datetime timestamp without time zone,
    status public.encounter_status,
    clinician_id text,
    store_id text,
    document_type text NOT NULL,
    context text NOT NULL
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
-- Name: inbound_shipment_stock_movement; Type: VIEW; Schema: public; Owner: -
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


--
-- Name: inventory_adjustment_stock_movement; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.inventory_adjustment_stock_movement AS
 SELECT 'n/a'::text AS id,
    invoice_line_stock_movement.quantity_movement AS quantity,
    invoice_line_stock_movement.item_id,
    invoice.store_id,
    invoice.verified_datetime AS datetime
   FROM (public.invoice_line_stock_movement
     JOIN public.invoice ON ((invoice_line_stock_movement.invoice_id = invoice.id)))
  WHERE ((invoice.type = 'INVENTORY_ADJUSTMENT'::public.invoice_type) AND (invoice.verified_datetime IS NOT NULL));


--
-- Name: invoice_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.invoice_stats AS
 SELECT invoice_id,
    sum(total_before_tax) AS total_before_tax,
    sum(total_after_tax) AS total_after_tax,
    (COALESCE(((sum(total_after_tax) / NULLIF(sum(total_before_tax), (0)::double precision)) - (1)::double precision), (0)::double precision) * (100)::double precision) AS tax_percentage,
    COALESCE(sum(total_before_tax) FILTER (WHERE (type = 'SERVICE'::public.invoice_line_type)), (0)::double precision) AS service_total_before_tax,
    COALESCE(sum(total_after_tax) FILTER (WHERE (type = 'SERVICE'::public.invoice_line_type)), (0)::double precision) AS service_total_after_tax,
    COALESCE(sum(total_before_tax) FILTER (WHERE (type = ANY (ARRAY['STOCK_IN'::public.invoice_line_type, 'STOCK_OUT'::public.invoice_line_type]))), (0)::double precision) AS stock_total_before_tax,
    COALESCE(sum(total_after_tax) FILTER (WHERE (type = ANY (ARRAY['STOCK_IN'::public.invoice_line_type, 'STOCK_OUT'::public.invoice_line_type]))), (0)::double precision) AS stock_total_after_tax
   FROM public.invoice_line
  GROUP BY invoice_id;


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
-- Name: latest_document; Type: VIEW; Schema: public; Owner: -
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
    d.owner_name_id,
    d.is_sync_update,
    d.context
   FROM (( SELECT document.name,
            max(document.datetime) AS datetime
           FROM public.document
          GROUP BY document.name) grouped
     JOIN public.document d ON (((d.name = grouped.name) AND (d.datetime = grouped.datetime))));


--
-- Name: location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.location (
    id text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    on_hold boolean NOT NULL,
    store_id text NOT NULL
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
-- Name: master_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_list (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text NOT NULL
);


--
-- Name: master_list_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_list_line (
    id text NOT NULL,
    item_id text NOT NULL,
    master_list_id text NOT NULL
);


--
-- Name: master_list_name_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_list_name_join (
    id text NOT NULL,
    master_list_id text NOT NULL,
    name_id text NOT NULL
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
    national_health_number text
);


--
-- Name: name_store_join; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.name_store_join (
    id text NOT NULL,
    name_id text NOT NULL,
    store_id text NOT NULL,
    name_is_customer boolean NOT NULL,
    name_is_supplier boolean NOT NULL
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
-- Name: program_enrolment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_enrolment (
    id text NOT NULL,
    document_name text NOT NULL,
    patient_id text NOT NULL,
    enrolment_datetime timestamp without time zone NOT NULL,
    program_enrolment_id text,
    status public.program_enrolment_status NOT NULL,
    context text NOT NULL,
    document_type text NOT NULL
);


--
-- Name: program_event; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.program_event (
    id text NOT NULL,
    patient_id text,
    datetime timestamp without time zone NOT NULL,
    active_start_datetime timestamp without time zone NOT NULL,
    active_end_datetime timestamp without time zone NOT NULL,
    document_type text NOT NULL,
    document_name text,
    type text NOT NULL,
    data text,
    context text NOT NULL,
    CONSTRAINT program_event_check CHECK ((datetime <= active_start_datetime)),
    CONSTRAINT program_event_check1 CHECK ((datetime <= active_end_datetime))
);


--
-- Name: report; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report (
    id text NOT NULL,
    name text NOT NULL,
    type public.report_type NOT NULL,
    template text NOT NULL,
    context public.context_type NOT NULL,
    comment text,
    sub_context text,
    argument_schema_id text
);


--
-- Name: requisition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requisition (
    id text NOT NULL,
    requisition_number bigint NOT NULL,
    store_id text NOT NULL,
    name_id text NOT NULL,
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
    linked_requisition_id text
);


--
-- Name: requisition_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.requisition_line (
    id text NOT NULL,
    requisition_id text NOT NULL,
    item_id text NOT NULL,
    requested_quantity integer NOT NULL,
    suggested_quantity integer NOT NULL,
    supply_quantity integer NOT NULL,
    available_stock_on_hand integer NOT NULL,
    average_monthly_consumption integer NOT NULL,
    snapshot_datetime timestamp without time zone,
    comment text
);


--
-- Name: stock_line; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_line (
    id text NOT NULL,
    item_id text NOT NULL,
    store_id text NOT NULL,
    location_id text,
    batch text,
    expiry_date date,
    cost_price_per_pack double precision NOT NULL,
    sell_price_per_pack double precision NOT NULL,
    available_number_of_packs double precision NOT NULL,
    total_number_of_packs double precision NOT NULL,
    pack_size integer NOT NULL,
    on_hold boolean NOT NULL,
    note text
);


--
-- Name: stock_movement; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stock_movement AS
 SELECT outbound_shipment_stock_movement.id,
    outbound_shipment_stock_movement.quantity,
    outbound_shipment_stock_movement.item_id,
    outbound_shipment_stock_movement.store_id,
    outbound_shipment_stock_movement.datetime
   FROM public.outbound_shipment_stock_movement
UNION
 SELECT inbound_shipment_stock_movement.id,
    inbound_shipment_stock_movement.quantity,
    inbound_shipment_stock_movement.item_id,
    inbound_shipment_stock_movement.store_id,
    inbound_shipment_stock_movement.datetime
   FROM public.inbound_shipment_stock_movement
UNION
 SELECT inventory_adjustment_stock_movement.id,
    inventory_adjustment_stock_movement.quantity,
    inventory_adjustment_stock_movement.item_id,
    inventory_adjustment_stock_movement.store_id,
    inventory_adjustment_stock_movement.datetime
   FROM public.inventory_adjustment_stock_movement;


--
-- Name: stock_on_hand; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stock_on_hand AS
 SELECT 'n/a'::text AS id,
    items_and_stores.item_id,
    items_and_stores.store_id,
    COALESCE(stock.available_stock_on_hand, (0)::bigint) AS available_stock_on_hand
   FROM (( SELECT item.id AS item_id,
            store.id AS store_id
           FROM public.item,
            public.store) items_and_stores
     LEFT JOIN ( SELECT stock_line.item_id,
            stock_line.store_id,
            (sum(((stock_line.pack_size)::double precision * stock_line.available_number_of_packs)))::bigint AS available_stock_on_hand
           FROM public.stock_line
          WHERE (stock_line.available_number_of_packs > (0)::double precision)
          GROUP BY stock_line.item_id, stock_line.store_id) stock ON (((stock.item_id = items_and_stores.item_id) AND (stock.store_id = items_and_stores.store_id))));


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
    inventory_adjustment_id text
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
    item_id text NOT NULL,
    batch text,
    expiry_date date,
    pack_size integer,
    cost_price_per_pack double precision,
    sell_price_per_pack double precision,
    note text
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
    data text NOT NULL
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
    error_code public.sync_api_error_code
);


--
-- Name: unit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unit (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    index integer NOT NULL
);


--
-- Name: user_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_account (
    id text NOT NULL,
    username text NOT NULL,
    hashed_password text NOT NULL,
    email text,
    language public.language_type DEFAULT 'ENGLISH'::public.language_type NOT NULL
);


--
-- Name: user_permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_permission (
    id text NOT NULL,
    user_id text NOT NULL,
    store_id text NOT NULL,
    permission public.permission_type NOT NULL,
    context text
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
-- Name: changelog cursor; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog ALTER COLUMN cursor SET DEFAULT nextval('public.changelog_cursor_seq'::regclass);


--
-- Data for Name: __diesel_schema_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.__diesel_schema_migrations VALUES ('20210705T1000', '2026-01-06 02:58:01.026932');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210710T1000', '2026-01-06 02:58:01.040882');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210805T1000', '2026-01-06 02:58:01.042873');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210810T1000', '2026-01-06 02:58:01.045125');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210815T1000', '2026-01-06 02:58:01.04789');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210825T1000', '2026-01-06 02:58:01.050995');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210905T1000', '2026-01-06 02:58:01.052982');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210910T1000', '2026-01-06 02:58:01.056115');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210915T1000', '2026-01-06 02:58:01.057596');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210917T1000', '2026-01-06 02:58:01.060982');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210918T1000', '2026-01-06 02:58:01.064613');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210920T1000', '2026-01-06 02:58:01.06648');
INSERT INTO public.__diesel_schema_migrations VALUES ('20210925T1000', '2026-01-06 02:58:01.069796');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211005T1000', '2026-01-06 02:58:01.073877');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211105T1000', '2026-01-06 02:58:01.075272');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211110T1000', '2026-01-06 02:58:01.077174');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211115T1000', '2026-01-06 02:58:01.079646');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211120T1000', '2026-01-06 02:58:01.084641');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211125T1000', '2026-01-06 02:58:01.108471');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211210T1000', '2026-01-06 02:58:01.122816');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211215T1000', '2026-01-06 02:58:01.125497');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211220T1000', '2026-01-06 02:58:01.128167');
INSERT INTO public.__diesel_schema_migrations VALUES ('20211225T1000', '2026-01-06 02:58:01.132342');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220127T0800', '2026-01-06 02:58:01.138149');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220211T1500', '2026-01-06 02:58:01.143484');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1015', '2026-01-06 02:58:01.145843');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1030', '2026-01-06 02:58:01.146509');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1130', '2026-01-06 02:58:01.147023');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1200', '2026-01-06 02:58:01.1475');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1230', '2026-01-06 02:58:01.147985');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1300', '2026-01-06 02:58:01.14827');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1330', '2026-01-06 02:58:01.148517');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220223T1400', '2026-01-06 02:58:01.149165');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220315T1000', '2026-01-06 02:58:01.150092');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220325T1400', '2026-01-06 02:58:01.153777');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220325T1430', '2026-01-06 02:58:01.156021');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220401T1000', '2026-01-06 02:58:01.159492');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220401T1100', '2026-01-06 02:58:01.162704');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220427T1000', '2026-01-06 02:58:01.164791');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220427T1300', '2026-01-06 02:58:01.167591');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1500', '2026-01-06 02:58:01.171685');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1600', '2026-01-06 02:58:01.174503');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1700', '2026-01-06 02:58:01.176646');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220607T1800', '2026-01-06 02:58:01.181346');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220621013225', '2026-01-06 02:58:01.184538');
INSERT INTO public.__diesel_schema_migrations VALUES ('20220831235556', '2026-01-06 02:58:01.187816');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221010220020', '2026-01-06 02:58:01.192067');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221011T1022', '2026-01-06 02:58:01.192499');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221027T0915', '2026-01-06 02:58:01.19301');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221106232001', '2026-01-06 02:58:01.194269');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221114012026', '2026-01-06 02:58:01.196484');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221116021440', '2026-01-06 02:58:01.196928');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221117221434', '2026-01-06 02:58:01.19727');
INSERT INTO public.__diesel_schema_migrations VALUES ('20221201194340', '2026-01-06 02:58:01.197592');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230116T1000', '2026-01-06 02:58:01.197944');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230327T1000', '2026-01-06 02:58:01.198423');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230330220342', '2026-01-06 02:58:01.199178');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230421T1000', '2026-01-06 02:58:01.20054');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230421T1100', '2026-01-06 02:58:01.20262');
INSERT INTO public.__diesel_schema_migrations VALUES ('20230620T1000', '2026-01-06 02:58:01.205463');


--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: changelog; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clinician; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: clinician_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: document; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: document_registry; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: encounter; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: form_schema; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: key_value_store; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.key_value_store VALUES ('DATABASE_VERSION', '1.0.4', NULL, NULL, NULL, NULL);


--
-- Data for Name: location; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: location_movement; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: master_list; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: master_list_line; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: master_list_name_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: migration_fragment_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: name_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: number; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program_enrolment; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: program_event; Type: TABLE DATA; Schema: public; Owner: -
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
-- Data for Name: sync_buffer; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: sync_log; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: unit; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_account; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_permission; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Data for Name: user_store_join; Type: TABLE DATA; Schema: public; Owner: -
--



--
-- Name: changelog_cursor_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.changelog_cursor_seq', 1, false);


--
-- Name: __diesel_schema_migrations __diesel_schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.__diesel_schema_migrations
    ADD CONSTRAINT __diesel_schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: changelog changelog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.changelog
    ADD CONSTRAINT changelog_pkey PRIMARY KEY (cursor);


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
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id);


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
-- Name: name name_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name
    ADD CONSTRAINT name_pkey PRIMARY KEY (id);


--
-- Name: name_store_join name_store_join_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_pkey PRIMARY KEY (id);


--
-- Name: number number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.number
    ADD CONSTRAINT number_pkey PRIMARY KEY (id);


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
-- Name: sync_buffer sync_buffer_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_buffer
    ADD CONSTRAINT sync_buffer_pkey PRIMARY KEY (record_id);


--
-- Name: sync_log sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sync_log
    ADD CONSTRAINT sync_log_pkey PRIMARY KEY (id);


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
-- Name: index_name_national_health_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX index_name_national_health_number ON public.name USING btree (national_health_number);


--
-- Name: ix_document_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_document_name_unique ON public.document USING btree (name);


--
-- Name: ix_number_store_type_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_number_store_type_unique ON public.number USING btree (store_id, type);


--
-- Name: activity_log activity_log_upsert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER activity_log_upsert_trigger AFTER INSERT OR UPDATE ON public.activity_log FOR EACH ROW EXECUTE FUNCTION public.upsert_activity_log_changelog();


--
-- Name: invoice invoice_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_delete_trigger AFTER DELETE ON public.invoice FOR EACH ROW EXECUTE FUNCTION public.delete_invoice_changelog();


--
-- Name: invoice_line invoice_line_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_line_delete_trigger AFTER DELETE ON public.invoice_line FOR EACH ROW EXECUTE FUNCTION public.delete_invoice_line_changelog();


--
-- Name: invoice_line invoice_line_upsert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_line_upsert_trigger AFTER INSERT OR UPDATE ON public.invoice_line FOR EACH ROW EXECUTE FUNCTION public.upsert_invoice_line_changelog();


--
-- Name: invoice invoice_upsert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER invoice_upsert_trigger AFTER INSERT OR UPDATE ON public.invoice FOR EACH ROW EXECUTE FUNCTION public.upsert_invoice_changelog();


--
-- Name: location location_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER location_trigger AFTER INSERT OR DELETE OR UPDATE ON public.location FOR EACH ROW EXECUTE FUNCTION public.update_changelog();


--
-- Name: requisition requisition_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requisition_delete_trigger AFTER DELETE ON public.requisition FOR EACH ROW EXECUTE FUNCTION public.delete_requisition_changelog();


--
-- Name: requisition_line requisition_line_delete_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requisition_line_delete_trigger AFTER DELETE ON public.requisition_line FOR EACH ROW EXECUTE FUNCTION public.delete_requisition_line_changelog();


--
-- Name: requisition_line requisition_line_upsert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requisition_line_upsert_trigger AFTER INSERT OR UPDATE ON public.requisition_line FOR EACH ROW EXECUTE FUNCTION public.upsert_requisition_line_changelog();


--
-- Name: requisition requisition_upsert_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER requisition_upsert_trigger AFTER INSERT OR UPDATE ON public.requisition FOR EACH ROW EXECUTE FUNCTION public.upsert_requisition_changelog();


--
-- Name: stock_line stock_line_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stock_line_trigger AFTER INSERT OR DELETE OR UPDATE ON public.stock_line FOR EACH ROW EXECUTE FUNCTION public.update_changelog();


--
-- Name: stocktake_line stocktake_line_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stocktake_line_trigger AFTER INSERT OR DELETE OR UPDATE ON public.stocktake_line FOR EACH ROW EXECUTE FUNCTION public.update_changelog();


--
-- Name: stocktake stocktake_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stocktake_trigger AFTER INSERT OR DELETE OR UPDATE ON public.stocktake FOR EACH ROW EXECUTE FUNCTION public.update_changelog();


--
-- Name: activity_log activity_log_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: clinician_store_join clinician_store_join_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.clinician(id);


--
-- Name: clinician_store_join clinician_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clinician_store_join
    ADD CONSTRAINT clinician_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: document document_form_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_form_schema_id_fkey FOREIGN KEY (form_schema_id) REFERENCES public.form_schema(id);


--
-- Name: document document_owner_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_owner_name_id_fkey FOREIGN KEY (owner_name_id) REFERENCES public.name(id);


--
-- Name: document_registry document_registry_form_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_form_schema_id_fkey FOREIGN KEY (form_schema_id) REFERENCES public.form_schema(id);


--
-- Name: document_registry document_registry_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_registry
    ADD CONSTRAINT document_registry_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.document_registry(id);


--
-- Name: encounter encounter_clinician_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.encounter
    ADD CONSTRAINT encounter_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES public.clinician(id);


--
-- Name: invoice_line invoice_line_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoice(id);


--
-- Name: invoice_line invoice_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: invoice_line invoice_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: invoice_line invoice_line_stock_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice_line
    ADD CONSTRAINT invoice_line_stock_line_id_fkey FOREIGN KEY (stock_line_id) REFERENCES public.stock_line(id);


--
-- Name: invoice invoice_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


--
-- Name: invoice invoice_name_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_name_store_id_fkey FOREIGN KEY (name_store_id) REFERENCES public.store(id);


--
-- Name: invoice invoice_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoice
    ADD CONSTRAINT invoice_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: item item_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_unit_id_fkey FOREIGN KEY (unit_id) REFERENCES public.unit(id);


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
-- Name: master_list_line master_list_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_line
    ADD CONSTRAINT master_list_line_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


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
-- Name: master_list_name_join master_list_name_join_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_list_name_join
    ADD CONSTRAINT master_list_name_join_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


--
-- Name: name_store_join name_store_join_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


--
-- Name: name_store_join name_store_join_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.name_store_join
    ADD CONSTRAINT name_store_join_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: number number_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.number
    ADD CONSTRAINT number_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: program_event program_event_patient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.program_event
    ADD CONSTRAINT program_event_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.name(id);


--
-- Name: report report_argument_schema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report
    ADD CONSTRAINT report_argument_schema_id_fkey FOREIGN KEY (argument_schema_id) REFERENCES public.form_schema(id);


--
-- Name: requisition_line requisition_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: requisition_line requisition_line_requisition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition_line
    ADD CONSTRAINT requisition_line_requisition_id_fkey FOREIGN KEY (requisition_id) REFERENCES public.requisition(id);


--
-- Name: requisition requisition_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


--
-- Name: requisition requisition_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.requisition
    ADD CONSTRAINT requisition_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: stock_line stock_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: stock_line stock_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


--
-- Name: stock_line stock_line_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_line
    ADD CONSTRAINT stock_line_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: stocktake stocktake_inventory_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_inventory_adjustment_id_fkey FOREIGN KEY (inventory_adjustment_id) REFERENCES public.invoice(id);


--
-- Name: stocktake_line stocktake_line_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.item(id);


--
-- Name: stocktake_line stocktake_line_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake_line
    ADD CONSTRAINT stocktake_line_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.location(id);


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
-- Name: stocktake stocktake_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stocktake
    ADD CONSTRAINT stocktake_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.store(id);


--
-- Name: store store_name_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store
    ADD CONSTRAINT store_name_id_fkey FOREIGN KEY (name_id) REFERENCES public.name(id);


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
-- PostgreSQL database dump complete
--


