-- These changes were originally inserted into an earlier migration on develop,
-- which means they won't run when updating to a "programs" branch if the
-- earlier migrations had already run.

-- 2021-08-15T10-00_create_name_table
CREATE TABLE name_new (
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
        'TRANSGENDER',
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
    is_deceased BOOLEAN,
    national_health_number TEXT,
    is_sync_update BOOLEAN
);

INSERT INTO name_new SELECT * FROM name;
DROP name;
ALTER TABLE name_new RENAME to name;

-- 2022-03-15T10-00_report_table


-- 2022-03-25T14-30_create_user_permission_table

