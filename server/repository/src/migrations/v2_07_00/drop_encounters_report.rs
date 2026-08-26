use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "drop_encounters_report"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            INSERT INTO changelog (table_name, record_id, row_action)
                SELECT 'report', id, 'DELETE'
                FROM report
                WHERE code = 'encounters';
            DELETE FROM report WHERE code = 'encounters';
            "#
        )?;

        Ok(())
    }
}
