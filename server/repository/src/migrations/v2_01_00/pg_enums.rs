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

    Ok(())
}
