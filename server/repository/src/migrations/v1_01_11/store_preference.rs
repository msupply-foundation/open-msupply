use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "store_preference"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE store_preference ADD COLUMN response_requisition_requires_authorisation bool NOT NULL DEFAULT false;
            ALTER TABLE store_preference ADD COLUMN request_requisition_requires_authorisation bool NOT NULL DEFAULT false;
        "#
        )?;

        Ok(())
    }
}
