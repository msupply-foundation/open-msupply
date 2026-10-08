use crate::{StorageConnection, migrations::sql};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE name ADD COLUMN date_of_death DATE;
        "#,
    )?;

    Ok(())
}
