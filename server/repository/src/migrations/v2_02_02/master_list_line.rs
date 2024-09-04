use crate::migrations::DOUBLE;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "master_list_line_price"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            ALTER TABLE master_list_line ADD COLUMN price {DOUBLE};
            "#
        )?;

        Ok(())
    }
}
