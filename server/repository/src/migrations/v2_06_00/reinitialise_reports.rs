use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reinitialise_reports_updated"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        const TYPE: &str = if cfg!(feature = "postgres") {
            "context_type"
        } else {
            "TEXT"
        };

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE context_type ADD VALUE 'OUTBOUND_RETURN';
                ALTER TYPE context_type ADD VALUE 'INBOUND_RETURN';
                "#,
            )?;
        }

        // Dropping report table to remove duplicate legacy reports.
        sql!(
            connection,
            r#"
                DROP TABLE report;
                CREATE TABLE report (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL,
                    template TEXT NOT NULL,
                    comment TEXT,
                    sub_context TEXT,
                    argument_schema_id TEXT REFERENCES form_schema(id),
                    context {TYPE} NOT NULL,
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
