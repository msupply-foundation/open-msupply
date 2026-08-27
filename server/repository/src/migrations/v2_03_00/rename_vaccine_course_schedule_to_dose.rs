use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_vaccine_course_schedule_to_dose"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course_schedule RENAME TO vaccine_course_dose;

                ALTER TABLE vaccine_course_dose ADD COLUMN min_interval_days INT NOT NULL DEFAULT 0;
                ALTER TABLE vaccine_course_dose ADD COLUMN min_age {DOUBLE} NOT NULL DEFAULT 0.0;
            "#
        )?;

        Ok(())
    }
}
