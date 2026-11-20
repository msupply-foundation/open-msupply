use crate::migrations::*;

/// Import finds names by trimmed code and checks new codes against the others'.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_trim_code_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_name_trim_code ON name (trim(code));
            "#,
        )?;

        Ok(())
    }
}
