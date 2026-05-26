use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_created_datetime_to_asset_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE asset_log ADD COLUMN created_datetime TIMESTAMP NOT NULL DEFAULT '1970-01-01 00:00:00';
            "#
        )?;

        sql!(
            connection,
            r#"
            UPDATE asset_log SET created_datetime = log_datetime;
            "#
        )?;

        Ok(())
    }
}
