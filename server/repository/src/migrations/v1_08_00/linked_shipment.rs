use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        // No referencial constraint due to circular dependency during sync integration
        r#"ALTER TABLE invoice ADD COLUMN original_shipment_id TEXT;"#
    )?;

    Ok(())
}
