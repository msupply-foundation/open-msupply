use crate::migrations::DOUBLE;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "master_list_line_price"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE master_list_line ADD COLUMN price {DOUBLE};
            "#
        )?;

        // Retranslate all master list lines on the next, in case they already had the new fields added before upgrade happens here.
        sql!(
            connection,
            r#"
            UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'list_master_line';
        "#,
        )?;

        Ok(())
    }
}
