use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_demographic_indicator_types_to_activity_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'DEMOGRAPHIC_INDICATOR_CREATED' AFTER 'VACCINATION_DELETED';
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'DEMOGRAPHIC_INDICATOR_UPDATED' AFTER 'DEMOGRAPHIC_INDICATOR_CREATED';
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'DEMOGRAPHIC_PROJECTION_CREATED' AFTER 'DEMOGRAPHIC_INDICATOR_UPDATED';
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'DEMOGRAPHIC_PROJECTION_UPDATED' AFTER 'DEMOGRAPHIC_PROJECTION_CREATED';

            "#
            )?;
        }

        Ok(())
    }
}
