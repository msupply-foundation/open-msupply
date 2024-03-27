use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // asset status (configurable)
    sql!(
        connection,
        r#"
        CREATE TABLE asset_log_status (
            id TEXT NOT NULL PRIMARY KEY,
            status TEXT NOT NULL,
          );
        "#,
    )?;
    // asset reason (configurable)
    sql!(
        connection,
        r#"
        CREATE TABLE asset_log_reason (
            id TEXT NOT NULL PRIMARY KEY,
            status_id TEXT NOT NULL REFERENCES asset_log_status(id)
            reason TEXT NOT NULL,
          );
        "#,
    )?;

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

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_log';
            "#
        )?;
    }

    Ok(())
}
