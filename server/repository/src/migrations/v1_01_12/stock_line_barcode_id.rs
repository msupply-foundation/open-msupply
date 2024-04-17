use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE stock_line ADD barcode_id TEXT REFERENCES barcode(id);
            "#
    )?;
    Ok(())
}
