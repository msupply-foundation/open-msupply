use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_custom_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The v2.01 `name.custom_fields` TEXT column backs the legacy
        // `name_custom_field` system and stays put. CustomFields-v2 stores values
        // in a separate JSONB column to avoid breaking external readers
        // (e.g. niger/congo plugins) that still target `name.custom_fields`.
        sql!(
            connection,
            r#"
            ALTER TABLE name ADD COLUMN custom_fields {JSONB};
            "#
        )?;

        Ok(())
    }
}
