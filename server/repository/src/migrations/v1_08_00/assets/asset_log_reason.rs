use crate::{migrations::sql, StorageConnection};
use crate::migrations::DATETIME;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {

    sql!(
        connection,
        r#"
        CREATE TABLE asset_log_reason (
            id TEXT NOT NULL PRIMARY KEY,
            asset_log_status TEXT NOT NULL,
            reason TEXT NOT NULL,
            deleted_datetime {DATETIME}
            );
        "#,
    )?;

    Ok(())
}