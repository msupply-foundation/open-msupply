use repository::schema::{
    ChangelogAction, ChangelogRow, ChangelogTableName, RemoteSyncBufferAction, RemoteSyncBufferRow,
    RequisitionLineRow,
};
use serde_json::json;
use util::constants::NUMBER_OF_DAYS_IN_A_MONTH;

use crate::sync::translation_remote::{
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    requisition_line::LegacyRequisitionLineRow,
    TRANSLATION_RECORD_REQUISITION_LINE,
};

use super::{TestSyncPushRecord, TestSyncRecord};

const REQUISITION_LINE_1: (&'static str, &'static str) = (
    "66FB0A41C95441ABBBC7905857466089",
    r#"{
        "ID": "66FB0A41C95441ABBBC7905857466089",
        "requisition_ID": "mock_request_draft_requisition2",
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
        "authoriser_comment": ""
    }"#,
);
fn requisition_line_request_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::RequisitionLine(RequisitionLineRow {
                id: "66FB0A41C95441ABBBC7905857466089".to_string(),
                requisition_id: "mock_request_draft_requisition2".to_string(),
                item_id: "item_a".to_string(),
                requested_quantity: 102,
                suggested_quantity: 101,
                supply_quantity: 2,
                available_stock_on_hand: 10,
                average_monthly_consumption: 3 * NUMBER_OF_DAYS_IN_A_MONTH as i32,
                comment: None,
                snapshot_datetime: None,
            }),
        )),
        identifier: "Requisition line 1",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Requisition_line_10".to_string(),
            table_name: TRANSLATION_RECORD_REQUISITION_LINE.to_string(),
            record_id: REQUISITION_LINE_1.0.to_string(),
            data: REQUISITION_LINE_1.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn requisition_line_request_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::RequisitionLine,
            row_id: REQUISITION_LINE_1.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyRequisitionLineRow {
            ID: REQUISITION_LINE_1.0.to_string(),
            requisition_ID: "mock_request_draft_requisition2".to_string(),
            item_ID: "item_a".to_string(),
            Cust_stock_order: 102,
            suggested_quantity: 101,
            actualQuan: 2,
            stock_on_hand: 10,
            daily_usage: 3.0,
            comment: None,
            snapshot_datetime: None,
        }),
    }
}

pub fn get_test_requisition_line_records() -> Vec<TestSyncRecord> {
    vec![requisition_line_request_pull_record()]
}

#[allow(dead_code)]
pub fn get_test_push_requisition_line_records() -> Vec<TestSyncPushRecord> {
    vec![requisition_line_request_push_record()]
}
