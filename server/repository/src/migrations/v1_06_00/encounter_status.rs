use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TYPE encounter_status ADD VALUE 'DELETED' AFTER 'CANCELLED';
        "#,
    )?;

    Ok(())
}
