use crate::migrations::*;

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(not(feature = "postgres"))]
    const RELATED_RECORD_TYPE: &'static str = "TEXT";
    #[cfg(feature = "postgres")]
    const RELATED_RECORD_TYPE: &'static str = "related_record_type";
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            CREATE TYPE {RELATED_RECORD_TYPE} AS ENUM (
                'STOCK_LINE'
            );
        "#
    )?;

    sql!(
        connection,
        r#"
            CREATE TABLE plugin_data (
                id TEXT NOT NULL PRIMARY KEY,
                plugin_name TEXT NOT NULL,
                related_record_id TEXT NOT NULL,
                related_record_type {RELATED_RECORD_TYPE} NOT NULL,
                store_id TEXT NOT NULL REFERENCES store(id),
                data TEXT NOT NULL
            );
        "#,
    )?;

    Ok(())
}
