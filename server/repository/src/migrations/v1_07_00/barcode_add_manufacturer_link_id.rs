use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding barcode.manufacturer_link_id
        ALTER TABLE barcode
        ADD COLUMN manufacturer_link_id TEXT;
        
        UPDATE barcode
        SET manufacturer_link_id = manufacturer_id;
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding barcode.manufacturer_link_id
        PRAGMA foreign_keys = OFF;
        ALTER TABLE barcode
        ADD COLUMN manufacturer_link_id TEXT REFERENCES name_link(id);
        
        UPDATE barcode
        SET manufacturer_link_id = manufacturer_id;
        PRAGMA foreign_keys = ON;
     "#,
    )?;

    sql! {
        connection,
        r#"
        ALTER TABLE barcode DROP COLUMN manufacturer_id;
        CREATE INDEX "index_barcode_manufacturer_link_id_fkey" ON "barcode" ("manufacturer_link_id");
        "#
    }?;

    Ok(())
}
