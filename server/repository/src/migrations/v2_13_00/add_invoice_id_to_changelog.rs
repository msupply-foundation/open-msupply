use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_invoice_id_to_changelog"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE changelog ADD COLUMN invoice_id TEXT;
                CREATE INDEX index_changelog_invoice_id_fkey ON changelog(invoice_id);
            "#,
        )?;

        Ok(())
    }
}
