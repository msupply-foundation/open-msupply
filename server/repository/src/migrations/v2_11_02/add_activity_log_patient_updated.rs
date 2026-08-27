use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_patient_updated_to_activity_log"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PATIENT_UPDATED';
                    ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'PATIENT_CREATED';
                "#
            )?;
        }
        Ok(())
    }
}
