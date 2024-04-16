use crate::{migrations::sql, StorageConnection};

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        -- Adding invoice.name_link_id
        ALTER TABLE invoice
        ADD COLUMN name_link_id TEXT NOT NULL DEFAULT 'temp_for_migration';
        
        UPDATE invoice
        SET name_link_id = name_id;
        
        ALTER TABLE invoice ADD CONSTRAINT invoice_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
        CREATE INDEX "index_invoice_name_link_id_fkey" ON "invoice" ("name_link_id");
        "#,
    )?;
    sql!(
        connection,
        r#"
        CREATE OR REPLACE FUNCTION upsert_invoice_changelog()
        RETURNS trigger AS
        $$ BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
            VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_link_id, NEW.store_id);
            RETURN NULL;
        END; $$
        LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION delete_invoice_changelog()
        RETURNS trigger AS
        $$ BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
            VALUES ('invoice', OLD.id, 'DELETE', OLD.name_link_id, OLD.store_id);
            RETURN NULL;
        END; $$
        LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION upsert_invoice_line_changelog()
        RETURNS trigger AS
        $$ BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
            SELECT 'invoice_line', NEW.id, 'UPSERT', name_link_id, store_id FROM invoice WHERE id = NEW.invoice_id;
            RETURN NULL;
        END; $$
        LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION delete_invoice_line_changelog()
        RETURNS trigger AS
        $$ BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
            SELECT 'invoice_line', OLD.id, 'DELETE', name_link_id, store_id FROM invoice WHERE id = OLD.invoice_id;
            RETURN NULL;
        END; $$
        LANGUAGE plpgsql;

        ALTER TABLE invoice ENABLE TRIGGER ALL;
        ALTER TABLE invoice_line ENABLE TRIGGER ALL;

        DROP INDEX index_invoice_name_id_fkey;
        ALTER TABLE invoice DROP COLUMN name_id;
        "#,
    )?;
    Ok(())
}

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
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
     
        -- invoice triggers
        CREATE TRIGGER invoice_insert_trigger
          AFTER INSERT ON invoice
          BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
              VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_link_id, NEW.store_id);
          END;

        CREATE TRIGGER invoice_update_trigger
            AFTER UPDATE ON invoice
            BEGIN
                INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
                VALUES ('invoice', NEW.id, 'UPSERT', NEW.name_link_id, NEW.store_id);
            END;

        CREATE TRIGGER invoice_delete_trigger
            AFTER DELETE ON invoice
            BEGIN
                INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
                VALUES ('invoice', OLD.id, 'DELETE', OLD.name_link_id, OLD.store_id);
            END;

        CREATE TRIGGER invoice_line_insert_trigger
        
        -- invoice_line triggers
        AFTER INSERT ON invoice_line
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
                SELECT "invoice_line", NEW.id, "UPSERT", name_link_id, store_id FROM invoice WHERE id = NEW.invoice_id;
            END;

        CREATE TRIGGER invoice_line_update_trigger
        AFTER UPDATE ON invoice_line
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
                SELECT "invoice_line", NEW.id, "UPSERT", name_link_id, store_id FROM invoice WHERE id = NEW.invoice_id;
            END;

        CREATE TRIGGER invoice_line_delete_trigger
        AFTER DELETE ON invoice_line
            BEGIN
            INSERT INTO changelog (table_name, record_id, row_action, name_link_id, store_id)
                SELECT "invoice_line", OLD.id, "DELETE", name_link_id, store_id FROM invoice WHERE id = OLD.invoice_id;
            END;    

        DROP INDEX "index_invoice_name_id_fkey";
        ALTER TABLE invoice DROP COLUMN name_id;
       "#,
    )?;

    Ok(())
}
