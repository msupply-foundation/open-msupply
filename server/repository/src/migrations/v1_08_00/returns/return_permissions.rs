use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE permission_type ADD VALUE 'OUTBOUND_RETURN_QUERY';
            ALTER TYPE permission_type ADD VALUE 'OUTBOUND_RETURN_MUTATE';
            ALTER TYPE permission_type ADD VALUE 'INBOUND_RETURN_QUERY';
            ALTER TYPE permission_type ADD VALUE 'INBOUND_RETURN_MUTATE';
            "#
        )?;
    }

    Ok(())
}
