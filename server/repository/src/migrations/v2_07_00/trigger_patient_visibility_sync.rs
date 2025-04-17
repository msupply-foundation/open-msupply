use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "trigger_patient_visibility_sync"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // For vaccination records to sync between sites correctly, OMS central needs to
            // store patient/patient_link records, and all their related name_store_join records

            // So on upgrade to 2.7, create changelog for all patients + their name_store_joins
            // Triggering remote sites to push all their patient to OMS central

            // See README in service/src.programs/patient
            r#"
                INSERT INTO changelog (table_name, record_id, row_action, store_id, name_link_id)
                    SELECT 'name_store_join', id, 'UPSERT', store_id, name_link_id
                    FROM name_store_join
                    WHERE name_link_id IN (
                        SELECT name_link.id
                        FROM name_link 
                        JOIN name ON name.id = name_link.name_id
                        WHERE name.type = 'PATIENT'
                    );

                INSERT INTO changelog (table_name, record_id, row_action)
                    SELECT 'name', id, 'UPSERT'
                    FROM name 
                    WHERE type = 'PATIENT';
            "#
        )?;

        Ok(())
    }
}
