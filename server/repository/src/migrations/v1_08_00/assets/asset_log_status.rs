use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset_log_status (
            id TEXT NOT NULL PRIMARY KEY,
            asset_log_id TEXT NOT NULL REFERENCES asset_log (id),
            status TEXT NOT NULL
            );
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE asset_log_reason (
            id TEXT NOT NULL PRIMARY KEY,
            asset_log_status_id TEXT NOT NULL REFERENCES asset_log_status (id),
            reason TEXT NOT NULL
            );
        "#,
    )?;

    Ok(())
}