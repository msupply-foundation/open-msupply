use crate::{migrations::*, StorageConnection};

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "patient_id_indices"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_encounter_patient_id ON encounter (patient_id);
                CREATE INDEX index_program_enrolment_patient_id ON program_enrolment (patient_id);
                CREATE INDEX index_program_event_patient_id ON program_event (patient_id);
            "#,
        )?;

        Ok(())
    }
}
