use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "change_asset_log_type_to_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Normalise existing values to the new enum variants. The column stays nullable
        // at the DB level (to avoid recreating the table on SQLite), but the service
        // layer always writes a concrete value from here on.
        sql!(
            connection,
            r#"
                UPDATE asset_log
                SET type = 'TEMPERATURE_MAPPING'
                WHERE type = 'Temperature Mapping';
            "#
        )?;
        sql!(
            connection,
            r#"
                UPDATE asset_log
                SET type = 'STATUS_UPDATE'
                WHERE type IS NULL OR type <> 'TEMPERATURE_MAPPING';
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    CREATE TYPE asset_log_type AS ENUM (
                        'STATUS_UPDATE',
                        'TEMPERATURE_MAPPING'
                    );
                "#
            )?;
            sql!(
                connection,
                r#"
                    ALTER TABLE asset_log
                        ALTER COLUMN type TYPE asset_log_type
                        USING type::asset_log_type;
                "#
            )?;
        }

        Ok(())
    }
}
