CREATE TABLE sync_buffer (
    record_id TEXT NOT NULL PRIMARY KEY,
    received_datetime TEXT NOT NULL,
    integration_datetime TEXT,
    integration_error TEXT,
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT NOT NULL
)