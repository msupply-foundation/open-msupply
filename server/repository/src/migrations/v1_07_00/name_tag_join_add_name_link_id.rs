use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE name_tag_join
            ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
            UPDATE name_tag_join
            SET name_link_id = name_id;
        
            ALTER TABLE name_tag_join ADD CONSTRAINT name_tag_join_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
       "#,
    )?;
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            PRAGMA foreign_keys = OFF;
            ALTER TABLE name_tag_join
            ADD COLUMN name_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration'; 
            UPDATE name_tag_join SET name_link_id = name_id;
            PRAGMA foreign_keys = ON;
        "#,
    )?;

    sql!(
        connection,
        r#"
            ALTER TABLE name_tag_join DROP COLUMN name_id;
            CREATE INDEX "index_name_tag_join_name_link_id_fkey" ON "name_tag_join" ("name_link_id");
        "#
    )?;

    Ok(())
}
