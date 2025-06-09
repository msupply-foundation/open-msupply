use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "rename_vaccine_course_is_active_to_use_in_gaps"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE vaccine_course RENAME COLUMN is_active TO use_in_gaps_calculations;
            "#
        )?;

        Ok(())
    }
}
