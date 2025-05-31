use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_dynamic_cursor_key"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Changelog
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'DYNAMIC_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
