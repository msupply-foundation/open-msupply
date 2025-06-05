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

                UPDATE demographic SET population_percentage = (
                    SELECT population_percentage FROM demographic_indicator
                    WHERE demographic_id = demographic.id
                ) WHERE id in (
                    SELECT demographic_id FROM demographic_indicator
                    WHERE population_percentage IS NOT NULL
                );
            "#,
        )?;

        Ok(())
    }
}
