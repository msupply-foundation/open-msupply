use chrono::NaiveDate;
use util::inline_init;

use crate::schema::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType,
};

use super::{
    common::{FullMockInvoice, FullMockInvoiceLine, FullMockRequisition},
    mock_item_a, mock_item_b, mock_name_store_b, mock_stock_line_a, mock_store_a, MockData,
};

pub fn mock_test_sync_processor() -> MockData {
    let mut result = MockData::default();
    result
        .requisitions
        .push(mock_request_requisition_for_invoice_sync_processor());
    result
        .requisitions
        .push(mock_response_requisition_for_invoice_sync_processor());
    result
        .full_requisitions
        .push(mock_sent_requistion_sync_processor());

    result.full_invoices = vec![(
        "mock_picked_invoice_sync_processor".to_owned(),
        mock_picked_invoice_sync_processor(),
    )]
    .into_iter()
    .collect();

    result
}

pub fn mock_sent_requistion_sync_processor() -> FullMockRequisition {
    let requisition_id = "mock_sent_requistion_sync_processor".to_owned();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);

    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Sent,
            created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
            sent_datetime: Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0)),
            finalised_datetime: None,
            colour: None,
            comment: None,
            their_reference: Some("some reference".to_string()),
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            linked_requisition_id: None,
        },
        lines: vec![
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line1_id;
                r.requisition_id = requisition_id.clone();
                r.item_id = mock_item_a().id;
                r.requested_quantity = 2;
                r.suggested_quantity = 3;
                r.supply_quantity = 0;
                r.available_stock_on_hand = 1;
                r.average_monthly_consumption = 1;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line2_id;
                r.requisition_id = requisition_id.clone();
                r.item_id = mock_item_b().id;
                r.requested_quantity = 5;
                r.suggested_quantity = 6;
                r.supply_quantity = 0;
                r.available_stock_on_hand = 1;
                r.average_monthly_consumption = 0;
            }),
        ],
    }
}

pub fn mock_request_requisition_for_invoice_sync_processor() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_requisition_for_invoice_sync_processor".to_string(),
        requisition_number: 3,
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Sent,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0)),
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: Some("some reference".to_string()),
        max_months_of_stock: 10.0,
        min_months_of_stock: 5.0,
        linked_requisition_id: None,
    }
}

pub fn mock_response_requisition_for_invoice_sync_processor() -> RequisitionRow {
    RequisitionRow {
        id: "mock_request_requisition_for_invoice_sync_processor".to_string(),
        requisition_number: 3,
        name_id: mock_name_store_b().id,
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Sent,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0)),
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: Some("some reference".to_string()),
        max_months_of_stock: 10.0,
        min_months_of_stock: 5.0,
        linked_requisition_id: Some(mock_request_requisition_for_invoice_sync_processor().id),
    }
}

pub fn mock_picked_invoice_sync_processor() -> FullMockInvoice {
    let invoice_id = "mock_picked_invoice_sync_processor".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_store_b().id,
            store_id: mock_store_a().id,
            invoice_number: 20,
            requisition_id: Some(mock_response_requisition_for_invoice_sync_processor().id),
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::Picked,
            on_hold: false,
            name_store_id: None,
            comment: None,
            their_reference: Some("some reference".to_string()),
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            shipped_datetime: None,
            colour: None,
            linked_invoice_id: None,
            picked_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    invoice_id: invoice_id.clone(),
                    r#type: InvoiceLineRowType::StockOut,
                    pack_size: 2,
                    number_of_packs: 2,
                    item_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    item_code: mock_item_a().code,
                    cost_price_per_pack: 20.0,
                    sell_price_per_pack: 10.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    batch: Some("batch".to_string()),
                    expiry_date: Some(NaiveDate::from_ymd(2021, 1, 1)),
                    note: None,
                    location_id: None,
                    stock_line_id: None,
                },
                stock_line: mock_stock_line_a(),
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    invoice_id: invoice_id.clone(),
                    r#type: InvoiceLineRowType::UnallocatedStock,
                    pack_size: 1,
                    number_of_packs: 2,
                    item_id: mock_item_b().id,
                    item_name: mock_item_b().name,
                    item_code: mock_item_b().code,
                    cost_price_per_pack: 300.0,
                    sell_price_per_pack: 100.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax: Some(0.0),
                    batch: None,
                    expiry_date: None,
                    note: None,
                    location_id: None,
                    stock_line_id: None,
                },
                stock_line: mock_stock_line_a(),
            },
        ],
    }
}
