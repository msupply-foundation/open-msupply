use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::purchase_order_line::{
        LegacyPurchaseOrderLineRow, LegacyPurchaseOrderLineRowOmsFields,
    },
};
use chrono::NaiveDate;
use repository::{PurchaseOrderLineDelete, PurchaseOrderLineRow, PurchaseOrderLineStatus};
use serde_json::json;

use super::TestSyncOutgoingRecord;

const TABLE_NAME: &str = "purchase_order_line";

const PURCHASE_ORDER_LINE_1: (&str, &str) = (
    "sync_test_purchase_order_1_line_1",
    r#"{
    "ID": "sync_test_purchase_order_1_line_1",
    "purchase_order_ID": "sync_test_purchase_order_1",
    "item_ID": "item_a",
	"item_name": "Item A",
    "store_ID": "store_a",
    "batch": "",
    "comment": "comment a!",
    "cost_from_invoice": 4,
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
    "oms_fields": {
        "status": "NEW"
    },
    "pack_units": "",
    "packsize_ordered": 20,
    "price_expected_after_discount": 10.0,
    "price_extension_expected": 200.0,
    "price_per_pack_before_discount": 20.0,
    "quan_adjusted_order": 0,
    "quan_original_order": 400,
    "quan_rec_to_date": 5000,
    "quote_line_ID": "",
    "snapshotQuantity": 0,
    "spare_estmated_cost": 0,
    "suggestedQuantity": 0,
    "supplier_code": "",
    "volume_per_pack": 0
    }"#,
);

const PURCHASE_ORDER_LINE_UNLINKED: (&str, &str) = (
    "sync_test_purchase_order_5_line_unlinked",
    r#"{
    "ID": "sync_test_purchase_order_5_line_unlinked",
    "purchase_order_ID": "12e889c0f0d211eb8dddb54df6d7fsadsa",
    "item_ID": "item_a",
	"item_name": "Item A",
    "store_ID": "store_a",
    "batch": "",
    "comment": "comment a!",
    "cost_from_invoice": 0,
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
    "oms_fields": {
        "status": "SENT"
    },
    "pack_units": "",
    "packsize_ordered": 0,
    "price_expected_after_discount": 0.0,
    "price_extension_expected": 0.0,
    "price_per_pack_before_discount": 0,
    "quan_adjusted_order": 0,
    "quan_original_order": 0,
    "quan_rec_to_date": 0,
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
            purchase_order_id: "sync_test_purchase_order_1".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            expected_delivery_date: None,
            item_name: "Item A".to_string(),
            requested_pack_size: 20.0,
            requested_number_of_units: 400.0,
            adjusted_number_of_units: None,
            received_number_of_units: 5000.0,
            stock_on_hand_in_units: 0.0,
            supplier_item_code: None,
            price_per_pack_before_discount: 20.0,
            price_per_pack_after_discount: 10.0,
            store_id: "store_a".to_string(),
            comment: Some("comment a!".to_string()),
            manufacturer_id: None,
            note: None,
            unit: None,
            status: PurchaseOrderLineStatus::New,
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
            purchase_order_id: "sync_test_purchase_order_1".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            received_number_of_units: 5000.0,
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            expected_delivery_date: None,
            stock_on_hand_in_units: 0.0,
            requested_pack_size: 20.0,
            requested_number_of_units: 400.0,
            adjusted_number_of_units: None,
            supplier_item_code: None,
            price_per_pack_before_discount: 20.0,
            price_per_pack_after_discount: 10.0,
            price_extension_expected: 200.0, // not in the db, but part of the legacy record
            comment: Some("comment a!".to_string()),
            manufacturer_id: None,
            note: None,
            unit: None,
            oms_fields: Some(LegacyPurchaseOrderLineRowOmsFields {
                status: PurchaseOrderLineStatus::New
            })
        }),
    }
}

fn purchase_order_line_unlinked_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_LINE_UNLINKED,
        PurchaseOrderLineRow {
            id: PURCHASE_ORDER_LINE_UNLINKED.0.to_string(),
            purchase_order_id: "12e889c0f0d211eb8dddb54df6d7fsadsa".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            expected_delivery_date: None,
            item_name: "Item A".to_string(),
            requested_pack_size: 0.0,
            requested_number_of_units: 0.0,
            adjusted_number_of_units: None,
            received_number_of_units: 0.0,
            stock_on_hand_in_units: 0.0,
            supplier_item_code: None,
            price_per_pack_before_discount: 0.0,
            price_per_pack_after_discount: 0.0,
            store_id: "store_a".to_string(),
            comment: Some("comment a!".to_string()),
            manufacturer_id: None,
            note: None,
            unit: None,
            status: PurchaseOrderLineStatus::Sent,
        },
    )
}

fn purchase_order_line_unlinked_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_LINE_UNLINKED.0.to_string(),
        push_data: json!(LegacyPurchaseOrderLineRow {
            id: PURCHASE_ORDER_LINE_UNLINKED.0.to_string(),
            store_id: "store_a".to_string(),
            purchase_order_id: "12e889c0f0d211eb8dddb54df6d7fsadsa".to_string(),
            line_number: 1,
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            received_number_of_units: 0.0,
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2018, 3, 19).unwrap()),
            expected_delivery_date: None,
            stock_on_hand_in_units: 0.0,
            requested_pack_size: 0.0,
            requested_number_of_units: 0.0,
            adjusted_number_of_units: None,
            supplier_item_code: None,
            price_per_pack_before_discount: 0.0,
            price_per_pack_after_discount: 0.0,
            price_extension_expected: 0.0, // not in the db, but part of the legacy record
            comment: Some("comment a!".to_string()),
            manufacturer_id: None,
            note: None,
            unit: None,
            oms_fields: Some(LegacyPurchaseOrderLineRowOmsFields {
                status: PurchaseOrderLineStatus::Sent
            })
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        purchase_order_line_pull_record(),
        purchase_order_line_unlinked_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        purchase_order_line_push_record(),
        purchase_order_line_unlinked_push_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        PURCHASE_ORDER_LINE_UNLINKED.0,
        PurchaseOrderLineDelete(PURCHASE_ORDER_LINE_UNLINKED.0.to_string()),
    )]
}
