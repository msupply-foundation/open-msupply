use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_temperature_summary_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE temperature_summary (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    sensor_id TEXT NOT NULL REFERENCES sensor(id),
                    location_id TEXT REFERENCES location(id),
                    period TEXT NOT NULL,
                    start_datetime {DATETIME} NOT NULL,
                    end_datetime {DATETIME} NOT NULL,
                    minimum_temperature {DOUBLE},
                    maximum_temperature {DOUBLE},
                    average_temperature {DOUBLE},
                    hot_duration_milliseconds INTEGER,
                    cold_duration_milliseconds INTEGER,
                    hot_threshold {DOUBLE},
                    cold_threshold {DOUBLE}
                );
                CREATE INDEX index_temperature_summary_sensor_id_start_datetime
                    ON temperature_summary (sensor_id, start_datetime);
            "#,
        )?;

        Ok(())
    }
}
