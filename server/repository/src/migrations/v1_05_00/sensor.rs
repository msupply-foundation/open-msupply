use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(not(feature = "postgres"))]
    const SENSOR_TYPE: &str = "TEXT";
    #[cfg(feature = "postgres")]
    const SENSOR_TYPE: &str = "sensor_type";
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            CREATE TYPE {SENSOR_TYPE} AS ENUM (
                'BLUE_MAESTRO',
                'LAIRD', 
                'BERLINGER'
            );
        "#
    )?;

    sql!(
        connection,
        r#"
            CREATE TABLE sensor (
                id TEXT NOT NULL PRIMARY KEY,
                serial TEXT NOT NULL,
                name TEXT NOT NULL,
                is_active BOOLEAN,
                store_id TEXT NOT NULL REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                battery_level INTEGER,
                log_interval INTEGER,
                last_connection_datetime {DATETIME},
                type {SENSOR_TYPE}
            );
            "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'sensor';

                CREATE TRIGGER sensor_trigger
                AFTER INSERT OR UPDATE OR DELETE ON sensor
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
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
