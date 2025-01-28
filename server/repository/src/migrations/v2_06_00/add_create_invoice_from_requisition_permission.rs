use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_create_invoice_from_requisition_permission"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'REQUISITION_CREATE_OUTBOUND_SHIPMENT';
                "#
            )?;
        }

        Ok(())
    }
}
