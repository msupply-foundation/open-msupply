use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_code_to_campaign"
    }

    // Campaigns get an optional code for other systems to match on (e.g. the OpenLMIS program),
    // so the name can be what users want to read. Existing campaigns start without one:
    // integrations fall back to the name when there's no code, so they keep matching.
    // The start and end dates were never used, so they go.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE campaign ADD COLUMN code TEXT NOT NULL DEFAULT '';
            ALTER TABLE campaign DROP COLUMN start_date;
            ALTER TABLE campaign DROP COLUMN end_date;
            "#
        )?;

        Ok(())
    }
}
