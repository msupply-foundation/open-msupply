use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    sql!(
        connection,
        r#"
            ALTER TABLE invoice_line ADD COLUMN type_temp NOT NULL DEFAULT 'STOCK_IN';

            UPDATE invoice_line SET type_temp = type;

            ALTER TABLE invoice_line DROP COLUMN type;

            ALTER TABLE invoice_line RENAME COLUMN type_temp TO type;
        "#
    )?;
    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn remove_sqlite_check_invoice_line() {
    use crate::migrations::*;
    use diesel::prelude::*;
    let connection = super::setup_data_migration("remove_sqlite_check_invoice_line").await;

    // Pre requisite
    sql!(
    &connection,
    r#"
        INSERT INTO invoice (id, name_id, store_id, invoice_number, on_hold, created_datetime, type, status)
        VALUES 
            ('invoice_id', 'name_id', 'store_id', 1, false, '', 'OUTBOUND_SHIPMENT', 'NEW');
        INSERT INTO unit (id, name, "index")
        VALUES 
            ('unit_id', '', 1);
        INSERT INTO item (id, unit_id, name, default_pack_size, type, legacy_record, code)
        VALUES 
            ('item_id', 'unit_id', '', 1, '', '', '');
    "#
    )
    .unwrap();

    let default = "'invoice_id', 'item_id', '', '', 0, 0, 0, 0, 1, 1";
    sql!(
        &connection,
        r#"
            INSERT INTO invoice_line (id, invoice_id, item_id, item_name, item_code, cost_price_per_pack, 
                        sell_price_per_pack, total_before_tax, total_after_tax, number_of_packs, pack_size, type)
            VALUES 
                ('line1', {default}, 'STOCK_IN'),
                ('line2', {default}, 'STOCK_OUT'),
                ('line3', {default}, 'STOCK_IN');
        "#
    )
    .unwrap();

    // Migrate to this version
    migrate(&connection, Some(V1_01_01.version())).unwrap();
    assert_eq!(get_database_version(&connection), V1_01_01.version());

    // Make sure check was removed
    sql!(
        &connection,
        r#"
            INSERT INTO invoice_line (id, invoice_id, item_id, item_name, item_code, cost_price_per_pack, 
                        sell_price_per_pack, total_before_tax, total_after_tax, number_of_packs, pack_size, type)
            VALUES 
                ('line4', {default}, 'not checked');
        "#
    )
    .unwrap();

    table! {
        invoice_line (id) {
            id -> Text,
            #[sql_name = "type"] type_ -> Text,
        }
    }
    use invoice_line::dsl as invoice_line_dsl;

    let invoice_lines = invoice_line_dsl::invoice_line
        .select((invoice_line_dsl::id, invoice_line_dsl::type_))
        .order_by(invoice_line_dsl::id.asc())
        .load::<(String, String)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        invoice_lines,
        vec![
            ("line1".to_string(), "STOCK_IN".to_string()),
            ("line2".to_string(), "STOCK_OUT".to_string()),
            ("line3".to_string(), "STOCK_IN".to_string()),
            ("line4".to_string(), "not checked".to_string())
        ]
    )
}
