use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_store_logo_and_store_preferences_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(connection, r#"ALTER TABLE store ADD logo TEXT;"#)?;

        #[cfg(not(feature = "postgres"))]
        const STORE_PREFERENCE_TYPE: &str = "TEXT";
        #[cfg(feature = "postgres")]
        const STORE_PREFERENCE_TYPE: &str = "store_preference_type";
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                CREATE TYPE {STORE_PREFERENCE_TYPE} AS ENUM (
                    'STORE_PREFERENCES'
                );
            "#
        )?;

        sql!(
            connection,
            r#"CREATE TABLE store_preference (
                id TEXT NOT NULL PRIMARY KEY,
                type {STORE_PREFERENCE_TYPE} DEFAULT 'STORE_PREFERENCES',
                pack_to_one BOOLEAN NOT NULL DEFAULT false
            );"#
        )?;

        Ok(())
    }
}
