use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE sync_log ADD duration_in_seconds BIGINT DEFAULT 0 NOT NULL;
        "#,
    )?;

    Ok(())
}
