use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_line_add_status"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    CREATE TYPE invoice_line_status AS ENUM ('PENDING', 'PASSED', 'REJECTED');
                "#
            )?;

            "invoice_line_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN status {status_type};
            "#
        )?;

        Ok(())
    }
}
