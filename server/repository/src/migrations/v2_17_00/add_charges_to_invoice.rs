use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_charges_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice ADD COLUMN charges_local_currency {DOUBLE} NOT NULL DEFAULT 0;
                ALTER TABLE invoice ADD COLUMN charges_foreign_currency {DOUBLE} NOT NULL DEFAULT 0;
            "#
        )?;

        Ok(())
    }
}
