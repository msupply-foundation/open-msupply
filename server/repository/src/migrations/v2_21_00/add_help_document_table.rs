use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_help_document_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE help_document (
                    id TEXT NOT NULL PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    deleted_datetime {DATETIME}
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'help_document';
                "#
            )?;
        }

        Ok(())
    }
}
