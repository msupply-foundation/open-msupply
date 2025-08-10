use crate::sync::{
    test::TestSyncIncomingRecord, translations::purchase_order_line::LegacyPurchaseOrderLineRow,
};
use chrono::NaiveDate;
use repository::PurchaseOrderLineRow;
use serde_json::json;

use super::TestSyncOutgoingRecord;

const TABLE_NAME: &str = "purchase_order_line";

const PURCHASE_ORDER_LINE_1: (&str, &str) = (
    "test_purchase_order_line_1",
    r#"{
    "ID": "test_purchase_order_line_1",
    "purchase_order_ID": "test_purchase_order_a",
    "item_ID": "item_a",
	"item_name": "Item A",
    "store_ID": "store_a",
    "batch": "",
    "comment": "comment a!",
    "cost_from_invoice": 0.012,
    "cost_local": 0,
    "delivery_date_expected": "0000-00-00",
    "delivery_date_requested": "2018-03-19",
    "expiry": "0000-00-00",
    "kit_data": null,
    "line_number": 1,
    "location_ID": "",
    "manufacturer_ID": "",
    "non_stock_name_ID": "",
    "note": "",
    "note_has_been_actioned": false,
    "note_show_on_goods_rec": false,
    "oms_fields": null,
    "pack_units": "",
    "packsize_ordered": 1000,
    "price_expected_after_discount": 0.0024,
    "price_extension_expected": 0.012,
    "price_per_pack_before_discount": 0,
    "quan_adjusted_order": 0,
    "quan_original_order": 100,
    "quan_rec_to_date": 5000,
    "quote_line_ID": "",
    "snapshotQuantity": 0,
    "spare_estmated_cost": 0,
    "suggestedQuantity": 0,
    "supplier_code": "",
    "volume_per_pack": 0
    }"#,
);

fn purchase_order_line_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_LINE_1,
        PurchaseOrderLineRow {
            id: PURCHASE_ORDER_LINE_1.0.to_string(),
            purchase_order_id: "test_purchase_order_a".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            expected_delivery_date: None,
            item_name: "Item A".to_string(),
            requested_pack_size: 1000.0,
            requested_number_of_units: 100.0,
            authorised_number_of_units: None,
            received_number_of_units: 5000.0,
            stock_on_hand_in_units: 0.0,
            supplier_item_code: None,
            price_per_unit_before_discount: 0.012,
            price_per_unit_after_discount: 0.0024,
            store_id: "store_a".to_string(),
            comment: Some("comment a!".to_string()),
        },
    )
}

fn purchase_order_line_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_LINE_1.0.to_string(),
        push_data: json!(LegacyPurchaseOrderLineRow {
            id: PURCHASE_ORDER_LINE_1.0.to_string(),
            store_id: "store_a".to_string(),
            purchase_order_id: "test_purchase_order_a".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            quan_rec_to_date: 5000.0,
            delivery_date_requested: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            delivery_date_expected: None,
            snapshot_quantity: 0.0,
            packsize_ordered: 1000.0,
            quan_original_order: 100.0,
            quan_adjusted_order: None,
            supplier_item_code: None,
            price_extension_expected: 0.012,
            price_expected_after_discount: 0.0024,
            comment: Some("comment a!".to_string()),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![purchase_order_line_pull_record()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![purchase_order_line_push_record()]
}
