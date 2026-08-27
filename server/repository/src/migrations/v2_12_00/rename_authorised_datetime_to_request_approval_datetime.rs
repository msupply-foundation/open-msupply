use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_authorised_datetime_to_request_approval_datetime"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE purchase_order 
            RENAME COLUMN authorised_datetime TO request_approval_datetime;
            "#
        )?;

        Ok(())
    }
}
