use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
        ALTER TABLE invoice ADD COLUMN status_temp NOT NULL DEFAULT 'NEW';
        ALTER TABLE invoice ADD COLUMN type_temp NOT NULL DEFAULT 'OUTBOUND_SHIPMENT';

        UPDATE invoice SET status_temp = status;
        UPDATE invoice SET type_temp = type;

        ALTER TABLE invoice DROP COLUMN status;
        ALTER TABLE invoice DROP COLUMN type;

        ALTER TABLE invoice RENAME COLUMN status_temp TO status;
        ALTER TABLE invoice RENAME COLUMN type_temp to type;
        "#
    )?;
    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn remove_sqlite_check_invoice() {
    use crate::migrations::*;
    use diesel::prelude::*;
    let mut connection = super::setup_data_migration("remove_sqlite_check_invoice").await;

    let default = "'name_id', 'store_id', 1, false, ''";
    sql!(
        &mut connection,
        r#"
            INSERT INTO invoice (id, name_id, store_id, invoice_number, on_hold, created_datetime, type, status)
            VALUES 
                ('invoice1', {default}, 'OUTBOUND_SHIPMENT', 'NEW'),
                ('invoice2', {default}, 'INBOUND_SHIPMENT', 'ALLOCATED'),     
                ('invoice3', {default}, 'OUTBOUND_SHIPMENT', 'VERIFIED');
        "#
    )
    .unwrap();

    // Migrate to this version
    migrate(&mut connection, Some(V1_01_01.version())).unwrap();
    assert_eq!(get_database_version(&mut connection), V1_01_01.version());

    // Make sure check was removed
    sql!(
        &mut connection,
        r#"
            INSERT INTO invoice (id, name_id, store_id, invoice_number, on_hold, created_datetime, type, status)
            VALUES 
                ('invoice4', {default}, 'not checked', 'not checked');
        "#
    )
    .unwrap();

    table! {
        invoice (id) {
            id -> Text,
            #[sql_name = "type"] type_ -> Text,
            status -> Text,
        }
    }
    use invoice::dsl as invoice_dsl;

    let invoices = invoice_dsl::invoice
        .select((invoice_dsl::id, invoice_dsl::type_, invoice_dsl::status))
        .order_by(invoice_dsl::id.asc())
        .load::<(String, String, String)>(&mut connection.connection)
        .unwrap();

    assert_eq!(
        invoices,
        vec![
            (
                "invoice1".to_string(),
                "OUTBOUND_SHIPMENT".to_string(),
                "NEW".to_string()
            ),
            (
                "invoice2".to_string(),
                "INBOUND_SHIPMENT".to_string(),
                "ALLOCATED".to_string()
            ),
            (
                "invoice3".to_string(),
                "OUTBOUND_SHIPMENT".to_string(),
                "VERIFIED".to_string()
            ),
            (
                "invoice4".to_string(),
                "not checked".to_string(),
                "not checked".to_string()
            )
        ]
    )
}
