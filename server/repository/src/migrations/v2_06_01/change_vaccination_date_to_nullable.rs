use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "change_vaccination_date_to_nullable"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                // Also drop FK reference that we removed for sqlite in 2.5 but not for postgres
                // name_link may not exist everywhere that vaccination is synced, so no reference constraint
                r#"
                    ALTER TABLE vaccination ALTER COLUMN vaccination_date DROP NOT NULL;
                    
                    ALTER TABLE vaccination DROP CONSTRAINT vaccination_facility_name_link_id_fkey;
                "#,
            )?;
        } else {
            sql!(
                connection,
                r#"
                -- PRAGMA foreign_keys = OFF; -- No longer effective now that we're using transactions
                ALTER TABLE vaccination RENAME TO vaccination_old;
                CREATE TABLE vaccination (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL,
                    program_enrolment_id TEXT NOT NULL,
                    encounter_id TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    vaccine_course_dose_id TEXT NOT NULL REFERENCES vaccine_course_dose(id),
                    created_datetime {DATETIME} NOT NULL,
                    facility_name_link_id TEXT,
                    facility_free_text TEXT,
                    invoice_id TEXT,
                    stock_line_id TEXT,
                    clinician_link_id TEXT,
                    vaccination_date {DATE},
                    given BOOLEAN NOT NULL,
                    not_given_reason TEXT,
                    comment TEXT
                );
                INSERT INTO vaccination (
                    id,
                    store_id,
                    program_enrolment_id,
                    encounter_id,
                    user_id,
                    vaccine_course_dose_id,
                    created_datetime,
                    facility_name_link_id,
                    facility_free_text,
                    invoice_id,
                    stock_line_id,
                    clinician_link_id,
                    vaccination_date,
                    given,
                    not_given_reason,
                    comment
                )
                SELECT
                    id,
                    store_id,
                    program_enrolment_id,
                    encounter_id,
                    user_id,
                    vaccine_course_dose_id,
                    created_datetime,
                    facility_name_link_id,
                    facility_free_text,
                    invoice_id,
                    stock_line_id,
                    clinician_link_id,
                    vaccination_date,
                    given,
                    not_given_reason,
                    comment
                FROM vaccination_old;
                DROP TABLE vaccination_old;
                -- PRAGMA foreign_keys = ON;
                "#,
            )?;
        };

        Ok(())
    }
}
