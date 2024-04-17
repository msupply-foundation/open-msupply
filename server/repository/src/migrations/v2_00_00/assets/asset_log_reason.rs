use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

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

    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_log_reason';
                ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ASSET_LOG_REASON_CREATED';
                ALTER TYPE activity_log_type ADD VALUE IF NOT EXISTS 'ASSET_LOG_REASON_DELETED';
            "#
        )?;
    }

    Ok(())
}
