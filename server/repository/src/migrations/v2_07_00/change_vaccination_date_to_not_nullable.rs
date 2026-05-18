use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "change_vaccination_date_to_not_nullable"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DELETE FROM changelog AS c WHERE c.record_id IN (
                    SELECT v.id FROM vaccination AS v WHERE v.vaccination_date IS NULL
                );
                DELETE FROM vaccination WHERE vaccination_date IS NULL;
            "#,
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE vaccination ALTER COLUMN vaccination_date SET NOT NULL;
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
                        patient_link_id TEXT NOT NULL DEFAULT '',
                        encounter_id TEXT NOT NULL,
                        user_id TEXT NOT NULL,
                        vaccine_course_dose_id TEXT NOT NULL REFERENCES vaccine_course_dose(id),
                        created_datetime {DATETIME} NOT NULL,
                        facility_name_link_id TEXT,
                        facility_free_text TEXT,
                        invoice_id TEXT,
                        stock_line_id TEXT,
                        clinician_link_id TEXT,
                        vaccination_date {DATE} NOT NULL,
                        given BOOLEAN NOT NULL,
                        not_given_reason TEXT,
                        comment TEXT
                    );

                    INSERT INTO vaccination (
                        id,
                        store_id,
                        program_enrolment_id,
                        patient_link_id,
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
                        patient_link_id,
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
