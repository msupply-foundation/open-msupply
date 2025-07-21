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
		"item_ID": "",
		"item_name": "",
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
            line_number: Some(1),
            item_link_id: None,
            item_name: None,
            number_of_packs: None,
            pack_size: None,
            requested_quantity: None,
            authorised_quantity: None,
            total_received: Some(1.6),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 1, 22).unwrap()),
            expected_delivery_date: None,
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
            line_number: Some(1),
            item_link_id: None,
            item_name: None,
            snapshot_soh: None,
            pack_size: None,
            requested_quantity: None,
            authorised_quantity: None,
            total_received: Some(1.6),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 1, 22).unwrap()),
            expected_delivery_date: None,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![purchase_order_line_pull_record()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![purchase_order_line_push_record()]
}
