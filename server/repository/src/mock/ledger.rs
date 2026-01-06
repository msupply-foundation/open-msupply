use chrono::{NaiveDate, NaiveDateTime};

use crate::{
    mock::mock_name_store_b, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus,
    InvoiceType, ItemRow, StockLineRow,
};

// Mock ledger data, across 2 items, varying stock lines, invoice types and statuses
pub fn mock_ledger_data() -> (
    Vec<ItemRow>,
    Vec<StockLineRow>,
    Vec<InvoiceRow>,
    Vec<InvoiceLineRow>,
) {
    let ledger_test_item_a = ItemRow {
        id: "ledger_test_item".to_string(),
        ..Default::default()
    };
    let ledger_test_item_b = ItemRow {
        id: "ledger_test_item_b".to_string(),
        ..Default::default()
    };
    let stock_line_a = StockLineRow {
        id: "ledger_stock_line_a".to_string(),
        item_link_id: ledger_test_item_a.id.clone(),
        store_id: "store_a".to_string(),
        ..Default::default()
    };
    let stock_line_b = StockLineRow {
        id: "ledger_stock_line_b".to_string(),
        item_link_id: ledger_test_item_a.id.clone(),
        store_id: "store_a".to_string(),
        ..Default::default()
    };
    let stock_line_c_item_b = StockLineRow {
        id: "ledger_stock_line_c_item_b".to_string(),
        item_link_id: ledger_test_item_b.id.clone(),
        store_id: "store_a".to_string(),
        ..Default::default()
    };

    let default_invoice = InvoiceRow {
        store_id: "store_a".to_string(),
        name_id: mock_name_store_b().id,
        created_datetime: get_test_ledger_datetime(1),
        ..Default::default()
    };
    let default_invoice_line = InvoiceLineRow {
        item_link_id: "ledger_test_item".to_string(),
        stock_line_id: Some(stock_line_a.id.clone()),
        number_of_packs: 10.0,
        pack_size: 5.0,
        ..Default::default()
    };

    // Delivered - inbound should NOT be in the view
    let delivered_inbound = InvoiceRow {
        status: InvoiceStatus::Delivered,
        id: "delivered_inbound".to_string(),
        delivered_datetime: Some(get_test_ledger_datetime(1)),
        r#type: InvoiceType::InboundShipment,
        ..default_invoice.clone()
    };
    let delivered_inbound_line = InvoiceLineRow {
        id: "delivered_inbound_line".to_string(),
        invoice_id: "delivered_inbound".to_string(),
        ..default_invoice_line.clone()
    };

    // RECEIVED - should be in the view
    let received_inbound = InvoiceRow {
        status: InvoiceStatus::Received,
        id: "received_inbound".to_string(),
        received_datetime: Some(get_test_ledger_datetime(2)),
        r#type: InvoiceType::InboundShipment,
        ..default_invoice.clone()
    };
    let received_inbound_line = InvoiceLineRow {
        id: "received_inbound_line".to_string(),
        invoice_id: "received_inbound".to_string(),
        ..default_invoice_line.clone()
    };

    // VERIFIED - should be in the view - should still use received datetime
    let verified_inbound = InvoiceRow {
        status: InvoiceStatus::Verified,
        id: "verified_inbound".to_string(),
        received_datetime: Some(get_test_ledger_datetime(3)),
        verified_datetime: Some(get_test_ledger_datetime(4)),
        r#type: InvoiceType::InboundShipment,
        ..default_invoice.clone()
    };
    let verified_inbound_line_stock_line_b = InvoiceLineRow {
        id: "verified_inbound_line_stock_line_b".to_string(),
        invoice_id: "verified_inbound".to_string(),
        stock_line_id: Some(stock_line_b.id.clone()),
        ..default_invoice_line.clone()
    };

    // NEW - to confirm not included in the view
    let new_outbound = InvoiceRow {
        status: InvoiceStatus::New,
        id: "new_outbound".to_string(),
        r#type: InvoiceType::OutboundShipment,
        ..default_invoice.clone()
    };
    let new_outbound_line = InvoiceLineRow {
        id: "new_outbound_line".to_string(),
        invoice_id: "new_outbound".to_string(),
        r#type: InvoiceLineType::StockOut,
        ..default_invoice_line.clone()
    };

    // PICKED - outbound/prescription should be in the view
    let picked_outbound = InvoiceRow {
        status: InvoiceStatus::Picked,
        id: "picked_outbound".to_string(),
        picked_datetime: Some(get_test_ledger_datetime(4)),
        r#type: InvoiceType::OutboundShipment,
        ..default_invoice.clone()
    };
    let picked_outbound_line = InvoiceLineRow {
        id: "picked_outbound_line".to_string(),
        invoice_id: "picked_outbound".to_string(),
        r#type: InvoiceLineType::StockOut,
        ..default_invoice_line.clone()
    };
    let picked_outbound_line_stock_line_b = InvoiceLineRow {
        id: "picked_outbound_line_stock_line_b".to_string(),
        invoice_id: "picked_outbound".to_string(),
        stock_line_id: Some(stock_line_b.id.clone()),
        r#type: InvoiceLineType::StockOut,
        ..default_invoice_line.clone()
    };

    // Inventory adjustments should only be included if verified
    let non_verified_inventory_adjustment = InvoiceRow {
        status: InvoiceStatus::Received, // not valid runtime state, but checking the view
        id: "non_verified_inventory_adjustment".to_string(),
        r#type: InvoiceType::InventoryAddition,
        ..default_invoice.clone()
    };
    let non_verified_inventory_adjustment_line = InvoiceLineRow {
        id: "non_verified_inventory_adjustment_line".to_string(),
        invoice_id: "non_verified_inventory_adjustment".to_string(),
        ..default_invoice_line.clone()
    };

    let verified_inventory_adjustment = InvoiceRow {
        status: InvoiceStatus::Verified,
        id: "verified_inventory_adjustment".to_string(),
        verified_datetime: Some(get_test_ledger_datetime(5)),
        r#type: InvoiceType::InventoryAddition,
        ..default_invoice.clone()
    };
    let verified_inventory_adjustment_line = InvoiceLineRow {
        id: "verified_inventory_adjustment_line".to_string(),
        invoice_id: "verified_inventory_adjustment".to_string(),
        ..default_invoice_line.clone()
    };

    // For Item B
    let verified_inventory_adjustment_b = InvoiceRow {
        status: InvoiceStatus::Verified,
        id: "verified_inventory_adjustment_b".to_string(),
        verified_datetime: Some(get_test_ledger_datetime(6)),
        r#type: InvoiceType::InventoryAddition,
        ..default_invoice.clone()
    };
    let verified_inventory_adjustment_b_line = InvoiceLineRow {
        id: "verified_inventory_adjustment_b_line".to_string(),
        invoice_id: "verified_inventory_adjustment_b".to_string(),
        item_link_id: ledger_test_item_b.id.clone(),
        stock_line_id: Some(stock_line_c_item_b.id.clone()),
        ..default_invoice_line.clone()
    };

    (
        vec![ledger_test_item_a, ledger_test_item_b],
        vec![stock_line_a, stock_line_b, stock_line_c_item_b],
        vec![
            delivered_inbound,
            received_inbound,
            verified_inbound,
            new_outbound,
            picked_outbound,
            non_verified_inventory_adjustment,
            verified_inventory_adjustment,
            verified_inventory_adjustment_b,
        ],
        vec![
            delivered_inbound_line,
            received_inbound_line,
            verified_inbound_line_stock_line_b,
            new_outbound_line,
            picked_outbound_line,
            picked_outbound_line_stock_line_b,
            non_verified_inventory_adjustment_line,
            verified_inventory_adjustment_line,
            verified_inventory_adjustment_b_line,
        ],
    )
}

pub fn get_test_ledger_datetime(day: u32) -> NaiveDateTime {
    NaiveDate::from_ymd_opt(2025, 1, day)
        .unwrap()
        .and_hms_milli_opt(0, 0, 0, 0)
        .unwrap()
}
