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
            DROP TABLE asset_catalogue_item_property;
            DROP TABLE asset_catalogue_property;
        "#
    )?;

    Ok(())
}
