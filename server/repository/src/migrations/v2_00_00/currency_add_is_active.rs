use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "currency_add_is_active"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE currency ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            "#
        )?;

        Ok(())
    }
}
