use crate::migrations::{DATETIME, DOUBLE};
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'COLD_CHAIN_API';
            "#,
        )?;
    }

    sql!(
        connection,
        r#"
            CREATE TABLE temperature_breach (
                id TEXT NOT NULL PRIMARY KEY,
                duration_milliseconds INTEGER NOT NULL,
                type TEXT NOT NULL,
                sensor_id TEXT NOT NULL REFERENCES sensor(id),
                store_id TEXT NOT NULL REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                start_datetime {DATETIME} NOT NULL,
                end_datetime {DATETIME},
                acknowledged BOOLEAN,
                threshold_minimum {DOUBLE} NOT NULL,
                threshold_maximum {DOUBLE} NOT NULL,
                threshold_duration_milliseconds INTEGER NOT NULL
            );

            CREATE TABLE temperature_log (
                id TEXT NOT NULL PRIMARY KEY,
                temperature {DOUBLE} NOT NULL,
                sensor_id TEXT NOT NULL REFERENCES sensor(id),
                store_id TEXT NOT NULL REFERENCES store(id),
                location_id TEXT REFERENCES location(id),
                datetime {DATETIME} NOT NULL,
                temperature_breach_id TEXT REFERENCES temperature_breach(id)
            );   

            CREATE TABLE temperature_breach_config (
                id TEXT NOT NULL PRIMARY KEY,
                duration_milliseconds INTEGER NOT NULL,
                type TEXT NOT NULL,
                description TEXT NOT NULL UNIQUE,
                is_active BOOLEAN,
                store_id TEXT NOT NULL REFERENCES store(id),
                minimum_temperature {DOUBLE} NOT NULL,
                maximum_temperature {DOUBLE} NOT NULL
            );
            "#
    )?;

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'temperature_breach';
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'temperature_log';
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'temperature_breach_config';

                CREATE TRIGGER temperature_breach_trigger
                AFTER INSERT OR UPDATE OR DELETE ON temperature_breach
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
                
                CREATE TRIGGER temperature_log_trigger
                AFTER INSERT OR UPDATE OR DELETE ON temperature_log
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();

                CREATE TRIGGER temperature_breach_config_trigger
                AFTER INSERT OR UPDATE OR DELETE ON temperature_breach_config
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
                
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER temperature_breach_insert_trigger
                AFTER INSERT ON temperature_breach
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("temperature_breach", NEW.id, "UPSERT");
                END;


                CREATE TRIGGER temperature_log_insert_trigger
                AFTER INSERT ON temperature_log
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("temperature_log", NEW.id, "UPSERT");
                END;

                CREATE TRIGGER temperature_breach_config_insert_trigger
                AFTER INSERT ON temperature_breach_config
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("temperature_breach_config", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER temperature_breach_update_trigger
                AFTER UPDATE ON temperature_breach
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('temperature_breach', NEW.id, 'UPSERT');
                END;

                CREATE TRIGGER temperature_log_update_trigger
                AFTER UPDATE ON temperature_log
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('temperature_log', NEW.id, 'UPSERT');
                END; 

                CREATE TRIGGER temperature_breach_config_update_trigger
                AFTER UPDATE ON temperature_breach_config
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('temperature_breach_config', NEW.id, 'UPSERT');
                END;         
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER temperature_breach_delete_trigger
                AFTER DELETE ON temperature_breach
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('temperature_breach', OLD.id, 'DELETE');
                END;

                CREATE TRIGGER temperature_log_delete_trigger
                AFTER DELETE ON temperature_log
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('temperature_log', OLD.id, 'DELETE');
                END;

                CREATE TRIGGER temperature_breach_config_delete_trigger
                AFTER DELETE ON temperature_breach_config
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('temperature_breach_config', OLD.id, 'DELETE');
                END;
            "#
        )?;
    }

    Ok(())
}
