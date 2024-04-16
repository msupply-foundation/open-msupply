use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE context_type ADD VALUE 'INBOUND_RETURN';
            ALTER TYPE context_type ADD VALUE 'OUTBOUND_RETURN';
            "#,
        )?;
    }

    Ok(())
}
