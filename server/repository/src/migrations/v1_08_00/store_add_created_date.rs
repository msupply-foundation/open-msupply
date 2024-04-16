use crate::{
    migrations::{sql, DATE},
    StorageConnection,
};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE store ADD COLUMN created_date {DATE};
        "#,
    )?;

    Ok(())
}
