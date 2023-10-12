use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'COLD_CHAIN_API';
        "#,
    )?;

    Ok(())
}
