use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE invoice_type ADD VALUE 'INBOUND_RETURN';
                ALTER TYPE invoice_type ADD VALUE 'OUTBOUND_RETURN';
                ALTER TYPE number_type ADD VALUE 'INBOUND_RETURN';
                ALTER TYPE number_type ADD VALUE 'OUTBOUND_RETURN';
            "#
        )?;
    }

    Ok(())
}
