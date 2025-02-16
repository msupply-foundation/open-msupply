use crate::migrations::*;

pub(crate) struct Migrate;

#[cfg(not(feature = "postgres"))]
const RELATED_RECORD_TYPE: &str = "TEXT";
#[cfg(feature = "postgres")]
const RELATED_RECORD_TYPE: &str = "related_record_type";

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "plugin_data"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            DROP TABLE plugin_data;
            CREATE TABLE plugin_data (
                id TEXT NOT NULL PRIMARY KEY,
                plugin_code TEXT NOT NULL,
                related_record_id TEXT NOT NULL,
                related_record_type {RELATED_RECORD_TYPE} NOT NULL,
                store_id TEXT NOT NULL REFERENCES store(id),
                data TEXT NOT NULL
            );
        "#,
        )?;

        Ok(())
    }
}
