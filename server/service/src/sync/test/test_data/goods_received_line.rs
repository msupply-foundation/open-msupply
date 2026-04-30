use crate::sync::test::TestSyncIncomingRecord;
use repository::mock::MockData;
use repository::*;

const TABLE_NAME: &str = "Goods_received_line";

// Line for a non-finalized GR — should create an invoice line
const GR_LINE_NON_FINALISED: (&str, &str) = (
    "gr_line_test_1",
    r#"{
        "ID": "gr_line_test_1",
        "goods_received_ID": "gr_non_finalised_test",
        "item_ID": "item_a",
        "item_name": "Item A",
        "pack_received": 10.0,
        "quantity_received": 5.0,
        "cost_price": 2.5,
        "batch_received": "BATCH001",
        "expiry_date": "2025-12-31",
        "comment": "line comment",
        "location_ID": "",
        "volume_per_pack": 0.5,
        "order_line_ID": "po_line_1"
    }"#,
);

// Line for a finalized GR — should update existing invoice line with purchase_order_line_id
const GR_LINE_FINALISED: (&str, &str) = (
    "gr_line_finalised_test",
    r#"{
        "ID": "gr_line_finalised_test",
        "goods_received_ID": "gr_finalised_test",
        "item_ID": "item_a",
        "item_name": "Item A",
        "pack_received": 10.0,
        "quantity_received": 5.0,
        "cost_price": 2.5,
        "batch_received": "",
        "expiry_date": "0000-00-00",
        "comment": "",
        "location_ID": "",
        "volume_per_pack": 0.0,
        "order_line_ID": "po_line_1"
    }"#,
);

fn gr_line_non_finalised_pull_record() -> TestSyncIncomingRecord {
    let mut record = TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        GR_LINE_NON_FINALISED,
        InvoiceLineRow {
            id: "gr_line_test_1".to_string(),
            invoice_id: "gr_non_finalised_test".to_string(),
            item_link_id: "item_a".to_string(),
            item_name: "Item A".to_string(),
            item_code: "item_a_code".to_string(),
            pack_size: 10.0,
            cost_price_per_pack: 2.5,
            sell_price_per_pack: 2.5,
            total_before_tax: 12.5,
            total_after_tax: 12.5,
            r#type: InvoiceLineType::StockIn,
            number_of_packs: 5.0,
            note: Some("line comment".to_string()),
            volume_per_pack: 0.5,
            batch: Some("BATCH001".to_string()),
            expiry_date: chrono::NaiveDate::from_ymd_opt(2025, 12, 31),
            purchase_order_line_id: Some("po_line_1".to_string()),
            ..Default::default()
        },
    );
    // Need parent GR in sync_buffer (non-finalized, status "nw")
    record.extra_data = Some(MockData {
        sync_buffer_rows: vec![SyncBufferRow {
            record_id: "gr_non_finalised_test".to_string(),
            table_name: "Goods_received".to_string(),
            data: r#"{"status": "nw"}"#.to_string(),
            action: SyncAction::Upsert,
            ..Default::default()
        }],
        ..Default::default()
    });
    record
}

fn gr_line_finalised_pull_record() -> TestSyncIncomingRecord {
    let existing_invoice = InvoiceRow {
        id: "gr_existing_si".to_string(),
        name_id: "name_a".to_string(),
        store_id: "store_a".to_string(),
        invoice_number: 99,
        r#type: InvoiceType::InboundShipment,
        status: InvoiceStatus::Verified,
        created_datetime: chrono::NaiveDate::from_ymd_opt(2024, 3, 10)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        ..Default::default()
    };

    let existing_line = InvoiceLineRow {
        id: "gr_existing_line".to_string(),
        invoice_id: "gr_existing_si".to_string(),
        item_link_id: "item_a".to_string(),
        item_name: "Item A".to_string(),
        item_code: "item_a_code".to_string(),
        pack_size: 10.0,
        cost_price_per_pack: 2.5,
        sell_price_per_pack: 2.5,
        total_before_tax: 12.5,
        total_after_tax: 12.5,
        r#type: InvoiceLineType::StockIn,
        number_of_packs: 5.0,
        ..Default::default()
    };

    let mut expected_line = existing_line.clone();
    expected_line.purchase_order_line_id = Some("po_line_1".to_string());

    let mut record =
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, GR_LINE_FINALISED, expected_line);
    record.extra_data = Some(MockData {
        invoices: vec![existing_invoice],
        invoice_lines: vec![existing_line],
        sync_buffer_rows: vec![
            // Parent GR in sync_buffer (finalized, status "fn")
            SyncBufferRow {
                record_id: "gr_finalised_test".to_string(),
                table_name: "Goods_received".to_string(),
                data: r#"{"status": "fn"}"#.to_string(),
                action: SyncAction::Upsert,
                ..Default::default()
            },
            // trans_line sync_buffer record linking the existing invoice line to the GR line
            SyncBufferRow {
                record_id: "gr_existing_line".to_string(),
                table_name: "trans_line".to_string(),
                data: r#"{"goods_received_lines_ID": "gr_line_finalised_test"}"#.to_string(),
                action: SyncAction::Upsert,
                integration_datetime: Some(
                    chrono::NaiveDate::from_ymd_opt(2024, 1, 1)
                        .unwrap()
                        .and_hms_opt(0, 0, 0)
                        .unwrap(),
                ),
                ..Default::default()
            },
        ],
        ..Default::default()
    });
    record
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        gr_line_non_finalised_pull_record(),
        gr_line_finalised_pull_record(),
    ]
}
