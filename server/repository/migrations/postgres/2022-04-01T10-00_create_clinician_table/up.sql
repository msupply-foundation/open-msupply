CREATE TABLE clinician (
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
    gender gender_type,
    is_active BOOLEAN NOT NULL,
    store_id TEXT NOT NULL
)