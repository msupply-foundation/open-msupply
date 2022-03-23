use chrono::NaiveDate;
use repository::schema::{
    ChangelogAction, ChangelogRow, ChangelogTableName, RemoteSyncBufferAction, RemoteSyncBufferRow,
    RequisitionRow, RequisitionRowStatus, RequisitionRowType,
};
use serde_json::json;

use crate::sync::translation_remote::{
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    requisition::{LegacyRequisitionRow, LegacyRequisitionStatus, LegacyRequisitionType},
    TRANSLATION_RECORD_REQUISITION,
};

use super::{TestSyncPushRecord, TestSyncRecord};

const REQUISITION_REQUEST: (&'static str, &'static str) = (
    "B3D3761753DB42A7B3286ACF89FBCA1C",
    r#"{
      "ID": "B3D3761753DB42A7B3286ACF89FBCA1C",
      "date_stock_take": "2020-07-09",
      "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
      "name_ID": "name_store_a",
      "status": "fn",
      "date_entered": "2020-07-10",
      "nsh_custInv_ID": "",
      "daysToSupply": 150,
      "store_ID": "store_a",
      "type": "request",
      "date_order_received": "0000-00-00",
      "previous_csh_id": "",
      "serial_number": 8,
      "requester_reference": "",
      "comment": "comment 1",
      "colour": 1,
      "custom_data": null,
      "linked_requisition_id": "mock_request_draft_requisition2",
      "linked_purchase_order_ID": "",
      "authorisationStatus": "",
      "thresholdMOS": 3,
      "orderType": "Normal",
      "periodID": "772B3984DBA14A5F941ED0EF857FDB31",
      "programID": "F36DBBC6DBCA4528BDA2403CE07CB44F",
      "lastModifiedAt": 1594273006,
      "is_emergency": false,
      "isRemoteOrder": false
    }"#,
);
fn requisition_request_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Requisition(RequisitionRow {
                id: REQUISITION_REQUEST.0.to_string(),
                user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
                requisition_number: 8,
                name_id: "name_store_a".to_string(),
                store_id: "store_a".to_string(),
                r#type: RequisitionRowType::Request,
                status: RequisitionRowStatus::Finalised,
                created_datetime: NaiveDate::from_ymd(2020, 7, 10).and_hms(0, 0, 0),
                sent_datetime: None,
                finalised_datetime: None,
                colour: Some("#1A1919".to_string()),
                comment: Some("comment 1".to_string()),
                their_reference: None,
                max_months_of_stock: 5.0,
                min_months_of_stock: 3.0,
                linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
                expected_delivery_date: None,
            }),
        )),
        identifier: "Requisition request",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Requisition_10".to_string(),
            table_name: TRANSLATION_RECORD_REQUISITION.to_string(),
            record_id: REQUISITION_REQUEST.0.to_string(),
            data: REQUISITION_REQUEST.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn requisition_request_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Requisition,
            row_id: REQUISITION_REQUEST.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyRequisitionRow {
            ID: REQUISITION_REQUEST.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            serial_number: 8,
            name_ID: "name_store_a".to_string(),
            store_ID: "store_a".to_string(),
            r#type: LegacyRequisitionType::Request,
            status: LegacyRequisitionStatus::Fn,
            date_entered: NaiveDate::from_ymd(2020, 7, 10),
            date_stock_take: None,
            date_order_received: None,
            requester_reference: None,
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            thresholdMOS: 3.0,
            daysToSupply: 150,
            colour: Some(1),
            comment: Some("comment 1".to_string()),
        }),
    }
}

const REQUISITION_RESPONSE: (&'static str, &'static str) = (
    "455AA2238EE14654B11B86D52B435FF1",
    r#"{
      "ID": "455AA2238EE14654B11B86D52B435FF1",
      "date_stock_take": "2020-06-09",
      "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
      "name_ID": "name_store_b",
      "status": "cn",
      "date_entered": "2020-07-09",
      "nsh_custInv_ID": "",
      "daysToSupply": 300,
      "store_ID": "store_b",
      "type": "response",
      "date_order_received": "2020-06-11",
      "previous_csh_id": "",
      "serial_number": 1,
      "requester_reference": "From request requisition 3",
      "comment": "From request requisition 3",
      "colour": 1,
      "custom_data": null,
      "linked_requisition_id": "mock_request_draft_requisition2",
      "linked_purchase_order_ID": "",
      "authorisationStatus": "none",
      "thresholdMOS": 3,
      "orderType": "Normal",
      "periodID": "641A3560C84A44BC9E6DDC01F3D75923",
      "programID": "F36DBBC6DBCA4528BDA2403CE07CB44F",
      "lastModifiedAt": 1594271180,
      "is_emergency": false,
      "isRemoteOrder": false
    }"#,
);
fn requisition_response_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Requisition(RequisitionRow {
                id: REQUISITION_RESPONSE.0.to_string(),
                user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
                requisition_number: 1,
                name_id: "name_store_b".to_string(),
                store_id: "store_b".to_string(),
                r#type: RequisitionRowType::Response,
                status: RequisitionRowStatus::New,
                created_datetime: NaiveDate::from_ymd(2020, 7, 9).and_hms(0, 0, 0),
                sent_datetime: None,
                finalised_datetime: None,
                colour: Some("#1A1919".to_string()),
                comment: Some("From request requisition 3".to_string()),
                their_reference: Some("From request requisition 3".to_string()),
                max_months_of_stock: 10.0,
                min_months_of_stock: 3.0,
                linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
                expected_delivery_date: None,
            }),
        )),
        identifier: "Requisition response",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Requisition_20".to_string(),
            table_name: TRANSLATION_RECORD_REQUISITION.to_string(),
            record_id: REQUISITION_RESPONSE.0.to_string(),
            data: REQUISITION_RESPONSE.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn requisition_response_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Requisition,
            row_id: REQUISITION_RESPONSE.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyRequisitionRow {
            ID: REQUISITION_RESPONSE.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            serial_number: 1,
            name_ID: "name_store_b".to_string(),
            store_ID: "store_b".to_string(),
            r#type: LegacyRequisitionType::Response,
            status: LegacyRequisitionStatus::Cn,
            date_entered: NaiveDate::from_ymd(2020, 7, 9),
            date_stock_take: None,
            date_order_received: None,
            requester_reference: Some("From request requisition 3".to_string()),
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            thresholdMOS: 3.0,
            daysToSupply: 300,
            colour: Some(1),
            comment: Some("From request requisition 3".to_string()),
        }),
    }
}

pub fn get_test_requisition_records() -> Vec<TestSyncRecord> {
    vec![
        requisition_request_pull_record(),
        requisition_response_pull_record(),
    ]
}

pub fn get_test_push_requisition_records() -> Vec<TestSyncPushRecord> {
    vec![
        requisition_request_push_record(),
        requisition_response_push_record(),
    ]
}
