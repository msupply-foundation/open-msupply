use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "update_changelog_for_demographic_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Essentially in `add_demographic_table.rs` we are moving the demographic_indicator table to a new table called demographic (while maintaining demographic_indicators on central (not synced)
        // So we need to update any changelog records that reference the demographic_indicator table to reference the new demographic table

        sql!(
            connection,
            r#"
                UPDATE changelog
                SET table_name = 'demographic'
                WHERE table_name = 'demographic_indicator';
            "#
        )?;

        Ok(())
    }
}
