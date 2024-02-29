use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding stock_line.supplier_link_id
        ALTER TABLE stock_line
        ADD COLUMN supplier_link_id TEXT;
        
        UPDATE stock_line
        SET supplier_link_id = supplier_id;
        
        ALTER TABLE stock_line ADD CONSTRAINT stock_line_supplier_link_id_fkey FOREIGN KEY (supplier_link_id) REFERENCES name_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding stock_line.supplier_link_id
        PRAGMA foreign_keys = OFF;
        ALTER TABLE stock_line
        ADD COLUMN supplier_link_id TEXT REFERENCES name_link(id);
        
        UPDATE stock_line
        SET supplier_link_id = supplier_id;
        PRAGMA foreign_keys = ON;
        "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX index_stock_line_supplier_id;
        ALTER TABLE stock_line DROP COLUMN supplier_id;
        CREATE INDEX "index_stock_line_supplier_link_id_fkey" ON "stock_line" ("supplier_link_id");
        "#
    }?;

    Ok(())
}
