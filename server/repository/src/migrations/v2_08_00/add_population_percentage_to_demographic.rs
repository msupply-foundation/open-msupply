use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_population_percentage_to_demographic"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE demographic ADD COLUMN population_percentage {DOUBLE} NOT NULL DEFAULT 0;  
            "#,
        )?;

        // Populate the new column with the existing values from demographic_indicator if they exist
        // They should only exist for the central server, so this will only affect the central server
        sql!(
            connection,
            r#"
                UPDATE demographic SET population_percentage = (
                    SELECT population_percentage FROM demographic_indicator
                    WHERE demographic_id = demographic.id
                ) WHERE id in (
                    SELECT demographic_id FROM demographic_indicator
                );
            "#,
        )?;

        // Create changelog entries for all the existing demographic records, so they'll be synced with their new population_percentage
        // We limit it to records that have a corresponding demographic_indicator, so this actually only affects the central server, otherwise we sync 0 records to central!
        sql!(
                connection,
                "INSERT INTO changelog (table_name, record_id, row_action) SELECT 'demographic', id, 'UPSERT' FROM demographic WHERE id in (
                    SELECT demographic_id FROM demographic_indicator
                );"
            )?;

        Ok(())
    }
}
