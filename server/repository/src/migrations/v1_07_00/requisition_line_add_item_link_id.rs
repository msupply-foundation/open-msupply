use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding requisition_line.item_link_id
        ALTER TABLE requisition_line
        ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE requisition_line
        SET item_link_id = item_id;
        
        ALTER TABLE requisition_line ADD CONSTRAINT requisition_line_item_link_id_fkey FOREIGN KEY (item_link_id) REFERENCES item_link(id);
       "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding requisition_line.item_link_id
        -- Disable foreign key checks to avoid firing constraints on adding new FK column
        PRAGMA foreign_keys = OFF;

        ALTER TABLE requisition_line
        ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp_for_migration' REFERENCES item_link(id); -- Can't have NOT NULL without a default... no sqlite PRAGMA for turning constraints off!
        
        UPDATE requisition_line
        SET item_link_id = item_id;

        PRAGMA foreign_keys = ON;
     "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX index_requisition_line_item_id_fkey;
        ALTER TABLE requisition_line DROP COLUMN item_id;
        "#
    }?;

    Ok(())
}
