use crate::{migrations::sql, StorageConnection};
use crate::migrations::DATETIME;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            CREATE TABLE sensor (
                id TEXT NOT NULL PRIMARY KEY,
                serial TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                is_active BOOLEAN,
                store_id TEXT REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                battery_level INTEGER,
                log_interval INTEGER,
                last_connection_timestamp {DATETIME}
            );            
            "#
    )?;

    #[cfg(feature = "postgres")]
    {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'sensor';
            "#
        )?;

        sql!(
            connection,
            r#"CREATE OR REPLACE FUNCTION upsert_sensor_changelog()
        RETURNS trigger
        LANGUAGE plpgsql
       AS $function$
         BEGIN
           INSERT INTO changelog (table_name, record_id, row_action)
                 VALUES ('sensor', NEW.id, 'UPSERT');
           -- The return value is required, even though it is ignored for a row-level AFTER trigger
           RETURN NULL;
         END;
       $function$
       ;"#
        )?;

        sql!(
            connection,
            r#"CREATE OR REPLACE FUNCTION delete_sensor_changelog()
        RETURNS trigger
        LANGUAGE plpgsql
       AS $function$
         BEGIN
           INSERT INTO changelog (table_name, record_id, row_action)
                 VALUES ('sensor', OLD.id, 'DELETE');
           -- The return value is required, even though it is ignored for a row-level AFTER trigger
           RETURN NULL;
         END;
       $function$
       ;"#
        )?;

        sql!(
            connection,
            r#"create trigger sensor_upsert_trigger after
        insert
            or
        update
            on
            sensor for each row execute function upsert_sensor_changelog();
        "#
        )?;
        sql!(
            connection,
            r#"create trigger sensor_delete_trigger after
        delete
            on
            sensor for each row execute function delete_sensor_changelog();
        "#
        )?;
    }
    #[cfg(not(feature = "postgres"))]
    {
        sql!(
            connection,
            r#"
                CREATE TRIGGER sensor_insert_trigger
                AFTER INSERT ON sensor
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("sensor", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER sensor_update_trigger
                AFTER UPDATE ON sensor
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('sensor', NEW.id, 'UPSERT');
                END;             
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER sensor_delete_trigger
                AFTER DELETE ON sensor
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('sensor', OLD.id, 'DELETE');
                END;
            "#
        )?;
    }

    Ok(())
}
