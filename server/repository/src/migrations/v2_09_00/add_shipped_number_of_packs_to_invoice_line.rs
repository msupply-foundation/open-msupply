use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_shipped_number_of_packs_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN shipped_number_of_packs DOUBLE PRECISION;
            "#
        )?;

        sql!(
            connection,
            r#"
                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'trans_line';
            "#,
        )?;

        Ok(())
    }
}
