use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_support_upload_files_processor_cursor_key_value_store"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SUPPORT_UPLOAD_FILES_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
