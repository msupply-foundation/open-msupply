use crate::sync::{
    test::TestSyncPullRecord,
    translations::invoice::{
        LegacyTransactRow, LegacyTransactStatus, LegacyTransactType, TransactMode,
    },
};
use chrono::{Duration, NaiveDate, NaiveTime};
use repository::{InvoiceRow, InvoiceRowDelete, InvoiceRowStatus, InvoiceRowType};
use serde_json::json;
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use super::TestSyncPushRecord;

const TABLE_NAME: &'static str = "transact";

const TRANSACT_1: (&'static str, &'static str) = (
    "12e889c0f0d211eb8dddb54df6d741bc",
    r#"{
      "Colour": 0,
      "Date_order_received": "0000-00-00",
      "Date_order_written": "2021-07-30",
      "ID": "12e889c0f0d211eb8dddb54df6d741bc",
      "amount_outstanding": 0,
      "arrival_date_actual": "0000-00-00",
      "arrival_date_estimated": "0000-00-00",
      "authorisationStatus": "",
      "budget_period_ID": "",
      "category2_ID": "",
      "category_ID": "",
      "comment": "",
      "confirm_date": "2021-07-30",
      "confirm_time": 47046,
      "contact_id": "",
      "currency_ID": "NEW_ZEALAND_DOLLARS",
      "currency_rate": 1.32,
      "custom_data": null,
      "diagnosis_ID": "",
      "donor_default_id": "",
      "encounter_id": "",
      "entry_date": "2021-07-30",
      "entry_time": 47046,
      "export_batch": 0,
      "foreign_currency_total": 0,
      "goodsReceivedConfirmation": null,
      "goods_received_ID": "",
      "hold": false,
      "insuranceDiscountAmount": 0,
      "insuranceDiscountRate": 0,
      "internalData": null,
      "invoice_num": 1,
      "invoice_printed_date": "0000-00-00",
      "is_authorised": false,
      "is_cancellation": false,
      "lastModifiedAt": 1627607293,
      "linked_goods_received_ID": "",
      "linked_transaction_id": "",
      "local_charge_distributed": 0,
      "mode": "store",
      "mwks_sequence_num": 0,
      "nameInsuranceJoinID": "",
      "name_ID": "name_store_a",
      "number_of_cartons": 0,
      "optionID": "",
      "original_PO_ID": "",
      "paymentTypeID": "",
      "pickslip_printed_date": "0000-00-00",
      "prescriber_ID": "",
      "requisition_ID": "",
      "responsible_officer_ID": "",
      "service_descrip": "",
      "service_price": 0,
      "ship_date": "0000-00-00",
      "ship_method_ID": "",
      "ship_method_comment": "",
      "status": "cn",
      "store_ID": "store_b",
      "subtotal": 0,
      "supplier_charge_fc": 0,
      "tax": 0,
      "their_ref": "",
      "total": 0,
      "type": "si",
      "user1": "",
      "user2": "",
      "user3": "",
      "user4": "",
      "user_ID": "",
      "wardID": "",
      "waybill_number": "",
      "om_allocated_datetime": "",
      "om_picked_datetime": null,
      "om_shipped_datetime": "",
      "om_delivered_datetime": "",
      "om_verified_datetime": "",
      "om_created_datetime": "",
      "om_transport_reference": ""
  }"#,
);
fn transact_1_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        TRANSACT_1,
        InvoiceRow {
            id: TRANSACT_1.0.to_string(),
            user_id: None,
            store_id: "store_b".to_string(),
            name_link_id: "name_store_a".to_string(),
            name_store_id: Some("store_a".to_string()),
            invoice_number: 1,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::Delivered,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: None,
            created_datetime: NaiveDate::from_ymd_opt(2021, 7, 30)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 30)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax: Some(0.0),
            currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
            currency_rate: 1.32,
            clinician_link_id: None,
        },
    )
}
fn transact_1_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TRANSACT_1.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: TRANSACT_1.0.to_string(),
            user_id: None,
            name_ID: "name_store_a".to_string(),
            store_ID: "store_b".to_string(),
            invoice_num: 1,
            _type: LegacyTransactType::Si,
            status: LegacyTransactStatus::Cn,
            hold: false,
            comment: None,
            their_ref: None,
            transport_reference: None,
            requisition_ID: None,
            linked_transaction_id: None,
            entry_date: NaiveDate::from_ymd_opt(2021, 7, 30).unwrap(),
            entry_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            ship_date: None,
            arrival_date_actual: Some(NaiveDate::from_ymd_opt(2021, 7, 30).unwrap()),
            confirm_date: Some(NaiveDate::from_ymd_opt(2021, 7, 30).unwrap()),
            confirm_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            mode: TransactMode::Store,
            created_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 30)
                    .unwrap()
                    .and_hms_opt(13, 4, 6)
                    .unwrap()
            ),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 30)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
            verified_datetime: None,
            om_status: Some(InvoiceRowStatus::Delivered),
            om_type: Some(InvoiceRowType::InboundShipment),
            om_colour: None,
            tax: Some(0.0),
            clinician_id: None,
            currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
            currency_rate: 1.32
        }),
    }
}

const TRANSACT_2: (&str, &str) = (
    "7c860d40f3f111eb9647790fe8518386",
    r#"{
        "Colour": 1710361,
        "Date_order_received": "0000-00-00",
        "Date_order_written": "2021-08-03",
        "ID": "7c860d40f3f111eb9647790fe8518386",
        "amount_outstanding": 0,
        "arrival_date_actual": "0000-00-00",
        "arrival_date_estimated": "0000-00-00",
        "authorisationStatus": "",
        "budget_period_ID": "",
        "category2_ID": "",
        "category_ID": "",
        "comment": "",
        "confirm_date": "0000-00-00",
        "confirm_time": 44806,
        "contact_id": "",
        "currency_ID": "AUSTRALIAN_DOLLARS",
        "currency_rate": 1,
        "custom_data": null,
        "diagnosis_ID": "",
        "donor_default_id": "",
        "encounter_id": "",
        "entry_date": "2021-08-03",
        "entry_time": 44806,
        "export_batch": 0,
        "foreign_currency_total": 0,
        "goodsReceivedConfirmation": null,
        "goods_received_ID": "",
        "hold": false,
        "insuranceDiscountAmount": 0,
        "insuranceDiscountRate": 0,
        "internalData": null,
        "invoice_num": 4,
        "invoice_printed_date": "0000-00-00",
        "is_authorised": false,
        "is_cancellation": false,
        "lastModifiedAt": 1627959832,
        "linked_goods_received_ID": "",
        "linked_transaction_id": "",
        "local_charge_distributed": 0,
        "mode": "store",
        "mwks_sequence_num": 0,
        "nameInsuranceJoinID": "",
        "name_ID": "name_store_b",
        "number_of_cartons": 0,
        "optionID": "",
        "original_PO_ID": "",
        "paymentTypeID": "",
        "pickslip_printed_date": "0000-00-00",
        "prescriber_ID": "",
        "requisition_ID": "",
        "responsible_officer_ID": "",
        "service_descrip": "",
        "service_price": 0,
        "ship_date": "0000-00-00",
        "ship_method_ID": "",
        "ship_method_comment": "",
        "status": "fn",
        "store_ID": "store_b",
        "subtotal": 0,
        "supplier_charge_fc": 0,
        "tax": 0,
        "their_ref": "",
        "total": 0,
        "type": "ci",
        "user1": "",
        "user2": "",
        "user3": "",
        "user4": "",
        "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
        "wardID": "",
        "waybill_number": "",
        "om_transport_reference": "transport reference"
    }"#,
);
fn transact_2_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        TRANSACT_2,
        InvoiceRow {
            id: TRANSACT_2.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_link_id: "name_store_b".to_string(),
            name_store_id: Some("store_b".to_string()),
            invoice_number: 4,
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::Shipped,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: Some("transport reference".to_string()),
            created_datetime: NaiveDate::from_ymd_opt(2021, 8, 3)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(44806),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax: Some(0.0),
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
        },
    )
}
fn transact_2_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TRANSACT_2.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: TRANSACT_2.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            name_ID: "name_store_b".to_string(),
            store_ID: "store_b".to_string(),
            invoice_num: 4,
            _type: LegacyTransactType::Ci,
            status: LegacyTransactStatus::Fn,
            hold: false,
            comment: None,
            their_ref: None,
            transport_reference: Some("transport reference".to_string()),
            requisition_ID: None,
            linked_transaction_id: None,
            entry_date: NaiveDate::from_ymd_opt(2021, 8, 3).unwrap(),
            entry_time: NaiveTime::from_hms_opt(12, 26, 46).unwrap(),
            ship_date: None,
            arrival_date_actual: None,
            confirm_date: None,
            confirm_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            mode: TransactMode::Store,
            created_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 8, 3)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(44806)
            ),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            om_status: Some(InvoiceRowStatus::Shipped),
            om_type: Some(InvoiceRowType::OutboundShipment),
            om_colour: None,
            tax: Some(0.0),
            clinician_id: None,
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
        }),
    }
}

const TRANSACT_OM_FIELDS: (&str, &str) = (
    "Ac860d40f3f111eb9647790fe8518386",
    r#"{
        "Colour": 1710361,
        "Date_order_received": "0000-00-00",
        "Date_order_written": "2021-08-03",
        "ID": "Ac860d40f3f111eb9647790fe8518386",
        "amount_outstanding": 0,
        "arrival_date_actual": "0000-00-00",
        "arrival_date_estimated": "0000-00-00",
        "authorisationStatus": "",
        "budget_period_ID": "",
        "category2_ID": "",
        "category_ID": "",
        "comment": "",
        "confirm_date": "0000-00-00",
        "confirm_time": 44806,
        "contact_id": "",
        "currency_ID": "",
        "currency_rate": 1,
        "custom_data": null,
        "diagnosis_ID": "",
        "donor_default_id": "",
        "encounter_id": "",
        "entry_date": "2021-08-03",
        "entry_time": 44806,
        "export_batch": 0,
        "foreign_currency_total": 0,
        "goodsReceivedConfirmation": null,
        "goods_received_ID": "",
        "hold": false,
        "insuranceDiscountAmount": 0,
        "insuranceDiscountRate": 0,
        "internalData": null,
        "invoice_num": 4,
        "invoice_printed_date": "0000-00-00",
        "is_authorised": false,
        "is_cancellation": false,
        "lastModifiedAt": 1627959832,
        "linked_goods_received_ID": "",
        "linked_transaction_id": "",
        "local_charge_distributed": 0,
        "mode": "store",
        "mwks_sequence_num": 0,
        "nameInsuranceJoinID": "",
        "name_ID": "name_store_b",
        "number_of_cartons": 0,
        "optionID": "",
        "original_PO_ID": "",
        "paymentTypeID": "",
        "pickslip_printed_date": "0000-00-00",
        "prescriber_ID": "",
        "requisition_ID": "",
        "responsible_officer_ID": "",
        "service_descrip": "",
        "service_price": 0,
        "ship_date": "0000-00-00",
        "ship_method_ID": "",
        "ship_method_comment": "",
        "status": "nw",
        "store_ID": "store_b",
        "subtotal": 0,
        "supplier_charge_fc": 0,
        "tax": 0,
        "their_ref": "",
        "total": 0,
        "type": "si",
        "user1": "",
        "user2": "",
        "user3": "",
        "user4": "",
        "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
        "wardID": "",
        "waybill_number": "",
        "om_transport_reference": "transport reference",
        "om_created_datetime": "2022-08-24T09:33:00",
        "om_allocated_datetime": "2022-08-25T10:33:00",
        "om_picked_datetime": "2022-08-26T11:33:00",
        "om_shipped_datetime": "2022-08-27T12:33:00",
        "om_delivered_datetime": "2022-08-28T13:33:00",
        "om_verified_datetime": "2022-08-29T14:33:00",
        "om_status": "SHIPPED",
        "om_colour": "SomeColour",
        "om_type": "INVENTORY_ADDITION"
    }"#,
);

fn transact_om_fields_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        TRANSACT_OM_FIELDS,
        InvoiceRow {
            id: TRANSACT_OM_FIELDS.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_link_id: "name_store_b".to_string(),
            name_store_id: Some("store_b".to_string()),
            invoice_number: 4,
            r#type: InvoiceRowType::InventoryAddition,
            status: InvoiceRowStatus::Shipped,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: Some("transport reference".to_string()),
            created_datetime: NaiveDate::from_ymd_opt(2022, 8, 24)
                .unwrap()
                .and_hms_opt(9, 33, 0)
                .unwrap(),
            allocated_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 25)
                    .unwrap()
                    .and_hms_opt(10, 33, 0)
                    .unwrap(),
            ),
            picked_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 26)
                    .unwrap()
                    .and_hms_opt(11, 33, 0)
                    .unwrap(),
            ),
            shipped_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 27)
                    .unwrap()
                    .and_hms_opt(12, 33, 0)
                    .unwrap(),
            ),
            delivered_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 28)
                    .unwrap()
                    .and_hms_opt(13, 33, 0)
                    .unwrap(),
            ),
            verified_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 29)
                    .unwrap()
                    .and_hms_opt(14, 33, 0)
                    .unwrap(),
            ),
            colour: Some("SomeColour".to_string()),
            requisition_id: None,
            linked_invoice_id: None,
            tax: Some(0.0),
            currency_id: None,
            currency_rate: 1.0,
            clinician_link_id: None,
        },
    )
}
fn transact_om_fields_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TRANSACT_OM_FIELDS.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: TRANSACT_OM_FIELDS.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            name_ID: "name_store_b".to_string(),
            store_ID: "store_b".to_string(),
            invoice_num: 4,
            _type: LegacyTransactType::Si,
            status: LegacyTransactStatus::Nw,
            hold: false,
            comment: None,
            their_ref: None,
            transport_reference: Some("transport reference".to_string()),
            requisition_ID: None,
            linked_transaction_id: None,
            entry_date: NaiveDate::from_ymd_opt(2022, 8, 24).unwrap(),
            entry_time: NaiveTime::from_hms_opt(9, 33, 0).unwrap(),
            ship_date: Some(NaiveDate::from_ymd_opt(2022, 8, 27).unwrap()),
            arrival_date_actual: Some(NaiveDate::from_ymd_opt(2022, 8, 28).unwrap()),
            confirm_date: Some(NaiveDate::from_ymd_opt(2022, 8, 29).unwrap()),
            confirm_time: NaiveTime::from_hms_opt(14, 33, 0).unwrap(),
            mode: TransactMode::Store,

            created_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 24)
                    .unwrap()
                    .and_hms_opt(9, 33, 0)
                    .unwrap()
            ),
            allocated_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 25)
                    .unwrap()
                    .and_hms_opt(10, 33, 0)
                    .unwrap()
            ),
            picked_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 26)
                    .unwrap()
                    .and_hms_opt(11, 33, 0)
                    .unwrap()
            ),
            shipped_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 27)
                    .unwrap()
                    .and_hms_opt(12, 33, 0)
                    .unwrap()
            ),
            delivered_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 28)
                    .unwrap()
                    .and_hms_opt(13, 33, 0)
                    .unwrap()
            ),
            verified_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 29)
                    .unwrap()
                    .and_hms_opt(14, 33, 0)
                    .unwrap()
            ),
            om_status: Some(InvoiceRowStatus::Shipped),
            om_type: Some(InvoiceRowType::InventoryAddition),
            om_colour: Some("SomeColour".to_string()),
            tax: Some(0.0),
            clinician_id: None,
            currency_id: None,
            currency_rate: 1.0,
        }),
    }
}

const INVENTORY_ADDITION: (&str, &str) = (
    "065AEF4C9C214C9AB4ED7BA0A1EC72C0",
    r#"{
        "name_ID": "invad",
        "ID": "065AEF4C9C214C9AB4ED7BA0A1EC72C0",
        "invoice_num": 1,
        "amount_outstanding": 0,
        "comment": "Stocktake 1; Added stock",
        "entry_date": "2023-01-16",
        "type": "si",
        "status": "fn",
        "total": 0,
        "export_batch": 0,
        "linked_transaction_id": "",
        "their_ref": "",
        "confirm_date": "2023-01-16",
        "service_descrip": "",
        "service_price": 0,
        "subtotal": 0,
        "tax": 0,
        "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
        "pickslip_printed_date": "0000-00-00",
        "prescriber_ID": "",
        "goods_received_ID": "",
        "invoice_printed_date": "0000-00-00",
        "ship_date": "0000-00-00",
        "ship_method_ID": "",
        "ship_method_comment": "",
        "waybill_number": "",
        "number_of_cartons": 0,
        "arrival_date_estimated": "0000-00-00",
        "arrival_date_actual": "0000-00-00",
        "responsible_officer_ID": "",
        "mode": "store",
        "category_ID": "",
        "confirm_time": 0,
        "foreign_currency_total": 0,
        "currency_ID": "",
        "hold": false,
        "currency_rate": 1,
        "supplier_charge_fc": 0,
        "local_charge_distributed": 0,
        "budget_period_ID": "",
        "store_ID": "store_b",
        "user1": "",
        "user2": "",
        "mwks_sequence_num": 0,
        "is_cancellation": false,
        "user3": "",
        "user4": "",
        "Colour": 0,
        "original_PO_ID": "",
        "donor_default_id": "",
        "Date_order_received": "0000-00-00",
        "Date_order_written": "0000-00-00",
        "contact_id": "",
        "encounter_id": "",
        "is_authorised": false,
        "requisition_ID": "",
        "entry_time": 0,
        "linked_goods_received_ID": "",
        "authorisationStatus": "",
        "nameInsuranceJoinID": "",
        "insuranceDiscountAmount": 0,
        "optionID": "",
        "insuranceDiscountRate": 0,
        "internalData": null,
        "lastModifiedAt": 1673825613,
        "custom_data": null,
        "goodsReceivedConfirmation": null,
        "paymentTypeID": "",
        "diagnosis_ID": "",
        "wardID": "",
        "category2_ID": "",
        "om_created_datetime": null,
        "om_allocated_datetime": null,
        "om_picked_datetime": null,
        "om_shipped_datetime": null,
        "om_delivered_datetime": null,
        "om_verified_datetime": null,
        "om_status": null,
        "om_colour": null,
        "om_type": null,
        "om_transport_reference": null,
        "finalised_date": "2023-01-16"
    }"#,
);

fn inventory_addition_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        INVENTORY_ADDITION,
        InvoiceRow {
            id: INVENTORY_ADDITION.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_link_id: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
            invoice_number: 1,
            r#type: InvoiceRowType::InventoryAddition,
            status: InvoiceRowStatus::Verified,
            created_datetime: NaiveDate::from_ymd_opt(2023, 1, 16)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            verified_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 1, 16)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            comment: Some("Stocktake 1; Added stock".to_string()),
            tax: Some(0.0),

            name_store_id: None,
            their_reference: None,
            transport_reference: None,
            on_hold: false,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            requisition_id: None,
            linked_invoice_id: None,
            colour: None,
            currency_id: None,
            currency_rate: 1.0,
            clinician_link_id: None,
        },
    )
}

fn inventory_addition_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: INVENTORY_ADDITION.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: INVENTORY_ADDITION.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            name_ID: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
            store_ID: "store_b".to_string(),
            invoice_num: 1,
            _type: LegacyTransactType::Si,
            status: LegacyTransactStatus::Fn,
            tax: Some(0.0),
            om_status: Some(InvoiceRowStatus::Verified),
            om_type: Some(InvoiceRowType::InventoryAddition),
            entry_date: NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),
            entry_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            confirm_date: Some(NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),),
            confirm_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            created_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 1, 16)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
            ),
            verified_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 1, 16)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
            ),
            mode: TransactMode::Store,
            comment: Some("Stocktake 1; Added stock".to_string()),

            arrival_date_actual: None,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            om_colour: None,
            ship_date: None,
            hold: false,
            their_ref: None,
            transport_reference: None,
            requisition_ID: None,
            linked_transaction_id: None,
            clinician_id: None,
            currency_id: None,
            currency_rate: 1.0
        }),
    }
}

const INVENTORY_REDUCTION: (&str, &str) = (
    "EE2EBC187C62453AADE221779FCFDABC",
    r#"{
        "name_ID": "invad",
        "ID": "EE2EBC187C62453AADE221779FCFDABC",
        "invoice_num": 2,
        "amount_outstanding": 0,
        "comment": "Stocktake 2; Reduced stock",
        "entry_date": "2023-01-16",
        "type": "sc",
        "status": "fn",
        "total": 0,
        "export_batch": 0,
        "linked_transaction_id": "",
        "their_ref": "",
        "confirm_date": "2023-01-16",
        "service_descrip": "",
        "service_price": 0,
        "subtotal": 0,
        "tax": 0,
        "user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
        "pickslip_printed_date": "0000-00-00",
        "prescriber_ID": "",
        "goods_received_ID": "",
        "invoice_printed_date": "0000-00-00",
        "ship_date": "0000-00-00",
        "ship_method_ID": "",
        "ship_method_comment": "",
        "waybill_number": "",
        "number_of_cartons": 0,
        "arrival_date_estimated": "0000-00-00",
        "arrival_date_actual": "0000-00-00",
        "responsible_officer_ID": "",
        "mode": "store",
        "category_ID": "",
        "confirm_time": 0,
        "foreign_currency_total": 0,
        "currency_ID": "",
        "hold": false,
        "currency_rate": 1,
        "supplier_charge_fc": 0,
        "local_charge_distributed": 0,
        "budget_period_ID": "",
        "store_ID": "store_b",
        "user1": "",
        "user2": "",
        "mwks_sequence_num": 0,
        "is_cancellation": false,
        "user3": "",
        "user4": "",
        "Colour": 0,
        "original_PO_ID": "",
        "donor_default_id": "",
        "Date_order_received": "0000-00-00",
        "Date_order_written": "0000-00-00",
        "contact_id": "",
        "encounter_id": "",
        "is_authorised": false,
        "requisition_ID": "",
        "entry_time": 0,
        "linked_goods_received_ID": "",
        "authorisationStatus": "",
        "nameInsuranceJoinID": "",
        "insuranceDiscountAmount": 0,
        "optionID": "",
        "insuranceDiscountRate": 0,
        "internalData": null,
        "lastModifiedAt": 1673825660,
        "custom_data": null,
        "goodsReceivedConfirmation": null,
        "paymentTypeID": "",
        "diagnosis_ID": "",
        "wardID": "",
        "category2_ID": "",
        "om_created_datetime": null,
        "om_allocated_datetime": null,
        "om_picked_datetime": null,
        "om_shipped_datetime": null,
        "om_delivered_datetime": null,
        "om_verified_datetime": null,
        "om_status": null,
        "om_colour": null,
        "om_type": null,
        "om_transport_reference": null,
        "finalised_date": "2023-01-16"
    }"#,
);

fn inventory_reduction_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        INVENTORY_REDUCTION,
        InvoiceRow {
            id: INVENTORY_REDUCTION.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_link_id: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
            invoice_number: 2,
            r#type: InvoiceRowType::InventoryReduction,
            status: InvoiceRowStatus::Verified,
            created_datetime: NaiveDate::from_ymd_opt(2023, 1, 16)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            verified_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 1, 16)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            comment: Some("Stocktake 2; Reduced stock".to_string()),
            tax: Some(0.0),

            name_store_id: None,
            their_reference: None,
            transport_reference: None,
            on_hold: false,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            requisition_id: None,
            linked_invoice_id: None,
            colour: None,
            currency_id: None,
            currency_rate: 1.0,
            clinician_link_id: None,
        },
    )
}

fn inventory_reduction_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: INVENTORY_REDUCTION.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: INVENTORY_REDUCTION.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            name_ID: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
            store_ID: "store_b".to_string(),
            invoice_num: 2,
            _type: LegacyTransactType::Sc,
            status: LegacyTransactStatus::Fn,
            tax: Some(0.0),
            om_status: Some(InvoiceRowStatus::Verified),
            om_type: Some(InvoiceRowType::InventoryReduction),
            entry_date: NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),
            entry_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            confirm_date: Some(NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),),
            confirm_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            created_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 1, 16)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
            ),
            verified_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 1, 16)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
            ),
            mode: TransactMode::Store,
            comment: Some("Stocktake 2; Reduced stock".to_string()),

            arrival_date_actual: None,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            om_colour: None,
            ship_date: None,
            hold: false,
            their_ref: None,
            transport_reference: None,
            requisition_ID: None,
            linked_transaction_id: None,
            clinician_id: None,
            currency_id: None,
            currency_rate: 1.0,
        }),
    }
}

const PRESCRIPTION_1: (&str, &str) = (
    "prescription_1",
    r#"{
      "Colour": 0,
      "Date_order_received": "0000-00-00",
      "Date_order_written": "2021-07-30",
      "ID": "prescription_1",
      "amount_outstanding": 0,
      "arrival_date_actual": "0000-00-00",
      "arrival_date_estimated": "0000-00-00",
      "authorisationStatus": "",
      "budget_period_ID": "",
      "category2_ID": "",
      "category_ID": "",
      "comment": "",
      "confirm_date": "2021-07-30",
      "confirm_time": 47046,
      "contact_id": "",
      "currency_ID": "",
      "currency_rate": 1,
      "custom_data": null,
      "diagnosis_ID": "",
      "donor_default_id": "",
      "encounter_id": "",
      "entry_date": "2021-07-30",
      "entry_time": 47046,
      "export_batch": 0,
      "foreign_currency_total": 0,
      "goodsReceivedConfirmation": null,
      "goods_received_ID": "",
      "hold": false,
      "insuranceDiscountAmount": 0,
      "insuranceDiscountRate": 0,
      "internalData": null,
      "invoice_num": 1,
      "invoice_printed_date": "0000-00-00",
      "is_authorised": false,
      "is_cancellation": false,
      "lastModifiedAt": 1627607293,
      "linked_goods_received_ID": "",
      "linked_transaction_id": "",
      "local_charge_distributed": 0,
      "mode": "dispensary",
      "mwks_sequence_num": 0,
      "nameInsuranceJoinID": "",
      "name_ID": "name_store_a",
      "number_of_cartons": 0,
      "optionID": "",
      "original_PO_ID": "",
      "paymentTypeID": "",
      "pickslip_printed_date": "0000-00-00",
      "prescriber_ID": "",
      "requisition_ID": "",
      "responsible_officer_ID": "",
      "service_descrip": "",
      "service_price": 0,
      "ship_date": "0000-00-00",
      "ship_method_ID": "",
      "ship_method_comment": "",
      "status": "cn",
      "store_ID": "store_b",
      "subtotal": 0,
      "supplier_charge_fc": 0,
      "tax": 0,
      "their_ref": "",
      "total": 0,
      "type": "ci",
      "user1": "",
      "user2": "",
      "user3": "",
      "user4": "",
      "user_ID": "",
      "wardID": "",
      "waybill_number": "",
      "om_allocated_datetime": "",
      "om_picked_datetime": null,
      "om_shipped_datetime": "",
      "om_delivered_datetime": "",
      "om_verified_datetime": "",
      "om_created_datetime": "",
      "om_transport_reference": ""
  }"#,
);
fn prescription_1_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        PRESCRIPTION_1,
        InvoiceRow {
            id: PRESCRIPTION_1.0.to_string(),
            user_id: None,
            store_id: "store_b".to_string(),
            name_link_id: "name_store_a".to_string(),
            name_store_id: Some("store_a".to_string()),
            invoice_number: 1,
            r#type: InvoiceRowType::Prescription,
            status: InvoiceRowStatus::Picked,
            on_hold: false,
            comment: None,
            their_reference: None,
            transport_reference: None,
            created_datetime: NaiveDate::from_ymd_opt(2021, 7, 30)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
            allocated_datetime: None,
            picked_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 30)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax: Some(0.0),
            currency_id: None,
            currency_rate: 1.0,
            clinician_link_id: None,
        },
    )
}
fn prescription_1_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PRESCRIPTION_1.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: PRESCRIPTION_1.0.to_string(),
            user_id: None,
            name_ID: "name_store_a".to_string(),
            store_ID: "store_b".to_string(),
            invoice_num: 1,
            _type: LegacyTransactType::Ci,
            status: LegacyTransactStatus::Cn,
            hold: false,
            comment: None,
            their_ref: None,
            transport_reference: None,
            requisition_ID: None,
            linked_transaction_id: None,
            entry_date: NaiveDate::from_ymd_opt(2021, 7, 30).unwrap(),
            entry_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            ship_date: None,
            arrival_date_actual: None,
            confirm_date: Some(NaiveDate::from_ymd_opt(2021, 7, 30).unwrap()),
            confirm_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            mode: TransactMode::Dispensary,
            created_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 30)
                    .unwrap()
                    .and_hms_opt(13, 4, 6)
                    .unwrap()
            ),
            allocated_datetime: None,
            picked_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 30)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046)
            ),
            shipped_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
            om_status: Some(InvoiceRowStatus::Picked),
            om_type: Some(InvoiceRowType::Prescription),
            om_colour: None,
            tax: Some(0.0),
            clinician_id: None,
            currency_id: None,
            currency_rate: 1.0,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        transact_1_pull_record(),
        transact_2_pull_record(),
        transact_om_fields_pull_record(),
        inventory_addition_pull_record(),
        inventory_reduction_pull_record(),
        prescription_1_pull_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        TABLE_NAME,
        TRANSACT_OM_FIELDS.0,
        InvoiceRowDelete(TRANSACT_OM_FIELDS.0.to_string()),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        transact_1_push_record(),
        transact_2_push_record(),
        transact_om_fields_push_record(),
        inventory_addition_push_record(),
        inventory_reduction_push_record(),
        prescription_1_push_record(),
    ]
}
