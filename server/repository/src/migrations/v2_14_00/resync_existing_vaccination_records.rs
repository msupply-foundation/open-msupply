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
                INSERT INTO changelog (table_name, record_id, row_action, name_link_id)
                SELECT 'vaccination', id, 'UPSERT', patient_link_id FROM vaccination;
            "#
        )?;

        Ok(())
    }
}
