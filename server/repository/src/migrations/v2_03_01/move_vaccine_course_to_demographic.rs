use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "move_vaccine_course_to_demographic"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Change vaccine_course to use demographic_id instead of demographic_indicator_id
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course add COLUMN demographic_id TEXT REFERENCES demographic(id);
                UPDATE vaccine_course set demographic_id = demographic_indicator_id;
                ALTER TABLE vaccine_course DROP COLUMN demographic_indicator_id;
            "#
        )?;

        Ok(())
    }
}
