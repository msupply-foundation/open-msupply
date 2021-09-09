-- Create central_sync_buffer table.

CREATE TABLE central_sync_buffer (
    id TEXT NOT NULL PRIMARY KEY,
    cursor_id INTEGER NOT NULL,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    data TEXT NOT NULL
)
