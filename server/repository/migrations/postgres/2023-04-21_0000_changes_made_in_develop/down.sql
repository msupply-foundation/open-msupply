-- This file should undo anything in `up.sql`

-- 2021-08-15T10-00_create_name_table
CREATE TYPE gender_type_original AS ENUM (
    'FEMALE',
    'MALE',
    'TRANSGENDER_MALE',
    'TRANSGENDER_MALE_HORMONE',
    'TRANSGENDER_MALE_SURGICAL',
    'TRANSGENDER_FEMALE',
    'TRANSGENDER_FEMALE_HORMONE',
    'TRANSGENDER_FEMALE_SURGICAL',
    'UNKNOWN',
    'NON_BINARY'
);

UPDATE name SET gender_type = NULL
WHERE gender_type = 'TRANSGENDER';

ALTER TABLE name
    ALTER COLUMN gender TYPE gender_type_original
    USING (gender::text::gender_type_original);

DROP TYPE gender;
ALTER TYPE gender_type_original RENAME TO gender_type;

ALTER TABLE name DROP COLUMN is_deceased;
ALTER TABLE name DROP COLUMN national_health_number;


-- 2022-03-15T10-00_report_table
CREATE TYPE context_type_original AS ENUM
(
    'INBOUND_SHIPMENT',
    'OUTBOUND_SHIPMENT',
    'REQUISITION',
    'STOCKTAKE',
    'RESOURCE'
);

UPDATE report SET context = NULL
WHERE context = 'PATIENT' or context = 'DISPENSARY';

ALTER TABLE report
    ALTER COLUMN context TYPE context_type_original
    USING (context::text::context_type_original);

DROP TYPE context_type;
ALTER TYPE context_type_original RENAME TO context_type;


-- 2022-03-25T14-30_create_user_permission_table
CREATE TYPE permission_type_original AS ENUM (
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
    'SERVER_ADMIN'
);

DELETE FROM user_permission
WHERE permission = 'PATIENT_QUERY' OR permission = 'PATIENT_MUTATE';
OR permission = 'DOCUMENT_QUERY' OR permission = 'DOCUMENT_MUTATE'

ALTER TABLE user_permission
    ALTER COLUMN permission TYPE permission_type_original
    USING (permission::text::permission_type_original);

DROP TYPE permission_type;
ALTER TYPE permission_type_original RENAME TO permission_type;


