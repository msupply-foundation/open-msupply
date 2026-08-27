use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE activity_log_type ADD VALUE 'INVENTORY_ADJUSTMENT';
            "#
        )?;
    }

    Ok(())
}
