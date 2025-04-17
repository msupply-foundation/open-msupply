use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_central_patient_visibility_processor_pg_enum_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'ADD_CENTRAL_PATIENT_VISIBILITY_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
