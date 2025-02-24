use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_report_is_active"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE report ADD COLUMN IF NOT EXISTS is_active BOOL NOT NULL DEFAULT true;
            "#
        )?;

        Ok(())
    }
}
