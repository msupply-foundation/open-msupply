use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_requisition_is_emergency"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition ADD is_emergency BOOLEAN NOT NULL DEFAULT FALSE;
            "#
        )?;

        Ok(())
    }
}
