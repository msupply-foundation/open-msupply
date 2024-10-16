use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_reason_option_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE reason_option_type AS ENUM (
                'POSITIVE_INVENTORY_ADJUSTMENT',
                'NEGATIVE_INVENTORY_ADJUSTMENT',
                'RETURN_REASON',
                'REQUISITION_LINE_VARIANCE'
                );
            "#
            )?;
        }

        const OPTION_TYPE_ENUM: &str = if cfg!(feature = "postgres") {
            "reason_option_type"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE reason_option (
                    id TEXT NOT NULL PRIMARY KEY,
                    type {OPTION_TYPE_ENUM} NOT NULL DEFAULT 'POSITIVE_INVENTORY_ADJUSTMENT',
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    reason TEXT NOT NULL
                );
            "#
        )?;

        Ok(())
    }
}
