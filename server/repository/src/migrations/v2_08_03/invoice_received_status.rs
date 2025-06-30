use crate::migrations::*;

pub(crate) struct Migrate;

/// the status Delivered is now InvoiceStatus::Received, but we have a new status called Delivered before it
/// All invoices that were Delivered before this migration will now be Received

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_received_status2"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Add new status to postgres enum
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'DELIVERED_NO_STOCK';
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'INVOICE_STATUS_DELIVERED_NO_STOCK';
                "#,
            )?;
        }

        sql!(
            connection,
            r#"
                -- Add delivered_no_stock_datetime column to invoice table
                ALTER TABLE invoice ADD COLUMN delivered_no_stock_datetime {DATETIME};
            "#
        )?;

        Ok(())
    }
}
