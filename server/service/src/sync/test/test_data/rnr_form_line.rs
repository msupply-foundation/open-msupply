use chrono::NaiveDate;
use repository::{RnRFormLineRow, RnRFormLowStock};
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "rnr_form_line";

const RNR_FORM_LINE_1: (&str, &str) = (
    "8524d61d-3f4d-43fd-9beb-326e6dcca16e",
    r#"{
        "id": "8524d61d-3f4d-43fd-9beb-326e6dcca16e",
        "rnr_form_id":  "cfd578f8-c3d5-4a04-a466-0ac81dde2aab",
        "item_link_id": "8F252B5884B74888AAB73A0D42C09E7A",
        "average_monthly_consumption": 0.0,
        "initial_balance": 0.0,
        "snapshot_quantity_received": 0.0,
        "snapshot_quantity_consumed": 0.0,
        "adjusted_quantity_consumed": 0.0,
        "snapshot_adjustments": 0.0,
        "entered_losses": 1.0,
        "stock_out_duration": 0,
        "final_balance": 0.0,
        "maximum_quantity": 0.0,
        "minimum_quantity": 0.0,
        "expiry_date": null,
        "calculated_requested_quantity": 0.0,
        "comment": null,
        "confirmed": false, 
        "low_stock": "OK",
        "previous_monthly_consumption_values": ""
    }"#,
);

fn rnr_form_line_1() -> RnRFormLineRow {
    RnRFormLineRow {
        id: RNR_FORM_LINE_1.0.to_string(),
        rnr_form_id: "cfd578f8-c3d5-4a04-a466-0ac81dde2aab".to_string(),
        item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
        requisition_line_id: None,
        average_monthly_consumption: 0.0,
        initial_balance: 0.0,
        snapshot_quantity_received: 0.0,
        snapshot_quantity_consumed: 0.0,
        snapshot_adjustments: 0.0,
        adjusted_quantity_consumed: 0.0,
        entered_quantity_consumed: None,
        entered_quantity_received: None,
        entered_adjustments: None,
        stock_out_duration: 0,
        final_balance: 0.0,
        maximum_quantity: 0.0,
        expiry_date: None,
        calculated_requested_quantity: 0.0,
        entered_requested_quantity: None,
        comment: None,
        confirmed: false,
        previous_monthly_consumption_values: "".to_string(),
        low_stock: RnRFormLowStock::Ok,
        entered_losses: Some(1.0),
        minimum_quantity: 0.0,
    }
}

const RNR_FORM_LINE_WITH_EXPIRY: (&str, &str) = (
    "rnr_form_line_with_expiry",
    r#"{
        "id": "rnr_form_line_with_expiry",
        "rnr_form_id":  "cfd578f8-c3d5-4a04-a466-0ac81dde2aab",
        "item_link_id": "8F252B5884B74888AAB73A0D42C09E7A",
        "requisition_line_id": "ABCB0A41C95441ABBBC7905857466089",
        "average_monthly_consumption": 0.0,
        "initial_balance": 0.0,
        "snapshot_quantity_received": 0.0,
        "snapshot_quantity_consumed": 0.0,
        "adjusted_quantity_consumed": 0.0,
        "snapshot_adjustments": 0.0,
        "entered_losses": 0.0,
        "stock_out_duration": 0,
        "final_balance": 0.0,
        "maximum_quantity": 0.0,
        "minimum_quantity": 0.0,
        "expiry_date": "2023-12-31",
        "calculated_requested_quantity": 0.0,
        "comment": null,
        "confirmed": false, 
        "low_stock": "OK",
        "previous_monthly_consumption_values": ""
    }"#,
);

fn rnr_form_line_with_expiry() -> RnRFormLineRow {
    RnRFormLineRow {
        id: RNR_FORM_LINE_WITH_EXPIRY.0.to_string(),
        rnr_form_id: "cfd578f8-c3d5-4a04-a466-0ac81dde2aab".to_string(),
        item_link_id: "8F252B5884B74888AAB73A0D42C09E7A".to_string(),
        requisition_line_id: Some("ABCB0A41C95441ABBBC7905857466089".to_string()),
        average_monthly_consumption: 0.0,
        initial_balance: 0.0,
        snapshot_quantity_received: 0.0,
        snapshot_quantity_consumed: 0.0,
        snapshot_adjustments: 0.0,
        adjusted_quantity_consumed: 0.0,
        entered_quantity_consumed: None,
        entered_quantity_received: None,
        entered_adjustments: None,
        stock_out_duration: 0,
        final_balance: 0.0,
        maximum_quantity: 0.0,
        expiry_date: Some(NaiveDate::from_ymd_opt(2023, 12, 31).unwrap()),
        calculated_requested_quantity: 0.0,
        entered_requested_quantity: None,
        comment: None,
        confirmed: false,
        previous_monthly_consumption_values: "".to_string(),
        low_stock: RnRFormLowStock::Ok,
        entered_losses: Some(0.0),
        minimum_quantity: 0.0,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, RNR_FORM_LINE_1, rnr_form_line_1()),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            RNR_FORM_LINE_WITH_EXPIRY,
            rnr_form_line_with_expiry(),
        ),
    ]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: RNR_FORM_LINE_1.0.to_string(),
            push_data: json!(rnr_form_line_1()),
        },
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: RNR_FORM_LINE_WITH_EXPIRY.0.to_string(),
            push_data: json!(rnr_form_line_with_expiry()),
        },
    ]
}
