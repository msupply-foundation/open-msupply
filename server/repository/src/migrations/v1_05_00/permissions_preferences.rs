use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "permissions_preferences"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type ADD VALUE 'SENSOR_QUERY';
                    ALTER TYPE permission_type ADD VALUE 'SENSOR_MUTATE'; 
                    ALTER TYPE permission_type ADD VALUE 'TEMPERATURE_BREACH_QUERY';
                    ALTER TYPE permission_type ADD VALUE 'TEMPERATURE_LOG_QUERY';
                "#
            )?;
        }
        sql!(
            connection,
            r#"
                ALTER TABLE store_preference ADD COLUMN vaccine_module bool NOT NULL DEFAULT false;
            "#
        )?;

        Ok(())
    }
}
