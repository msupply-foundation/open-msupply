use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create a donor property that can be assigned to assets
    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, name, value_type, allowed_values) VALUES ('donor', 'Donor', 'STRING', NULL);
        "#,
    )?;
    Ok(())
}
