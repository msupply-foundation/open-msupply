use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE name_store_join
            ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
            UPDATE name_store_join
            SET name_link_id = name_id;
        
            ALTER TABLE name_store_join ADD CONSTRAINT name_store_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
       "#,
    )?;
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            PRAGMA foreign_keys = OFF;
            ALTER TABLE name_store_join
            ADD COLUMN name_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration'; 
            UPDATE name_store_join SET name_link_id = name_id;
            PRAGMA foreign_keys = ON;

            CREATE INDEX "index_name_store_join_name_link_id_fkey" ON "name_store_join" ("name_link_id");
            "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX IF EXISTS index_name_store_join_name_id_fkey;
        ALTER TABLE name_store_join DROP COLUMN name_id;
        "#
    }?;

    Ok(())
}
