use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Create the external_dimensions property as an example (available for all asset types)
    sql!(
        connection,
        r#"
        INSERT INTO asset_property (id, key, name, value_type, allowed_values, asset_class_id) VALUES ('external_dimensions', 'external_dimensions', 'External dimensions - WxDxH (in cm)', 'STRING', NULL, 'fad280b6-8384-41af-84cf-c7b6b4526ef0');
        "#,
    )?;

    // Properties for Cold/Freezer rooms

    sql!(
        connection,
        r#"
        -- TODO
        "#,
    )?;

    Ok(())
}
