use crate::migrations::*;

#[cfg(not(feature = "postgres"))]
pub(crate) fn migrate(_: &StorageConnection) -> anyhow::Result<()> {
    Ok(())
}

#[cfg(feature = "postgres")]
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        CREATE TABLE demographic_indicator (
            id TEXT NOT NULL PRIMARY KEY,
            name TEXT NOT NULL,
            population_percentage {DOUBLE} NOT NULL,
            year_1_projection {DOUBLE} NOT NULL,
            year_2_projection {DOUBLE} NOT NULL,
            year_3_projection {DOUBLE} NOT NULL,
            year_4_projection {DOUBLE} NOT NULL,
            year_5_projection {DOUBLE} NOT NULL,
        )
        "#,
    )?;

    sql!(
        connection,
        r#"
        CREATE TABLE demographic_projection (
            id TEXT NOT NULL PRIMARY KEY,
            population_percentage {DOUBLE} NOT NULL,
            year_1 {DOUBLE} NOT NULL,
            year_2 {DOUBLE} NOT NULL,
            year_3 {DOUBLE} NOT NULL,
            year_4 {DOUBLE} NOT NULL,
            year_5 {DOUBLE} NOT NULL,
        )
        "#,
    )?;

    Ok(())
}
