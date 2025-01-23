use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "prescription_payments_store_pref"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD COLUMN prescription_payments_enabled BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        // Retranslate store prefs
        sql!(
            connection,
            r#"
                  UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'pref';
            "#,
        )?;

        Ok(())
    }
}
