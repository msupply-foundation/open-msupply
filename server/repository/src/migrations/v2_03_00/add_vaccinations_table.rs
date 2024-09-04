use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccinations_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Note: some fields don't have reference constraints, as those records may not be synced to Central OMS
        // or to other facilities viewing the vaccination records
        sql!(
            connection,
            r#"
                CREATE TABLE vaccination (
                    id TEXT NOT NULL PRIMARY KEY,
                    program_id TEXT NOT NULL,
                    encounter_id TEXT NOT NULL,
                    created_datetime TIMESTAMP NOT NULL,
                    user_id TEXT NOT NULL REFERENCES user_account(id),
                    vaccine_course_dose_id TEXT NOT NULL REFERENCES vaccine_course_dose(id),
                    store_id TEXT NOT NULL,
                    clinician_link_id TEXT,
                    invoice_id TEXT,
                    stock_line_id TEXT,
                    vaccination_date {DATE} NOT NULL,
                    given BOOLEAN NOT NULL,
                    not_given_reason TEXT,
                    comment TEXT
                );
            "#
        )?;

        Ok(())
    }
}
