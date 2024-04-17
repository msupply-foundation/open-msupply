use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
