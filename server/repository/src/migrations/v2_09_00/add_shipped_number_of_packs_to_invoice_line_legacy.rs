use crate::migrations::*;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::Deserialize;

pub(crate) struct Migrate;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_09_00::add_shipped_number_of_packs_to_invoice_line_legacy::SyncActionMapping,
        table_name -> Text,
        integration_error -> Nullable<Text>,

    }
}

table! {
    invoice_line (id) {
        id -> Text,
        shipped_number_of_packs -> Nullable<Double>,
    }
}

#[derive(Deserialize)]
pub struct LegacyTransLineRow {
    #[serde(rename = "sentQuantity")]
    #[serde(default)]
    pub shipped_number_of_packs: Option<f64>,
}

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_shipped_number_of_packs_to_invoice_line_legacy"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let sync_buffer_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in sync_buffer_rows {
            let legacy_row_or_error = serde_json::from_str::<LegacyTransLineRow>(&data);
            let legacy_row = match legacy_row_or_error {
                Ok(legacy_row) => {
                    if legacy_row.shipped_number_of_packs.is_none() {
                        continue; // Skip rows without shipped_number_of_packs
                    }
                    legacy_row
                }
                Err(e) => {
                    diesel::update(sync_buffer::table)
                        .filter(sync_buffer::record_id.eq(&id))
                        .set(sync_buffer::integration_error.eq(e.to_string()))
                        .execute(connection.lock().connection())?;
                    println!("Error parsing legacy row for ID {}: {}", id, e);
                    // Skip rows with parsing errors
                    continue;
                }
            };

            diesel::update(invoice_line::table)
                .filter(invoice_line::id.eq(id))
                .set(invoice_line::shipped_number_of_packs.eq(legacy_row.shipped_number_of_packs))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrations::{v2_08_00::V2_08_00, v2_09_00::V2_09_00},
        test_db::*,
    };
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    use util::*;

    // --- Test Data Setup Helpers --- //
    fn setup_test_dependencies(connection: &StorageConnection) {
        // Helper for running SQL and unwrapping
        let run = |sql: &str| {
            sql_query(sql)
                .execute(connection.lock().connection())
                .unwrap()
        };

        // Customer names and links
        run("INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('customer_name_id', 'FACILITY', true, false, 'CUST1', 'Test Customer');");
        run("INSERT INTO name_link (id, name_id) VALUES ('customer_name_id', 'customer_name_id');");

        // Store, item, item_link, currency
        run("INSERT INTO store (id, name_link_id, code, site_id) VALUES ('store_id', 'customer_name_id', 'STORE1', 1);");
        run("INSERT INTO item (id, name, code, default_pack_size, type, legacy_record) VALUES ('item_id', 'Test Item', 'ITEM1', 1.0, 'STOCK', '');");
        run("INSERT INTO item_link (id, item_id) VALUES ('item_id', 'item_id');");
        run("INSERT INTO currency (id, rate, code, is_home_currency, date_updated, is_active) VALUES ('USD', 1.0, 'USD', true, '2023-01-01', true);");

        // Invoice
        run("INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, created_datetime, currency_id, on_hold) VALUES ('invoice_id', 'customer_name_id', 'store_id', 1, 'OUTBOUND_SHIPMENT', 'NEW', '2023-01-01 00:00:00', 'USD', false) ON CONFLICT (id) DO NOTHING;");
    }

    // --- Invoice Line Helpers --- //
    fn create_invoice_line_without_shipped_number_of_packs(
        connection: &StorageConnection,
        id: &str,
    ) {
        execute_sql_with_error(
            connection,
            sql_query(&format!(
                r#"
                    INSERT INTO invoice_line (
                        id, invoice_id, item_link_id, item_name, item_code, pack_size, number_of_packs, cost_price_per_pack, sell_price_per_pack, total_before_tax, total_after_tax, type
                    )
                    VALUES (
                        '{}', 'invoice_id', 'item_id', 'Test Item', 'ITEM1', 1.0, 10.0, 10.0, 15.0, 100.0, 100.0, 'STOCK_OUT'
                    );
                "#,
                id
            ))
        ).unwrap();
    }

    fn add_trans_line_sync_buffer_entry(
        connection: &StorageConnection,
        invoice_line_id: &str,
        non_id_data: &str,
    ) {
        let sync_data = format!(r#"{{"id": "{}", {}}}"#, invoice_line_id, non_id_data);
        execute_sql_with_error(
            connection,
            sql_query(format!(
                r#"
                    INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data) 
                    VALUES ('{}', $1, 'trans_line', 'UPSERT', '{}');
                "#,
                invoice_line_id, sync_data
            ))
            .bind::<Timestamp, _>(Defaults::naive_date_time()),
        )
        .unwrap();
    }

    // --- Migration Test --- //
    #[actix_rt::test]
    async fn test_sync_shipped_number_of_packs_to_existing_invoice_lines() {
        let previous_version = V2_08_00.version();
        let version = V2_09_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!(
                "test_sync_shipped_number_of_packs_to_existing_invoice_lines{}",
                version
            ),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_dependencies(&connection);

        create_invoice_line_without_shipped_number_of_packs(&connection, "invoice_line_1");
        create_invoice_line_without_shipped_number_of_packs(&connection, "invoice_line_2");
        create_invoice_line_without_shipped_number_of_packs(&connection, "invoice_line_3");
        create_invoice_line_without_shipped_number_of_packs(&connection, "invoice_line_4");

        add_trans_line_sync_buffer_entry(&connection, "invoice_line_1", r#""sentQuantity": 1.0"#);
        add_trans_line_sync_buffer_entry(&connection, "invoice_line_2", r#""sentQuantity": 0.0"#);
        add_trans_line_sync_buffer_entry(&connection, "invoice_line_3", r#""#);
        add_trans_line_sync_buffer_entry(&connection, "invoice_line_4", r#"invalid-json-data"#);

        // --- Run migration --- //
        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        // --- Assert: Invoice Lines updated as expected --- //
        let invoice_lines = invoice_line::table
            .select((invoice_line::id, invoice_line::shipped_number_of_packs))
            .order_by(invoice_line::id.asc())
            .load::<(String, Option<f64>)>(connection.lock().connection())
            .unwrap();

        #[rustfmt::skip] // Easier to read output
        let expected = vec![
            ("invoice_line_1".to_string(), Some(1.0)), // Updated from sync
            ("invoice_line_2".to_string(), Some(0.0)), // Updated from sync
            ("invoice_line_3".to_string(), None), // No sync data
            ("invoice_line_4".to_string(), None), // Invalid sync data
        ];
        assert_eq!(invoice_lines, expected);
    }
}
