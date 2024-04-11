use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        // No referential constraint due to circular dependency during sync integration
        r#"ALTER TABLE invoice ADD COLUMN original_shipment_id TEXT;"#
    )?;

    Ok(())
}
