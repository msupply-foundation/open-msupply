use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE barcode ADD is_sync_update bool NOT NULL DEFAULT False;
        ALTER TABLE public.barcode RENAME COLUMN value TO gtin;
        "#
    )?;

    Ok(())
}
