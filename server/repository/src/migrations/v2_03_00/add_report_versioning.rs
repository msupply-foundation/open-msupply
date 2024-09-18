use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_report_version_fields"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
            sql!(
                connection,
                r#"
                    ALTER TABLE report ADD COLUMN is_custom BOOLEAN NOT NULL DEFAULT false;
                    ALTER TABLE report ADD COLUMN version TEXT NOT NULL DEFAULT 1.0;
                    ALTER TABLE report ADD COLUMN code TEXT;
                "#
            )?;

        Ok(())
    }
}

