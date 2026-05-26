use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_goods_received_cleanup"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DELETE FROM changelog WHERE table_name = 'report' AND record_id NOT IN (SELECT id FROM report);
            "#
        )?;

        Ok(())
    }
}
