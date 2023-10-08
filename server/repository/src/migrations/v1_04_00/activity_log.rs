use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE activity_log ADD COLUMN change_to TEXT;
        ALTER TABLE activity_log RENAME COLUMN event TO change_from;
        "#,
    )?;

    Ok(())
}
