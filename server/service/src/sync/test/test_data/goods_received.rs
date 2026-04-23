use crate::sync::test::TestSyncIncomingRecord;
use crate::sync::translations::{IntegrationOperation, PullTranslateResult};
use repository::mock::MockData;
use repository::*;

fn migration_log_for(invoice: &InvoiceRow) -> ActivityLogRow {
    ActivityLogRow {
        id: format!("{}_migrated_from_legacy", invoice.id),
        r#type: ActivityLogType::InvoiceMigratedFromLegacy,
        user_id: invoice.user_id.clone(),
        store_id: Some(invoice.store_id.clone()),
        record_id: Some(invoice.id.clone()),
        datetime: invoice.created_datetime,
        changed_to: None,
        changed_from: None,
    }
}

const TABLE_NAME: &str = "Goods_received";

// Non-finalized GR — should create a new InboundShipment invoice
const GR_NON_FINALISED: (&str, &str) = (
    "gr_non_finalised_test",
    r#"{
        "ID": "gr_non_finalised_test",
        "store_ID": "store_a",
        "purchase_order_ID": "test_purchase_order_a",
        "serial_number": 42,
        "status": "nw",
        "comment": "test comment",
        "supplier_reference": "sup ref",
        "user_id_created": "user_account_a",
        "entry_date": "2024-03-15",
        "received_date": "0000-00-00",
        "donor_id": ""
    }"#,
);

// Finalized GR — should update existing invoice with purchase_order_id
const GR_FINALISED: (&str, &str) = (
    "gr_finalised_test",
    r#"{
        "ID": "gr_finalised_test",
        "store_ID": "store_a",
        "purchase_order_ID": "test_purchase_order_a",
        "serial_number": 43,
        "status": "fn",
        "comment": "",
        "supplier_reference": "",
        "user_id_created": "",
        "entry_date": "2024-03-15",
        "received_date": "2024-03-16",
        "donor_id": ""
    }"#,
);

fn gr_non_finalised_pull_record() -> TestSyncIncomingRecord {
    let expected_invoice = InvoiceRow {
        id: "gr_non_finalised_test".to_string(),
        name_id: "name_a".to_string(),
        store_id: "store_a".to_string(),
        user_id: Some("user_account_a".to_string()),
        invoice_number: 42,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::New,
        on_hold: false,
        comment: Some("test comment".to_string()),
        their_reference: Some("sup ref".to_string()),
        created_datetime: chrono::NaiveDate::from_ymd_opt(2024, 3, 15)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        purchase_order_id: Some("test_purchase_order_a".to_string()),
        ..Default::default()
    };
    let expected_log = migration_log_for(&expected_invoice);

    TestSyncIncomingRecord {
        translated_record: PullTranslateResult::IntegrationOperations(vec![
            IntegrationOperation::upsert(expected_invoice),
            IntegrationOperation::upsert(expected_log),
        ]),
        sync_buffer_row: SyncBufferRow {
            table_name: TABLE_NAME.to_string(),
            record_id: GR_NON_FINALISED.0.to_string(),
            data: GR_NON_FINALISED.1.to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        },
        extra_data: None,
    }
}

fn gr_finalised_pull_record() -> TestSyncIncomingRecord {
    let existing_invoice = InvoiceRow {
        id: "gr_existing_si".to_string(),
        name_id: "name_a".to_string(),
        store_id: "store_a".to_string(),
        invoice_number: 99,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Verified,
        // Simulate the legacy transact.hold=true flag the invoice translator
        // would have carried over. The GR translator should clear this on
        // migrated finalised shipments (#11378).
        on_hold: true,
        created_datetime: chrono::NaiveDate::from_ymd_opt(2024, 3, 10)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        ..Default::default()
    };

    let mut expected_invoice = existing_invoice.clone();
    expected_invoice.purchase_order_id = Some("test_purchase_order_a".to_string());
    expected_invoice.on_hold = false;
    let expected_log = migration_log_for(&expected_invoice);

    let mut record = TestSyncIncomingRecord {
        translated_record: PullTranslateResult::IntegrationOperations(vec![
            IntegrationOperation::upsert(expected_invoice),
            IntegrationOperation::upsert(expected_log),
        ]),
        sync_buffer_row: SyncBufferRow {
            table_name: TABLE_NAME.to_string(),
            record_id: GR_FINALISED.0.to_string(),
            data: GR_FINALISED.1.to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        },
        extra_data: None,
    };
    record.extra_data = Some(MockData {
        invoices: vec![existing_invoice],
        // Transact sync_buffer record with goods_received_ID pointing to this GR.
        // Set integration_datetime so the invoice translator doesn't try to re-parse
        // this minimal record during the integration test.
        sync_buffer_rows: vec![SyncBufferRow {
            record_id: "gr_existing_si".to_string(),
            table_name: "transact".to_string(),
            data: r#"{"goods_received_ID": "gr_finalised_test"}"#.to_string(),
            action: SyncAction::Upsert,
            integration_datetime: Some(
                chrono::NaiveDate::from_ymd_opt(2024, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            ..Default::default()
        }],
        ..Default::default()
    });
    record
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![gr_non_finalised_pull_record(), gr_finalised_pull_record()]
}
