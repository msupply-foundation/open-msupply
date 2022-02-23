CREATE TYPE key_type AS ENUM (
    -- Cursor for pulling central records from the central server
    'CENTRAL_SYNC_PULL_CURSOR',
    'REMOTE_SYNC_INITILISATION_STARTED',
    'REMOTE_SYNC_INITILISATION_FINISHED'
);

-- key value store, e.g. to store local server state
CREATE TABLE key_value_store (
    id key_type NOT NULL PRIMARY KEY,
    value_string TEXT,
    value_int INTEGER,
    value_bigint BIGINT,
    value_float DOUBLE PRECISION,
    value_bool BOOLEAN
)