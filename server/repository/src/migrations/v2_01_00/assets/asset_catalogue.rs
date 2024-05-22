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
            ALTER TABLE asset_catalogue_property ADD COLUMN key TEXT NOT NULL DEFAULT name;
        "#
    )?;

    Ok(())
}
