CREATE TYPE sync_action AS ENUM (
    'UPSERT',
    'DELETE',
    'MERGE'
);

CREATE TABLE sync_buffer (
    record_id TEXT NOT NULL PRIMARY KEY,
    received_datetime TIMESTAMP NOT NULL,
    integration_datetime TIMESTAMP,
    integration_error TEXT,
    table_name TEXT NOT NULL,
    action sync_action NOT NULL,
    data TEXT NOT NULL
)
