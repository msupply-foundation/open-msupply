use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        UPDATE temperature_breach SET acknowledged = not acknowledged;
        ALTER TABLE temperature_breach RENAME COLUMN acknowledged TO unacknowledged;
        ALTER TABLE temperature_breach ADD COLUMN comment TEXT
        "#,
    )?;

    Ok(())
}
