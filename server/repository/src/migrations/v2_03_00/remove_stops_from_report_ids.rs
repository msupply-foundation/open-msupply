use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_stops_from_report_ids"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                SELECT
                    REPLACE(id, '.', '_')
                FROM 
                    report;
            "#
        )?;

        Ok(())
    }
}
