use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_skip_dose_option_to_vaccine_course"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course ADD COLUMN
                can_skip_dose BOOLEAN DEFAULT FALSE;
            "#
        )?;
        Ok(())
    }
}
