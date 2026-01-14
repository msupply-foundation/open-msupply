use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "activity_log_add_zero_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"ALTER TYPE activity_log_type ADD VALUE 'QUANTITY_FOR_LINE_HAS_BEEN_SET_TO_ZERO';
            "#
            )?;
        }

        Ok(())
    }
}
