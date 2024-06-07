use crate::sync::translations::requisition_line::LegacyRequisitionLineRow;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
use chrono::NaiveDate;
use repository::{RequisitionLineRow, RequisitionLineRowDelete};
use serde_json::json;
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

const TABLE_NAME: &str = "requisition_line";

const REQUISITION_LINE_1: (&str, &str) = (
    "66FB0A41C95441ABBBC7905857466089",
    r#"{
        "ID": "66FB0A41C95441ABBBC7905857466089",
        "requisition_ID": "mock_request_draft_requisition3",
        "item_ID": "item_a",
        "stock_on_hand": 10,
        "actualQuan": 2,
        "imprest_or_prev_quantity": 0,
        "colour": -255,
        "line_number": 1,
        "Cust_prev_stock_balance": 0,
        "Cust_stock_received": 0,
        "Cust_stock_order": 102,
        "comment": "",
        "Cust_loss_adjust": 0,
        "days_out_or_new_demand": 0,
        "previous_stock_on_hand": 0,
        "daily_usage": 3,
        "suggested_quantity": 101,
        "adjusted_consumption": 0,
        "linked_requisition_line_ID": "",
        "purchase_order_line_ID": "",
        "optionID": "",
        "Cust_stock_issued": 0,
        "itemName": "Ibuprofen 200mg tablets",
        "stockLosses": 0,
        "stockAdditions": 0,
        "stockExpiring": 0,
        "DOSforAMCadjustment": 0,
        "requestedPackSize": 0,
        "approved_quantity": 0,
        "authoriser_comment": "",
        "om_snapshot_datetime": ""
    }"#,
);
fn requisition_line_request_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REQUISITION_LINE_1,
        RequisitionLineRow {
            id: REQUISITION_LINE_1.0.to_string(),
            requisition_id: "mock_request_draft_requisition3".to_string(),
            item_link_id: "item_a".to_string(),
            requested_quantity: 102.0,
            suggested_quantity: 101.0,
            supply_quantity: 2.0,
            available_stock_on_hand: 10.0,
            average_monthly_consumption: 3.0 * NUMBER_OF_DAYS_IN_A_MONTH,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0.0,
            approval_comment: None,
            item_name: "Ibuprofen 200mg tablets".to_string(),
        },
    )
}
fn requisition_line_request_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REQUISITION_LINE_1.0.to_string(),
        push_data: json!(LegacyRequisitionLineRow {
            ID: REQUISITION_LINE_1.0.to_string(),
            requisition_ID: "mock_request_draft_requisition3".to_string(),
            item_ID: "item_a".to_string(),
            Cust_stock_order: 102.0,
            suggested_quantity: 101.0,
            actualQuan: 2.0,
            stock_on_hand: 10.0,
            daily_usage: 3.0,
            comment: None,
            snapshot_datetime: None,
            approved_quantity: 0.0,
            approval_comment: None,
            item_name: "Ibuprofen 200mg tablets".to_string()
        }),
    }
}

const REQUISITION_LINE_OM_FIELD: (&str, &str) = (
    "ABCB0A41C95441ABBBC7905857466089",
    r#"{
        "ID": "ABCB0A41C95441ABBBC7905857466089",
        "requisition_ID": "mock_request_draft_requisition3",
        "item_ID": "item_a",
        "stock_on_hand": 10,
        "actualQuan": 2,
        "imprest_or_prev_quantity": 0,
        "colour": -255,
        "line_number": 1,
        "Cust_prev_stock_balance": 0,
        "Cust_stock_received": 0,
        "Cust_stock_order": 102,
        "comment": "Some comment",
        "Cust_loss_adjust": 0,
        "days_out_or_new_demand": 0,
        "previous_stock_on_hand": 0,
        "daily_usage": 3,
        "suggested_quantity": 101,
        "adjusted_consumption": 0,
        "linked_requisition_line_ID": "",
        "purchase_order_line_ID": "",
        "optionID": "",
        "Cust_stock_issued": 0,
        "itemName": "Ibuprofen 200mg tablets",
        "stockLosses": 0,
        "stockAdditions": 0,
        "stockExpiring": 0,
        "DOSforAMCadjustment": 0,
        "requestedPackSize": 0,
        "approved_quantity": 0,
        "authoriser_comment": "approval comment",
        "om_snapshot_datetime": "2022-04-04T14:48:11"
    }"#,
);
fn requisition_line_om_fields_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REQUISITION_LINE_OM_FIELD,
        RequisitionLineRow {
            id: REQUISITION_LINE_OM_FIELD.0.to_string(),
            requisition_id: "mock_request_draft_requisition3".to_string(),
            item_link_id: "item_a".to_string(),
            requested_quantity: 102.0,
            suggested_quantity: 101.0,
            supply_quantity: 2.0,
            available_stock_on_hand: 10.0,
            approved_quantity: 0.0,
            approval_comment: Some("approval comment".to_string()),
            average_monthly_consumption: 3.0 * NUMBER_OF_DAYS_IN_A_MONTH,
            comment: Some("Some comment".to_string()),
            snapshot_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 4, 4)
                    .unwrap()
                    .and_hms_opt(14, 48, 11)
                    .unwrap(),
            ),
            item_name: "Ibuprofen 200mg tablets".to_string(),
        },
    )
}
fn requisition_line_om_fields_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REQUISITION_LINE_OM_FIELD.0.to_string(),
        push_data: json!(LegacyRequisitionLineRow {
            ID: REQUISITION_LINE_OM_FIELD.0.to_string(),
            requisition_ID: "mock_request_draft_requisition3".to_string(),
            item_ID: "item_a".to_string(),
            Cust_stock_order: 102.0,
            suggested_quantity: 101.0,
            actualQuan: 2.0,
            stock_on_hand: 10.0,
            daily_usage: 3.0,
            approved_quantity: 0.0,
            approval_comment: Some("approval comment".to_string()),
            comment: Some("Some comment".to_string()),
            item_name: "Ibuprofen 200mg tablets".to_string(),
            snapshot_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 4, 4)
                    .unwrap()
                    .and_hms_opt(14, 48, 11)
                    .unwrap()
            ),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        requisition_line_request_pull_record(),
        requisition_line_om_fields_pull_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        REQUISITION_LINE_OM_FIELD.0,
        RequisitionLineRowDelete(REQUISITION_LINE_OM_FIELD.0.to_string()),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        requisition_line_request_push_record(),
        requisition_line_om_fields_push_record(),
    ]
}
