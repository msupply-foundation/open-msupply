use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TABLE master_list_line 
            ADD COLUMN item_link_id TEXT NOT NULL DEFAULT 'temp for migration';
            
            UPDATE master_list_line SET item_link_id = item_id;
            
            ALTER TABLE master_list_line 
            ADD CONSTRAINT master_list_line_item_link_id_fkey 
            FOREIGN KEY (item_link_id) REFERENCES item_link(id);
            DROP INDEX IF EXISTS index_master_list_line_item_id_fkey;
            ALTER TABLE master_list_line DROP item_id;
            "#,
        )?;
    } else {
        sql!(
            connection,
            r#"
            ALTER TABLE master_list_line RENAME TO master_list_line_old;

            CREATE TABLE master_list_line (
                id TEXT NOT NULL PRIMARY KEY,
                item_link_id TEXT NOT NULL REFERENCES item_link(id),
                master_list_id TEXT NOT NULL REFERENCES master_list(id)
            );

            INSERT INTO master_list_line (id, item_link_id, master_list_id)
            SELECT id, item_id, master_list_id FROM master_list_line_old;

            DROP TABLE master_list_line_old;
            "#,
        )?;
    }

    Ok(())
}
