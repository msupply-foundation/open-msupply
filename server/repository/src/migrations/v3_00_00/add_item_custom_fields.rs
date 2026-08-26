use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_custom_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // CustomFields-v2 values for items live in a JSONB column, mirroring
        // `name.custom_fields`. Imported from legacy mSupply `[item]user_field_*`
        // via the v5 sync translator; central-only, never edited in OMS.
        sql!(
            connection,
            r#"
            ALTER TABLE item ADD COLUMN custom_fields {JSONB};
            "#
        )?;

        Ok(())
    }
}
