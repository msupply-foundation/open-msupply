use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_demographic_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // NOTE: These migrations assume that we've only ever created demographic_projection/indicators for a single base year.
        // This should be safe as we haven't had a live release yet.

        // Create demographic table
        sql!(
            connection,
            r#"
                CREATE TABLE demographic (
                    id TEXT NOT NULL PRIMARY KEY,
                    name TEXT NOT NULL
                );
            "#
        )?;

        // Insert any existing data into the new table
        // We'll assume we don't have duplicate names (yet!)
        sql!(
            connection,
            r#"
                INSERT INTO demographic (id, name)
                SELECT id, name FROM demographic_indicator;
            "#
        )?;

        // Add demographic indicator to demographic_indicator table
        sql!(
            connection,
            r#"
                    ALTER TABLE demographic_indicator add COLUMN demographic_id TEXT REFERENCES demographic(id);
                    UPDATE demographic_indicator set demographic_id = id;
            "#
        )?;

        Ok(())
    }
}
