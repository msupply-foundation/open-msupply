use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::purchase_order::{
        LegacyPurchaseOrderRow, LegacyPurchaseOrderStatus, PurchaseOrderOmsFields,
    },
};
use chrono::NaiveDate;
use repository::{PurchaseOrderDelete, PurchaseOrderRow, PurchaseOrderStatus};
use serde_json::json;

use super::TestSyncOutgoingRecord;

const TABLE_NAME: &str = "purchase_order";

// populated object case
const PURCHASE_ORDER_1: (&str, &str) = (
    "sync_test_purchase_order_1",
    r#"{
        "name_ID": "name_store_b",
        "ID": "sync_test_purchase_order_1",
        "creation_date": "2021-01-22",
        "target_months": 2.1,
        "status": "fn",
        "serial_number": 1,
        "store_ID": "store_b",
        "comment": "some test comment",
        "currency_ID": "currency_a",
        "inv_sub_total": 12.1,
        "freight": 0.24,
        "cost_in_local_currency": 12.34,
        "reference": "test reference",
        "lines": "",
        "requested_delivery_date": "2021-08-15",
        "locked": "",
        "confirm_date": "2021-07-11",
        "created_by": "some user",
        "last_edited_by": "some other user",
        "Order_total_after_discount": 180.0,
        "supplier_agent": "some agent",
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
        "Order_total_before_discount": 200.0,
        "inv_discount_amount": 222.2,
        "supplier_discount_amount": 20.0,
        "quote_ID": "",
        "editedRemotely": "",
        "heading_message": "some heading message",
        "budget_period_ID": "",
        "category_ID": "",
        "include_in_on_order_calcs": "",
        "colour": "",
        "user_field_1": "",
        "is_authorised": true,
        "auth_checksum": "",
        "donor_id": "donor_a",
        "user_field_2": "",
        "linked_transaction_ID": "",
        "lookBackMonths": "",
        "custom_data": "",
        "minimumExpiryDate": "",
        "Date_contract_signed": "2021-01-22",
        "Date_advance_payment": "2025-01-22",
        "po_sent_date": "2025-01-15",
        "Date_goods_received_at_port": "2025-01-22",
        "delivery_method": "sea",
        "curr_rate": 1.6,
        "oms_fields": { 
            "created_datetime": "2021-01-22T00:00:00",
            "confirmed_datetime": "2021-07-11T01:02:03",
            "sent_datetime": "2025-01-15T01:02:03",
            "supplier_discount_percentage": 10.0, 
            "request_approval_datetime": "2025-01-22T00:00:00",
            "finalised_datetime": "2025-01-22T00:00:00",
            "status": "FINALISED"
        }
    }"#,
);

fn purchase_order_1_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_1,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_1.0.to_string(),
            store_id: "store_b".to_string(),
            created_by: Some("some user".to_string()),
            supplier_name_id: "name_store_b".to_string(),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::Finalised,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            confirmed_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 7, 11)
                    .unwrap()
                    .and_hms_opt(1, 2, 3)
                    .unwrap(),
            ),
            target_months: Some(2.1),
            comment: Some("some test comment".to_string()),
            donor_id: Some("donor_a".to_string()),
            reference: Some("test reference".to_string()),
            currency_id: Some("currency_a".to_string()),
            foreign_exchange_rate: 1.6,
            shipping_method: Some("sea".to_string()),
            sent_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 1, 15)
                    .unwrap()
                    .and_hms_opt(1, 2, 3)
                    .unwrap(),
            ),
            contract_signed_date: Some(NaiveDate::from_ymd_opt(2021, 1, 22).unwrap()),
            advance_paid_date: Some(NaiveDate::from_ymd_opt(2025, 1, 22).unwrap()),
            received_at_port_date: Some(NaiveDate::from_ymd_opt(2025, 1, 22).unwrap()),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 8, 15).unwrap()),
            supplier_agent: Some("some agent".to_string()),
            authorising_officer_1: Some("agent".to_string()),
            authorising_officer_2: Some("agent2".to_string()),
            additional_instructions: Some("additional instructions".to_string()),
            heading_message: Some("some heading message".to_string()),
            agent_commission: Some(1.0),
            document_charge: Some(0.5),
            communications_charge: None,
            insurance_charge: Some(1.0),
            freight_charge: None,
            freight_conditions: Some("difficult".to_string()),
            supplier_discount_percentage: Some(10.0),
            request_approval_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            finalised_datetime: Some(
                NaiveDate::from_ymd_opt(2025, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
        },
    )
}
fn purchase_order_1_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_1.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            name_id: "name_store_b".to_string(),
            id: PURCHASE_ORDER_1.0.to_string(),
            creation_date: NaiveDate::from_ymd_opt(2021, 1, 22).unwrap(),
            target_months: Some(2.1),
            status: LegacyPurchaseOrderStatus::Fn,
            comment: Some("some test comment".to_string()),
            currency_id: Some("currency_a".to_string()),
            reference: Some("test reference".to_string()),
            confirm_date: Some(NaiveDate::from_ymd_opt(2021, 7, 11).unwrap()),
            created_by: Some("some user".to_string()),
            store_id: "store_b".to_string(),
            supplier_agent: Some("some agent".to_string()),
            authorising_officer_1: Some("agent".to_string()),
            authorising_officer_2: Some("agent2".to_string()),
            freight_conditions: Some("difficult".to_string()),
            additional_instructions: Some("additional instructions".to_string()),
            agent_commission: Some(1.0),
            document_charge: Some(0.5),
            communications_charge: None,
            insurance_charge: Some(1.0),
            freight_charge: None,
            supplier_discount_amount: 20.0,
            order_total_before_discount: 200.0,
            order_total_after_discount: 180.0,
            donor_id: Some("donor_a".to_string()),
            purchase_order_number: 1,
            heading_message: Some("some heading message".to_string()),
            delivery_method: Some("sea".to_string()),
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 8, 15).unwrap()),
            sent_date: Some(NaiveDate::from_ymd_opt(2025, 1, 15).unwrap()),
            contract_signed_date: Some(NaiveDate::from_ymd_opt(2021, 1, 22).unwrap()),
            advance_paid_date: Some(NaiveDate::from_ymd_opt(2025, 1, 22).unwrap()),
            received_at_port_date: Some(NaiveDate::from_ymd_opt(2025, 1, 22).unwrap()),
            curr_rate: Some(1.6),
            is_authorised: true,
            oms_fields: Some(PurchaseOrderOmsFields {
                created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                confirmed_datetime: Some(
                    NaiveDate::from_ymd_opt(2021, 7, 11)
                        .unwrap()
                        .and_hms_opt(1, 2, 3)
                        .unwrap()
                ),
                sent_datetime: Some(
                    NaiveDate::from_ymd_opt(2025, 1, 15)
                        .unwrap()
                        .and_hms_opt(1, 2, 3)
                        .unwrap(),
                ),
                supplier_discount_percentage: Some(10.0),
                request_approval_datetime: Some(
                    NaiveDate::from_ymd_opt(2025, 1, 22)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                ),
                finalised_datetime: Some(
                    NaiveDate::from_ymd_opt(2025, 1, 22)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap()
                ),
                status: PurchaseOrderStatus::Finalised,
            }),
        }),
    }
}

// Legacy migration record
const PURCHASE_ORDER_2: (&str, &str) = (
    "FA9FFB5F474E4EE998ADA2632E41E6BF",
    r#"{
    "Date_advance_payment": "0000-00-00",
    "Date_contract_signed": "0000-00-00",
    "Date_goods_received_at_port": "0000-00-00",
    "ID": "FA9FFB5F474E4EE998ADA2632E41E6BF",
    "Order_total_after_discount": 0,
    "Order_total_before_discount": 0,
    "additional_instructions": "",
    "agent_commission": 0,
    "auth_checksum": "",
    "authorizing_officer_1": "",
    "authorizing_officer_2": "",
    "budget_period_ID": "",
    "category_ID": "",
    "colour": 0,
    "comment": "",
    "communications_charge": 0,
    "confirm_date": "2021-03-15",
    "cost_in_local_currency": 0,
    "created_by": "user_account_a",
    "creation_date": "2021-03-15",
    "curr_rate": 1,
    "currency_ID": "currency_a",
    "custom_data": null,
    "delivery_method": "",
    "document_charge": 0,
    "donor_id": "",
    "editedRemotely": false,
    "freight": 0,
    "freight_charge": 0,
    "freight_conditions": "",
    "heading_message": "",
    "include_in_on_order_calcs": false,
    "insurance_charge": 0,
    "inv_discount_amount": 0,
    "inv_sub_total": 0,
    "is_authorised": false,
    "last_edited_by": "user_account_a",
    "lines": 3,
    "linked_transaction_ID": "",
    "locked": false,
    "lookBackMonths": 0,
    "minimumExpiryDate": "0000-00-00",
    "name_ID": "donor_a",
    "po_sent_date": "2021-03-15",
    "quote_ID": "",
    "reference": "",
    "requested_delivery_date": "2021-03-15",
    "serial_number": 1,
    "status": "cn",
    "store_ID": "store_a",
    "supplier_agent": "",
    "supplier_discount_amount": 0,
    "target_months": 0,
    "total_foreign_currency_expected": 0,
    "total_local_currency_expected": 0,
    "user_field_1": "",
    "user_field_2": ""
}"#,
);

fn purchase_order_2_migration_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_2,
        PurchaseOrderRow {
            id: "FA9FFB5F474E4EE998ADA2632E41E6BF".to_string(),
            store_id: "store_a".to_string(),
            created_by: Some("user_account_a".to_string()),
            supplier_name_id: "donor_a".to_string(),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::Sent,
            created_datetime: NaiveDate::from_ymd_opt(2021, 3, 15)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            confirmed_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 3, 15)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            target_months: Some(0.0),
            comment: None,
            donor_id: None,
            reference: None,
            currency_id: Some("currency_a".to_string()),
            foreign_exchange_rate: 1.0,
            shipping_method: None,
            sent_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 3, 15)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 3, 15).unwrap()),
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
            supplier_discount_percentage: None,
            request_approval_datetime: None,
            finalised_datetime: None,
        },
    )
}

fn purchase_order_2_migration_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: "FA9FFB5F474E4EE998ADA2632E41E6BF".to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            name_id: "donor_a".to_string(),
            id: "FA9FFB5F474E4EE998ADA2632E41E6BF".to_string(),
            creation_date: NaiveDate::from_ymd_opt(2021, 3, 15).unwrap(),
            target_months: Some(0.0),
            status: LegacyPurchaseOrderStatus::Cn,
            comment: None,
            currency_id: Some("currency_a".to_string()),
            reference: None,
            confirm_date: Some(NaiveDate::from_ymd_opt(2021, 3, 15).unwrap()),
            created_by: Some("user_account_a".to_string()),
            store_id: "store_a".to_string(),
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
            supplier_discount_amount: 0.0,
            curr_rate: Some(1.0),
            order_total_before_discount: 0.0,
            order_total_after_discount: 0.0,
            donor_id: None,
            purchase_order_number: 1,
            heading_message: None,
            delivery_method: None,
            requested_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 3, 15).unwrap()),
            sent_date: Some(NaiveDate::from_ymd_opt(2021, 3, 15).unwrap()),
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            is_authorised: true,
            oms_fields: Some(PurchaseOrderOmsFields {
                created_datetime: NaiveDate::from_ymd_opt(2021, 3, 15)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                confirmed_datetime: Some(
                    NaiveDate::from_ymd_opt(2021, 3, 15)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                ),
                sent_datetime: Some(
                    NaiveDate::from_ymd_opt(2021, 3, 15)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                ),
                status: PurchaseOrderStatus::Sent,
                ..Default::default()
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
        "status": "nw",
        "serial_number": 1,
        "store_ID": "store_b",
        "confirm_date": "0000-00-00",
        "curr_rate": 1.0,
        "Date_contract_signed": "0000-00-00",
        "Date_advance_payment": "0000-00-00",
        "po_sent_date": "0000-00-00",
        "Date_goods_received_at_port": "0000-00-00",
        "oms_fields": ""
    }"#,
);

fn purchase_order_3_empty_string_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_3,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_3.0.to_string(),
            store_id: "store_b".to_string(),
            created_by: None,
            supplier_name_id: "name_store_b".to_string(),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            confirmed_datetime: None,
            target_months: None,
            comment: None,
            donor_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: 1.0,
            shipping_method: None,
            sent_datetime: None,
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            requested_delivery_date: None,
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
            supplier_discount_percentage: None,
            request_approval_datetime: None,
            finalised_datetime: None,
        },
    )
}
fn purchase_order_3_empty_string_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_3.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            name_id: "name_store_b".to_string(),
            id: PURCHASE_ORDER_3.0.to_string(),
            creation_date: NaiveDate::from_ymd_opt(2021, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::Nw,
            comment: None,
            currency_id: None,
            reference: None,
            confirm_date: None,
            created_by: None,
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
            supplier_discount_amount: 0.0,
            curr_rate: Some(1.0),
            order_total_before_discount: 0.0,
            order_total_after_discount: 0.0,
            donor_id: None,
            purchase_order_number: 1,
            heading_message: None,
            delivery_method: None,
            requested_delivery_date: None,
            sent_date: None,
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            is_authorised: false,
            oms_fields: Some(PurchaseOrderOmsFields {
                created_datetime: NaiveDate::from_ymd_opt(2021, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                confirmed_datetime: None,
                sent_datetime: None,
                ..Default::default()
            })
        }),
    }
}

// empty object case
const PURCHASE_ORDER_4: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d741hw",
    r#"{
        "name_ID": "name_store_b",
        "ID": "12e889c0f0d211eb8dddb54df6d741hw",
        "creation_date": "2020-01-22",
        "status": "nw",
        "serial_number": 1,
        "store_ID": "store_b",
        "confirm_date": "0000-00-00",
        "curr_rate": 1.0,
        "received_at_port_date": "0000-00-00",
        "Date_contract_signed": "0000-00-00",
        "Date_advance_payment": "0000-00-00",
        "po_sent_date": "0000-00-00",
        "Date_goods_received_at_port": "0000-00-00",
        "oms_fields": {}
    }"#,
);

fn purchase_order_4_empty_object_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_4,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_4.0.to_string(),
            store_id: "store_b".to_string(),
            created_by: None,
            supplier_name_id: "name_store_b".to_string(),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            confirmed_datetime: None,
            target_months: None,
            comment: None,
            donor_id: None,
            reference: None,
            currency_id: None,
            foreign_exchange_rate: 1.0,
            shipping_method: None,
            sent_datetime: None,
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            requested_delivery_date: None,
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
            ..Default::default()
        },
    )
}

fn purchase_order_4_empty_object_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_4.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            name_id: "name_store_b".to_string(),
            id: PURCHASE_ORDER_4.0.to_string(),
            creation_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::Nw,
            comment: None,
            currency_id: None,
            reference: None,
            confirm_date: None,
            created_by: None,
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
            supplier_discount_amount: 0.0,
            curr_rate: Some(1.0),
            order_total_before_discount: 0.0,
            order_total_after_discount: 0.0,
            donor_id: None,
            purchase_order_number: 1,
            heading_message: None,
            delivery_method: None,
            requested_delivery_date: None,
            sent_date: None,
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            is_authorised: false,
            oms_fields: Some(PurchaseOrderOmsFields {
                created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                ..Default::default()
            })
        }),
    }
}

// null field
const PURCHASE_ORDER_5: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d7fsadsa",
    r#"{
        "name_ID": "name_store_b",
        "ID": "12e889c0f0d211eb8dddb54df6d7fsadsa",
        "creation_date": "2020-01-22",
        "status": "nw",
        "serial_number": 1,
        "store_ID": "store_b",
        "curr_rate": 1.0,
        "confirm_date": "0000-00-00",
        "received_at_port_date": "0000-00-00",
        "Date_contract_signed": "0000-00-00",
        "Date_advance_payment": "0000-00-00",
        "po_sent_date": "0000-00-00",
        "Date_goods_received_at_port": "0000-00-00",
        "oms_fields": null
    }"#,
);

fn purchase_order_5_null_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_5,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_5.0.to_string(),
            store_id: "store_b".to_string(),
            created_by: None,
            supplier_name_id: "name_store_b".to_string(),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            foreign_exchange_rate: 1.0,
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            ..Default::default()
        },
    )
}

fn purchase_order_5_null_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_5.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            name_id: "name_store_b".to_string(),
            id: PURCHASE_ORDER_5.0.to_string(),
            creation_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::Nw,
            comment: None,
            currency_id: None,
            reference: None,
            confirm_date: None,
            created_by: None,
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
            supplier_discount_amount: 0.0,
            curr_rate: Some(1.0),
            order_total_before_discount: 0.0,
            order_total_after_discount: 0.0,
            donor_id: None,
            purchase_order_number: 1,
            heading_message: None,
            delivery_method: None,
            requested_delivery_date: None,
            sent_date: None,
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            is_authorised: false,
            oms_fields: Some(PurchaseOrderOmsFields {
                created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                ..Default::default()
            })
        }),
    }
}

const PURCHASE_ORDER_6: (&str, &str) = (
    "12e889c0f0d211eb8dddb54df6d7ffsagda",
    r#"{
        "name_ID": "name_store_b",
        "ID": "12e889c0f0d211eb8dddb54df6d7ffsagda",
        "creation_date": "2020-01-22",
        "status": "nw",
        "serial_number": 1,
        "store_ID": "store_b",
        "curr_rate": 1.0,
        "confirm_date": "0000-00-00",
        "received_at_port_date": "0000-00-00",
        "Date_contract_signed": "0000-00-00",
        "Date_advance_payment": "0000-00-00",
        "po_sent_date": "0000-00-00",
        "Date_goods_received_at_port": "0000-00-00"
    }"#,
);

fn purchase_order_6_no_fields_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PURCHASE_ORDER_6,
        PurchaseOrderRow {
            id: PURCHASE_ORDER_6.0.to_string(),
            store_id: "store_b".to_string(),
            created_by: None,
            supplier_name_id: "name_store_b".to_string(),
            purchase_order_number: 1,
            status: PurchaseOrderStatus::New,
            foreign_exchange_rate: 1.0,
            created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            ..Default::default()
        },
    )
}
fn purchase_order_6_no_fields_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PURCHASE_ORDER_6.0.to_string(),
        push_data: json!(LegacyPurchaseOrderRow {
            name_id: "name_store_b".to_string(),
            id: PURCHASE_ORDER_6.0.to_string(),
            creation_date: NaiveDate::from_ymd_opt(2020, 1, 22).unwrap(),
            target_months: None,
            status: LegacyPurchaseOrderStatus::Nw,
            comment: None,
            currency_id: None,
            reference: None,
            confirm_date: None,
            created_by: None,
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
            supplier_discount_amount: 0.0,
            curr_rate: Some(1.0),
            order_total_before_discount: 0.0,
            order_total_after_discount: 0.0,
            donor_id: None,
            purchase_order_number: 1,
            heading_message: None,
            delivery_method: None,
            requested_delivery_date: None,
            sent_date: None,
            contract_signed_date: None,
            advance_paid_date: None,
            received_at_port_date: None,
            is_authorised: false,
            oms_fields: Some(PurchaseOrderOmsFields {
                created_datetime: NaiveDate::from_ymd_opt(2020, 1, 22)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                ..Default::default()
            })
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        purchase_order_1_pull_record(),
        purchase_order_2_migration_pull_record(),
        purchase_order_4_empty_object_pull_record(),
        purchase_order_3_empty_string_pull_record(),
        purchase_order_5_null_pull_record(),
        purchase_order_6_no_fields_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        purchase_order_1_push_record(),
        purchase_order_2_migration_push_record(),
        purchase_order_3_empty_string_push_record(),
        purchase_order_4_empty_object_push_record(),
        purchase_order_5_null_push_record(),
        purchase_order_6_no_fields_push_record(),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        PURCHASE_ORDER_5.0,
        PurchaseOrderDelete(PURCHASE_ORDER_5.0.to_string()),
    )]
}
