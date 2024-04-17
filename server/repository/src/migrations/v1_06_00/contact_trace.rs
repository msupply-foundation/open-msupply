use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE contact_trace ADD COLUMN relationship TEXT;
        "#,
    )?;

    Ok(())
}
