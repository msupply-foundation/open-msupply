use crate::migrations::*;

/// Purchase order charges are replaced by service item lines.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_charges_from_purchase_order"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE purchase_order DROP COLUMN agent_commission;
                ALTER TABLE purchase_order DROP COLUMN document_charge;
                ALTER TABLE purchase_order DROP COLUMN communications_charge;
                ALTER TABLE purchase_order DROP COLUMN insurance_charge;
                ALTER TABLE purchase_order DROP COLUMN freight_charge;
            "#
        )?;

        Ok(())
    }
}
