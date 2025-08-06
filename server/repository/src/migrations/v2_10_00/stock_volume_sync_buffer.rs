use crate::migrations::*;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{de::DeserializeOwned, Deserialize};

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SyncAction {
    Upsert,
}

table! {
    sync_buffer (record_id) {
        record_id -> Text,
        data -> Text,
        action -> crate::migrations::v2_10_00::stock_volume_sync_buffer::SyncActionMapping,
        table_name -> Text,
        integration_error -> Nullable<Text>,
    }
}
table! {
    stock_line (id) {
        id -> Text,
        total_volume -> Double,
        volume_per_pack -> Double,
    }
}

table! {
    invoice_line (id) {
        id -> Text,
        volume_per_pack -> Double,
    }
}

table! {
    stocktake_line (id) {
        id -> Text,
        volume_per_pack -> Double,
    }
}

#[derive(Deserialize)]
pub struct LegacyStockLineRow {
    pub total_volume: f64,
    pub volume_per_pack: f64,
}

#[derive(Deserialize)]
pub struct LegacyTransLineRow {
    pub volume_per_pack: f64,
}

#[derive(Deserialize)]
pub struct LegacyStocktakeLineRow {
    pub volume_per_pack: f64,
}

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "stock_volume_sync_buffer"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let stock_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("item_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in stock_line_sync_buffer {
            let legacy_row =
                match parse_or_integration_error::<LegacyStockLineRow>(connection, &id, &data)? {
                    Some(row) => row,
                    None => {
                        println!("Could not parse legacy stock line data for ID: {}", id);
                        continue;
                    }
                };

            diesel::update(stock_line::table)
                .filter(stock_line::id.eq(id))
                .set((
                    stock_line::total_volume.eq(legacy_row.total_volume),
                    stock_line::volume_per_pack.eq(legacy_row.volume_per_pack),
                ))
                .execute(connection.lock().connection())?;
        }

        let invoice_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("trans_line")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in invoice_line_sync_buffer {
            let legacy_row =
                match parse_or_integration_error::<LegacyTransLineRow>(connection, &id, &data)? {
                    Some(row) => row,
                    None => {
                        println!("Could not parse legacy invoice line data for ID: {}", id);
                        continue;
                    }
                };
            diesel::update(invoice_line::table)
                .filter(invoice_line::id.eq(id))
                .set(invoice_line::volume_per_pack.eq(legacy_row.volume_per_pack))
                .execute(connection.lock().connection())?;
        }

        let stocktake_line_sync_buffer = sync_buffer::table
            .select((sync_buffer::record_id, sync_buffer::data))
            .filter(
                sync_buffer::action
                    .eq(SyncAction::Upsert)
                    .and(sync_buffer::table_name.eq("Stock_take_lines")),
            )
            .load::<(String, String)>(connection.lock().connection())?;

        for (id, data) in stocktake_line_sync_buffer {
            let legacy_row =
                match parse_or_integration_error::<LegacyStocktakeLineRow>(connection, &id, &data)?
                {
                    Some(row) => row,
                    None => {
                        println!("Could not parse legacy stocktake line data for ID: {}", id);
                        continue;
                    }
                };
            diesel::update(stocktake_line::table)
                .filter(stocktake_line::id.eq(id))
                .set(stocktake_line::volume_per_pack.eq(legacy_row.volume_per_pack))
                .execute(connection.lock().connection())?;
        }

        Ok(())
    }
}

fn parse_or_integration_error<T: DeserializeOwned>(
    connection: &StorageConnection,
    id: &str,
    data: &str,
) -> Result<Option<T>, RepositoryError> {
    let result = match serde_json::from_str::<T>(&data) {
        Ok(legacy_row) => Some(legacy_row),
        Err(e) => {
            diesel::update(sync_buffer::table)
                .filter(sync_buffer::record_id.eq(id))
                .set(sync_buffer::integration_error.eq(e.to_string()))
                .execute(connection.lock().connection())?;

            None
        }
    };

    Ok(result)
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_stock_volume() {
    use crate::migrations::*;
    use crate::test_db::*;
    use diesel::{sql_query, sql_types::Timestamp, RunQueryDsl};
    use util::*;

    let previous_version = v2_09_01::V2_09_01.version();
    let version = v2_10_00::V2_10_00.version();
    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}_stock_volume"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    sql!(
        &connection,
        r#"
        INSERT INTO unit (id, name, "index", is_active) VALUES ('unit_id', 'Unit', 1, true);
        INSERT INTO item (id, name, code, default_pack_size, type, is_active, legacy_record) VALUES ('item_id', 'Item', 'ITEM', 1, 'STOCK', true, 'het is leuk');
        INSERT INTO item_link (id, item_id) VALUES ('item_link_id', 'item_id');
        INSERT INTO name (id, type, is_customer, is_supplier, code, name) VALUES ('name_id', 'STORE', false, false, '', '');
        INSERT INTO name_link (id, name_id) VALUES ('name_link_id', 'name_id');
        INSERT INTO store (id, name_link_id, site_id, code) VALUES
        ('store_id', 'name_link_id', 1, '');

        INSERT INTO stock_line (id, item_link_id, store_id, pack_size, total_number_of_packs, available_number_of_packs, cost_price_per_pack, sell_price_per_pack, on_hold) VALUES
        ('stock_line_id', 'item_link_id', 'store_id', 1, 10.0, 5.0, 0.0, 0.0, false);
        INSERT INTO invoice (id, name_link_id, store_id, invoice_number, type, status, on_hold, created_datetime) VALUES
        ('invoice_id', 'name_link_id', 'store_id', 1, 'INBOUND_SHIPMENT', 'NEW', false, '2023-01-01 00:00:00');
        INSERT INTO invoice_line (id, invoice_id, item_link_id, pack_size, number_of_packs, item_name, item_code, sell_price_per_pack, total_before_tax, total_after_tax, cost_price_per_pack, type) VALUES
        ('invoice_line_id', 'invoice_id', 'item_link_id', 1, 2.0, 'Item', 'ITEM', 0.0, 0.0, 0.0, 0.0, 'STOCK_IN');
        INSERT INTO stocktake (id, store_id, user_id, stocktake_number, status, created_datetime, is_locked) VALUES
        ('stocktake_id', 'store_id', 'user_id', 1, 'NEW', '2023-01-01 00:00:00', false);
        INSERT INTO stocktake_line (id, stocktake_id, item_link_id, pack_size, counted_number_of_packs, item_name, snapshot_number_of_packs) VALUES
        ('stocktake_line_id', 'stocktake_id', 'item_link_id', 1, 3.0, 'Item', 5.0);
    "#
    )
    .unwrap();

    let stock_line_sync_buffer_data = r#"{
        "ID": "stock_line_id",
        "item_ID": "item_id",
        "name_ID": "name_id",
        "pack_size": 1,
        "available": 5.0,
        "quantity": 10.0,
        "store_ID": "store_id",
        "total_volume": 100.0,
        "volume_per_pack": 50.0
    }"#;

    let invoice_line_sync_buffer_data = r#"{
        "ID": "invoice_line_id",
        "transaction_ID": "invoice_id",
        "item_ID": "item_id",
        "name_ID": "name_id",
        "pack_size": 1,
        "quantity": 2.0,
        "volume_per_pack": 50.0
    }"#;

    let stocktake_line_sync_buffer_data = r#"{
        "ID": "stocktake_line_id",
        "stock_take_ID": "stocktake_id",
        "item_ID": "item_id",
        "name_ID": "name_id",
        "pack_size": 1,
        "stock_take_qty": 3.0,
        "volume_per_pack": 50.0
    }"#;

    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO sync_buffer
            (record_id, received_datetime, table_name, action, data)
            VALUES
            ('stock_line_id', $1, 'item_line', 'UPSERT', '{stock_line_sync_buffer_data}');
        "#
        ))
        .bind::<Timestamp, _>(Defaults::naive_date_time()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO sync_buffer
            (record_id, received_datetime, table_name, action, data)
            VALUES
            ('invoice_line_id', $1, 'trans_line', 'UPSERT', '{invoice_line_sync_buffer_data}');
        "#
        ))
        .bind::<Timestamp, _>(Defaults::naive_date_time()),
    )
    .unwrap();

    execute_sql_with_error(
        &connection,
        sql_query(format!(
            r#"
            INSERT INTO sync_buffer
            (record_id, received_datetime, table_name, action, data)
            VALUES
            ('stocktake_line_id', $1, 'Stock_take_lines', 'UPSERT', '{stocktake_line_sync_buffer_data}');
        "#
        ))
        .bind::<Timestamp, _>(Defaults::naive_date_time()),
    )
    .unwrap();

    migrate(&connection, Some(version.clone())).unwrap();

    let stock_lines = stock_line::table
        .select((
            stock_line::id,
            stock_line::total_volume,
            stock_line::volume_per_pack,
        ))
        .load::<(String, f64, f64)>(connection.lock().connection())
        .unwrap();
    assert_eq!(
        stock_lines,
        vec![("stock_line_id".to_string(), 100.0, 50.0)]
    );

    let invoice_lines = invoice_line::table
        .select((invoice_line::id, invoice_line::volume_per_pack))
        .load::<(String, f64)>(connection.lock().connection())
        .unwrap();
    assert_eq!(invoice_lines, vec![("invoice_line_id".to_string(), 50.0)]);

    let stocktake_lines = stocktake_line::table
        .select((stocktake_line::id, stocktake_line::volume_per_pack))
        .load::<(String, f64)>(connection.lock().connection())
        .unwrap();
    assert_eq!(
        stocktake_lines,
        vec![("stocktake_line_id".to_string(), 50.0)]
    );
}
