use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "plugin_data_update"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            DROP TABLE plugin_data;
            CREATE TABLE plugin_data (
                id TEXT NOT NULL PRIMARY KEY,
                store_id TEXT  REFERENCES store(id),
                plugin_code TEXT NOT NULL,
                related_record_id TEXT,
                data_identifier TEXT NOT NULL,
                data TEXT NOT NULL
            );
        "#,
        )?;

        Ok(())
    }
}
