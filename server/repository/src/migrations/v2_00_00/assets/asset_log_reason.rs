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

    // add default reasons
    sql!(
        connection,
        r#"
    INSERT INTO asset_log_reason (id, asset_log_status, reason)
    VALUES ('020a3b04-4a29-46ca-9afd-140edcc15b7c', 'NOT_IN_USE', 'Awaiting installation'),
    ('44f648e9-2ff1-4010-be84-6bb6befce2d7', 'NOT_IN_USE', 'Stored'),
    ('772231c3-d715-4a80-868b-57afb58f7e89', 'NOT_IN_USE', 'Offsite for repairs'),
    ('6c79d05f-ebd0-4a1d-9d7e-fcea52fb24e4', 'NOT_IN_USE', 'Awaiting decommissioning'),
    ('325c1a24-97eb-4597-885d-253a52430125', 'FUNCTIONING_BUT_NEEDS_ATTENTION', 'Needs servicing'),
    ('2f734462-c76d-4b08-b8d2-40b250538d46', 'NOT_IN_USE', 'Multiple temperature breaches'),
    ('d37a8d80-aaa7-4585-a1fc-0c69f7770129', 'NOT_IN_USE', 'Unknown'),
    ('b4ae8758-27d8-440c-8f23-08d5423748e8', 'NOT_FUNCTIONING', 'Needs spare parts'),
    ('290ed6c8-20ef-469d-bf6c-dd944ae24e8f', 'NOT_FUNCTIONING', 'Lack of power');
    "#
    )?;

    Ok(())
}
