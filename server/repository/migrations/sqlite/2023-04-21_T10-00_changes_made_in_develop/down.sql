-- This file should undo anything in `up.sql`

-- 2021-08-15T10-00_create_name_table
BEGIN;
CREATE TABLE name_original (
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
    gender TEXT CHECK (gender IN (
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
    )),
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
    created_datetime TIMESTAMP,
);

INSERT INTO name_original SELECT 
    id, name, code, type, is_customer, is_supplier, supplying_store_id, first_name, last_name, gender, date_of_birth, phone, charge_code, comment, country, address1, address2, email, website, is_manufacturer, is_donor, on_hold, created_datetime
 FROM name;
DROP name;
ALTER TABLE name_original RENAME to name;

COMMIT;