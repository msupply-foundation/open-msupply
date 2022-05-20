CREATE TABLE remote_sync_buffer (
    id TEXT NOT NULL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL,
    data TEXT NOT NULL
)