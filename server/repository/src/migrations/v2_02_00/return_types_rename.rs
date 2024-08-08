use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
            ALTER TYPE context_type RENAME VALUE 'INBOUND_RETURN' TO 'CUSTOMER_RETURN';
            ALTER TYPE context_type RENAME VALUE 'OUTBOUND_RETURN' TO 'SUPPLIER_RETURN';
            ALTER TYPE invoice_type RENAME VALUE 'INBOUND_RETURN' TO 'CUSTOMER_RETURN';
            ALTER TYPE invoice_type RENAME VALUE 'OUTBOUND_RETURN' TO 'SUPPLIER_RETURN';
            ALTER TYPE number_type RENAME VALUE 'INBOUND_RETURN' TO 'CUSTOMER_RETURN';
            ALTER TYPE number_type RENAME VALUE 'OUTBOUND_RETURN' TO 'SUPPLIER_RETURN';
            ALTER TYPE permission_type RENAME VALUE 'OUTBOUND_RETURN_QUERY' TO 'SUPPLIER_RETURN_QUERY';
            ALTER TYPE permission_type RENAME VALUE 'OUTBOUND_RETURN_MUTATE' TO 'SUPPLIER_RETURN_MUTATE';
            ALTER TYPE permission_type RENAME VALUE 'INBOUND_RETURN_QUERY' TO 'CUSTOMER_RETURN_QUERY';
            ALTER TYPE permission_type RENAME VALUE 'INBOUND_RETURN_MUTATE' TO 'CUSTOMER_RETURN_MUTATE';

            "#,
        )?;
    }

    Ok(())
}
