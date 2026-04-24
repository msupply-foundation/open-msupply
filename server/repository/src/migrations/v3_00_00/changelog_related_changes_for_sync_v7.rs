use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "changelog_related_changes_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE requisition ADD COLUMN transfer_store_id TEXT;
                ALTER TABLE invoice ADD COLUMN transfer_store_id TEXT;
            "#
        )?;

        Ok(())
    }
}
