use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"CREATE TABLE return_reason (
            id TEXT NOT NULL PRIMARY KEY,
            is_active BOOLEAN,
            reason TEXT NOT NULL
        );"#
    )?;

    sql!(
        connection,
        r#"ALTER TABLE invoice_line ADD COLUMN return_reason_id TEXT REFERENCES return_reason(id);"#
    )?;
    sql!(
        connection,
        r#"
           CREATE INDEX index_invoice_line_return_reason_id ON invoice_line (return_reason_id);
        "#
    )?;

    Ok(())
}
