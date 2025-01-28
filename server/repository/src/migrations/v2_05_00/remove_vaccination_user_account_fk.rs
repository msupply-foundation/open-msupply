use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_vaccination_user_account_fk"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Temp fix - user_account record not always available on central server!

        if cfg!(feature = "postgres") {
            let result = sql!(
                connection,
                r#"
                    ALTER TABLE vaccination DROP CONSTRAINT vaccination_user_id_fkey;
                "#
            );
            if result.is_err() {
                log::warn!("Failed to drop FK constraint on user_id column of vaccination table, please check name of constraint");
            }
        } else {
            sql!(
                connection,
                r#"
                CREATE TABLE tmp_vaccination (
                    id TEXT NOT NULL PRIMARY KEY,
                    program_enrolment_id TEXT NOT NULL,
                    encounter_id TEXT NOT NULL,
                    created_datetime TIMESTAMP NOT NULL,
                    user_id TEXT NOT NULL,
                    vaccine_course_dose_id TEXT NOT NULL REFERENCES vaccine_course_dose(id),
                    store_id TEXT NOT NULL,
                    clinician_link_id TEXT,
                    invoice_id TEXT,
                    stock_line_id TEXT,
                    vaccination_date {DATE} NOT NULL,
                    given BOOLEAN NOT NULL,
                    not_given_reason TEXT,
                    comment TEXT,
                    facility_name_link_id TEXT,
                    facility_free_text TEXT
                );
                INSERT INTO tmp_vaccination SELECT * FROM vaccination;

                PRAGMA foreign_keys = OFF;              
                DROP TABLE vaccination;
                ALTER TABLE tmp_vaccination RENAME TO vaccination;              
                PRAGMA foreign_keys = ON;
                "#
            )?;
        }

        Ok(())
    }
}
