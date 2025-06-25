use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "resync_existing_vaccination_records"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id, is_sync_update, source_site_id)
                SELECT table_name, record_id, row_action, name_link_id, store_id, is_sync_update, source_site_id FROM changelog WHERE table_name = 'vaccination' and source_site_id IS NOT NULL; 
            "#
        )?;

        Ok(())
    }
}
