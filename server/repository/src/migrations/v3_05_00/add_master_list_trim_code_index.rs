use crate::migrations::*;

/// Import finds master lists by trimmed code and checks each new code against the others.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_master_list_trim_code_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_master_list_trim_code ON master_list (trim(code));
            "#,
        )?;

        Ok(())
    }
}
