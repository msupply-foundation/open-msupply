use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_patient_link_id_to_vaccination"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // Note that OMS central may not have all program enrolment records
            // Thus, existing vaccination records may not get an associated patient link
            // We also don't add the foreign key constraint here as patient may not exist on OMS central
            // Adding as NOT NULL as all future records should have a patient link
            r#"
                ALTER TABLE vaccination ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT '';

                UPDATE vaccination 
                SET patient_link_id = (
                    SELECT program_enrolment.patient_link_id
                    FROM program_enrolment
                    WHERE program_enrolment.id = vaccination.program_enrolment_id)
                -- Ensure we only update lines that have a program enrolment 
                WHERE EXISTS (
                    SELECT 1
                    FROM program_enrolment
                    WHERE program_enrolment.id = vaccination.program_enrolment_id
                );
            "#
        )?;

        Ok(())
    }
}
