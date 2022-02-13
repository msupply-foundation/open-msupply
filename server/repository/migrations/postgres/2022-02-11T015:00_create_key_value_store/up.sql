CREATE TYPE key_type AS ENUM (
    -- e.g. if the initial central server sync has been performed
    'CENTRAL_SYNC_STATE'
);

-- key value store, e.g. to store local server state
CREATE TABLE key_value_store (
    id key_type NOT NULL PRIMARY KEY,
    value_string TEXT
)