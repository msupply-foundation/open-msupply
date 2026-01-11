use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "log_tag_sensor_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE sensor_type ADD VALUE IF NOT EXISTS 'LOG_TAG';
                "#
            )?;
        }
        Ok(())
    }
}