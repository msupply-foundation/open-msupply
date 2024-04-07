use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE permission_type ADD VALUE 'INVENTORY_ADJUSTMENT_QUERY';
            ALTER TYPE permission_type ADD VALUE 'INVENTORY_ADJUSTMENT_MUTATE';
            "#
        )?;
    }

    Ok(())
}
