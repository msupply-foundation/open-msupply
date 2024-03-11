use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE asset_log (
            id TEXT NOT NULL PRIMARY KEY,
            asset_id TEXT NOT NULL REFERENCES asset(id),
            user_id TEXT NOT NULL REFERENCES user_account(id),
            status TEXT, 
            comment TEXT,
            type TEXT,
            reason TEXT,
            log_datetime {DATETIME} NOT NULL
          );
        "#,
    )?;

    Ok(())
}
