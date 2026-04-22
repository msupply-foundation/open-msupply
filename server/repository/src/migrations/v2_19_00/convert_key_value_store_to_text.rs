use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "convert_key_value_store_to_text"
    }

    #[allow(unused_variables)]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TABLE key_value_store ALTER COLUMN id TYPE TEXT USING id::TEXT;
                DROP TYPE IF EXISTS key_type;
            "#
        )?;

        Ok(())
    }
}
