use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create the external_dimensions property as an example (available for all asset types)
    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values) VALUES ('external_dimensions', 'external_dimensions', 'External dimensions - WxDxH (in cm)', 'STRING', NULL);
        "#,
    )?;
    Ok(())
}
