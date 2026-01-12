use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_api_verson_incompatible"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
               ALTER TYPE sync_api_error_code ADD VALUE IF NOT EXISTS 'API_VERSION_INCOMPATIBLE';
            "#
        )?;
        Ok(())
    }
}
