use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding invoice.name_link_id
        ALTER TABLE invoice
        ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE invoice
        SET name_link_id = name_id;
        
        ALTER TABLE invoice ADD CONSTRAINT invoice_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
       "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding invoice.name_link_id
        PRAGMA foreign_keys = OFF;
        ALTER TABLE invoice
        ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES name_link(id);
        
        UPDATE invoice
        SET name_link_id = name_id;
        PRAGMA foreign_keys = ON;

        CREATE INDEX "index_invoice_name_link_id_fkey" ON "invoice" ("name_link_id");
     "#,
    )?;

    sql!(
        connection,
        r#"
        DROP INDEX IF EXISTS index_invoice_name_id_fkey;

        ALTER TABLE invoice
        DROP COLUMN name_id;
       "#,
    )?;

    Ok(())
}
