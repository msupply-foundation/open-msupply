use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS store_items;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW store_items AS
    SELECT i.id as item_id, sl.store_id, sl.pack_size, sl.available_number_of_packs, sl.total_number_of_packs
    FROM
      item i
      LEFT JOIN item_link il ON il.item_id = i.id
      LEFT JOIN stock_line sl ON sl.item_link_id = il.id
      LEFT JOIN store s ON s.id = sl.store_id;
            "#
        )?;

        Ok(())
    }
}
