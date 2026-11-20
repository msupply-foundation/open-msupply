use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_standalone_central_admin_key_pg_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'STANDALONE_CENTRAL_ADMIN_USER_ID';
                "#
            )?;
        }

        Ok(())
    }
}
