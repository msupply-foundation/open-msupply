use crate::migrations::DATETIME;
use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_program_deleted_datetime"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE program ADD COLUMN deleted_datetime {DATETIME};
            "#
        )?;

        Ok(())
    }
}
