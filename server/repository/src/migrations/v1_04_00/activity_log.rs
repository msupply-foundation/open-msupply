use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE activity_log ADD COLUMN change_to TEXT;
        ALTER TABLE activity_log ADD COLUMN change_from TEXT;
        UPDATE activity_log SET change_from = event;
        ALTER TABLE activity_log DROP COLUMN event;
        "#,
    )?;

    Ok(())
}
