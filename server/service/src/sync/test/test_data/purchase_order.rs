use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::purchase_order::{
        LegacyPurchaseOrderRow, LegacyPurchaseOrderStatus, PurchaseOrderOmsFields,
    },
};
use chrono::NaiveDate;
use repository::{PurchaseOrderRow, PurchaseOrderStatus};
use serde_json::json;

use super::TestSyncOutgoingRecord;

const TABLE_NAME: &str = "purchase_order";

// populated object case
const PURCHASE_ORDER_2: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d741hx",
    r#"{
        "name_ID": "name_store_b",
        "ID": "12e889c0f0d211eb8dddb54df6d741hx",
        "creation_date": "2021-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "comment": "",
        "currency_ID": "",
        "inv_sub_total": "",
        "freight": "",
        "cost_in_local_currency": "",
        "curr_rate": "",
        "reference": "",
        "lines": "",
        "requested_delivery_date": "",
        "locked": "",
        "confirm_date": "",
        "created_by": "",
        "last_edited_by": "",
        "Order_total_after_discount": "",
        "supplier_agent": "",
        "delivery_method": "",
        "authorizing_officer_1": "",
        "authorizing_officer_2": "",
        "freight_conditions": "",
        "additional_instructions": "",
        "total_foreign_currency_expected": "",
        "total_local_currency_expected": "",
        "insurance_charge": 1.0,
        "po_sent_date": "",
        "Order_total_before_discount": "",
        "quote_ID": "",
        "editedRemotely": "",
        "heading_message": "",
        "budget_period_ID": "",
        "category_ID": "",
        "include_in_on_order_calcs": "",
        "colour": "",
        "user_field_1": "",
        "Date_contract_signed": "",
        "Date_advance_payment": "",
        "Date_goods_received_at_port": "",
        "is_authorised": "",
        "auth_checksum": "",
        "donor_id": "",
        "user_field_2": "",
        "linked_transaction_ID": "",
        "lookBackMonths": "",
        "custom_data": "",
        "minimumExpiryDate": "",
        "oms_fields": {
            "foreign_exchange_rate": 1.6,
            "contract_signed_datetime": "2021-01-22T15:16:00",
            "heading_message": "test heading message"
        }
    }"#,
);

// "oms_fields": {
//     "foreign_exchange_rate": 1.6,
//     "shipping_method": "",
//     "sent_datetime": "",
//     "contract_signed_datetime": "2021-01-22T15:16:00",
//     "advance_paid_datetime": "",
//     "delivered_datetime": "",
//     "received_at_port_datetime": "",
//     "expected_delivery_datetime": "",
//     "heading_message": ""
// }

fn purchase_order_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_2,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_2.0.to_string(),
            store_id: "store_b".to_string(),
            user_id: None,
            supplier_name_link_id: Some("name_store_b".to_string()),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            confirmed_datetime: None,
            delivered_datetime: None,
            target_months: None,
            comment: None,
            supplier_discount_percentage: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: Some(1.6),
            shipping_method: None,
            sent_datetime: None,
            contract_signed_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 1, 22)
                    .unwrap()
                    .and_hms_opt(15, 16, 0)
                    .unwrap(),
            ),
            advance_paid_datetime: None,
            received_at_port_datetime: None,
            expected_delivery_datetime: None,
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            additional_instructions: None,
            heading_message: Some("test heading message".to_string()),
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: Some(1.0),
            freight_charge: None,
            freight_conditions: None,
        },
    )
}
fn purchase_order_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_2.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_2.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_datetime: None,
            user_id: None,
            store_id: "store_b".to_string(),
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            freight_conditions: None,
            additional_instructions: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: Some(1.0),
            freight_charge: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            purchase_order_number: 1,
            supplier_name_link_id: Some("name_store_b".to_string()),
            supplier_discount_percentage: None,
            oms_fields: Some(PurchaseOrderOmsFields {
                foreign_exchange_rate: Some(1.6),
                shipping_method: None,
                sent_datetime: None,
                contract_signed_datetime: Some(
                    NaiveDate::from_ymd_opt(2021, 1, 22)
                        .unwrap()
                        .and_hms_opt(15, 16, 0)
                        .unwrap(),
                ),
                advance_paid_datetime: None,
                received_at_port_datetime: None,
                expected_delivery_datetime: None,
                heading_message: Some("test heading message".to_string()),
                delivered_datetime: None,
            }),
        }),
    }
}

// empty string case
const PURCHASE_ORDER_3: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d741hz",
    r#"{
        "name_ID": "name_store_b",
        "ID": "12e889c0f0d211eb8dddb54df6d741hz",
        "creation_date": "2021-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "oms_fields": ""
    }"#,
);

fn purchase_order_empty_string_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_3,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_3.0.to_string(),
            store_id: "store_b".to_string(),
            user_id: None,
            supplier_name_link_id: Some("name_store_b".to_string()),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            confirmed_datetime: None,
            delivered_datetime: None,
            target_months: None,
            comment: None,
            supplier_discount_percentage: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: None,
            shipping_method: None,
            sent_datetime: None,
            contract_signed_datetime: None,
            advance_paid_datetime: None,
            received_at_port_datetime: None,
            expected_delivery_datetime: None,
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            additional_instructions: None,
            heading_message: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            freight_conditions: None,
        },
    )
}
fn purchase_order_empty_string_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_3.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_3.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_datetime: None,
            user_id: None,
            store_id: "store_b".to_string(),
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            freight_conditions: None,
            additional_instructions: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            purchase_order_number: 1,
            supplier_name_link_id: Some("name_store_b".to_string()),
            supplier_discount_percentage: None,
            oms_fields: None,
        }),
    }
}

// empty object case
const PURCHASE_ORDER_4: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d741hw",
    r#"{
        "name_ID": "",
        "ID": "12e889c0f0d211eb8dddb54df6d741hw",
        "creation_date": "2020-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "oms_fields": {}
    }"#,
);

fn purchase_order_empty_object_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_4,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_4.0.to_string(),
            store_id: "store_b".to_string(),
            user_id: None,
            supplier_name_link_id: None,
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            confirmed_datetime: None,
            delivered_datetime: None,
            target_months: None,
            comment: None,
            supplier_discount_percentage: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: None,
            shipping_method: None,
            sent_datetime: None,
            contract_signed_datetime: None,
            advance_paid_datetime: None,
            received_at_port_datetime: None,
            expected_delivery_datetime: None,
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            additional_instructions: None,
            heading_message: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            freight_conditions: None,
        },
    )
}
fn purchase_order_empty_object_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_4.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_4.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_datetime: None,
            user_id: None,
            store_id: "store_b".to_string(),
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            freight_conditions: None,
            additional_instructions: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            purchase_order_number: 1,
            supplier_name_link_id: None,
            supplier_discount_percentage: None,
            oms_fields: None,
        }),
    }
}

// null field
const PURCHASE_ORDER_5: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d7fsadsa",
    r#"{
        "name_ID": "",
        "ID": "12e889c0f0d211eb8dddb54df6d7fsadsa",
        "creation_date": "2020-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "oms_fields": null
    }"#,
);

fn purchase_order_null_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_5,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_5.0.to_string(),
            store_id: "store_b".to_string(),
            user_id: None,
            supplier_name_link_id: None,
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            confirmed_datetime: None,
            delivered_datetime: None,
            target_months: None,
            comment: None,
            supplier_discount_percentage: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: None,
            shipping_method: None,
            sent_datetime: None,
            contract_signed_datetime: None,
            advance_paid_datetime: None,
            received_at_port_datetime: None,
            expected_delivery_datetime: None,
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            additional_instructions: None,
            heading_message: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            freight_conditions: None,
        },
    )
}
fn purchase_order_null_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_5.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_5.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_datetime: None,
            user_id: None,
            store_id: "store_b".to_string(),
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            freight_conditions: None,
            additional_instructions: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            purchase_order_number: 1,
            supplier_name_link_id: None,
            supplier_discount_percentage: None,
            oms_fields: None,
        }),
    }
}

const PURCHASE_ORDER_6: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d7ffsagda",
    r#"{
        "name_ID": "",
        "ID": "12e889c0f0d211eb8dddb54df6d7ffsagda",
        "creation_date": "2020-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b"
    }"#,
);

fn purchase_order_no_fields_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_6,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_6.0.to_string(),
            store_id: "store_b".to_string(),
            user_id: None,
            supplier_name_link_id: None,
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            confirmed_datetime: None,
            delivered_datetime: None,
            target_months: None,
            comment: None,
            supplier_discount_percentage: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: None,
            shipping_method: None,
            sent_datetime: None,
            contract_signed_datetime: None,
            advance_paid_datetime: None,
            received_at_port_datetime: None,
            expected_delivery_datetime: None,
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            additional_instructions: None,
            heading_message: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            freight_conditions: None,
        },
    )
}
fn purchase_order_no_fields_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_6.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_6.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_datetime: None,
            user_id: None,
            store_id: "store_b".to_string(),
            supplier_agent: None,
            authorising_officer_1: None,
            authorising_officer_2: None,
            freight_conditions: None,
            additional_instructions: None,
            agent_commission: None,
            document_charge: None,
            communications_charge: None,
            insurance_charge: None,
            freight_charge: None,
            supplier_discount_amount: None,
            donor_link_id: None,
            purchase_order_number: 1,
            supplier_name_link_id: None,
            supplier_discount_percentage: None,
            oms_fields: None,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        purchase_order_empty_object_pull_record(),
        purchase_order_pull_record(),
        purchase_order_empty_string_pull_record(),
        purchase_order_null_pull_record(),
        purchase_order_no_fields_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        purchase_order_empty_object_push_record(),
        purchase_order_push_record(),
        purchase_order_empty_string_push_record(),
        purchase_order_null_push_record(),
        purchase_order_no_fields_push_record(),
    ]
}
