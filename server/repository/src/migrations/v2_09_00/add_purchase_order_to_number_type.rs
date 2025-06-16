use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_to_number_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE number_type ADD VALUE 'PURCHASE_ORDER';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'purchase_order';
                "#
            )?;
        }

        Ok(())
    }
}
