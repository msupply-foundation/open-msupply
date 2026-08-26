use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "vaccine_course_store_config"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE vaccine_course_store_config (
                    id TEXT PRIMARY KEY NOT NULL,
                    vaccine_course_id TEXT NOT NULL REFERENCES vaccine_course(id),
                    store_id TEXT NOT NULL REFERENCES store(id),
                    wastage_rate {DOUBLE},
                    coverage_rate {DOUBLE}
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'vaccine_course_store_config';
                "#
            )?;
        }

        Ok(())
    }
}
