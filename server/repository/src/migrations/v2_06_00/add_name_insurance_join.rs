use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_name_insurance_join"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let policy_type = if cfg!(feature = "postgres") {
            "insurance_policy_type"
        } else {
            "TEXT"
        };

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'name_insurance_join';
                "#
            )?;

            // Postgres enum variant for policy_type
            sql!(
                connection,
                r#"
                    CREATE TYPE insurance_policy_type AS ENUM ('PERSONAL', 'BUSINESS');
                "#
            )?;
        }

        sql!(
            connection,
            r#"
                CREATE TABLE name_insurance_join (
                    id TEXT NOT NULL PRIMARY KEY,
                    name_link_id TEXT NOT NULL REFERENCES name_link(id),
                    insurance_provider_id TEXT NOT NULL REFERENCES insurance_provider(id),
                    policy_number_person TEXT,
                    policy_number_family TEXT,
                    policy_number TEXT NOT NULL,
                    policy_type {policy_type} NOT NULL,
                    discount_percentage {DOUBLE} NOT NULL,
                    expiry_date DATE NOT NULL,
                    is_active BOOLEAN NOT NULL,
                    entered_by_id TEXT
                );
            "#
        )?;

        Ok(())
    }
}
