use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "activity_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE 'ASSET_PROPERTY_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE 'ASSET_PROPERTY_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE 'VACCINE_COURSE_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE 'VACCINE_COURSE_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE 'PROGRAM_CREATED';
                    ALTER TYPE activity_log_type ADD VALUE 'PROGRAM_UPDATED';
                "#
            )?;
        }

        Ok(())
    }
}
