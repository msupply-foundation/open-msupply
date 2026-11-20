use crate::migrations::*;

/// An item is found by its trimmed code, and every new or recoded item is checked against the
/// others' codes. Without the index each check reads the whole table, so an import of many new
/// items slows with the square of their number.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_item_trim_code_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_item_trim_code ON item (trim(code));
            "#,
        )?;

        Ok(())
    }
}
