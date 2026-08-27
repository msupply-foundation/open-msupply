use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "system_log_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                "CREATE TYPE system_log_type AS ENUM ('PROCESSOR_ERROR');"
            )?;

            sql!(
                connection,
                "ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'system_log';"
            )?;
        }

        let system_log_type = if cfg!(feature = "postgres") {
            "system_log_type"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE system_log (
                    id TEXT NOT NULL PRIMARY KEY,
                    type {system_log_type} NOT NULL, 
                    sync_site_id INTEGER,
                    datetime {DATETIME} NOT NULL,
                    message TEXT,
                    is_error BOOLEAN NOT NULL DEFAULT FALSE
                );
            "#
        )?;

        Ok(())
    }
}
