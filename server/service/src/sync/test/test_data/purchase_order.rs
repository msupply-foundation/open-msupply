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
        "creation_date": "2021-01-22",
        "target_months": 2.1,
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "comment": "some test comment",
        "currency_ID": "currency_a",
        "inv_sub_total": 12.1,
        "freight": 0.24,
        "cost_in_local_currency": 12.34,
        "curr_rate": "",
        "reference": "test reference",
        "lines": "",
        "requested_delivery_date": "",
        "locked": "",
        "confirm_date": "2020-07-11",
        "created_by": "some user",
        "last_edited_by": "some other user",
        "Order_total_after_discount": 12.2,
        "supplier_agent": "some agent",
        "delivery_method": "sea",
        "authorizing_officer_1": "agent",
        "authorizing_officer_2": "agent2",
        "freight_conditions": "difficult",
        "additional_instructions": "additional instructions",
        "agent_commission": 1.0,
        "document_charge": 0.5,
        "communications_charge": 0.0,
        "freight_charge": 0,
        "total_foreign_currency_expected": "",
        "total_local_currency_expected": "",
        "insurance_charge": 1.0,
        "po_sent_date": "",
        "Order_total_before_discount": "",
        "inv_discount_amount": 222.2,
        "supplier_discount_amount": 12.2,
        "quote_ID": "",
        "editedRemotely": "",
        "heading_message": "some heading message",
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
        "donor_id": "some donor",
        "user_field_2": "",
        "linked_transaction_ID": "",
        "lookBackMonths": "",
        "custom_data": "",
        "minimumExpiryDate": "",
        "oms_fields": { 
            "foreign_exchange_rate": 1.6,
            "shipping_method": "sea",
            "sent_datetime": "2025-01-15T15:16:00",
            "contract_signed_datetime": "2021-01-22T15:16:00",
            "advance_paid_datetime": "2025-01-22T15:16:00",
            "delivered_datetime": "2025-01-22T15:16:00",
            "received_at_port_date": "2025-01-22",
            "expected_delivery_date": "2025-01-22" 
        }
    }"#,
);

fn purchase_order_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_2,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_2.0.to_string(),
            store_id: "store_b".to_string(),
            user_id: Some("some user".to_string()),
            supplier_name_link_id: Some("name_store_b".to_string()),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_date: NaiveDate::from_ymd_opt(2021, 1, 22).unwrap(),
            confirmed_date: Some(NaiveDate::from_ymd_opt(2020, 7, 11).unwrap()),
            delivered_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 1, 22)
                    .unwrap()
                    .and_hms_opt(15, 16, 0)
                    .unwrap(),
            ),
            target_months: Some(2.1),
            comment: Some("some test comment".to_string()),
            supplier_discount_percentage: Some(222.2),
            supplier_discount_amount: Some(12.2),
            donor_link_id: Some("some donor".to_string()),
            reference: Some("test reference".to_string()),
            currency_id: Some("currency_a".to_string()),
            foreign_exchange_rate: Some(1.6),
            shipping_method: Some("sea".to_string()),
            sent_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 1, 15)
                    .unwrap()
                    .and_hms_opt(15, 16, 0)
                    .unwrap(),
            ),
            contract_signed_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 1, 22)
                    .unwrap()
                    .and_hms_opt(15, 16, 0)
                    .unwrap(),
            ),
            advance_paid_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 1, 22)
                    .unwrap()
                    .and_hms_opt(15, 16, 0)
                    .unwrap(),
            ),
            received_at_port_date: Some(NaiveDate::from_ymd_opt(2025, 1, 22).unwrap()),
            expected_delivery_date: Some(NaiveDate::from_ymd_opt(2025, 1, 22).unwrap()),
            supplier_agent: Some("some agent".to_string()),
            authorising_officer_1: Some("agent".to_string()),
            authorising_officer_2: Some("agent2".to_string()),
            additional_instructions: Some("additional instructions".to_string()),
            heading_message: Some("test heading message".to_string()),
            agent_commission: Some(1.0),
            document_charge: Some(0.5),
            communications_charge: None,
            insurance_charge: Some(1.0),
            freight_charge: None,
            freight_conditions: Some("difficult".to_string()),
        },
    )
}
fn purchase_order_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_2.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_2.0.to_string(),
            created_date: NaiveDate::from_ymd_opt(2021, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_date: None,
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
            heading_message: Some("test heading message".to_string()),
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
                received_at_port_date: None,
                expected_delivery_date: None,
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
        "creation_date": "2021-01-22",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "confirm_date": "0000-00-00",
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
            created_date: NaiveDate::from_ymd_opt(2021, 1, 22).unwrap(),
            confirmed_date: None,
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
            received_at_port_date: None,
            expected_delivery_date: None,
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
            created_date: NaiveDate::from_ymd_opt(2021, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_date: None,
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
            heading_message: None,
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
        "creation_date": "2020-01-22",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "confirm_date": "0000-00-00",
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
            created_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            confirmed_date: None,
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
            received_at_port_date: None,
            expected_delivery_date: None,
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
            created_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_date: None,
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
            heading_message: None,
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
        "creation_date": "2020-01-22",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "confirm_date": "0000-00-00",
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
            created_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            confirmed_date: None,
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
            received_at_port_date: None,
            expected_delivery_date: None,
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
            created_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_date: None,
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
            heading_message: None,
            oms_fields: None,
        }),
    }
}

const PURCHASE_ORDER_6: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d7ffsagda",
    r#"{
        "name_ID": "",
        "ID": "12e889c0f0d211eb8dddb54df6d7ffsagda",
        "creation_date": "2020-01-22",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "confirm_date": "0000-00-00"
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
            created_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            confirmed_date: None,
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
            received_at_port_date: None,
            expected_delivery_date: None,
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
            created_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::New,
            comment: None,
            currency_id: None,
            reference: None,
            confirmed_date: None,
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
            heading_message: None,
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
