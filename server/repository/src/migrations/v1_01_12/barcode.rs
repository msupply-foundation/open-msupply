use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE barcode (
                id text NOT NULL PRIMARY KEY,
                value text NOT NULL,
                item_id text REFERENCES item(id),
                manufacturer_id text,
                pack_size int4,
                parent_id text
            );            
            "#
    )?;

    sql!(
        connection,
        r#"ALTER TABLE public.invoice_line ADD barcode_id text NULL REFERENCES barcode(id);"#
    )?;

    sql!(
        connection,
        r#"ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'barcode';"#
    )?;

    sql!(
        connection,
        r#"CREATE OR REPLACE FUNCTION public.upsert_barcode_changelog()
        RETURNS trigger
        LANGUAGE plpgsql
       AS $function$
         BEGIN
           INSERT INTO changelog (table_name, record_id, row_action)
                 VALUES ('barcode', NEW.id, 'UPSERT');
           -- The return value is required, even though it is ignored for a row-level AFTER trigger
           RETURN NULL;
         END;
       $function$
       ;"#
    )?;

    sql!(
        connection,
        r#"CREATE OR REPLACE FUNCTION public.delete_barcode_changelog()
        RETURNS trigger
        LANGUAGE plpgsql
       AS $function$
         BEGIN
           INSERT INTO changelog (table_name, record_id, row_action, name_id)
                 VALUES ('barcode', OLD.id, 'DELETE', OLD.name_id);
           -- The return value is required, even though it is ignored for a row-level AFTER trigger
           RETURN NULL;
         END;
       $function$
       ;"#
    )?;

    sql!(
        connection,
        r#"create trigger barcode_upsert_trigger after
        insert
            or
        update
            on
            barcode for each row execute function upsert_barcode_changelog();
        "#
    )?;
    sql!(
        connection,
        r#"create trigger barcode_delete_trigger after
        delete
            on
            barcode for each row execute function delete_barcode_changelog();
        
        "#
    )?;

    Ok(())
}
