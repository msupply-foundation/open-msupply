use crate::migrations::*;

pub(crate) struct Migrate;

/// the status Delivered is now InvoiceStatus::Received, but we have a new status called Delivered before it
/// All invoices that were Delivered before this migration will now be Received

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "invoice_received_status"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- Set all existing invoices for this site that were Delivered to Received
                UPDATE invoice
                SET status = 'RECEIVED'
                WHERE status = 'DELIVERED';

                -- We don't need to create changelogs for these changes as we're mapping these to legacy statuses in translations
            "#
        )?;

        Ok(())
    }
}
