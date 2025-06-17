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
                    -- Below is to be removed before merging to develop
                    ALTER TABLE purchase_order ALTER COLUMN purchase_order_number TYPE BIGINT;
                "#
            )?;
        }

        // FEATURE BRANCH ONLY: Convert purchase_order_number from Integer to BigInt
        // TODO: Remove this migration before merging to develop - original migration already updated
        // TODO: Also remove the PostgreSQL ALTER COLUMN above for purchase_order_number
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order RENAME COLUMN purchase_order_number TO old_purchase_order_number;
                ALTER TABLE purchase_order ADD COLUMN purchase_order_number BIGINT;
                UPDATE purchase_order SET purchase_order_number = old_purchase_order_number;
                ALTER TABLE purchase_order DROP COLUMN old_purchase_order_number;
            "#
        )?;

        Ok(())
    }
}
