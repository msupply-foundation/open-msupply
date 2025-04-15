use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_assign_requisition_number_processor_cursor_pg_enum_type"
    }

    // For non-transfer-related processing of requisitions
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'ASSIGN_REQUISITION_NUMBER_PROCESSOR_CURSOR';
                "#
            )?;
        }

        Ok(())
    }
}
