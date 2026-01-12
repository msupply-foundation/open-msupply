use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "permission"
    }

    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(feature = "postgres")]
        sql!(
            _connection,
            r#"ALTER TYPE permission_type ADD VALUE 'ITEM_NAMES_CODES_AND_UNITS_MUTATE';"#
        )?;

        Ok(())
    }
}
