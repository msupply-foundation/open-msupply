use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "resync_existing_vaccine_course_records"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                INSERT INTO changelog (table_name, record_id, row_action)
                SELECT 'vaccine_course', id, 'UPSERT' FROM vaccine_course; 
            "#
        )?;

        Ok(())
    }
}
