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
            reason_id TEXT REFERENCES asset_log_reason(id),
            comment TEXT,
            type TEXT,
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
