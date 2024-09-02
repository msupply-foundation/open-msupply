use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccinations_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE vaccination (
                    id TEXT NOT NULL PRIMARY KEY,
                    encounter_id TEXT NOT NULL,
                    created_datetime TIMESTAMP NOT NULL,
                    user_id TEXT NOT NULL REFERENCES user_account(id),
                    store_id TEXT NOT NULL REFERENCES store(id),
                    clinician_link_id TEXT,
                    invoice_line_id TEXT,
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
