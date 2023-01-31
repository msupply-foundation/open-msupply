CREATE TABLE clinician
(
    id TEXT NOT NULL PRIMARY KEY,
    store_id TEXT NOT NULL REFERENCES store(id),
    code TEXT NOT NULL,
    last_name TEXT NOT NULL,
    initials TEXT NOT NULL,
    first_name TEXT,
    address1 TEXT,
    address2 TEXT,
    phone TEXT,
    mobile TEXT,
    email TEXT,
    is_female BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL
)