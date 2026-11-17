use crate::migrations::*;

/// A unit is found by its trimmed name, and every new or renamed active unit is checked against
/// the others' names. Without the index each check reads the whole table, so an import of many
/// new units slows with the square of their number.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_unit_trim_name_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_unit_trim_name ON unit (trim(name));
            "#,
        )?;

        Ok(())
    }
}
