use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE some_new_table ADD COLUMN new_column TEXT;
        "#
    )?;

    Ok(())
}
