use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_donor_id_to_invoice_and_invoice_lines"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN donor_id TEXT;
            "#
        )?;

        sql!(
            connection,
            r#"
                ALTER TABLE invoice ADD COLUMN default_donor_id TEXT;
            "#
        )?;

        Ok(())
    }
}
