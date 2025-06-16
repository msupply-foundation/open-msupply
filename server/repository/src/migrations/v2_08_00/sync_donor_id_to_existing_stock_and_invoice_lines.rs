use crate::migrations::*;

use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde_json::Value;

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_08_00::sync_donor_id_to_existing_stock_and_invoice_lines::SyncActionMapping,
        table_name -> Text,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

table! {
    stock_line (id) {
        id -> Text,
        donor_link_id -> Nullable<Text>,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        donor_link_id -> Nullable<Text>,
    }
}

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "sync_donor_id_to_existing_stock_and_invoice_lines"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // --- Update Stock Lines with donor_id from sync_buffer --- //
        let stock_line_sync_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("item_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (stock_line_id, sync_data) in stock_line_sync_rows {
            let parsed_sync_data: Value = match serde_json::from_str(&sync_data) {
                Ok(value) => value,
                Err(err) => {
                    println!(
                        "Error parsing sync data for stock line {}: {}",
                        stock_line_id, err
                    );
                    continue;
                }
            };

            let sync_donor_id = parsed_sync_data
                .get("donor_id")
                .and_then(|value| value.as_str());

            if let Some(sync_donor_id) = sync_donor_id {
                if sync_donor_id.is_empty() {
                    continue;
                }
                let current_link_donor_id = stock_line::table
                    .filter(stock_line::id.eq(&stock_line_id))
                    .select(stock_line::donor_link_id)
                    .first::<Option<String>>(connection.lock().connection())
                    .optional()?;

                if let Some(existing_donor_id) = current_link_donor_id {
                    if existing_donor_id.is_none() {
                        diesel::update(stock_line::table.filter(stock_line::id.eq(&stock_line_id)))
                            .set(stock_line::donor_link_id.eq(sync_donor_id))
                            .execute(connection.lock().connection())?;
                    }
                }
            }
        }

        // --- Update Invoice Lines with donor_id from sync_buffer --- //
        let invoice_line_sync_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (invoice_line_id, sync_data) in invoice_line_sync_rows {
            let parsed_sync_data: Value = match serde_json::from_str(&sync_data) {
                Ok(value) => value,
                Err(err) => {
                    println!(
                        "Error parsing sync data for invoice line {}: {}",
                        invoice_line_id, err
                    );
                    continue;
                }
            };

            let sync_donor_id = parsed_sync_data
                .get("donor_id")
                .and_then(|value| value.as_str());

            if let Some(sync_donor_id) = sync_donor_id {
                if sync_donor_id.is_empty() {
                    continue;
                }
                let current_link_donor_id = invoice_line::table
                    .filter(invoice_line::id.eq(&invoice_line_id))
                    .select(invoice_line::donor_link_id)
                    .first::<Option<String>>(connection.lock().connection())
                    .optional()?;

                if let Some(existing_donor_id) = current_link_donor_id {
                    if existing_donor_id.is_none() {
                        diesel::update(
                            invoice_line::table.filter(invoice_line::id.eq(&invoice_line_id)),
                        )
                        .set(invoice_line::donor_link_id.eq(sync_donor_id))
                        .execute(connection.lock().connection())?;
                    }
                }
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{
        migrations::{v2_07_00::V2_07_00, v2_08_00::V2_08_00},
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

        // Donor and customer names and links
        run("INSERT INTO name (id, type, is_customer, is_supplier, is_donor, code, name) VALUES ('donor_name_id', 'FACILITY', false, false, true, 'DONOR1', 'Test Donor');");
        run("INSERT INTO name_link (id, name_id) VALUES ('donor_name_id', 'donor_name_id');");
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

    // --- Stock Line Helpers --- //
    fn create_stock_line_without_donor(connection: &StorageConnection, id: &str, batch: &str) {
        execute_sql_with_error(
            connection,
            sql_query(&format!(
                r#"
                    INSERT INTO stock_line (id, item_link_id, store_id, batch, pack_size, cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, on_hold)
                    VALUES ('{}', 'item_id', 'store_id', '{}', 1.0, 10.0, 15.0, 100.0, 100.0, false);
                "#,
                id, batch
            ))
        ).unwrap();
    }

    fn add_item_line_sync_buffer_entry(
        connection: &StorageConnection,
        stock_line_id: &str,
        donor_id: &str,
        batch: &str,
    ) {
        let sync_data = format!(
            r#"{{"id": "{}", "donor_id": "{}", "batch": "{}"}}"#,
            stock_line_id, donor_id, batch
        );
        execute_sql_with_error(
            connection,
            sql_query(format!(
                r#"
                    INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data) 
                    VALUES ('{}', $1, 'item_line', 'UPSERT', '{}');
                "#,
                stock_line_id, sync_data
            ))
            .bind::<Timestamp, _>(Defaults::naive_date_time()),
        )
        .unwrap();
    }

    // --- Invoice Line Helpers --- //
    fn create_invoice_line_without_donor(connection: &StorageConnection, id: &str) {
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
        donor_id: &str,
    ) {
        let sync_data = format!(
            r#"{{"id": "{}", "donor_id": "{}"}}"#,
            invoice_line_id, donor_id
        );
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
    async fn test_sync_donor_id_to_existing_stock_lines() {
        let previous_version = V2_07_00.version();
        let version = V2_08_00.version();

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_stock_lines_{}", version),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        setup_test_dependencies(&connection);

        // --- Create test stock and invoice lines (without donor_link_id) --- //
        create_stock_line_without_donor(&connection, "stock_line_1", "BATCH1");
        create_stock_line_without_donor(&connection, "stock_line_2", "BATCH2");
        create_stock_line_without_donor(&connection, "stock_line_3", "BATCH3");
        create_stock_line_without_donor(&connection, "stock_line_4", "BATCH4");

        create_invoice_line_without_donor(&connection, "invoice_line_1");
        create_invoice_line_without_donor(&connection, "invoice_line_2");
        create_invoice_line_without_donor(&connection, "invoice_line_3");
        create_invoice_line_without_donor(&connection, "invoice_line_4");

        // --- Add sync buffer entries for lines that should be updated --- //
        add_item_line_sync_buffer_entry(&connection, "stock_line_1", "donor_name_id", "BATCH1");
        add_item_line_sync_buffer_entry(&connection, "stock_line_2", "donor_name_id", "BATCH2");
        // stock_line_3 has no sync data
        // stock_line_4 has sync data but donor_id is empty
        add_item_line_sync_buffer_entry(&connection, "stock_line_4", "", "BATCH4");

        add_trans_line_sync_buffer_entry(&connection, "invoice_line_1", "donor_name_id");
        add_trans_line_sync_buffer_entry(&connection, "invoice_line_2", "donor_name_id");

        // invoice_line_3 has no sync data
        // Invoice line 4 has sync data but donor_id is empty
        add_trans_line_sync_buffer_entry(&connection, "invoice_line_4", "");

        // --- Run migration --- //
        migrate(&connection, Some(version.clone())).unwrap();
        assert_eq!(get_database_version(&connection), version);

        // --- Assert: Stock Lines updated as expected --- //
        let stock_lines = stock_line::table
            .select((stock_line::id, stock_line::donor_link_id))
            .order_by(stock_line::id.asc())
            .load::<(String, Option<String>)>(connection.lock().connection())
            .unwrap();

        #[rustfmt::skip] // Easier to read output
        let expected = vec![
            ("stock_line_1".to_string(), Some("donor_name_id".to_string())), // Updated from sync
            ("stock_line_2".to_string(), Some("donor_name_id".to_string())), // Updated from sync
            ("stock_line_3".to_string(), None), // No sync data
            ("stock_line_4".to_string(), None), // Empty donor_id in sync data
        ];
        assert_eq!(stock_lines, expected);

        // --- Assert: Invoice Lines updated as expected --- //
        let invoice_lines = invoice_line::table
            .select((invoice_line::id, invoice_line::donor_link_id))
            .order_by(invoice_line::id.asc())
            .load::<(String, Option<String>)>(connection.lock().connection())
            .unwrap();

        #[rustfmt::skip] // Easier to read output
        let expected = vec![
            ("invoice_line_1".to_string(), Some("donor_name_id".to_string())), // Updated from sync
            ("invoice_line_2".to_string(), Some("donor_name_id".to_string())), // Updated from sync
            ("invoice_line_3".to_string(), None), // No sync data
            ("invoice_line_4".to_string(), None), // Empty donor_id in sync data
        ];
        assert_eq!(invoice_lines, expected);
    }
}
