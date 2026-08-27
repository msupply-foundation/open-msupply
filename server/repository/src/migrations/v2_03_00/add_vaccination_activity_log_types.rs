use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccination_activity_log_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'VACCINATION_CREATED';
                ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'VACCINATION_UPDATED';
                ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'VACCINATION_DELETED';
            "#
            )?;
        }

        Ok(())
    }
}
