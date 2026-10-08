use crate::{
    StorageConnection,
    migrations::{DATE, sql},
};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE store ADD COLUMN created_date {DATE};
        "#,
    )?;

    Ok(())
}
