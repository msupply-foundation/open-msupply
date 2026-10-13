use crate::migrations::DATETIME;
use crate::{StorageConnection, migrations::sql};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE name ADD COLUMN deleted_datetime {DATETIME};
        "#
    )?;

    Ok(())
}
