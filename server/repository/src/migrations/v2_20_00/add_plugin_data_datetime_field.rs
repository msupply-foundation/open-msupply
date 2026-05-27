use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_plugin_data_datetime_field"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Optional, plugin-controlled timestamp (e.g. an "update time"). Kept
        // as a distinct column (rather than living inside the `data` JSON blob)
        // so that records can be efficiently filtered/sorted by date range
        // (e.g. for a "Daily Tally" list).
        sql!(
            connection,
            r#"
            ALTER TABLE plugin_data ADD COLUMN datetime TIMESTAMP;
            "#
        )?;

        // Partial index: only index rows where `datetime` is set, since most
        // plugin_data records won't use this field.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_plugin_data_datetime
                ON plugin_data (datetime)
                WHERE datetime IS NOT NULL;
            "#
        )?;

        // Re-translate any plugin_data sync buffer records so the new column
        // is populated from the source payload where available.
        sql!(
            connection,
            r#"
            UPDATE sync_buffer
            SET integration_datetime = NULL
            WHERE table_name = 'plugin_data';
            "#
        )?;

        Ok(())
    }
}
