use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_imprest_and_stock_history_to_requisition_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE requisition_type ADD VALUE IF NOT EXISTS 'IMPREST';
                    ALTER TYPE requisition_type ADD VALUE IF NOT EXISTS 'STOCK_HISTORY';
                "#
            )?;
        }

        Ok(())
    }
}
