use crate::{StorageConnection, migrations::sql};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
