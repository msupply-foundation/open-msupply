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
		"line_number": 1,
		"item_ID": "item_a",
		"item_name": "Item A",
		"quan_rec_to_date": 1.6,
		"delivery_date_requested": "2021-01-22",
		"delivery_date_expected": "",
		"non_stock_name_ID": "",
		"cost_from_invoice": "",
		"cost_local": "",
		"comment": "",
		"batch": "",
		"expiry": "",
		"store_ID": "",
		"spare_estmated_cost": "",
		"pack_units": "",
		"price_expected_after_discount": "",
		"price_extension_expected": "",
		"supplier_code": "",
		"price_per_pack_before_discount": "",
		"quote_line_ID": "",
		"volume_per_pack": "",
		"location_ID": "",
		"manufacturer_ID": "",
		"note": "",
		"note_show_on_goods_rec": "",
		"note_has_been_actioned": "",
		"kit_data": "",
		"suggestedQuantity": ""
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

            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 1, 22).unwrap()),
            expected_delivery_date: None,
            item_name: "Item A".to_string(),
            requested_pack_size: 1.0,
            requested_number_of_units: 0.0,
            authorised_number_of_units: None,
            received_number_of_units: 0.0,
            stock_on_hand_in_units: 0.0,
            supplier_item_code: None,
            price_per_pack_before_discount: 0.0,
            price_per_pack_after_discount: 0.0,
        },
    )
}

fn purchase_order_line_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_LINE_1.0.to_string(),
        push_data: json!(LegacyPurchaseOrderLineRow {
            id: PURCHASE_ORDER_LINE_1.0.to_string(),
            purchase_order_id: "test_purchase_order_a".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            quan_rec_to_date: 1.6,
            delivery_date_requested: Some(NaiveDate::from_ymd_opt(2021, 1, 22).unwrap()),
            delivery_date_expected: None,
            snapshot_quantity: 0.0,
            packsize_ordered: 0.0,
            quan_original_order: 0.0,
            quan_adjusted_order: None,
            supplier_item_code: None,
            price_per_pack_before_discount: 0.0,
            price_per_pack_after_discount: 0.0,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![purchase_order_line_pull_record()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![purchase_order_line_push_record()]
}
