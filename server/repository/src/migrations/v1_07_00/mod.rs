use super::{helpers::run_without_change_log_updates, version::Version, Migration};

use crate::StorageConnection;

mod barcode_add_manufacturer_link_id;
mod changelog_add_name_link_id;
mod clinician_link;
mod clinician_store_join_add_clinician_link_id;
mod contact_trace_link_id;
mod currency;
mod document_owner_name_link_id;
mod encounter_add_clinician_link_id;
mod encounter_add_patient_link_id;
mod invoice_add_clinician_link_id;
mod invoice_add_currency_fields;
mod invoice_add_name_link_id;
mod invoice_line_add_item_link_id;
mod item_add_is_active;
mod item_link_create_table;
mod master_list_line_add_item_link_id;
mod master_list_name_join_add_name_link_id;
mod name_link;
mod name_store_join_add_name_link_id;
mod name_tag_join_add_name_link_id;
mod program_enrolment_add_patient_link_id;
mod program_event_patient_link_id;
mod requisition_add_name_link_id;
mod requisition_line_add_item_link_id;
mod stock_line_add_item_link_id;
mod stock_line_add_supplier_link_id;
mod stocktake_line_add_item_link_id;
mod store_preference_add_issue_in_foreign_currency;
mod sync_log;
mod unit_add_is_active;

pub(crate) struct V1_07_00;

impl Migration for V1_07_00 {
    fn version(&self) -> Version {
        Version::from_str("1.7.0")
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sync_log::migrate(connection)?;
        currency::migrate(connection)?;
        store_preference_add_issue_in_foreign_currency::migrate(connection)?;
        invoice_add_currency_fields::migrate(connection)?;

        // We don't want merge-migration updates to sync back.
        run_without_change_log_updates(connection, |connection| {
            item_add_is_active::migrate(connection)?;
            unit_add_is_active::migrate(connection)?;
            // Item link migrations
            item_link_create_table::migrate(connection)?;
            stocktake_line_add_item_link_id::migrate(connection)?;
            stock_line_add_item_link_id::migrate(connection)?;
            invoice_line_add_item_link_id::migrate(connection)?;
            master_list_line_add_item_link_id::migrate(connection)?;
            requisition_line_add_item_link_id::migrate(connection)?;

            // Name link migrations
            name_link::migrate(connection)?;
            changelog_add_name_link_id::migrate(connection)?;
            invoice_add_name_link_id::migrate(connection)?;
            name_store_join_add_name_link_id::migrate(connection)?;
            master_list_name_join_add_name_link_id::migrate(connection)?;
            name_tag_join_add_name_link_id::migrate(connection)?;
            requisition_add_name_link_id::migrate(connection)?;
            stock_line_add_supplier_link_id::migrate(connection)?;
            barcode_add_manufacturer_link_id::migrate(connection)?;
            document_owner_name_link_id::migrate(connection)?;
            // Patient link migrations
            program_event_patient_link_id::migrate(connection)?;
            program_enrolment_add_patient_link_id::migrate(connection)?;
            encounter_add_patient_link_id::migrate(connection)?;

            // Clinician link migrations
            clinician_link::migrate(connection)?;
            clinician_store_join_add_clinician_link_id::migrate(connection)?;
            encounter_add_clinician_link_id::migrate(connection)?;
            invoice_add_clinician_link_id::migrate(connection)?;
            contact_trace_link_id::migrate(connection)?;

            Ok(())
        })?;
        Ok(())
    }
}

#[cfg(test)]
fn insert_merge_test_data(connection: &StorageConnection) {
    use super::sql;

    sql!(
        connection,
        r#"
        INSERT INTO item 
            (id, name, code, default_pack_size, type, legacy_record)
        VALUES 
            ('item1', 'item1name', 'item1code', 1, 'STOCK', ''),
            ('item2', 'item2name', 'item2code', 2, 'STOCK', ''),
            ('item3', 'item3name', 'item3code', 3, 'STOCK', ''),
            ('item4', 'item4name', 'item4code', 4, 'STOCK', '');
        "#
    )
    .unwrap();
    sql!(
        connection,
        r#"
        INSERT INTO
            name (id, name, code, is_customer, is_supplier, type, is_sync_update)
        VALUES
            ('name1', 'name1name', 'name1code', TRUE, FALSE, 'STORE', TRUE),
            ('name2', 'name2name', 'name2code', TRUE, FALSE, 'STORE', TRUE),
            ('name3', 'name3name', 'name3code', TRUE, FALSE, 'STORE', TRUE);
        "#
    )
    .unwrap();
    sql!(
        connection,
        r#"
        INSERT INTO
            store (id, name_id, code, site_id, store_mode)
        VALUES
            ('store1', 'name1', 'store1code', 1, 'STORE'),
            ('store2', 'name2', 'store2code', 1, 'STORE'),
            ('store3', 'name3', 'store3code', 1, 'STORE');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
        stock_line (
            id,
            item_id,
            store_id,
            cost_price_per_pack,
            sell_price_per_pack,
            available_number_of_packs,
            total_number_of_packs,
            pack_size,
            on_hold
        )
        VALUES
            ('stock_line1', 'item1', 'store1', 1.0, 1.0, 1.0, 1.0, 1.0, FALSE),
            ('stock_line2', 'item1', 'store1', 2.0, 2.0, 2.0, 2.0, 2.0, FALSE),
            ('stock_line3', 'item2', 'store1', 4.0, 4.0, 4.0, 4.0, 4.0, FALSE),
            ('stock_line4', 'item3', 'store2', 8.0, 8.0, 8.0, 8.0, 8.0, FALSE);
        "#
    )
    .unwrap();

    sql!(
    connection,
        r#"
        INSERT INTO
            invoice (id, name_id, store_id, invoice_number, on_hold, created_datetime, status, type)
        VALUES
            ('invoice1', 'name1', 'store1', 1, false, '2020-07-09 17:10:40', 'PICKED', 'INBOUND_SHIPMENT');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
        invoice_line (
            id,
            invoice_id,
            item_id,
            item_name,
            item_code,
            cost_price_per_pack,
            sell_price_per_pack,
            total_after_tax,
            total_before_tax,
            number_of_packs,
            pack_size,
            type
        )
        VALUES
            ('invoice_line1', 'invoice1', 'item1', 'item1name', 'item1code', 1, 2, 4, 4, 2, 12, 'STOCK_IN'),
            ('invoice_line2', 'invoice1', 'item1', 'item1name', 'item1code', 1, 3, 6, 6, 2, 12, 'STOCK_IN'),
            ('invoice_line3', 'invoice1', 'item1', 'item1name', 'item1code', 1, 4, 8, 8, 2, 12, 'STOCK_IN'),
            ('invoice_line4', 'invoice1', 'item2', 'item2name', 'item2code', 1, 5, 10, 10, 2, 12, 'STOCK_IN');
        "#
        )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
            requisition (
                id,
                requisition_number,
                store_id,
                created_datetime,
                max_months_of_stock,
                min_months_of_stock,
                status,
                type,
                name_id
            )
        VALUES
            ('requisition1', 1, 'store1', '2021-01-02 00:00:00', 2, 1, 'DRAFT', 'REQUEST', 'name1');
        "#
    )
    .unwrap();

    sql!(
        connection,
        r#"
        INSERT INTO
        requisition_line (
            id,
            requisition_id,
            item_id,
            requested_quantity,
            suggested_quantity,
            supply_quantity,
            available_stock_on_hand,
            average_monthly_consumption,
            approved_quantity
        )
        VALUES
            ('requisition_line1', 'requisition1', 'item1', 1, 2, 2, 5, 3, 2),
            ('requisition_line2', 'requisition1', 'item1', 1, 2, 2, 5, 3, 2),
            ('requisition_line3', 'requisition1', 'item1', 1, 2, 2, 5, 3, 2),
            ('requisition_line4', 'requisition1', 'item2', 1, 2, 2, 5, 3, 2);
        "#
    )
    .unwrap();
}

#[cfg(test)]
#[actix_rt::test]
async fn migration_1_07_00_merge() {
    use crate::migrations::*;
    use crate::test_db::*;
    use chrono::NaiveDateTime;
    use diesel::prelude::*;
    use item_link::dsl as item_link_dsl;
    use requisition_line::dsl as requisition_line_dsl;
    use stock_movement::dsl as stock_movement_dsl;
    use stock_on_hand::dsl as stock_on_hand_dsl;

    table! {
        item_link {
            id->Text,
            item_id->Text,
        }
    }
    #[derive(Queryable, Debug, PartialEq)]
    struct ItemLinkRow {
        id: String,
        item_id: String,
    }

    table! {
        stock_on_hand(id) {
            id -> Text,
            item_id -> Text,
            store_id -> Text,
            available_stock_on_hand -> BigInt,
        }
    }
    #[derive(Queryable, Debug, PartialEq)]
    struct StockOnHandRow {
        id: String,
        item_id: String,
        store_id: String,
        available_stock_on_hand: i64,
    }

    table! {
        stock_movement (id) {
            id -> Text,
            item_id -> Text,
            store_id -> Text,
            quantity -> BigInt,
            datetime -> Timestamp,
        }
    }
    #[derive(Queryable, Debug, PartialEq)]
    struct StockMovementRow {
        id: String,
        item_id: String,
        store_id: String,
        quantity: i64,
        datetime: NaiveDateTime,
    }

    table! {
        requisition_line (id) {
            id -> Text,
            requisition_id -> Text,
            item_link_id -> Text,
            requested_quantity -> Integer,
            suggested_quantity -> Integer,
            supply_quantity -> Integer,
            available_stock_on_hand -> Integer ,
            average_monthly_consumption -> Integer,
            snapshot_datetime -> Nullable<Timestamp>,
            approved_quantity -> Integer,
            approval_comment -> Nullable<Text>,
            comment -> Nullable<Text>,
        }
    }

    #[derive(Queryable, Debug, PartialEq, Default)]
    struct RequisitionLineRow {
        id: String,
        requisition_id: String,
        item_link_id: String,
        requested_quantity: i32,
        suggested_quantity: i32,
        supply_quantity: i32,
        available_stock_on_hand: i32,
        average_monthly_consumption: i32,
        snapshot_datetime: Option<NaiveDateTime>,
        approved_quantity: i32,
        approval_comment: Option<String>,
        comment: Option<String>,
    }

    let previous_version = v1_06_00::V1_06_00.version();
    let version = V1_07_00.version();

    let SetupResult { connection, .. } = setup_test(SetupOption {
        db_name: &format!("migration_{version}_merge"),
        version: Some(previous_version.clone()),
        ..Default::default()
    })
    .await;

    insert_merge_test_data(&connection);

    let old_soh: Vec<StockOnHandRow> = stock_on_hand_dsl::stock_on_hand
        .order(stock_on_hand_dsl::item_id.asc())
        .load(connection.lock().connection())
        .unwrap();

    let old_stock_movements: Vec<StockMovementRow> = stock_movement_dsl::stock_movement
        .order(stock_movement_dsl::id.asc())
        .load(connection.lock().connection())
        .unwrap();

    migrate(&connection, Some(version.clone())).unwrap();
    assert_eq!(get_database_version(&connection), version);

    let expected_item_links = vec![
        ItemLinkRow {
            id: "item1".to_string(),
            item_id: "item1".to_string(),
        },
        ItemLinkRow {
            id: "item2".to_string(),
            item_id: "item2".to_string(),
        },
        ItemLinkRow {
            id: "item3".to_string(),
            item_id: "item3".to_string(),
        },
        ItemLinkRow {
            id: "item4".to_string(),
            item_id: "item4".to_string(),
        },
    ];
    let migration_item_links: Vec<ItemLinkRow> = item_link_dsl::item_link
        .order(item_link_dsl::id)
        .load(connection.lock().connection())
        .unwrap();
    assert_eq!(expected_item_links, migration_item_links);

    // Tests the view rewrite works correctly and implicitly that the stock_line.item_link_id got populated
    let new_soh: Vec<StockOnHandRow> = stock_on_hand_dsl::stock_on_hand
        .order(stock_on_hand_dsl::item_id.asc())
        .load(connection.lock().connection())
        .unwrap();
    assert_eq!(old_soh, new_soh);

    // Tests the view rewrites work correctly and implicitly that the invoice_line.item_link_id got populated
    let new_stock_movements: Vec<StockMovementRow> = stock_movement_dsl::stock_movement
        .order(stock_movement_dsl::id.asc())
        .load(connection.lock().connection())
        .unwrap();
    assert_eq!(old_stock_movements, new_stock_movements);

    let expected_requisition_lines = vec![
        RequisitionLineRow {
            id: "requisition_line1".to_string(),
            requisition_id: "requisition1".to_string(),
            item_link_id: "item1".to_string(),
            requested_quantity: 1,
            suggested_quantity: 2,
            supply_quantity: 2,
            available_stock_on_hand: 5,
            average_monthly_consumption: 3,
            approved_quantity: 2,
            ..Default::default()
        },
        RequisitionLineRow {
            id: "requisition_line2".to_string(),
            requisition_id: "requisition1".to_string(),
            item_link_id: "item1".to_string(),
            requested_quantity: 1,
            suggested_quantity: 2,
            supply_quantity: 2,
            available_stock_on_hand: 5,
            average_monthly_consumption: 3,
            approved_quantity: 2,
            ..Default::default()
        },
        RequisitionLineRow {
            id: "requisition_line3".to_string(),
            requisition_id: "requisition1".to_string(),
            item_link_id: "item1".to_string(),
            requested_quantity: 1,
            suggested_quantity: 2,
            supply_quantity: 2,
            available_stock_on_hand: 5,
            average_monthly_consumption: 3,
            approved_quantity: 2,
            ..Default::default()
        },
        RequisitionLineRow {
            id: "requisition_line4".to_string(),
            requisition_id: "requisition1".to_string(),
            item_link_id: "item2".to_string(),
            requested_quantity: 1,
            suggested_quantity: 2,
            supply_quantity: 2,
            available_stock_on_hand: 5,
            average_monthly_consumption: 3,
            approved_quantity: 2,
            ..Default::default()
        },
    ];
    let updated_requisition_lines: Vec<RequisitionLineRow> = requisition_line_dsl::requisition_line
        .order(requisition_line_dsl::id.asc())
        .load(connection.lock().connection())
        .unwrap();

    assert_eq!(expected_requisition_lines, updated_requisition_lines);
}
