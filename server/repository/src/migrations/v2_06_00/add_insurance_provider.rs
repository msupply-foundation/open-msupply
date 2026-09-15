use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_insurance_provider"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE insurance_provider (
                    id TEXT NOT NULL PRIMARY KEY,
                    provider_name TEXT NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    prescription_validity_days INTEGER,
                    comment TEXT
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'insurance_provider';
                "#
            )?;
        }

        Ok(())
    }
}
