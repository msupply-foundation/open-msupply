use repository::{
    ChangelogAction, ChangelogRow, ChangelogTableName, NumberRow, NumberRowType, SyncBufferRow,
};
use serde_json::json;
use util::inline_init;

use crate::sync::{
    test::{TestSyncPullRecord, TestSyncPushRecord},
    translations::{number::LegacyNumberRow, LegacyTableName, PullUpsertRecord},
};

// store_remote_pull is a dummy store added in test_remote_pull.rs
const NUMBER_STOCK_TAKE: (&'static str, &'static str) = (
    "0a355d80f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "0a355d80f0d211eb8dddb54df6d741bc",
      "name": "stock_take_number_for_store_store_remote_pull",
      "value": 1,
      "store_ID": "store_remote_pull"
    }
    "#,
);
fn number_stock_take_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NUMBER,
        NUMBER_STOCK_TAKE,
        PullUpsertRecord::Number(NumberRow {
            id: NUMBER_STOCK_TAKE.0.to_string(),
            value: 1,
            store_id: "store_remote_pull".to_string(),
            r#type: NumberRowType::Stocktake.to_string(),
        }),
    )
}
fn number_stock_take_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Number;
            r.record_id = NUMBER_STOCK_TAKE.0.to_string();
            r.row_action = ChangelogAction::Upsert;
        }),
        push_data: json!(LegacyNumberRow {
            ID: NUMBER_STOCK_TAKE.0.to_string(),
            name: "stock_take_number_for_store_store_remote_pull".to_string(),
            value: 1,
            store_id: "store_remote_pull".to_string()
        }),
    }
}

const NUMBER_INVENTORY_ADJUSTMENT: (&'static str, &'static str) = (
    "12e8d7e0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "12e8d7e0f0d211eb8dddb54df6d741bc",
      "name": "inventory_adjustment_serial_number_for_store_store_remote_pull",
      "value": 2,
      "store_ID": "store_remote_pull"
    }"#,
);
fn number_inv_adjustment_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NUMBER,
        NUMBER_INVENTORY_ADJUSTMENT,
        PullUpsertRecord::Number(NumberRow {
            id: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
            value: 2,
            store_id: "store_remote_pull".to_string(),
            r#type: NumberRowType::InventoryAdjustment.to_string(),
        }),
    )
}
fn number_inv_adjustment_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Number;
            r.record_id = NUMBER_INVENTORY_ADJUSTMENT.0.to_string();
            r.row_action = ChangelogAction::Upsert;
        }),
        push_data: json!(LegacyNumberRow {
            ID: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
            name: "inventory_adjustment_serial_number_for_store_store_remote_pull".to_string(),
            value: 2,
            store_id: "store_remote_pull".to_string()
        }),
    }
}

const CUSTOMER_INVOICE_ADJUSTMENT: (&'static str, &'static str) = (
    "67f303f0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "67f303f0f0d211eb8dddb54df6d741bc",
      "name": "customer_invoice_number_for_store_store_remote_pull",
      "value": 8,
      "store_ID": "store_remote_pull"
    }"#,
);
fn number_customer_invoice_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NUMBER,
        CUSTOMER_INVOICE_ADJUSTMENT,
        PullUpsertRecord::Number(NumberRow {
            id: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
            value: 8,
            store_id: "store_remote_pull".to_string(),
            r#type: NumberRowType::OutboundShipment.to_string(),
        }),
    )
}
fn number_customer_invoice_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Number;
            r.record_id = CUSTOMER_INVOICE_ADJUSTMENT.0.to_string();
            r.row_action = ChangelogAction::Upsert;
        }),
        push_data: json!(LegacyNumberRow {
            ID: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
            name: "customer_invoice_number_for_store_store_remote_pull".to_string(),
            value: 8,
            store_id: "store_remote_pull".to_string()
        }),
    }
}

const PURCHASE_ORDER: (&'static str, &'static str) = (
    "772B973657F440089E4BFE7ADE013D28",
    r#"{
      "ID": "772B973657F440089E4BFE7ADE013D28",
      "name": "purchase_order_number_for_store_store_remote_pull",
      "value": 2,
      "store_ID": "store_remote_pull"
    }"#,
);

fn number_purchase_order_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord {
        // None on translation record means this record is ignored (don't want to integrate purchase order numbers yet)
        translated_record: None,
        sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = LegacyTableName::NUMBER.to_string();
            r.record_id = PURCHASE_ORDER.0.to_string();
            r.data = PURCHASE_ORDER.1.to_string();
        }),
        extra_data: None,
    }
}

const SUPPLIER_INVOICE: (&'static str, &'static str) = (
    "F16EC3CB735B4C8B8D441EDB9186A262",
    r#"{
      "ID": "F16EC3CB735B4C8B8D441EDB9186A262",
      "name": "supplier_invoice_number_for_store_store_remote_pull",
      "value": 3,
      "store_ID": "store_remote_pull"
    }"#,
);
fn number_supplier_invoice_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::NUMBER,
        SUPPLIER_INVOICE,
        PullUpsertRecord::Number(NumberRow {
            id: SUPPLIER_INVOICE.0.to_string(),
            value: 3,
            store_id: "store_remote_pull".to_string(),
            r#type: NumberRowType::InboundShipment.to_string(),
        }),
    )
}
fn number_supplier_invoice_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: inline_init(|r: &mut ChangelogRow| {
            r.cursor = 2;
            r.table_name = ChangelogTableName::Number;
            r.record_id = SUPPLIER_INVOICE.0.to_string();
            r.row_action = ChangelogAction::Upsert;
        }),
        push_data: json!(LegacyNumberRow {
            ID: SUPPLIER_INVOICE.0.to_string(),
            name: "supplier_invoice_number_for_store_store_remote_pull".to_string(),
            value: 3,
            store_id: "store_remote_pull".to_string()
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        number_stock_take_pull_record(),
        number_inv_adjustment_pull_record(),
        number_customer_invoice_pull_record(),
        number_supplier_invoice_pull_record(),
        number_purchase_order_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        number_stock_take_push_record(),
        number_inv_adjustment_push_record(),
        number_customer_invoice_push_record(),
        number_supplier_invoice_push_record(),
    ]
}
