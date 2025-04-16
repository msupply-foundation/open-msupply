use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_patient_link_id_to_vaccination"
    }
    /**
    All vaccination records need a `patient_link_id` applied, and vaccination changelogs
    on OMS Central need `name_link_id` set, so they can be synced to all sites where patient is
    visible (determined via name_store_join - see changelog.rs for more)

    Strategy:
    - OMS Central upgrades
      - Patient data may not be available on OMS Central, so link id not reliably applied to all vaccinations on central
      - Changelog with name_link_id will be inserted for vaccinations where patient_link_id could be applied (making these be sync-out-able)
      - Vaccinations for patients only on remote sites won't be fetch/syncable until the owning remote site upgrades
    - Remote site upgrades
      - Patient data is available, so link id applied
      - Changelog was inserted, so will sync to OMS Central
      - During integration OMS central will upsert vaccination - creating a changelog with the name_link_id
      - These vaccination records are now be sync-able
    */

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // Note we don't add the foreign key constraint here as patient may not exist yet on OMS central
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
                    FROM vaccination
                    WHERE patient_link_id <> '';
            "#
        )?;

        Ok(())
    }
}
