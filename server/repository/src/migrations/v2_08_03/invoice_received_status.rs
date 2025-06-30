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
                    'PRESCRIPTION_STATUS_RECEIVED';
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
                SET status = 'RECEIVED',
                received_datetime = delivered_datetime
                WHERE delivered_datetime is not null

                -- Set all existing invoices for this site that were Delivered to Received
                UPDATE invoice
                SET status = 'RECEIVED'
                WHERE status = 'DELIVERED';

                --Create changelogs to resync all the invoices that were Delivered before and are for this sync site
                INSERT INTO changelog (record_id, table_name, row_action, store_id)
                SELECT id,'invoice', 'UPSERT', store_id
                FROM invoice
                WHERE received_datetime IS NOT NULL
                AND store_id in (SELECT store_id FROM store WHERE site_id in (SELECT value_int FROM key_value_store WHERE id = 'SETTINGS_SYNC_SITE_ID'))
            "#
        )?;

        Ok(())
    }
}
