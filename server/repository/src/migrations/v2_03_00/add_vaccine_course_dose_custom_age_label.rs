use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccine_course_dose_custom_age_label"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course_dose ADD COLUMN custom_age_label TEXT;
            "#
        )?;

        Ok(())
    }
}
