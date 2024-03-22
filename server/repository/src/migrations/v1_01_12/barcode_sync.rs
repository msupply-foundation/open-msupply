use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE barcode ADD is_sync_update bool NOT NULL DEFAULT False;
        ALTER TABLE barcode RENAME COLUMN value TO gtin;
        "#
    )?;

    #[cfg(feature = "postgres")]
    {
        sql!(
            connection,
            r#"CREATE OR REPLACE FUNCTION upsert_barcode_changelog()
        RETURNS trigger
        LANGUAGE plpgsql
       AS $function$
         BEGIN
           INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
                 VALUES ('barcode', NEW.id, 'UPSERT', NEW.is_sync_update);
           -- The return value is required, even though it is ignored for a row-level AFTER trigger
           RETURN NULL;
         END;
       $function$
       ;"#
        )?;
    }
    #[cfg(not(feature = "postgres"))]
    {
        sql!(
            connection,
            r#"
                DROP TRIGGER barcode_insert_trigger;
                DROP TRIGGER barcode_update_trigger;
                "#
        )?;

        for operation in ["insert", "update"] {
            sql!(
                connection,
                r#"
                    CREATE TRIGGER barcode_{operation}_trigger
                    AFTER {operation} ON barcode
                    BEGIN
                        INSERT INTO changelog (table_name, record_id, row_action, is_sync_update)
                        VALUES ("barcode", NEW.id, "UPSERT", NEW.is_sync_update);
                    END;
                "#
            )?;
        }
    }

    Ok(())
}
