use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "store_preferences_for_reports"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD COLUMN monthly_consumption_look_back_period {DOUBLE} DEFAULT 0.0;
                ALTER TABLE store_preference ADD COLUMN months_lead_time {DOUBLE} DEFAULT 0.0;
                ALTER TABLE store_preference ADD COLUMN months_overstock {DOUBLE} DEFAULT 6.0;
                ALTER TABLE store_preference ADD COLUMN months_understock {DOUBLE} DEFAULT 3.0;
                ALTER TABLE store_preference ADD COLUMN months_items_expire {DOUBLE} DEFAULT 3.0;
                ALTER TABLE store_preference ADD COLUMN stocktake_frequency {DOUBLE} DEFAULT 1.0; 
            "#
        )?;

        // Reset translate all prefs on the next sync
        sql!(
            connection,
            r#"
                UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'pref';
            "#,
        )?;

        Ok(())
    }
}
