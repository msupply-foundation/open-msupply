use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS report_store;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW report_store AS
    SELECT
        store.id,
        store.code,
        store.store_mode,
        store.logo,
        name.name
    FROM store
    JOIN name_link ON store.name_link_id = name_link.id
    JOIN name ON name_link.name_id = name.id;
    "#
        )?;

        Ok(())
    }
}
