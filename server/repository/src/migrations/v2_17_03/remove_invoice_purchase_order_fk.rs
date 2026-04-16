use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_invoice_purchase_order_fk"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The purchase_order_id FK on invoice can cause integration failures when
        // OG data references purchase orders that don't exist in OMS.
        // Other similar FK fields (requisition_id, linked_invoice_id, original_shipment_id)
        // don't have constraints, so this is consistent with that pattern.
        // See: https://github.com/msupply-foundation/open-msupply/issues/10898

        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TABLE invoice DROP CONSTRAINT IF EXISTS invoice_purchase_order_id_fkey;
                "#
            )?;
        }
        // SQLite: The purchase_order_id column was added via ALTER TABLE ADD COLUMN
        // with REFERENCES, which SQLite does not enforce, so no action needed.

        Ok(())
    }
}
