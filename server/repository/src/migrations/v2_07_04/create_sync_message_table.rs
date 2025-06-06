use crate::migrations::types::*;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_sync_message_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let message_status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                     CREATE TYPE sync_message_status AS ENUM ('NEW', 'PROCESSED', 'ERROR');
                "#
            )?;

            "sync_message_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
            CREATE TABLE sync_message (
                id TEXT PRIMARY KEY,
                to_store_id TEXT REFERENCES store(id),
                from_store_id TEXT REFERENCES store(id),
                body TEXT NOT NULL,
                created_datetime {DATETIME} NOT NULL,
                status {message_status_type} NOT NULL,
                type TEXT,
                error_message TEXT
            );
            "#
        )?;

        // Changelog
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'sync_message';
                "#
            )?;
        }

        Ok(())
    }
}
