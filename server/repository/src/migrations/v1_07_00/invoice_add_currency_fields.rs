use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_add_currency_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
        ALTER TABLE invoice ADD COLUMN currency_id TEXT REFERENCES currency(id);
        ALTER TABLE invoice ADD COLUMN currency_rate {DOUBLE} NOT NULL DEFAULT 1.0;
        "#,
        )?;
        Ok(())
    }
}
