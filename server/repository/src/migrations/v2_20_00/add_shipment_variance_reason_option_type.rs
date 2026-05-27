use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_shipment_variance_reason_option_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE reason_option_type
                      ADD VALUE IF NOT EXISTS 'SHIPMENT_VARIANCE' AFTER 'REQUISITION_LINE_VARIANCE';
                "#
            )?;
        }

        Ok(())
    }
}
