use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE activity_log_type ADD VALUE 'ASSET_CREATED';
            ALTER TYPE activity_log_type ADD VALUE 'ASSET_UPDATED';
            ALTER TYPE activity_log_type ADD VALUE 'ASSET_DELETED';
            ALTER TYPE activity_log_type ADD VALUE 'ASSET_LOG_CREATED';
            "#
        )?;
    }

    Ok(())
}
