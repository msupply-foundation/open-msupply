use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_assign_prescription_number_processor_cursor_key_value_store"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'ASSIGN_PRESCRIPTION_NUMBER_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
