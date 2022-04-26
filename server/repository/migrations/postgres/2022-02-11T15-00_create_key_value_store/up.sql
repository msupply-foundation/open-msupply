CREATE TYPE key_type AS ENUM (
    -- Cursor for pulling central records from the central server
    'CENTRAL_SYNC_PULL_CURSOR',
    'REMOTE_SYNC_INITILISATION_STARTED',
    'REMOTE_SYNC_INITILISATION_FINISHED',
    'REMOTE_SYNC_PUSH_CURSOR',
    -- sync settings
    'SETTINGS_SYNC_URL',
    'SETTINGS_SYNC_USERNAME',
    'SETTINGS_SYNC_PASSWORD_SHA_256',
    'SETTINGS_SYNC_INTERVAL_SEC',
    'SETTINGS_SYNC_CENTRAL_SERVER_SITE_ID',
    'SETTINGS_SYNC_SIDE_ID',
    'SETTINGS_SYNC_SIDE_HARDWARE_ID'
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