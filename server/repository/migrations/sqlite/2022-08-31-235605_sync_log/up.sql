CREATE TABLE sync_log (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    started_datetime TIMESTAMP NOT NULL,
    completed_datetime TIMESTAMP,
    error_datetime TIMESTAMP,
    error_message TEXT,
    -- error_code TEXT,
    progress_total BIGINT,
    progress_done BIGINT
)