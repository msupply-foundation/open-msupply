use crate::{migrations::sql, StorageConnection};

// todo wat
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            DROP TRIGGER IF EXISTS stock_line_trigger;
            DROP TRIGGER IF EXISTS stock_line_insert_trigger;
            DROP TRIGGER IF EXISTS stock_line_update_trigger;
            DROP TRIGGER IF EXISTS stock_line_delete_trigger;

            DROP TRIGGER IF EXISTS stocktake_trigger;
            DROP TRIGGER IF EXISTS stocktake_insert_trigger;
            DROP TRIGGER IF EXISTS stocktake_update_trigger;
            DROP TRIGGER IF EXISTS stocktake_delete_trigger;

            DROP TRIGGER IF EXISTS stocktake_line_trigger;
            DROP TRIGGER IF EXISTS stocktake_line_insert_trigger;
            DROP TRIGGER IF EXISTS stocktake_line_update_trigger;
            DROP TRIGGER IF EXISTS stocktake_line_delete_trigger;
       "#
    )?;

    Ok(())
}
