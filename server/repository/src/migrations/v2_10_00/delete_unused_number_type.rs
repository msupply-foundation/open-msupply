use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "delete_unused_number_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The number_type in postgres was used, but not we have a custom string mapping
        // Removing this to avoid future confusion
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    DROP TYPE IF EXISTS number_row_type;
                "#
            )?;
        }

        Ok(())
    }
}
