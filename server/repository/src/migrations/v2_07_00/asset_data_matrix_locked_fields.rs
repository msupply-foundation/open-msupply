use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "asset_data_matrix_locked_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE asset ADD COLUMN locked_fields_json TEXT;
            "#,
        )?;

        Ok(())
    }
}
