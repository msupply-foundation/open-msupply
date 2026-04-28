use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_v7_cursor_pg_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PULL_CURSOR_V7';
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SYNC_PUSH_CURSOR_V7';
                "#
            )?;
        }

        Ok(())
    }
}
