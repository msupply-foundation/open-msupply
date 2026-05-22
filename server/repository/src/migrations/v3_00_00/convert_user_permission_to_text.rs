use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "convert_user_permission_to_text"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE user_permission
                        ALTER COLUMN permission TYPE TEXT USING permission::TEXT;
                    DROP TYPE IF EXISTS permission_type;
                "#
            )?;
        }

        Ok(())
    }
}
