use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_and_number_type"
    }

    #[cfg(feature = "postgres")]
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        use crate::migrations::sql;

        sql!(connection, r#"ALTER TYPE invoice_type ADD VALUE 'REPACK';"#)?;
        sql!(connection, r#"ALTER TYPE number_type ADD VALUE 'REPACK';"#)?;

        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate(&self, _connection: &StorageConnection) -> anyhow::Result<()> {
        Ok(())
    }
}
