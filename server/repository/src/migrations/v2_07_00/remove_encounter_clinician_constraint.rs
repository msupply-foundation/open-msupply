use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_encounter_clinician_link_constraint2"
    }

    // Patient encounters can be synced to many sites, and one of those sites may not
    // have visibility of the associated clinician. This means that the clinician link id
    // may not exist on all sites. Therefore we need to remove the foreign key constraint

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            let result = sql!(
                connection,
                r#"
                    ALTER TABLE encounter DROP CONSTRAINT IF EXISTS encounter_clinician_link_id_fkey;
                "#
            );
            if result.is_err() {
                log::warn!("Failed to drop FK constraint on clinician_link_id column of encounter table, please check name of constraint");
            }
        } else {
            sql!(
                connection,
                r#"
                -- PRAGMA foreign_keys = OFF; -- No longer effective now that we're using transactions
                ALTER TABLE encounter RENAME TO encounter_old;

                CREATE TABLE encounter (
                    id TEXT NOT NULL PRIMARY KEY,
                    document_name TEXT NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    start_datetime {DATETIME} NOT NULL,
                    end_datetime {DATETIME},
                    status TEXT NULL,
                    store_id TEXT,
                    document_type TEXT NOT NULL,
                    program_id TEXT,
                    patient_link_id TEXT NOT NULL,
                    clinician_link_id TEXT
                );
                
                INSERT INTO encounter (
                    id,
                    document_name,
                    created_datetime,
                    start_datetime,
                    end_datetime,
                    status,
                    store_id,
                    document_type,
                    program_id,
                    patient_link_id,
                    clinician_link_id
                )
                SELECT 
                    id,
                    document_name,
                    created_datetime,
                    start_datetime,
                    end_datetime,
                    status,
                    store_id,
                    document_type,
                    program_id,
                    patient_link_id,
                    clinician_link_id
                 FROM encounter_old;

                DROP TABLE encounter_old;
                -- PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        Ok(())
    }
}
