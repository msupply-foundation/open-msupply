use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_max_age_to_vaccine_dose"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course_dose ADD COLUMN max_age {DOUBLE} NOT NULL DEFAULT 0;
                UPDATE vaccine_course_dose SET max_age = min_age;
            "#
        )?;
        Ok(())
    }
}
