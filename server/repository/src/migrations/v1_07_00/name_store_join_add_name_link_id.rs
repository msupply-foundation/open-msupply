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
        
            CREATE OR REPLACE FUNCTION upsert_name_store_join_changelog()
            RETURNS trigger AS
            $$
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
                    VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.name_link_id, NEW.is_sync_update);
                    RETURN NULL;
                END;
            $$ LANGUAGE 'plpgsql';
            
            ALTER TABLE name_store_join ENABLE TRIGGER ALL;
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

        CREATE TRIGGER name_store_join_insert_trigger
          AFTER INSERT ON name_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
              VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.name_link_id, NEW.is_sync_update);
          END;

        CREATE TRIGGER name_store_join_update_trigger
          AFTER UPDATE ON name_store_join
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
              VALUES ('name_store_join', NEW.id, 'UPSERT', NEW.store_id, NEW.name_link_id, NEW.is_sync_update);
          END;
        "#
    )?;

    sql!(
        connection,
        r#"
            DROP INDEX index_name_store_join_name_id_fkey;
            ALTER TABLE name_store_join DROP COLUMN name_id;
            CREATE INDEX "index_name_store_join_name_link_id_fkey" ON "name_store_join" ("name_link_id");
        "#
    )?;

    Ok(())
}
