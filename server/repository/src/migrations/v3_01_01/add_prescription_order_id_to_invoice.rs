use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_prescription_order_id_to_invoice"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Deliberately no FK: dispensing invoices are patient-distributed and can
        // land on sites that never receive the (remote-owned) prescription_order,
        // same reason invoice.requisition_id is a soft reference.
        sql!(
            connection,
            r#"
            ALTER TABLE invoice ADD COLUMN prescription_order_id TEXT;
            "#
        )?;

        Ok(())
    }
}
