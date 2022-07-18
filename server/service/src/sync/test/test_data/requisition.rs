use super::{TestSyncPullRecord, TestSyncPushRecord};
use crate::sync::translations::{
    requisition::{LegacyRequisitionRow, LegacyRequisitionStatus, LegacyRequisitionType},
    LegacyTableName, PullDeleteRecordTable, PullUpsertRecord,
};
use chrono::NaiveDate;
use repository::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    ChangelogAction, ChangelogRow, ChangelogTableName, RequisitionRow,
};
use serde_json::json;

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
fn requisition_request_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::REQUISITION,
        REQUISITION_REQUEST,
        PullUpsertRecord::Requisition(RequisitionRow {
            id: REQUISITION_REQUEST.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            requisition_number: 8,
            name_id: "name_store_a".to_string(),
            store_id: "store_a".to_string(),
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Sent,
            created_datetime: NaiveDate::from_ymd(2020, 7, 10).and_hms(0, 0, 0),
            sent_datetime: Some(NaiveDate::from_ymd(2020, 07, 09).and_hms(05, 36, 46)),
            finalised_datetime: None,
            colour: None,
            comment: Some("comment 1".to_string()),
            their_reference: None,
            max_months_of_stock: 5.0,
            min_months_of_stock: 3.0,
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            expected_delivery_date: None,
        }),
    )
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
            requester_reference: None,
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            thresholdMOS: 3.0,
            daysToSupply: 150,
            comment: Some("comment 1".to_string()),
            created_datetime: Some(NaiveDate::from_ymd(2020, 7, 10).and_hms(0, 0, 0)),
            last_modified_at: 1594273006,
            sent_datetime: Some(NaiveDate::from_ymd(2020, 07, 09).and_hms(05, 36, 46)),
            finalised_datetime: None,
            max_months_of_stock: Some(5.0),
            om_status: Some(RequisitionRowStatus::Sent),
            om_colour: None,
            expected_delivery_date: None,
        }),
    }
}

const REQUISITION_RESPONSE: (&'static str, &'static str) = (
    "AA5AA2238EE14654B11B86D52B435FF1",
    r#"{
      "ID": "AA5AA2238EE14654B11B86D52B435FF1",
      "date_stock_take": "2020-06-09",
      "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
      "name_ID": "name_store_b",
      "status": "fn",
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
fn requisition_response_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::REQUISITION,
        REQUISITION_RESPONSE,
        PullUpsertRecord::Requisition(RequisitionRow {
            id: REQUISITION_RESPONSE.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            requisition_number: 1,
            name_id: "name_store_b".to_string(),
            store_id: "store_b".to_string(),
            r#type: RequisitionRowType::Response,
            status: RequisitionRowStatus::Finalised,
            created_datetime: NaiveDate::from_ymd(2020, 7, 9).and_hms(0, 0, 0),
            sent_datetime: None,
            finalised_datetime: Some(NaiveDate::from_ymd(2020, 07, 09).and_hms(05, 06, 20)),
            colour: None,
            comment: Some("From request requisition 3".to_string()),
            their_reference: Some("From request requisition 3".to_string()),
            max_months_of_stock: 10.0,
            min_months_of_stock: 3.0,
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            expected_delivery_date: None,
        }),
    )
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
            status: LegacyRequisitionStatus::Fn,
            date_entered: NaiveDate::from_ymd(2020, 7, 9),
            requester_reference: Some("From request requisition 3".to_string()),
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            thresholdMOS: 3.0,
            daysToSupply: 300,
            comment: Some("From request requisition 3".to_string()),
            created_datetime: Some(NaiveDate::from_ymd(2020, 7, 9).and_hms(0, 0, 0)),
            last_modified_at: 1594271180,
            sent_datetime: None,
            finalised_datetime: Some(NaiveDate::from_ymd(2020, 7, 9).and_hms(5, 6, 20)),
            max_months_of_stock: Some(10.0),
            om_status: Some(RequisitionRowStatus::Finalised),
            om_colour: None,
            expected_delivery_date: None,
        }),
    }
}

const REQUISITION_OM_FIELDS: (&'static str, &'static str) = (
    "455AA2238EE14654B11B86D52B435FF2",
    r#"{
      "ID": "455AA2238EE14654B11B86D52B435FF2",
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
      "isRemoteOrder": false,
      "om_created_datetime": "2020-07-09T00:00:00",
      "om_sent_datetime": "2022-03-24T14:48:00",
      "om_finalised_datetime": "2022-03-25T14:48:00",
      "om_expected_delivery_date": "2022-03-26",
      "om_max_months_of_stock": 10.0,
      "om_status": "NEW",
      "om_colour": "Colour" 
    }"#,
);
fn requisition_om_fields_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::REQUISITION,
        REQUISITION_OM_FIELDS,
        PullUpsertRecord::Requisition(RequisitionRow {
            id: REQUISITION_OM_FIELDS.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            requisition_number: 1,
            name_id: "name_store_b".to_string(),
            store_id: "store_b".to_string(),
            r#type: RequisitionRowType::Response,
            status: RequisitionRowStatus::New,
            created_datetime: NaiveDate::from_ymd(2020, 7, 9).and_hms(0, 0, 0),
            sent_datetime: Some(NaiveDate::from_ymd(2022, 03, 24).and_hms(14, 48, 00)),
            finalised_datetime: Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(14, 48, 00)),
            expected_delivery_date: Some(NaiveDate::from_ymd(2022, 03, 26)),
            colour: Some("Colour".to_string()),
            comment: Some("From request requisition 3".to_string()),
            their_reference: Some("From request requisition 3".to_string()),
            max_months_of_stock: 10.0,
            min_months_of_stock: 3.0,
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
        }),
    )
}
fn requisition_om_fields_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Requisition,
            row_id: REQUISITION_OM_FIELDS.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyRequisitionRow {
            ID: REQUISITION_OM_FIELDS.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            serial_number: 1,
            name_ID: "name_store_b".to_string(),
            store_ID: "store_b".to_string(),
            r#type: LegacyRequisitionType::Response,
            status: LegacyRequisitionStatus::Cn,
            date_entered: NaiveDate::from_ymd(2020, 7, 9),
            requester_reference: Some("From request requisition 3".to_string()),
            linked_requisition_id: Some("mock_request_draft_requisition2".to_string()),
            thresholdMOS: 3.0,
            daysToSupply: 300,
            comment: Some("From request requisition 3".to_string()),
            last_modified_at: 1648219680,
            created_datetime: Some(NaiveDate::from_ymd(2020, 07, 09).and_hms(0, 0, 0)),
            sent_datetime: Some(NaiveDate::from_ymd(2022, 03, 24).and_hms(14, 48, 00)),
            finalised_datetime: Some(NaiveDate::from_ymd(2022, 03, 25).and_hms(14, 48, 00)),
            expected_delivery_date: Some(NaiveDate::from_ymd(2022, 03, 26)),
            max_months_of_stock: Some(10.0),
            om_status: Some(RequisitionRowStatus::New),
            om_colour: Some("Colour".to_string()),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        requisition_request_pull_record(),
        requisition_response_pull_record(),
        requisition_om_fields_pull_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        LegacyTableName::REQUISITION,
        REQUISITION_OM_FIELDS.0,
        PullDeleteRecordTable::Requisition,
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        requisition_request_push_record(),
        requisition_response_push_record(),
        requisition_om_fields_push_record(),
    ]
}
