use crate::{StorageConnection, migrations::sql};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE currency ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
        "#
    )?;

    Ok(())
}
