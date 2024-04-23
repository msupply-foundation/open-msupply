use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE requisition_line ADD COLUMN item_name TEXT NOT NULL DEFAULT '';

            UPDATE requisition_line SET item_name = (
                SELECT item.name
                FROM item
                INNER JOIN item_link ON item_link.item_id = item.id
                WHERE item_link.id = requisition_line.item_link_id
            ) WHERE item_name = '';
        "#,
    )?;

    Ok(())
}
