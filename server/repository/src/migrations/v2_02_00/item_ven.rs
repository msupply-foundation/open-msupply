use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
          CREATE TYPE ven_category AS ENUM (
            'V',
            'E',
            'N',
            'NOT_ASSIGNED'
          );
        "#
    )?;

    const VEN_CATEGORY_ENUM_TYPE: &str = if cfg!(feature = "postgres") {
        "ven_category"
    } else {
        "TEXT"
    };

    sql!(
        connection,
        r#"
            ALTER TABLE item ADD COLUMN strength TEXT;
            ALTER TABLE item ADD COLUMN ven_category {VEN_CATEGORY_ENUM_TYPE} NOT NULL DEFAULT 'NOT_ASSIGNED';
        "#
    )?;

    // Reset translate all items on the next sync
    sql!(
        connection,
        r#"
            UPDATE sync_buffer SET integration_datetime = NULL WHERE table_name = 'item';
        "#,
    )?;

    Ok(())
}
