use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE sync_log ADD integration_progress_total INTEGER;
        ALTER TABLE sync_log ADD integration_progress_done INTEGER; 
        "#,
    )?;

    Ok(())
}
