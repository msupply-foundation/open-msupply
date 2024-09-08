use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vaccine_course_changelog_table_names"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'demographic_indicator';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'vaccine_course';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'vaccine_course_dose';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'vaccine_course_item';
                "#
            )?;
        }

        Ok(())
    }
}
