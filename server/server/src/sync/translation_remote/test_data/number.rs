use repository::schema::{NumberRow, NumberRowType, RemoteSyncBufferAction, RemoteSyncBufferRow};

use crate::sync::translation_remote::test_data::{TestSyncDataRecord, TestSyncRecord};

const NUMBER_STOCK_TAKE: (&'static str, &'static str) = (
    "0a355d80f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "0a355d80f0d211eb8dddb54df6d741bc",
      "name": "stock_take_number_for_store_370759B91F9F46088885F679E14DFF76",
      "value": 1
    }"#,
);

const NUMBER_INVENTORY_ADJUSTMENT: (&'static str, &'static str) = (
    "12e8d7e0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "12e8d7e0f0d211eb8dddb54df6d741bc",
      "name": "inventory_adjustment_serial_number_for_store_370759B91F9F46088885F679E14DFF76",
      "value": 2
    }"#,
);

const CUSTOMER_INVOICE_ADJUSTMENT: (&'static str, &'static str) = (
    "67f303f0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "67f303f0f0d211eb8dddb54df6d741bc",
      "name": "customer_invoice_number_for_store_370759B91F9F46088885F679E14DFF76",
      "value": 8
    }"#,
);

const PURCHASE_ORDER: (&'static str, &'static str) = (
    "772B973657F440089E4BFE7ADE013D28",
    r#"{
      "ID": "772B973657F440089E4BFE7ADE013D28",
      "name": "purchase_order_number_for_store_370759B91F9F46088885F679E14DFF76",
      "value": 2
    }"#,
);

const SUPPLIER_INVOICE: (&'static str, &'static str) = (
    "F16EC3CB735B4C8B8D441EDB9186A262",
    r#"{
      "ID": "F16EC3CB735B4C8B8D441EDB9186A262",
      "name": "supplier_invoice_number_for_store_370759B91F9F46088885F679E14DFF76",
      "value": 3
    }"#,
);

#[allow(dead_code)]
const RECORD_TYPE: &'static str = "number";
#[allow(dead_code)]
pub fn get_test_number_records() -> Vec<TestSyncRecord> {
    vec![
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Number(Some(NumberRow {
                id: NUMBER_STOCK_TAKE.0.to_string(),
                value: 1,
                store_id: "370759B91F9F46088885F679E14DFF76".to_string(),
                r#type: NumberRowType::Stocktake,
            })),
            identifier: "Stocktake",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "10".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: NUMBER_STOCK_TAKE.0.to_string(),
                data: NUMBER_STOCK_TAKE.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Number(Some(NumberRow {
                id: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
                value: 2,
                store_id: "370759B91F9F46088885F679E14DFF76".to_string(),
                r#type: NumberRowType::InventoryAdjustment,
            })),
            identifier: "Inventory adjustment",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "10".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: NUMBER_INVENTORY_ADJUSTMENT.0.to_string(),
                data: NUMBER_INVENTORY_ADJUSTMENT.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Number(Some(NumberRow {
                id: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
                value: 8,
                store_id: "370759B91F9F46088885F679E14DFF76".to_string(),
                r#type: NumberRowType::OutboundShipment,
            })),
            identifier: "Customer invoice",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "10".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: CUSTOMER_INVOICE_ADJUSTMENT.0.to_string(),
                data: CUSTOMER_INVOICE_ADJUSTMENT.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Number(Some(NumberRow {
                id: SUPPLIER_INVOICE.0.to_string(),
                value: 3,
                store_id: "370759B91F9F46088885F679E14DFF76".to_string(),
                r#type: NumberRowType::InboundShipment,
            })),
            identifier: "Supplier invoice",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "10".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: SUPPLIER_INVOICE.0.to_string(),
                data: SUPPLIER_INVOICE.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
        TestSyncRecord {
            translated_record: TestSyncDataRecord::Number(None),
            identifier: "Purchase order",
            remote_sync_buffer_row: RemoteSyncBufferRow {
                id: "10".to_string(),
                table_name: RECORD_TYPE.to_string(),
                record_id: PURCHASE_ORDER.0.to_string(),
                data: PURCHASE_ORDER.1.to_string(),
                action: RemoteSyncBufferAction::Update,
            },
        },
    ]
}
