use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

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
                CREATE TRIGGER sensor_trigger
                AFTER INSERT OR UPDATE OR DELETE ON sensor
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
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
