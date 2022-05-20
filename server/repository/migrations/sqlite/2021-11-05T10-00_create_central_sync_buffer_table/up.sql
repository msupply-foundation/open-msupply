-- Create central_sync_buffer table.

CREATE TABLE central_sync_buffer (
    id INTEGER NOT NULL PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data TEXT NOT NULL
)
