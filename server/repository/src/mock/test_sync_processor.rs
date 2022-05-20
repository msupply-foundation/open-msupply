use chrono::NaiveDate;
use util::inline_init;

use crate::{
    requisition_row::{RequisitionRowStatus, RequisitionRowType},
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    RequisitionLineRow, RequisitionRow,
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
        .push(mock_sent_requisition_sync_processor());

    result.full_invoices = vec![(
        "mock_picked_invoice_sync_processor".to_owned(),
        mock_picked_invoice_sync_processor(),
    )]
    .into_iter()
    .collect();

    result
}

pub fn mock_sent_requisition_sync_processor() -> FullMockRequisition {
    let requisition_id = "mock_sent_requisition_sync_processor".to_owned();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);

    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id = requisition_id.clone();
            r.requisition_number = 3;
            r.name_id = mock_name_store_b().id;
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionRowType::Request;
            r.status = RequisitionRowStatus::Sent;
            r.created_datetime = NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0);
            r.sent_datetime = Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0));
            r.their_reference = Some("some reference".to_string());
            r.max_months_of_stock = 10.0;
            r.min_months_of_stock = 5.0;
        }),
        lines: vec![
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line1_id;
                r.requisition_id = requisition_id.clone();
                r.item_id = mock_item_a().id;
                r.requested_quantity = 2;
                r.suggested_quantity = 3;
                r.available_stock_on_hand = 1;
                r.average_monthly_consumption = 1;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line2_id;
                r.requisition_id = requisition_id.clone();
                r.item_id = mock_item_b().id;
                r.requested_quantity = 5;
                r.suggested_quantity = 6;
                r.available_stock_on_hand = 1;
            }),
        ],
    }
}

pub fn mock_request_requisition_for_invoice_sync_processor() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_request_requisition_for_invoice_sync_processor".to_string();
        r.requisition_number = 3;
        r.name_id = mock_name_store_b().id;
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionRowType::Request;
        r.status = RequisitionRowStatus::Sent;
        r.created_datetime = NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0);
        r.sent_datetime = Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0));
        r.their_reference = Some("some reference".to_string());
        r.max_months_of_stock = 10.0;
        r.min_months_of_stock = 5.0;
    })
}

pub fn mock_response_requisition_for_invoice_sync_processor() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_request_requisition_for_invoice_sync_processor".to_string();
        r.requisition_number = 3;
        r.name_id = mock_name_store_b().id;
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionRowType::Request;
        r.status = RequisitionRowStatus::Sent;
        r.created_datetime = NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0);
        r.sent_datetime = Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0));
        r.their_reference = Some("some reference".to_string());
        r.max_months_of_stock = 10.0;
        r.min_months_of_stock = 5.0;
        r.linked_requisition_id = Some(mock_request_requisition_for_invoice_sync_processor().id);
    })
}

pub fn mock_picked_invoice_sync_processor() -> FullMockInvoice {
    let invoice_id = "mock_picked_invoice_sync_processor".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id = invoice_id.clone();
            r.name_id = mock_name_store_b().id;
            r.store_id = mock_store_a().id;
            r.invoice_number = 20;
            r.requisition_id = Some(mock_response_requisition_for_invoice_sync_processor().id);
            r.r#type = InvoiceRowType::OutboundShipment;
            r.status = InvoiceRowStatus::Picked;
            r.their_reference = Some("some reference".to_string());
            r.created_datetime = NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0);
        }),
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
