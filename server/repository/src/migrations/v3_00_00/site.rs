use crate::{migrations::sql, StorageConnection};

// todo wat
pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"CREATE TABLE site (
            id TEXT NOT NULL PRIMARY KEY,
            site_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            hardware_id TEXT NOT NULL,
            hashed_password TEXT NOT NULL
        );"#
    )?;

    sql!(
        connection,
        r#"
        ALTER TABLE store ADD COLUMN om_site_id INTEGER;
        "#
    )?;

    Ok(())
}
