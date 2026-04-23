use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "sync_log_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE sync_log_v7 (
                id TEXT NOT NULL PRIMARY KEY,
                started_datetime {DATETIME} NOT NULL,
                finished_datetime {DATETIME},
                push_started_datetime {DATETIME},
                push_finished_datetime {DATETIME},
                push_progress_total INTEGER,
                push_progress_done INTEGER,
                pull_started_datetime {DATETIME},
                pull_finished_datetime {DATETIME},
                pull_progress_total INTEGER,
                pull_progress_done INTEGER,
                wait_for_integration_started_datetime {DATETIME},
                wait_for_integration_finished_datetime {DATETIME},
                integration_started_datetime {DATETIME},
                integration_finished_datetime {DATETIME},
                integration_progress_total INTEGER,
                integration_progress_done INTEGER,
                error {JSON}
            );
            "#,
        )?;

        Ok(())
    }
}
