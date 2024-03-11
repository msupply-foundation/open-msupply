use crate::migrations::DATETIME;
use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(not(feature = "postgres"))]
    const REASON_ENUM_TYPE: &'static str = "TEXT";
    #[cfg(not(feature = "postgres"))]
    const STATUS_ENUM_TYPE: &'static str = "TEXT";

    #[cfg(feature = "postgres")]
    const REASON_ENUM_TYPE: &'static str = "asset_reason";
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            CREATE TYPE {REASON_ENUM_TYPE} AS ENUM (
                'AWAITING_INSTALLATION',
                'STORED',
                'OFFSITE_FOR_REPAIRS',
                'AWAITING_DECOMISSIONING',
                'NEEDS_SERVICING',
                'MULTIPLE_TEMPERATURE_BREACHES',
                'UNKNOWN',
                'NEEDS_SPARE_PARTS',
                'LACK_OF_POWER',
                'FUNCTIONING',
                'DECOMISSIONED'
                );
            "#
    )?;

    #[cfg(feature = "postgres")]
    const STATUS_ENUM_TYPE: &'static str = "asset_status";
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            CREATE TYPE {STATUS_ENUM_TYPE} AS ENUM (
                'NOT_IN_USE',
                'FUNCTIONING',
                'FUNCTIONING_BUT_NEEDS_ATTENTION',
                'NOT_FUNCTIONING',
                'DECOMISSIONED'
                );
            );
            "#
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE asset_log (
            id TEXT NOT NULL PRIMARY KEY,
            asset_id TEXT NOT NULL REFERENCES asset(id),
            user_id NOT NULL TEXT REFERENCES user_account(id),
            status {STATUS_ENUM_TYPE},
            comment TEXT,
            type TEXT,
            reason {REASON_ENUM_TYPE},
            log_datetime {DATETIME} NOT NULL
          );
        "#,
    )?;

    Ok(())
}
