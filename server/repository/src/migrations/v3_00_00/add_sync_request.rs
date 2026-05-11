use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_request"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE sync_request (
                id TEXT NOT NULL PRIMARY KEY,
                -- Stamped onto sync_buffer.reference_id and sync_log_v7.reference_id
                -- for every run of this request. Joined requests share this value
                -- so the integrate step picks up all relevant buffer rows in one
                -- pass. NULL until the request is first picked up by the runner.
                -- Dynamic cursor ids are derived as "pull_<reference_id>" and
                -- "push_<reference_id>". Logical (not enforced) FK target for
                -- sync_log_v7.reference_id and sync_buffer.reference_id.
                reference_id TEXT,
                -- Free-text description shown by the UI verbatim. Frontend
                -- resolves sync_log_v7.reference_id -> sync_request rows and
                -- displays this string as-is.
                description TEXT NOT NULL,
                -- The store this sync_request targets. Used as the routing key by
                -- the SyncRequest sync style: central pulls the row to whichever
                -- site currently has this store active. NULL for local-only rows
                -- (e.g. self-resync of the sync_request table during migration).
                store_id TEXT,
                -- ChangelogCondition::Inner serialized; NULL = no pull side.
                pull_filter {JSON},
                push_filter {JSON},
                created_datetime {DATETIME} NOT NULL,
                finished_datetime {DATETIME}
            );
            "#,
        )?;

        Ok(())
    }
}
