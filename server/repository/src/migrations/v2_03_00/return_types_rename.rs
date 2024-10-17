use crate::{migrations::*, StorageConnection};

pub fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
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
    } else {
        sql!(
            connection,
            r#"
                UPDATE report SET context = 'CUSTOMER_RETURN' WHERE context = 'INBOUND_RETURN';
                UPDATE report SET context = 'SUPPLIER_RETURN' WHERE context = 'OUTBOUND_RETURN';
                UPDATE invoice SET type = 'CUSTOMER_RETURN' WHERE type = 'INBOUND_RETURN';
                UPDATE invoice SET type = 'SUPPLIER_RETURN' WHERE type = 'OUTBOUND_RETURN';
                UPDATE number SET type = 'CUSTOMER_RETURN' WHERE type = 'INBOUND_RETURN';
                UPDATE number SET type = 'SUPPLIER_RETURN' WHERE type = 'OUTBOUND_RETURN';
                UPDATE user_permission SET permission = 'SUPPLIER_RETURN_QUERY' WHERE permission = 'OUTBOUND_RETURN_QUERY';
                UPDATE user_permission SET permission = 'SUPPLIER_RETURN_MUTATE' WHERE permission = 'OUTBOUND_RETURN_MUTATE';
                UPDATE user_permission SET permission = 'CUSTOMER_RETURN_QUERY' WHERE permission = 'INBOUND_RETURN_QUERY';
                UPDATE user_permission SET permission = 'CUSTOMER_RETURN_MUTATE' WHERE permission = 'INBOUND_RETURN_MUTATE';
            "#,
        )?;
    }

    Ok(())
}
