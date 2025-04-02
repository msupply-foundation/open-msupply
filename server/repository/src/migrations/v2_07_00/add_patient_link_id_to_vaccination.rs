use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_patient_link_id_to_vaccination"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // OMS central may not have all program enrolment records, so when running this mutation
            // on OMS central, existing vaccination records may not get an associated patient link.
            // Therefore we insert into changelog for all vaccination records, so when remote sites
            // upgrade, they will update their records with the correct patient link and push back to
            // OMS central on their next sync.

            // Note we don't add the foreign key constraint here as patient may not exist on OMS central
            r#"
                ALTER TABLE vaccination ADD COLUMN patient_link_id TEXT NOT NULL DEFAULT ''; -- NOT NULL as all future records should have a patient link

                UPDATE vaccination 
                SET patient_link_id = (
                    SELECT program_enrolment.patient_link_id
                    FROM program_enrolment
                    WHERE program_enrolment.id = vaccination.program_enrolment_id)
                -- Ensure we only update lines where we have the related program enrolment record
                WHERE EXISTS (
                    SELECT 1
                    FROM program_enrolment
                    WHERE program_enrolment.id = vaccination.program_enrolment_id
                );

                INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id)
                    SELECT 'vaccination', id, 'UPSERT', store_id, patient_link_id
                    FROM vaccination;
            "#
        )?;

        Ok(())
    }
}
