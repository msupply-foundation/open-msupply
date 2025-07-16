use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_support_upload_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                CREATE TYPE support_upload_status as ENUM (
                    'PENDING', 
                    'IN_PROGRESS', 
                    'COMPLETED', 
                    'FAILED'
                );
            "#
        )?;
        const STATUS_TYPE: &str = if cfg!(feature = "postgres") {
            "support_upload_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE support_upload (
                    id TEXT NOT NULL PRIMARY KEY, 
                    created_datetime {DATETIME} NOT NULL,
                    store_id TEXT NOT NULL,
                    title TEXT NOT NULL, 
                    status {STATUS_TYPE} NOT NULL,
                    upload_start_datetime {DATETIME} NOT NULL
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                "ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'support_upload';"
            )?;
        }

        Ok(())
    }
}
