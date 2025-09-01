use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_permission_to_verify_inbound_shipment"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
            ALTER TYPE permission_type ADD VALUE 'INBOUND_SHIPMENT_VERIFY';
            "#,
            )?;
        }

        Ok(())
    }
}
