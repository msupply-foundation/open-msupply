use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_migration_version_to_system_log_type_enums"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'MIGRATION_VERSION';
                "#
            )?;
        }

        Ok(())
    }
}
