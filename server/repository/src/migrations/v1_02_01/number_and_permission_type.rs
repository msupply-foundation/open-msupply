use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "number_and_permission_type"
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TYPE number_type ADD VALUE 'PRESCRIPTION';
                ALTER TYPE permission_type ADD VALUE 'PRESCRIPTION_QUERY';
                ALTER TYPE permission_type ADD VALUE 'PRESCRIPTION_MUTATE';
            "#
        )?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}
