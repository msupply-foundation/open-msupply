use crate::migrations::*;

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}

/// For Diesel 2 enums to work in Postgres there must be an actual type in the database.
/// This migration adds all missing enums.
#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TYPE item_type AS ENUM (
            'STOCK',
            'SERVICE',
            'NON_STOCK'
        );
        ALTER TABLE item ALTER COLUMN type TYPE item_type using type::item_type;
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TYPE temperature_breach_type AS ENUM (
            'COLD_CONSECUTIVE',
            'COLD_CUMULATIVE',
            'HOT_CONSECUTIVE',
            'HOT_CUMULATIVE',
            'EXCURSION'
        );

        ALTER TABLE temperature_breach ALTER COLUMN type TYPE temperature_breach_type using type::temperature_breach_type;
        ALTER TABLE temperature_breach_config ALTER COLUMN type TYPE temperature_breach_type using type::temperature_breach_type;
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TYPE asset_log_status AS ENUM (
            'NOT_IN_USE',
            'FUNCTIONING',
            'FUNCTIONING_BUT_NEEDS_ATTENTION',
            'NOT_FUNCTIONING',
            'DECOMMISSIONED'
        );
        CREATE TYPE asset_log_reason AS ENUM (
            'AWAITING_INSTALLATION',
            'STORED',
            'OFFSITE_FOR_REPAIRS',
            'AWAITING_DECOMMISSIONING',
            'NEEDS_SERVICING',
            'MULTIPLE_TEMPERATURE_BREACHES',
            'UNKNOWN',
            'NEEDS_SPARE_PARTS',
            'LACK_OF_POWER',
            'FUNCTIONING',
            'DECOMMISSIONED'
        );
        DROP VIEW latest_asset_log;
        ALTER TABLE asset_log ALTER COLUMN status TYPE asset_log_status using status::asset_log_status;
        ALTER TABLE asset_log ALTER COLUMN reason TYPE asset_log_reason using reason::asset_log_reason;
        CREATE OR REPLACE VIEW public.latest_asset_log
            AS SELECT al.id,
                al.asset_id,
                al.user_id,
                al.status,
                al.comment,
                al.type,
                al.reason,
                al.log_datetime
            FROM (SELECT asset_log.asset_id,
                        max(asset_log.log_datetime) AS latest_log_datetime
                    FROM asset_log
                    GROUP BY asset_log.asset_id) grouped
                JOIN asset_log al ON al.asset_id = grouped.asset_id AND al.log_datetime = grouped.latest_log_datetime;
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TYPE sync_file_status AS ENUM (
            'NEW',
            'IN_PROGRESS',
            'ERROR',
            'DONE',
            'PERMANENT_FAILURE'
        );
        ALTER TABLE sync_file_reference ALTER COLUMN status TYPE sync_file_status using status::sync_file_status;
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TYPE sync_file_direction AS ENUM (
            'UPLOAD',
            'DOWNLOAD'
        );
        ALTER TABLE sync_file_reference ALTER COLUMN direction TYPE sync_file_direction using direction::sync_file_direction;
        "#,
    )?;

    Ok(())
}
