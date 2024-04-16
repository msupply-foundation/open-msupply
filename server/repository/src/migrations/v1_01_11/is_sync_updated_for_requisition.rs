use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    // is_sync_update field, to make sure that records coming through sync don't trigger circular sync
    // (sync integration operation is flagged as is_sync_update = true and is_sync_update = true records are filtered form push queue)
    // this is edge case for remote data (requisition) due to authorisation logic, where ownership is changed to central server while
    // record is being authorised

    sql!(
        connection,
        r#"
            ALTER TABLE requisition ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE requisition_line ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;
            "#
    )?;

    // Adding is_sync_update to changelog table requires dropping and re-create changelog_deduped view (with new is_sync_update column)
    sql!(
        connection,
        r#"
            DROP VIEW changelog_deduped;

            ALTER TABLE changelog ADD is_sync_update BOOLEAN NOT NULL DEFAULT FALSE;

            CREATE VIEW changelog_deduped AS
            SELECT t1.cursor,
                t1.table_name,
                t1.record_id,
                t1.row_action,
                t1.name_id,
                t1.store_id,
                t1.is_sync_update
            FROM changelog t1
            WHERE t1.cursor = (SELECT max(t2.cursor) 
                            from changelog t2
                            where t2.record_id = t1.record_id)
            ORDER BY t1.cursor;
            "#
    )?;

    // Triggers for requisition insert and update
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            CREATE OR REPLACE FUNCTION upsert_requisition_changelog()
            RETURNS trigger AS
            $$
              BEGIN
                INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id, is_sync_update)
                  VALUES ('requisition', NEW.id, 'UPSERT', NEW.name_id, NEW.store_id, NEW.is_sync_update);
                -- The return value is required, even though it is ignored for a row-level AFTER trigger
                RETURN NULL;
              END;
            $$ LANGUAGE 'plpgsql';
            "#
    )?;
    #[cfg(not(feature = "postgres"))]
    {
        sql!(
            connection,
            r#"
                DROP TRIGGER requisition_insert_trigger;
                DROP TRIGGER requisition_update_trigger;
                "#
        )?;
        for operation in ["insert", "update"] {
            sql!(
                connection,
                r#"
                    CREATE TRIGGER requisition_{operation}_trigger
                    AFTER {operation} ON requisition
                    BEGIN
                      INSERT INTO changelog (table_name, record_id, row_action, name_id, store_id, is_sync_update)
                        VALUES ("requisition", NEW.id, "UPSERT", NEW.name_id, NEW.store_id, NEW.is_sync_update);
                    END;
                    "#
            )?;
        }
    }

    // Triggers for requisition_line insert and update
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            CREATE OR REPLACE FUNCTION upsert_requisition_line_changelog()
            RETURNS trigger AS
            $$
              BEGIN
                INSERT INTO changelog (table_name, record_id, is_sync_update, row_action,name_id, store_id)
                  SELECT 'requisition_line', NEW.id, NEW.is_sync_update, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
                -- The return value is required, even though it is ignored for a row-level AFTER trigger
                RETURN NULL;
              END;
            $$ LANGUAGE 'plpgsql';
            "#
    )?;
    #[cfg(not(feature = "postgres"))]
    {
        sql!(
            connection,
            r#"
                DROP TRIGGER requisition_line_insert_trigger;
                DROP TRIGGER requisition_line_update_trigger;
                "#
        )?;
        for operation in ["insert", "update"] {
            sql!(
                connection,
                r#"
                    CREATE TRIGGER requisition_line_{operation}_trigger
                    AFTER {operation} ON requisition_line
                    BEGIN
                        INSERT INTO changelog (table_name, record_id, is_sync_update, row_action, name_id, store_id)
                            SELECT "requisition_line", NEW.id, NEW.is_sync_update, 'UPSERT', name_id, store_id FROM requisition WHERE id = NEW.requisition_id;
                    END;
                    "#
            )?;
        }
    }

    Ok(())
}
