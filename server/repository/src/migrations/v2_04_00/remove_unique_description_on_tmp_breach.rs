use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_unique_description_on_tmp_breach"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            let result = sql!(
                connection,
                r#"
                    ALTER TABLE temperature_breach_config DROP CONSTRAINT temperature_breach_config_description_key;
                "#
            );
            if (result.is_err()) {
                log::warn!("Failed to drop unique constraint on description column of temperature_breach_config table, please check name of constraint");
            }
        } else {
            sql!(
                connection,
                r#"
                CREATE TABLE tmp_temperature_breach_config (
                    id TEXT NOT NULL PRIMARY KEY,
                    duration_milliseconds INTEGER NOT NULL,
                    type TEXT NOT NULL,
                    description TEXT NOT NULL,
                    is_active BOOLEAN,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    minimum_temperature {DOUBLE} NOT NULL,
                    maximum_temperature {DOUBLE} NOT NULL
                );
                INSERT INTO tmp_temperature_breach_config SELECT * FROM temperature_breach_config;

                PRAGMA foreign_keys = OFF;
                DROP TABLE temperature_breach_config;
                ALTER TABLE tmp_temperature_breach_config RENAME TO temperature_breach_config;
                PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        Ok(())
    }
}
