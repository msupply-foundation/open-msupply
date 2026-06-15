use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_properties_v2"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The v2.01 `name.properties` TEXT column backs the legacy
        // `name_property` system and stays put. Properties-v2 stores values
        // in a separate JSONB column to avoid breaking external readers
        // (e.g. niger/congo plugins) that still target `name.properties`.
        sql!(
            connection,
            r#"
            ALTER TABLE name ADD COLUMN properties_v2 {JSONB};
            "#
        )?;

        Ok(())
    }
}
