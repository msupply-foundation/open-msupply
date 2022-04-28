use repository::{
    schema::{RemoteSyncBufferAction, RemoteSyncBufferRow},
    ChangelogAction, ChangelogRow, ChangelogTableName, NumberRow, NumberRowType,
};
use serde_json::json;

use crate::sync::translation_remote::{
    number::LegacyNumberRow,
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    test_data::{TestSyncPushRecord, TestSyncRecord},
    TRANSLATION_RECORD_NUMBER,
};

const NUMBER_STOCK_TAKE: (&'static str, &'static str) = (
    "0a355d80f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "0a355d80f0d211eb8dddb54df6d741bc",
      "name": "stock_take_number_for_store_store_remote_pull",
      "value": 1
    }"#,
);
fn number_stock_take_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Number(NumberRow {
                id: NUMBER_STOCK_TAKE.0.to_string(),
                value: 1,
                store_id: "store_remote_pull".to_string(),
                r#type: NumberRowType::Stocktake,
            }),
        )),
        identifier: "Stocktake",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Number_10".to_string(),
            table_name: TRANSLATION_RECORD_NUMBER.to_string(),
            record_id: NUMBER_STOCK_TAKE.0.to_string(),
            data: NUMBER_STOCK_TAKE.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn number_stock_take_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Number,
            row_id: NUMBER_STOCK_TAKE.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNumberRow {
            ID: NUMBER_STOCK_TAKE.0.to_string(),
            name: "stock_take_number_for_store_store_remote_pull".to_string(),
            value: 1,
        }),
    }
}

const NUMBER_INVENTORY_ADJUSTMENT: (&'static str, &'static str) = (
    "12e8d7e0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "12e8d7e0f0d211eb8dddb54df6d741bc",
      "name": "inventory_adjustment_serial_number_for_store_store_remote_pull",
      "value": 2
    }"#,
);
fn number_inv_adjustment_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Number(NumberRow {
                id: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
                value: 2,
                store_id: "store_remote_pull".to_string(),
                r#type: NumberRowType::InventoryAdjustment,
            }),
        )),
        identifier: "Inventory adjustment",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Number_20".to_string(),
            table_name: TRANSLATION_RECORD_NUMBER.to_string(),
            record_id: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
            data: NUMBER_INVENTORY_ADJUSTMENT.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn number_inv_adjustment_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Number,
            row_id: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNumberRow {
            ID: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
            name: "inventory_adjustment_serial_number_for_store_store_remote_pull".to_string(),
            value: 2,
        }),
    }
}

const CUSTOMER_INVOICE_ADJUSTMENT: (&'static str, &'static str) = (
    "67f303f0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "67f303f0f0d211eb8dddb54df6d741bc",
      "name": "customer_invoice_number_for_store_store_remote_pull",
      "value": 8
    }"#,
);
fn number_customer_invoice_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Number(NumberRow {
                id: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
                value: 8,
                store_id: "store_remote_pull".to_string(),
                r#type: NumberRowType::OutboundShipment,
            }),
        )),
        identifier: "Customer invoice",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Number_30".to_string(),
            table_name: TRANSLATION_RECORD_NUMBER.to_string(),
            record_id: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
            data: CUSTOMER_INVOICE_ADJUSTMENT.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn number_customer_invoice_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Number,
            row_id: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNumberRow {
            ID: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
            name: "customer_invoice_number_for_store_store_remote_pull".to_string(),
            value: 8,
        }),
    }
}

const PURCHASE_ORDER: (&'static str, &'static str) = (
    "772B973657F440089E4BFE7ADE013D28",
    r#"{
      "ID": "772B973657F440089E4BFE7ADE013D28",
      "name": "purchase_order_number_for_store_store_remote_pull",
      "value": 2
    }"#,
);
fn number_purchase_order_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: None,
        identifier: "Purchase order",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Number_50".to_string(),
            table_name: TRANSLATION_RECORD_NUMBER.to_string(),
            record_id: PURCHASE_ORDER.0.to_string(),
            data: PURCHASE_ORDER.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}

const SUPPLIER_INVOICE: (&'static str, &'static str) = (
    "F16EC3CB735B4C8B8D441EDB9186A262",
    r#"{
      "ID": "F16EC3CB735B4C8B8D441EDB9186A262",
      "name": "supplier_invoice_number_for_store_store_remote_pull",
      "value": 3
    }"#,
);
fn number_supplier_invoice_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Number(NumberRow {
                id: SUPPLIER_INVOICE.0.to_string(),
                value: 3,
                store_id: "store_remote_pull".to_string(),
                r#type: NumberRowType::InboundShipment,
            }),
        )),
        identifier: "Supplier invoice",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Number_40".to_string(),
            table_name: TRANSLATION_RECORD_NUMBER.to_string(),
            record_id: SUPPLIER_INVOICE.0.to_string(),
            data: SUPPLIER_INVOICE.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn number_supplier_invoice_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Number,
            row_id: SUPPLIER_INVOICE.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyNumberRow {
            ID: SUPPLIER_INVOICE.0.to_string(),
            name: "supplier_invoice_number_for_store_store_remote_pull".to_string(),
            value: 3,
        }),
    }
}

#[allow(dead_code)]
pub fn get_test_number_records() -> Vec<TestSyncRecord> {
    vec![
        number_stock_take_pull_record(),
        number_inv_adjustment_pull_record(),
        number_customer_invoice_pull_record(),
        number_supplier_invoice_pull_record(),
        number_purchase_order_pull_record(),
    ]
}

#[allow(dead_code)]
pub fn get_test_push_number_records() -> Vec<TestSyncPushRecord> {
    vec![
        number_stock_take_push_record(),
        number_inv_adjustment_push_record(),
        number_customer_invoice_push_record(),
        number_supplier_invoice_push_record(),
    ]
}
