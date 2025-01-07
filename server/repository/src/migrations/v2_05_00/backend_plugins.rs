use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "backend_plugin"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE plugin_variant_type AS ENUM (
                    'BOA_JS'
                );
                "#
            )?
        }

        let variant_type = if cfg!(feature = "postgres") {
            "plugin_variant_type"
        } else {
            "TEXT"
        };

        // Types type safety is controlled by repository layer
        sql!(
            connection,
            r#"
                CREATE TABLE backend_plugin (
                    id TEXT NOT NULL PRIMARY KEY,
                    code TEXT NOT NULL,
                    bundle_base64 TEXT NOT NULL,
                    types TEXT NOT NULL,
                    variant_type {variant_type} NOT NULL
                );
            "#
        )?;

        if cfg!(feature = "postgres") {
            // Postgres changelog variant
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'backend_plugin';
                "#
            )?;
        }

        Ok(())
    }
}
