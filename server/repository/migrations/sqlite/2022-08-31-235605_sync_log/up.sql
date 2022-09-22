CREATE TABLE sync_log (
    id TEXT NOT NULL PRIMARY KEY,
    started_datetime TIMESTAMP NOT NULL,
    finished_datetime TIMESTAMP,
    prepare_initial_started_datetime TIMESTAMP,
    prepare_initial_finished_datetime TIMESTAMP,

    push_started_datetime TIMESTAMP,
    push_finished_datetime TIMESTAMP,
    push_progress_total INTEGER,
    push_progress_done INTEGER,

    pull_central_started_datetime TIMESTAMP,
    pull_central_finished_datetime TIMESTAMP,
    pull_central_progress_total INTEGER,
    pull_central_progress_done INTEGER,

    pull_remote_started_datetime TIMESTAMP,
    pull_remote_finished_datetime TIMESTAMP,
    pull_remote_progress_total INTEGER,
    pull_remote_progress_done INTEGER,

    integration_started_datetime TIMESTAMP,
    integration_finished_datetime TIMESTAMP,

    error_message TEXT
)