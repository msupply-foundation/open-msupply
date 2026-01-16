use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::invoice::{
        LegacyOmStatus, LegacyTransactRow, LegacyTransactStatus, LegacyTransactType, TransactMode,
    },
};
use chrono::{Duration, NaiveDate, NaiveTime};
use repository::{InvoiceRow, InvoiceRowDelete, InvoiceStatus, InvoiceType};
use serde_json::json;
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use super::TestSyncOutgoingRecord;

const TABLE_NAME: &str = "transact";

const TRANSACT_1: (&str, &str) = (
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
      "finalised_date": "0000-00-00",
      "finalised_time": 0,
      "contact_id": "",
      "currency_ID": "NEW_ZEALAND_DOLLARS",
      "currency_rate": 1.32,
      "custom_data": null,
      "diagnosis_ID": "",
      "donor_default_id": "donor_a",
      "encounter_id": "",
      "entry_date": "2021-07-30",
      "entry_time": 47046,
      "export_batch": 0,
      "foreign_currency_total": 0,
      "goodsReceivedConfirmation": null,
      "goods_received_ID": "some goods id",
      "hold": false,
      "insuranceDiscountAmount": 10.0,
      "insuranceDiscountRate": 2.5,
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
      "nameInsuranceJoinID": "NAME_INSURANCE_JOIN_1_ID",
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
      "ship_method_ID": "SHIPPING_METHOD_1_ID",
      "ship_method_comment": "",
      "status": "cn",
      "store_ID": "store_b",
      "subtotal": 0,
      "supplier_charge_fc": 0,
      "tax": 0,
      "tax_rate": 0,
      "their_ref": "",
      "total": 0,
      "type": "si",
      "user1": "",
      "user2": "",
      "user3": "",
      "user4": "",
      "user_ID": "MISSING_USER_ID",
      "wardID": "",
      "waybill_number": "",
      "om_allocated_datetime": "",
      "om_picked_datetime": null,
      "om_shipped_datetime": "",
      "om_delivered_datetime": "",
      "om_verified_datetime": "",
      "om_created_datetime": "",
      "om_transport_reference": "",
      "om_expected_delivery_date": ""
  }"#,
);

fn transact_1_pull_row() -> InvoiceRow {
    InvoiceRow {
        id: TRANSACT_1.0.to_string(),
        user_id: Some("MISSING_USER_ID".to_string()),
        store_id: "store_b".to_string(),
        name_id: "name_store_a".to_string(),
        name_store_id: Some("store_a".to_string()),
        invoice_number: 1,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Received,
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
        received_datetime: Some(
            NaiveDate::from_ymd_opt(2021, 7, 30)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
        ),
        verified_datetime: None,
        cancelled_datetime: None,
        colour: None,
        requisition_id: None,
        linked_invoice_id: None,
        tax_percentage: Some(0.0),
        currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
        currency_rate: 1.32,
        clinician_link_id: None,
        original_shipment_id: None,
        backdated_datetime: None,
        diagnosis_id: None,
        program_id: None,
        name_insurance_join_id: Some("NAME_INSURANCE_JOIN_1_ID".to_string()),
        insurance_discount_amount: Some(10.0),
        insurance_discount_percentage: Some(2.5),
        is_cancellation: false,
        expected_delivery_date: None,
        default_donor_link_id: Some("donor_a".to_string()),
        goods_received_id: Some("some goods id".to_string()),
        shipping_method_id: Some("SHIPPING_METHOD_1_ID".to_string()),
    }
}

fn transact_1_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, TRANSACT_1, transact_1_pull_row())
}

fn transact_1_push_legacy_row() -> LegacyTransactRow {
    LegacyTransactRow {
        ID: TRANSACT_1.0.to_string(),
        user_id: Some("MISSING_USER_ID".to_string()),
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
        finalised_date: None,
        finalised_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
        confirm_date: Some(NaiveDate::from_ymd_opt(2021, 7, 30).unwrap()),
        confirm_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
        mode: TransactMode::Store,
        created_datetime: Some(
            NaiveDate::from_ymd_opt(2021, 7, 30)
                .unwrap()
                .and_hms_opt(13, 4, 6)
                .unwrap(),
        ),
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        // received_datetime: Some(
        //     NaiveDate::from_ymd_opt(2021, 7, 30)
        //         .unwrap()
        //         .and_hms_opt(0, 0, 0)
        //         .unwrap()
        //         + Duration::seconds(47046),
        // ),
        delivered_datetime: Some(
            NaiveDate::from_ymd_opt(2021, 7, 30)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
        ),
        verified_datetime: None,
        cancelled_datetime: None,
        om_status: Some(LegacyOmStatus::Delivered),
        om_type: Some(InvoiceType::InboundShipment),
        om_colour: None,
        tax_percentage: Some(0.0),
        clinician_id: None,
        original_shipment_id: None,
        currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
        currency_rate: 1.32,
        backdated_datetime: None,
        diagnosis_id: None,
        program_id: None,
        name_insurance_join_id: Some("NAME_INSURANCE_JOIN_1_ID".to_string()),
        insurance_discount_amount: Some(10.0),
        insurance_discount_percentage: Some(2.5),
        is_cancellation: false,
        expected_delivery_date: None,
        default_donor_link_id: Some("donor_a".to_string()),
        goods_received_ID: Some("some goods id".to_string()),
        shipping_method_id: Some("SHIPPING_METHOD_1_ID".to_string()),
    }
}

fn transact_1_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TRANSACT_1.0.to_string(),
        push_data: json!(transact_1_push_legacy_row()),
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
        "tax_rate": 0,
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
        "om_transport_reference": "transport reference",
        "programID": "missing_program",
        "om_expected_delivery_date": "",
        "finalised_date": "0000-00-00",
        "finalised_time": 0
    }"#,
);
fn transact_2_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        TRANSACT_2,
        InvoiceRow {
            id: TRANSACT_2.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_id: "name_store_b".to_string(),
            name_store_id: Some("store_b".to_string()),
            invoice_number: 4,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::Shipped,
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
            received_datetime: None,
            verified_datetime: None,
            cancelled_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax_percentage: Some(0.0),
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: Some("missing_program".to_string()),
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_id: None,
            shipping_method_id: None,
        },
    )
}
fn transact_2_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
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
            finalised_date: None,
            finalised_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
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
            // received_datetime: None
            verified_datetime: None,
            cancelled_datetime: None,
            om_status: Some(LegacyOmStatus::Shipped),
            om_type: Some(InvoiceType::OutboundShipment),
            om_colour: None,
            tax_percentage: Some(0.0),
            clinician_id: None,
            original_shipment_id: None,
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: Some("missing_program".to_string()),
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_ID: None,
            shipping_method_id: None,
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
        "finalised_date": "2022-08-29",
        "finalised_time": 34800,
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
        "status": "nw",
        "store_ID": "store_b",
        "subtotal": 0,
        "supplier_charge_fc": 0,
        "tax": 0,
        "tax_rate": 0,
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
        "om_received_datetime": "2022-08-28T13:33:00",
        "om_delivered_datetime": "2022-08-28T13:33:00",
        "om_verified_datetime": "2022-08-29T14:33:00",
        "om_status": "SHIPPED",
        "om_colour": "SomeColour",
        "om_type": "INVENTORY_ADDITION",
        "om_expected_delivery_date": ""
    }"#,
);

fn transact_om_fields_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        TRANSACT_OM_FIELDS,
        InvoiceRow {
            id: TRANSACT_OM_FIELDS.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_id: "name_store_b".to_string(),
            name_store_id: Some("store_b".to_string()),
            invoice_number: 4,
            r#type: InvoiceType::InventoryAddition,
            status: InvoiceStatus::Shipped,
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
            received_datetime: Some(
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
            cancelled_datetime: None,
            colour: Some("SomeColour".to_string()),
            requisition_id: None,
            linked_invoice_id: None,
            tax_percentage: Some(0.0),
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_id: None,
            shipping_method_id: None,
        },
    )
}
fn transact_om_fields_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
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
            finalised_date: Some(NaiveDate::from_ymd_opt(2022, 8, 29).unwrap()),
            finalised_time: NaiveTime::from_hms_opt(14, 33, 0).unwrap(),
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
            // received_datetime: Some(
            //     NaiveDate::from_ymd_opt(2022, 8, 28)
            //         .unwrap()
            //         .and_hms_opt(13, 33, 0)
            //         .unwrap()
            // ),
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
            cancelled_datetime: None,
            om_status: Some(LegacyOmStatus::Shipped),
            om_type: Some(InvoiceType::InventoryAddition),
            om_colour: Some("SomeColour".to_string()),
            tax_percentage: Some(0.0),
            clinician_id: None,
            original_shipment_id: None,
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_ID: None,
            shipping_method_id: None,
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
        "tax_rate": 0,
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
        "currency_ID": "NEW_ZEALAND_DOLLARS",
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
        "finalised_date": "2023-01-16",
        "finalised_time": 0,
        "om_expected_delivery_date": null
    }"#,
);

fn inventory_addition_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INVENTORY_ADDITION,
        InvoiceRow {
            id: INVENTORY_ADDITION.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_id: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
            invoice_number: 1,
            r#type: InvoiceType::InventoryAddition,
            status: InvoiceStatus::Verified,
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
            tax_percentage: Some(0.0),

            name_store_id: None,
            their_reference: None,
            transport_reference: None,
            on_hold: false,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            received_datetime: None,
            cancelled_datetime: None,
            requisition_id: None,
            linked_invoice_id: None,
            colour: None,
            currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_id: None,
            shipping_method_id: None,
        },
    )
}

fn inventory_addition_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
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
            tax_percentage: Some(0.0),
            om_status: Some(LegacyOmStatus::Verified),
            om_type: Some(InvoiceType::InventoryAddition),
            entry_date: NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),
            entry_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            confirm_date: Some(NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),),
            confirm_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            finalised_date: Some(NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),),
            finalised_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
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
            cancelled_datetime: None,
            mode: TransactMode::Store,
            comment: Some("Stocktake 1; Added stock".to_string()),

            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            // received_datetime: None
            om_colour: None,
            hold: false,
            their_ref: None,
            transport_reference: None,
            requisition_ID: None,
            linked_transaction_id: None,
            clinician_id: None,
            original_shipment_id: None,
            currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
            currency_rate: 1.0,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_ID: None,
            shipping_method_id: None,
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
        "status": "FN",
        "total": 0,
        "export_batch": 0,
        "linked_transaction_id": "",
        "their_ref": "",
        "confirm_date": "2023-01-16",
        "service_descrip": "",
        "service_price": 0,
        "subtotal": 0,
        "tax": 0,
        "tax_rate": 0,
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
        "currency_ID": "NEW_ZEALAND_DOLLARS",
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
        "finalised_date": "2023-01-16",
        "finalised_time": 0,
        "om_expected_delivery_date": null
    }"#,
);

fn inventory_reduction_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        INVENTORY_REDUCTION,
        InvoiceRow {
            id: INVENTORY_REDUCTION.0.to_string(),
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
            store_id: "store_b".to_string(),
            name_id: INVENTORY_ADJUSTMENT_NAME_CODE.to_string(),
            invoice_number: 2,
            r#type: InvoiceType::InventoryReduction,
            status: InvoiceStatus::Verified,
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
            tax_percentage: Some(0.0),

            name_store_id: None,
            their_reference: None,
            transport_reference: None,
            on_hold: false,
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            received_datetime: None,
            requisition_id: None,
            cancelled_datetime: None,
            linked_invoice_id: None,
            colour: None,
            currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_id: None,
            shipping_method_id: None,
        },
    )
}

fn inventory_reduction_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
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
            tax_percentage: Some(0.0),
            om_status: Some(LegacyOmStatus::Verified),
            om_type: Some(InvoiceType::InventoryReduction),
            entry_date: NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),
            entry_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            confirm_date: Some(NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),),
            confirm_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            finalised_date: Some(NaiveDate::from_ymd_opt(2023, 1, 16).unwrap(),),
            finalised_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
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
            cancelled_datetime: None,
            mode: TransactMode::Store,
            comment: Some("Stocktake 2; Reduced stock".to_string()),
            allocated_datetime: None,
            picked_datetime: None,
            shipped_datetime: None,
            delivered_datetime: None,
            // received_datetime: None
            om_colour: None,
            hold: false,
            their_ref: None,
            transport_reference: None,
            requisition_ID: None,
            linked_transaction_id: None,
            clinician_id: None,
            original_shipment_id: None,
            currency_id: Some("NEW_ZEALAND_DOLLARS".to_string()),
            currency_rate: 1.0,
            backdated_datetime: None,
            diagnosis_id: None,
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_ID: None,
            shipping_method_id: None,
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
      "currency_ID": "AUSTRALIAN_DOLLARS",
      "currency_rate": 1,
      "custom_data": null,
      "diagnosis_ID": "503E901E00534F1797DF4F29E12F907D",
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
      "tax_rate": 0,
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
      "om_transport_reference": "",
      "om_expected_delivery_date": "",
      "finalised_date": "0000-00-00",
      "finalised_time": 0
  }"#,
);
fn prescription_1_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PRESCRIPTION_1,
        InvoiceRow {
            id: PRESCRIPTION_1.0.to_string(),
            user_id: None,
            store_id: "store_b".to_string(),
            name_id: "name_store_a".to_string(),
            name_store_id: Some("store_a".to_string()),
            invoice_number: 1,
            r#type: InvoiceType::Prescription,
            status: InvoiceStatus::Picked,
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
            received_datetime: None,
            verified_datetime: None,
            cancelled_datetime: None,
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax_percentage: Some(0.0),
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: Some("503E901E00534F1797DF4F29E12F907D".to_string()),
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_id: None,
            shipping_method_id: None,
        },
    )
}
fn prescription_1_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
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
            finalised_date: None,
            finalised_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
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
            // received_datetime: None
            verified_datetime: None,
            cancelled_datetime: None,
            om_status: Some(LegacyOmStatus::Picked),
            om_type: Some(InvoiceType::Prescription),
            om_colour: None,
            tax_percentage: Some(0.0),
            clinician_id: None,
            original_shipment_id: None,
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            backdated_datetime: None,
            diagnosis_id: Some("503E901E00534F1797DF4F29E12F907D".to_string()),
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: None,
            default_donor_link_id: None,
            goods_received_ID: None,
            shipping_method_id: None,
        }),
    }
}

const CANCELLED_PRESCRIPTION: (&str, &str) = (
    "cancelled_prescription",
    r#"{
      "Colour": 0,
      "Date_order_received": "0000-00-00",
      "Date_order_written": "2021-07-30",
      "ID": "cancelled_prescription",
      "amount_outstanding": 0,
      "arrival_date_actual": "0000-00-00",
      "arrival_date_estimated": "2021-07-30",
      "authorisationStatus": "",
      "budget_period_ID": "",
      "category2_ID": "",
      "category_ID": "",
      "comment": "",
      "confirm_date": "2021-07-30",
      "confirm_time": 47046,
      "contact_id": "",
      "currency_ID": "AUSTRALIAN_DOLLARS",
      "currency_rate": 1,
      "custom_data": null,
      "diagnosis_ID": "503E901E00534F1797DF4F29E12F907D",
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
      "tax_rate": 0,
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
      "om_cancelled_datetime": "2022-08-24T09:33:00",
      "om_transport_reference": "",
      "om_expected_delivery_date": "",
      "finalised_date": "0000-00-00",
      "finalised_time": 0
  }"#,
);
fn cancelled_prescription_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        CANCELLED_PRESCRIPTION,
        InvoiceRow {
            id: CANCELLED_PRESCRIPTION.0.to_string(),
            user_id: None,
            store_id: "store_b".to_string(),
            name_id: "name_store_a".to_string(),
            name_store_id: Some("store_a".to_string()),
            invoice_number: 1,
            r#type: InvoiceType::Prescription,
            status: InvoiceStatus::Picked,
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
            received_datetime: None,
            verified_datetime: None,
            cancelled_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 24)
                    .unwrap()
                    .and_hms_opt(9, 33, 0)
                    .unwrap(),
            ),
            colour: None,
            requisition_id: None,
            linked_invoice_id: None,
            tax_percentage: Some(0.0),
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            clinician_link_id: None,
            original_shipment_id: None,
            backdated_datetime: None,
            diagnosis_id: Some("503E901E00534F1797DF4F29E12F907D".to_string()),
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: NaiveDate::from_ymd_opt(2021, 7, 30),
            default_donor_link_id: None,
            goods_received_id: None,
            shipping_method_id: None,
        },
    )
}
fn cancelled_prescription_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: CANCELLED_PRESCRIPTION.0.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: CANCELLED_PRESCRIPTION.0.to_string(),
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
            finalised_date: None,
            finalised_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
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
            // received_datetime: None
            verified_datetime: None,
            cancelled_datetime: Some(
                NaiveDate::from_ymd_opt(2022, 8, 24)
                    .unwrap()
                    .and_hms_opt(9, 33, 0)
                    .unwrap(),
            ),
            om_status: Some(LegacyOmStatus::Picked),
            om_type: Some(InvoiceType::Prescription),
            om_colour: None,
            tax_percentage: Some(0.0),
            clinician_id: None,
            original_shipment_id: None,
            currency_id: Some("AUSTRALIAN_DOLLARS".to_string()),
            currency_rate: 1.0,
            backdated_datetime: None,
            diagnosis_id: Some("503E901E00534F1797DF4F29E12F907D".to_string()),
            program_id: None,
            name_insurance_join_id: None,
            insurance_discount_amount: None,
            insurance_discount_percentage: None,
            is_cancellation: false,
            expected_delivery_date: NaiveDate::from_ymd_opt(2021, 7, 30),
            default_donor_link_id: None,
            goods_received_ID: None,
            shipping_method_id: None,
        }),
    }
}

// When inbound shipment is migrated to omsupply and it's new status and a transfer
// om should consider it a shipped invoice.
// For this test using copy of TRANSACT_1, which is in 'cn' status, delivered
const TRANSACT_MIGRATE_OG_SI_STATUS_ID: &str = "12e889c0f12312311eb8dddb54df6d741bc";

fn transact_migrate_og_si_to_shipped_pull() -> TestSyncIncomingRecord {
    let json_body = TRANSACT_1
        .1
        .to_string()
        .replace(TRANSACT_1.0, TRANSACT_MIGRATE_OG_SI_STATUS_ID)
        .replace(r#""status": "cn""#, r#""status": "nw""#)
        .replace(
            r#"confirm_date": "2021-07-30"#,
            r#"confirm_date": "0000-00-00"#,
        )
        .replace(r#"confirm_time": 47046"#, r#"confirm_time": 0"#);

    let id_and_data = (TRANSACT_MIGRATE_OG_SI_STATUS_ID, json_body.as_str());

    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        id_and_data,
        InvoiceRow {
            id: TRANSACT_MIGRATE_OG_SI_STATUS_ID.to_string(),
            status: InvoiceStatus::Shipped,

            shipped_datetime: transact_1_pull_row().received_datetime,
            delivered_datetime: None,
            received_datetime: None,
            ..transact_1_pull_row()
        },
    )
}

fn transact_migrate_og_si_to_shipped_push() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TRANSACT_MIGRATE_OG_SI_STATUS_ID.to_string(),
        push_data: json!(LegacyTransactRow {
            ID: TRANSACT_MIGRATE_OG_SI_STATUS_ID.to_string(),
            status: LegacyTransactStatus::Nw,
            om_status: Some(LegacyOmStatus::Shipped),
            // arrival_date_actual: None,
            confirm_date: None,
            confirm_time: NaiveTime::from_hms_opt(0, 0, 0).unwrap(),
            shipped_datetime: transact_1_push_legacy_row().delivered_datetime,
            delivered_datetime: None,
            finalised_date: transact_1_push_legacy_row().finalised_date,
            finalised_time: transact_1_push_legacy_row().finalised_time,
            ..transact_1_push_legacy_row()
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        transact_1_pull_record(),
        transact_2_pull_record(),
        transact_om_fields_pull_record(),
        inventory_addition_pull_record(),
        inventory_reduction_pull_record(),
        prescription_1_pull_record(),
        cancelled_prescription_pull_record(),
        transact_migrate_og_si_to_shipped_pull(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        TRANSACT_OM_FIELDS.0,
        InvoiceRowDelete(TRANSACT_OM_FIELDS.0.to_string()),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        transact_1_push_record(),
        transact_2_push_record(),
        transact_om_fields_push_record(),
        inventory_addition_push_record(),
        inventory_reduction_push_record(),
        prescription_1_push_record(),
        cancelled_prescription_push_record(),
        transact_migrate_og_si_to_shipped_push(),
    ]
}
