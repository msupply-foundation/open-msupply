use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "linked_shipment"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // No referential constraint due to circular dependency during sync integration
            r#"ALTER TABLE invoice ADD COLUMN original_shipment_id TEXT;"#
        )?;

        Ok(())
    }
}
