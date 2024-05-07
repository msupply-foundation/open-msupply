use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Split INVENTORY_ADJUSTMENT to INVENTORY_REDUCTION and INVENTORY_ADDITION
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE invoice_type ADD VALUE IF NOT EXISTS 'INVENTORY_REDUCTION';
                ALTER TYPE invoice_type RENAME VALUE 'INVENTORY_ADJUSTMENT' TO 'INVENTORY_ADDITION';
            "#
        )?;
    } else {
        // For Sqlite need to migrate data
        sql!(
            connection,
            r#"
                UPDATE invoice SET type = 'INVENTORY_ADDITION' WHERE type = 'INVENTORY_ADJUSTMENT';
            "#
        )?;
    }

    sql!(
        connection,
        r#" ALTER TABLE stocktake 
                RENAME COLUMN inventory_adjustment_id TO inventory_addition_id;

                ALTER TABLE stocktake 
                ADD COLUMN inventory_reduction_id TEXT REFERENCES invoice(id);"#
    )?;

    // Update inventory_adjustment_stock_movement VIEW to use INVENTORY_REDUCTION and INVENTORY_ADDITION
    let create_or_replace_view = if cfg!(feature = "postgres") {
        "CREATE OR REPLACE VIEW"
    } else {
        "DROP VIEW inventory_adjustment_stock_movement; CREATE VIEW"
    };
    sql!(
        connection,
        r#"
                {create_or_replace_view} inventory_adjustment_stock_movement AS
                SELECT 
                    'n/a' as id,
                    quantity_movement as quantity,
                    item_id,
                    store_id,
                    verified_datetime as datetime
                FROM invoice_line_stock_movement 
                JOIN invoice
                    ON invoice_line_stock_movement.invoice_id = invoice.id
                WHERE invoice.type IN ('INVENTORY_REDUCTION', 'INVENTORY_ADDITION') 
                    AND verified_datetime IS NOT NULL;
            "#,
    )?;

    Ok(())
}

#[cfg(test)]
#[actix_rt::test]
async fn split_inventory_adjustment() {
    use crate::migrations::*;
    use diesel::{prelude::*, sql_query, sql_types::*};
    let connection = super::setup_data_migration("split_inventory_adjustment").await;

    let default = "'name_id', 'store_id', 1, false, 'NEW'";
    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO invoice (id, name_id, store_id, invoice_number, on_hold, status, created_datetime, type)
            VALUES 
                ('invoice1', {default}, $1, 'INVENTORY_ADJUSTMENT'),
                ('invoice2', {default}, $1, 'INBOUND_SHIPMENT'),     
                ('invoice3', {default}, $1, 'INVENTORY_ADJUSTMENT');
        "#
        ))
        .bind::<Timestamp, _>(util::Defaults::naive_date_time()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query((
            r#"
            INSERT INTO stocktake
            (id, stocktake_number, store_id, user_id, created_datetime, status, inventory_adjustment_id)
            VALUES
                ('stocktake1', 1, 'store_id', '', $1, 'NEW', 'invoice1')
        "#
        ).to_string())
        .bind::<Timestamp, _>(util::Defaults::naive_date_time()),
    )
    .unwrap();

    // Migrate to this version
    migrate(&connection, Some(V1_01_01.version())).unwrap();
    assert_eq!(get_database_version(&connection), V1_01_01.version());

    // Check can add INVENTORY_REDUCTION
    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO invoice (id, name_id, store_id, invoice_number, on_hold, status, created_datetime, type)
            VALUES 
                ('invoice4', {default}, $1, 'INVENTORY_REDUCTION');
        "#
        ))
        .bind::<Timestamp, _>(util::Defaults::naive_date_time()),
    )
    .unwrap();

    table! {
        invoice (id) {
            id -> Text,
            #[sql_name = "type"] type_ -> Text,
        }
    }
    use invoice::dsl as invoice_dsl;

    let invoices = invoice_dsl::invoice
        .select((invoice_dsl::id, invoice_dsl::type_))
        .order_by(invoice_dsl::id.asc())
        .load::<(String, String)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        invoices,
        vec![
            ("invoice1".to_string(), "INVENTORY_ADDITION".to_string()),
            ("invoice2".to_string(), "INBOUND_SHIPMENT".to_string()),
            ("invoice3".to_string(), "INVENTORY_ADDITION".to_string()),
            ("invoice4".to_string(), "INVENTORY_REDUCTION".to_string()),
        ]
    );

    table! {
        stocktake (id) {
            id -> Text,
            inventory_addition_id -> Nullable<Text>,
            inventory_reduction_id -> Nullable<Text>,
        }
    }
    use stocktake::dsl as stocktake_dsl;

    let stocktakes = stocktake_dsl::stocktake
        .select((
            stocktake_dsl::id,
            stocktake_dsl::inventory_addition_id,
            stocktake_dsl::inventory_reduction_id,
        ))
        .order_by(stocktake_dsl::id.asc())
        .load::<(String, Option<String>, Option<String>)>(connection.lock().connection())
        .unwrap();

    assert_eq!(
        stocktakes,
        vec![("stocktake1".to_string(), Some("invoice1".to_string()), None)]
    )
}
