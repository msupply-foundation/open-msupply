use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reinitialise_reports"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE report (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    template TEXT NOT NULL,
                    comment TEXT,
                    sub_context TEXT,
                    argument_schema_id TEXT REFERENCES form_schema(id),
                    context TEXT NOT NULL,
                    is_custom BOOLEAN NOT NULL DEFAULT true,
                    version TEXT NOT NULL DEFAULT 1.0,
                    code TEXT NOT NULL DEFAULT ''
                );
            "#
        )?;

        // remove record of report syncing so that reports will re sync post migration from OMS central
        sql!(
            connection,
            r#"
                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'om_report';
            "#
        )?;

        Ok(())
    }
}
