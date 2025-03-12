use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "change_vaccination_date_to_nullable"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if !cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TABLE vaccination RENAME TO vaccination_old;
                CREATE TABLE vaccination (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL,
                    program_enrolment_id TEXT NOT NULL,
                    encounter_id TEXT NOT NULL,
                    user_id TEXT NOT NULL REFERENCES user_account(id),
                    vaccine_course_dose_id TEXT NOT NULL REFERENCES vaccine_course_dose(id),
                    created_datetime {DATETIME} NOT NULL,
                    facility_name_link_id TEXT REFERENCES name(id),
                    facility_free_text TEXT,
                    invoice_id TEXT,
                    stock_line_id TEXT,
                    clinician_link_id TEXT,
                    vaccination_date {DATE},
                    given BOOLEAN NOT NULL,
                    not_given_reason TEXT,
                    comment TEXT
                );
                INSERT INTO vaccination SELECT * FROM vaccination_old;
                DROP TABLE vaccination_old;
            "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                    ALTER TABLE vaccination ALTER COLUMN vaccination_date DROP NOT NULL;
                "#,
            )?;
        };

        Ok(())
    }
}
