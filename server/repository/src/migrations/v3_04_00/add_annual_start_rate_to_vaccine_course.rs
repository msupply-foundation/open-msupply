use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_annual_start_rate_to_vaccine_course"
    }

    // The share of a course's target population that starts the course each year. 100
    // keeps every existing course forecasting as it did: the whole group, every year.
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course ADD COLUMN annual_start_rate {DOUBLE} NOT NULL DEFAULT 100;
            "#
        )?;
        Ok(())
    }
}
