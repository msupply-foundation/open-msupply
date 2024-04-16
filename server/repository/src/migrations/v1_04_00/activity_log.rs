use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE activity_log ADD COLUMN changed_to TEXT;
        ALTER TABLE activity_log RENAME COLUMN event TO changed_from;
        "#,
    )?;

    Ok(())
}
