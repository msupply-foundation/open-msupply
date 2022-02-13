CREATE TYPE key_type AS ENUM (
    -- Cursor for pulling central records from the central server
    'CENTRAL_SYNC_PULL_CURSOR'
);

-- key value store, e.g. to store local server state
CREATE TABLE key_value_store (
    id key_type NOT NULL PRIMARY KEY,
    value_string TEXT
)