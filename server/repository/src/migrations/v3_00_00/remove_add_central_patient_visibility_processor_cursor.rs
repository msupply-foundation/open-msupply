use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_add_central_patient_visibility_processor_cursor"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The AddPatientVisibilityForCentral processor has been removed, so its cursor entry in
        // key_value_store is no longer needed. The 'ADD_CENTRAL_PATIENT_VISIBILITY_PROCESSOR_CURSOR'
        // value remains in the postgres key_type enum (postgres does not support removing enum
        // values), but no code references it anymore.
        sql!(
            connection,
            r#"
                DELETE FROM key_value_store WHERE id = 'ADD_CENTRAL_PATIENT_VISIBILITY_PROCESSOR_CURSOR';
            "#
        )?;

        Ok(())
    }
}
