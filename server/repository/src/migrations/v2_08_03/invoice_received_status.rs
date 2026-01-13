use crate::migrations::*;

pub(crate) struct Migrate;

/// the status Delivered is now InvoiceStatus::Received, but we have a new status called Delivered before it
/// All invoices that were Delivered before this migration will now be Received

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_received_status"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Add new status to postgres enum
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE invoice_status ADD VALUE IF NOT EXISTS 'RECEIVED';
                ALTER TYPE activity_log_type
                ADD VALUE IF NOT EXISTS
                    'INVOICE_STATUS_RECEIVED';
                "#,
            )?;
        }

        sql!(
            connection,
            r#"
                -- Add received_datetime column to invoice table
                ALTER TABLE invoice ADD COLUMN received_datetime {DATETIME};

                -- Set a received_datetime for all existing invoices that were Delivered before (have a delivered_datetime)
                UPDATE invoice
                SET received_datetime = delivered_datetime
                WHERE delivered_datetime is not null;

                -- We don't need to create changelogs for these changes as we're mapping these to legacy statuses in translations
            "#
        )?;

        Ok(())
    }
}
