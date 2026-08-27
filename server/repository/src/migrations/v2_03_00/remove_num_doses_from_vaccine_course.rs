use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_num_doses_from_vaccine_course"
    }

    // We have the vaccine_course_dose table, can just look up count from there
    // Shouldn't need to maintain this count too
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course DROP COLUMN doses;
            "#
        )?;

        Ok(())
    }
}
