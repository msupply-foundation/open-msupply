use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_supplier_comment_to_invoice_line"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // The supplying store's explanation of why the quantity sent differs
        // from the quantity requested. Authored on the outbound (customer
        // invoice) side, carried to the receiving store's inbound line by the
        // shipment-transfer processor, and read-only there. Legacy mSupply
        // holds the same value in `trans_line.supplier_comment`.
        //
        // No index: it is never filtered or sorted on, only displayed beside
        // the line it belongs to.
        sql!(
            connection,
            r#"
                ALTER TABLE invoice_line ADD COLUMN supplier_comment TEXT;
            "#
        )?;

        Ok(())
    }
}
