use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_vaccine_course_dose_dose_number"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Dropped in favour of sorting by min_age
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course_dose DROP COLUMN dose_number;
            "#
        )?;

        Ok(())
    }
}
