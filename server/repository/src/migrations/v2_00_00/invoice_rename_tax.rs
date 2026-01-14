use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_rename_tax"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // No referential constraint due to circular dependency during sync integration
            r#"
                ALTER TABLE invoice RENAME COLUMN tax TO tax_percentage;
                ALTER TABLE invoice_line RENAME COLUMN tax TO tax_percentage;
            "#
        )?;

        Ok(())
    }
}
