use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_master_list_to_changelog"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Changelog
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'master_list';
                "#
            )?;
        }

        Ok(())
    }
}
