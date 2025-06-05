use crate::{migrations::*, stock_line_row::stock_line, sync_buffer::sync_buffer, SyncAction};
use anyhow::anyhow;
use diesel::prelude::*;
use serde_json::Value;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "sync_donor_id_to_existing_stock_lines"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let sync_buffer_rows = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("item_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (stock_line_id, sync_data) in sync_buffer_rows {
            let parsed_sync_data: Value = serde_json::from_str(&sync_data)
                .map_err(|e| anyhow!("Parse stock_line sync error: {}: {}", stock_line_id, e))?;

            let sync_donor_id = parsed_sync_data
                .get("donor_id")
                .and_then(|value| value.as_str());

            if let Some(sync_donor_id) = sync_donor_id {
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

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_db::*;
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    use util::*;

    fn setup_test_dependencies(connection: &StorageConnection) {
        // Create donor name
        sql!(
            connection,
            r#"
                INSERT INTO name (id, type, is_customer, is_supplier, code, name)
                VALUES ('donor_name_id', 'FACILITY', false, false, 'DONOR1', 'Test Donor');
            "#
        )
        .unwrap();

        // Create name_link for donor
        sql!(
            connection,
            r#"
                INSERT INTO name_link (id, name_id)
                VALUES ('donor_name_id', 'donor_name_id');
            "#
        )
        .unwrap();

        // Create store
        sql!(
            connection,
            r#"
                INSERT INTO store (id, name_link_id, code, site_id)
                VALUES ('store_id', 'donor_name_id', 'STORE1', 1);
            "#
        )
        .unwrap();

        // Create item and item_link
        sql!(
            connection,
            r#"
                INSERT INTO item (id, name, code, type, legacy_record)
                VALUES ('item_id', 'Test Item', 'ITEM1', 'STOCK', '');
            "#
        )
        .unwrap();

        sql!(
            connection,
            r#"
                INSERT INTO item_link (id, item_id)
                VALUES ('item_id', 'item_id');
            "#
        )
        .unwrap();
    }

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

    fn create_stock_line_with_donor(
        connection: &StorageConnection,
        id: &str,
        batch: &str,
        donor_id: &str,
    ) {
        execute_sql_with_error(
            connection,
            sql_query(&format!(
                r#"
                    INSERT INTO stock_line (id, item_link_id, store_id, batch, pack_size, cost_price_per_pack, sell_price_per_pack, available_number_of_packs, total_number_of_packs, on_hold, donor_link_id)
                    VALUES ('{}', 'item_id', 'store_id', '{}', 1.0, 10.0, 15.0, 100.0, 100.0, false, '{}');
                "#,
                id, batch, donor_id
            ))
        ).unwrap();
    }

    fn add_sync_buffer_entry(
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

    fn add_donor_link_id_column(connection: &StorageConnection) {
        sql!(
            connection,
            r#"
                ALTER TABLE stock_line ADD COLUMN donor_link_id TEXT;
            "#
        )
        .unwrap();
    }

    fn get_stock_line_results(connection: &StorageConnection) -> Vec<(String, Option<String>)> {
        stock_line::table
            .select((stock_line::id, stock_line::donor_link_id))
            .order_by(stock_line::id.asc())
            .load::<(String, Option<String>)>(connection.lock().connection())
            .unwrap()
    }

    #[actix_rt::test]
    async fn test_sync_donor_id_to_existing_stock_lines() {
        let previous_version = Version::from_str("2.7.0");
        let version = Version::from_str("2.8.0");

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_{}", version),
            version: Some(previous_version.clone()),
            ..Default::default()
        })
        .await;

        // Setup test environment
        setup_test_dependencies(&connection);

        // Create stock lines without donor_link_id column
        create_stock_line_without_donor(&connection, "stock_line_1", "BATCH1");
        create_stock_line_without_donor(&connection, "stock_line_2", "BATCH2");
        create_stock_line_without_donor(&connection, "stock_line_3", "BATCH3");

        // Sync buffer data
        add_sync_buffer_entry(&connection, "stock_line_1", "donor_name_id", "BATCH1");
        add_sync_buffer_entry(&connection, "stock_line_2", "donor_name_id", "BATCH2");
        // stock_line_3 has no sync data

        // Simulates v2.8 migration that adds donor_link_id column
        add_donor_link_id_column(&connection);

        // Create a stock line that already has donor set
        create_stock_line_with_donor(&connection, "stock_line_4", "BATCH4", "existing_donor");
        add_sync_buffer_entry(&connection, "stock_line_4", "donor_name_id", "BATCH4");

        // Run the migration
        Migrate.migrate(&connection).unwrap();

        // Get stock lines results
        let stock_lines = get_stock_line_results(&connection);

        #[rustfmt::skip] // Makes the expected output more readable
        let expected = vec![
            ("stock_line_1".to_string(), Some("donor_name_id".to_string())), // Updated from sync
            ("stock_line_2".to_string(), Some("donor_name_id".to_string())), // Updated from sync
            ("stock_line_3".to_string(), None), // No sync data
            ("stock_line_4".to_string(), Some("existing_donor".to_string())), // Donor already set
        ];

        assert_eq!(stock_lines, expected);
    }

    #[actix_rt::test]
    async fn test_sync_donor_id_with_invalid_json() {
        let previous_version = Version::from_str("2.7.0");
        let version = Version::from_str("2.8.0");

        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name: &format!("migration_invalid_json_{}", version),
            version: Some(previous_version),
            ..Default::default()
        })
        .await;

        setup_test_dependencies(&connection);
        create_stock_line_without_donor(&connection, "stock_line_1", "BATCH1");

        // Add invalid JSON to sync buffer
        execute_sql_with_error(
            &connection,
            sql_query(
                r#"
                    INSERT INTO sync_buffer (record_id, received_datetime, table_name, action, data) 
                    VALUES ('stock_line_1', $1, 'item_line', 'UPSERT', 'invalid json');
                "#,
            )
            .bind::<Timestamp, _>(Defaults::naive_date_time()),
        )
        .unwrap();

        add_donor_link_id_column(&connection);

        let result = Migrate.migrate(&connection);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Parse stock_line sync error"));
    }
}
