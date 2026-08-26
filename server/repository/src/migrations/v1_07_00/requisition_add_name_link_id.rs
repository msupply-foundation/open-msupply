use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            ALTER TABLE requisition
            ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
            UPDATE requisition
            SET name_link_id = name_id;
        
            ALTER TABLE requisition ADD CONSTRAINT requisition_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
        
            CREATE OR REPLACE FUNCTION upsert_requisition_changelog()
            RETURNS trigger AS
            $$
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
                    VALUES ('requisition', NEW.id, 'UPSERT', NEW.store_id, NEW.name_link_id, NEW.is_sync_update);
                    RETURN NULL;
                END;
            $$ LANGUAGE 'plpgsql';

            CREATE OR REPLACE FUNCTION delete_requisition_changelog()
            RETURNS trigger AS
            $$
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
                    VALUES ('requisition', OLD.id, 'DELETE', OLD.store_id, OLD.name_link_id, OLD.is_sync_update);
                    RETURN NULL;
                END;
            $$ LANGUAGE 'plpgsql';

            CREATE OR REPLACE FUNCTION upsert_requisition_line_changelog()
            RETURNS trigger AS
            $$
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
                    SELECT 'requisition_line', NEW.id, 'UPSERT', store_id, name_link_id, NEW.is_sync_update FROM requisition WHERE id = NEW.requisition_id;
                    RETURN NULL;
                END;    
            $$ LANGUAGE 'plpgsql';

            CREATE OR REPLACE FUNCTION delete_requisition_line_changelog()
            RETURNS trigger AS
            $$
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
                    SELECT 'requisition_line', OLD.id, 'DELETE', store_id, name_link_id, OLD.is_sync_update FROM requisition WHERE id = OLD.requisition_id;
                    RETURN NULL;
                END;
            $$ LANGUAGE 'plpgsql';

            ALTER TABLE requisition ENABLE TRIGGER ALL;
            ALTER TABLE requisition_line ENABLE TRIGGER ALL;
       "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            PRAGMA foreign_keys = OFF;
            ALTER TABLE requisition
            ADD COLUMN name_link_id TEXT NOT NULL REFERENCES name_link (id) DEFAULT 'temp_for_migration'; 
            UPDATE requisition SET name_link_id = name_id;
            PRAGMA foreign_keys = ON;

            -- requisition triggers
            CREATE TRIGGER requisition_insert_trigger AFTER INSERT ON requisition
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
            VALUES ('requisition', NEW.id, 'UPSERT', NEW.store_id, NEW.name_link_id, NEW.is_sync_update);
            END;
            
            CREATE TRIGGER requisition_update_trigger AFTER UPDATE ON requisition
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
            VALUES ('requisition', NEW.id, 'UPSERT', NEW.store_id, NEW.name_link_id, NEW.is_sync_update);
            END;
            
            CREATE TRIGGER requisition_delete_trigger AFTER DELETE ON requisition
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
            VALUES ('requisition', OLD.id, 'DELETE', OLD.store_id, OLD.name_link_id, OLD.is_sync_update);
            END;

            -- requisition_line triggers
            CREATE TRIGGER requisition_line_insert_trigger AFTER INSERT ON requisition_line
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
            SELECT 'requisition_line', NEW.id, 'UPSERT', store_id, name_link_id, NEW.is_sync_update FROM requisition WHERE id = NEW.requisition_id;
            END;
            
            CREATE TRIGGER requisition_line_update_trigger AFTER UPDATE ON requisition_line
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
            SELECT 'requisition_line', NEW.id, 'UPSERT', store_id, name_link_id, NEW.is_sync_update FROM requisition WHERE id = NEW.requisition_id;
            END;
            
            CREATE TRIGGER requisition_line_delete_trigger AFTER DELETE ON requisition_line
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id, is_sync_update)
            SELECT 'requisition_line', OLD.id, 'DELETE', store_id, name_link_id, OLD.is_sync_update FROM requisition WHERE id = OLD.requisition_id;
            END;
        "#,
    )?;

    sql!(
        connection,
        r#"
            DROP INDEX index_requisition_name_id_fkey;
            ALTER TABLE requisition DROP COLUMN name_id;
            CREATE INDEX "index_requisition_name_link_id_fkey" ON "requisition" ("name_link_id");
        "#
    )?;

    Ok(())
}
