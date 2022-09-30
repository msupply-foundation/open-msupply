CREATE TYPE sync_api_error_code AS ENUM (
    'CONNECTION_ERROR',
    'SITE_UUID_IS_BEING_CHANGED',
    'SITE_NAME_NOT_FOUND',
    'INCORRECT_PASSWORD',
    'HARDWARE_ID_MISMATCH',
    'SITE_HAS_NO_STORE',
    'SITE_AUTH_TIMEOUT',
    'INTEGRATION_TIMEOUT_REACHED'
);

CREATE TABLE sync_log (
    id TEXT NOT NULL PRIMARY KEY,
    started_datetime TIMESTAMP NOT NULL,
    done_datetime TIMESTAMP,
    prepare_initial_start_datetime TIMESTAMP,
    prepare_initial_done_datetime TIMESTAMP,

    push_start_datetime TIMESTAMP,
    push_done_datetime TIMESTAMP,
    push_progress_total INTEGER,
    push_progress_done INTEGER,

    pull_central_start_datetime TIMESTAMP,
    pull_central_done_datetime TIMESTAMP,
    pull_central_progress_total INTEGER,
    pull_central_progress_done INTEGER,

    pull_remote_start_datetime TIMESTAMP,
    pull_remote_done_datetime TIMESTAMP,
    pull_remote_progress_total INTEGER,
    pull_remote_progress_done INTEGER,

    integration_start_datetime TIMESTAMP,
    integration_done_datetime TIMESTAMP,

    error_message TEXT,
    error_code sync_api_error_code
)