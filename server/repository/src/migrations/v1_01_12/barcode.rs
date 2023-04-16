use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE barcode (
                id text NOT NULL PRIMARY KEY,
                value text NOT NULL,
                item_id text REFERENCES item(id),
                manufacturer_id text,
                pack_size int4,
                parent_id text
            );            
            "#
    )?;

    sql!(
        connection,
        r#"ALTER TABLE public.invoice_line ADD barcode_id text NULL REFERENCES barcode(id);"#
    )?;

    Ok(())
}
