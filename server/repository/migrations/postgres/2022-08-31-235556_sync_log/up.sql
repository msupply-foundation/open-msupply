CREATE TYPE sync_log_type AS ENUM (
    'INITIALISATION',
    'OPERATIONAL',
    'PREPARE_INITIAL_RECORDS',
    'PULL_CENTRAL',
    'PUSH_REMOTE',
    'PULL_REMOTE'
);

CREATE TABLE sync_log (
    id TEXT NOT NULL PRIMARY KEY,
    type sync_log_type NOT NULL,
    started_datetime TIMESTAMP NOT NULL,
    completed_datetime TIMESTAMP,
    error_datetime TIMESTAMP,
    error_message TEXT,
    -- error_code sync_log_error_code,
    progress_total BIGINT,
    progress_done BIGINT
)