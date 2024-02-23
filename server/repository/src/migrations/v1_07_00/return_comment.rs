use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"ALTER TABLE invoice_line ADD COLUMN comment TEXT;"#
    )?;

    Ok(())
}
