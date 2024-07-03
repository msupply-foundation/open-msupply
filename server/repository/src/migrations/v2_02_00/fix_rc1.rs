use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        UPDATE some_new_table SET new_column = 'some value';
        "#
    )?;

    Ok(())
}
