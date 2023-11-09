use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE temperature_breach RENAME COLUMN acknowledged TO unacknowledged;
        "#,
    )?;

    Ok(())
}
