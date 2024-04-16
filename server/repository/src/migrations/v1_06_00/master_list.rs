use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE master_list ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
        "#,
    )?;

    Ok(())
}
