use crate::migrations::*;

/// A location type is found by its trimmed code, and every new or recoded one is checked against
/// the others' codes. Without the index each check reads the whole table, so an import of many
/// new location types slows with the square of their number.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_location_type_trim_code_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_location_type_trim_code ON location_type (trim(code));
            "#,
        )?;

        Ok(())
    }
}
