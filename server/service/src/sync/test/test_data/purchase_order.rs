use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::{
        invoice::{LegacyTransactRow, LegacyTransactStatus, LegacyTransactType, TransactMode},
        purchase_order::{
            LegacyPurchaseOrderRow, LegacyPurchaseOrderStatus, PurchaseOrderOmsFields,
        },
    },
};
use chrono::{Duration, NaiveDate, NaiveDateTime, NaiveTime};
use repository::{
    InvoiceRow, InvoiceRowDelete, InvoiceStatus, InvoiceType, PurchaseOrderRow, PurchaseOrderStatus,
};
use serde_json::json;
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;

use super::TestSyncOutgoingRecord;

const TABLE_NAME: &str = "purchase_order";

const PURCHASE_ORDER_1: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d741hw",
    r#"{
        "name_ID": "",
        "ID": "12e889c0f0d211eb8dddb54df6d741hw",
        "creation_date": "2020-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "target_months": "",
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
        "agent_commission": "",
        "document_charge": "",
        "communications_charge": "",
        "insurance_charge": "",
        "freight_charge": "",
        "po_sent_date": "",
        "supplier_discount_amount": "",
        "Order_total_before_discount": "",
        "inv_discount_amount": "",
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
        "oms_fields": {}
    }"#,
);

fn purchase_order_empty_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_1,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_1.0.to_string(),
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
fn purchase_order_empty_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_1.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            id: PURCHASE_ORDER_1.0.to_string(),
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(15, 16, 0)
                .unwrap(),
            target_months: Some(1.0),
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

const PURCHASE_ORDER_2: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d741hx",
    r#"{
        "name_ID": "",
        "ID": "12e889c0f0d211eb8dddb54df6d741hx",
        "creation_date": "2020-01-22T15:16:00",
        "status": "New",
        "serial_number": 1,
        "store_ID": "store_b",
        "target_months": "",
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
        "agent_commission": "",
        "document_charge": "",
        "communications_charge": "",
        "insurance_charge": "",
        "freight_charge": "",
        "po_sent_date": "",
        "supplier_discount_amount": "",
        "Order_total_before_discount": "",
        "inv_discount_amount": "",
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
            "shipping_method": "",
            "sent_datetime": "",
            "contract_signed_datetime": "2021-01-22T15:16:00",
            "advance_paid_datetime": "",
            "delivered_datetime": "",
            "received_at_port_datetime": "",
            "expected_delivery_datetime": "",
            "heading_message": ""
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
            user_id: Some("0763E2E3053D4C478E1E6B6B03FEC207".to_string()),
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
            target_months: Some(1.0),
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
                heading_message: None,
                delivered_datetime: None,
            }),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        purchase_order_empty_pull_record(),
        purchase_order_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        purchase_order_empty_push_record(),
        purchase_order_push_record(),
    ]
}
