use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
           ALTER TABLE master_list_name_join
           ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
      
           UPDATE master_list_name_join
           SET name_link_id = name_id;
      
           ALTER TABLE master_list_name_join ADD CONSTRAINT master_list_name_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
           DROP INDEX index_master_list_name_join_name_id_fkey;
           ALTER TABLE master_list_name_join DROP COLUMN name_id;
      "#,
    )?;
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            ALTER TABLE master_list_name_join RENAME TO master_list_name_join_old;

            CREATE TABLE master_list_name_join (
                id TEXT NOT NULL PRIMARY KEY,
                master_list_id TEXT NOT NULL REFERENCES master_list(id),
                name_link_id TEXT NOT NULL REFERENCES name_link(id)
            );

            INSERT INTO master_list_name_join (id, master_list_id, name_link_id)
            SELECT id, master_list_id, name_id FROM master_list_name_join_old;

            DROP TABLE master_list_name_join_old;

            CREATE INDEX "index_master_list_name_join_name_link_id_fkey" on "master_list_name_join" (name_link_id);
        "#
    )?;

    Ok(())
}
