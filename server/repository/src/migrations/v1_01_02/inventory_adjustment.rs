use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "inventory_adjustment"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        #[cfg(not(feature = "postgres"))]
        const INVENTORY_ADJUSTMENT_REASON_TYPE: &str = "TEXT";
        #[cfg(feature = "postgres")]
        const INVENTORY_ADJUSTMENT_REASON_TYPE: &str = "inventory_adjustment_type";
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                CREATE TYPE {INVENTORY_ADJUSTMENT_REASON_TYPE} AS ENUM (
                    'POSITIVE',
                    'NEGATIVE'
                );
                "#
        )?;

        sql!(
            connection,
            r#"CREATE TABLE inventory_adjustment_reason (
                id TEXT NOT NULL PRIMARY KEY,
                type {INVENTORY_ADJUSTMENT_REASON_TYPE},
                is_active BOOLEAN,
                reason TEXT NOT NULL
            );"#
        )?;

        sql!(
            connection,
            r#"ALTER TABLE invoice_line 
                ADD inventory_adjustment_reason_id TEXT REFERENCES inventory_adjustment_reason(id);"#
        )?;

        sql!(
            connection,
            r#"ALTER TABLE stocktake_line 
                ADD inventory_adjustment_reason_id TEXT REFERENCES inventory_adjustment_reason(id);"#
        )?;

        Ok(())
    }
}
