use crate::migrations::DOUBLE;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "master_list_default_price_list"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE master_list
            ADD COLUMN is_default_price_list BOOLEAN DEFAULT FALSE;
            ALTER TABLE master_list
            ADD COLUMN discount {DOUBLE};
            "#
        )?;

        // Retranslate all master lists on the next sync, in case they already had the new fields added before upgrade happens here.
        sql!(
            connection,
            r#"
            UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'list_master';
        "#,
        )?;

        Ok(())
    }
}
