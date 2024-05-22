use crate::{
    migrations::{sql, JSON},
    StorageConnection,
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE asset_catalogue_item ADD COLUMN properties {JSON};
        "#
    )?;

    sql!(
        connection,
        r#"
            ALTER TABLE asset_catalogue_property ADD COLUMN key TEXT NOT NULL DEFAULT 'some-key';
            UPDATE asset_catalogue_property SET key = name;
        "#
    )?;

    // Update the asset_catalogue_property for known asset_catalogue_property rows to use a better `key`
    sql!(
        connection,
        r#"
            UPDATE asset_catalogue_property SET key = 'energy_source' WHERE id = '7613ef45-6410-41dc-a50a-c8fabf80cf71';
            UPDATE asset_catalogue_property SET key = 'storage_volume_5c' WHERE id = '1520c497-e498-478b-bc8d-bbb57a93fd16';
            UPDATE asset_catalogue_property SET key = 'storage_volume_20c' WHERE id = '9ba1bd8a-9cb4-4dc0-af74-5278cbea6d93';
            UPDATE asset_catalogue_property SET key = 'storage_volume_70c' WHERE id = '4c15f2b6-6043-46f7-a3b2-e26077292224';
        "#
        )

    Ok(())
}
