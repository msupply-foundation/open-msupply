use chrono::NaiveDate;
use util::inline_init;

use crate::{
    requisition_row::{RequisitionStatus, RequisitionType},
    InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType, RequisitionLineRow,
    RequisitionRow, StockLineRow,
};

use super::{
    common::{FullMockInvoice, FullMockInvoiceLine, FullMockRequisition},
    mock_item_a, mock_item_b, mock_name_a, mock_name_b, mock_store_a, MockData,
};

pub fn mock_test_requisition_queries() -> MockData {
    let mut result = MockData::default();
    result
        .full_requisitions
        .push(mock_request_draft_requisition_all_fields());
    result
        .full_requisitions
        .push(mock_response_draft_requisition_all_fields());
    result
        .full_requisitions
        .push(mock_request_draft_requisition_all_fields_updated());
    result.full_invoices = vec![
        (
            "mock_invoice1_linked_to_requisition".to_string(),
            mock_invoice1_linked_to_requisition(),
        ),
        (
            "mock_invoice2_linked_to_requisition".to_string(),
            mock_invoice2_linked_to_requisition(),
        ),
        (
            "mock_invoice3_linked_to_requisition".to_string(),
            mock_invoice3_linked_to_requisition(),
        ),
    ]
    .into_iter()
    .collect();

    result
}

// Updated with response_requisition_id
pub fn mock_request_draft_requisition_all_fields_updated() -> FullMockRequisition {
    let mut requisition = mock_request_draft_requisition_all_fields();
    requisition.requisition.linked_requisition_id =
        Some(mock_response_draft_requisition_all_fields().requisition.id);
    requisition
}

pub fn mock_request_draft_requisition_all_fields() -> FullMockRequisition {
    let requisition_id = "mock_request_draft_requisition_all_fields".to_string();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id.clone_from(&requisition_id);
            r.user_id = Some("user_id".to_string());
            r.requisition_number = 3;
            r.name_link_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Request;
            r.status = RequisitionStatus::Draft;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.sent_datetime = Some(
                NaiveDate::from_ymd_opt(2021, 1, 2)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            );
            r.finalised_datetime = Some(
                NaiveDate::from_ymd_opt(2021, 1, 3)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            );
            r.expected_delivery_date = Some(NaiveDate::from_ymd_opt(2021, 1, 4).unwrap());
            r.colour = Some("colour".to_string());
            r.comment = Some("comment".to_string());
            r.their_reference = Some("their_reference".to_string());
            r.max_months_of_stock = 1.0;
            r.min_months_of_stock = 0.9;
        }),
        lines: vec![
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line1_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_a().id;
                r.requested_quantity = 10.0;
                r.suggested_quantity = 3.0;
                r.available_stock_on_hand = 1.0;
                r.average_monthly_consumption = 10.0;
                r.item_name = mock_item_a().name;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line2_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_b().id;
                r.requested_quantity = 15.0;
                r.suggested_quantity = 3.0;
                r.available_stock_on_hand = 1.0;
                r.average_monthly_consumption = 10.0;
                r.item_name = mock_item_b().name;
            }),
        ],
    }
}

pub fn mock_response_draft_requisition_all_fields() -> FullMockRequisition {
    let requisition_id = "mock_response_draft_requisition_all_fields".to_string();
    let line1_id = format!("{}1", requisition_id);
    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id.clone_from(&requisition_id);
            r.requisition_number = 3;
            r.name_link_id = mock_name_b().id;
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::Draft;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.sent_datetime = Some(
                NaiveDate::from_ymd_opt(2021, 1, 2)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            );
            r.finalised_datetime = Some(
                NaiveDate::from_ymd_opt(2021, 1, 3)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            );
            r.colour = Some("colour".to_string());
            r.comment = Some("comment".to_string());
            r.their_reference = Some("their_reference".to_string());
            r.max_months_of_stock = 1.0;
            r.min_months_of_stock = 0.9;
            r.linked_requisition_id = Some("mock_request_draft_requisition_all_fields".to_string());
        }),
        lines: vec![inline_init(|r: &mut RequisitionLineRow| {
            r.id = line1_id;
            r.requisition_id.clone_from(&requisition_id);
            r.item_link_id = mock_item_a().id;
            r.requested_quantity = 10.0;
            r.suggested_quantity = 15.0;
            r.available_stock_on_hand = 1.0;
            r.average_monthly_consumption = 10.0;
        })],
    }
}

pub fn mock_invoice1_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice1_linked_to_requisition".to_string();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id.clone_from(&invoice_id);
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.invoice_number = 20;
            r.r#type = InvoiceType::InboundShipment;
            r.status = InvoiceStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
            r.requisition_id = Some(mock_request_draft_requisition_all_fields().requisition.id);
        }),
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    stock_line_id: Some(line1_id.clone()),
                    invoice_id: invoice_id.clone(),
                    location_id: None,
                    item_link_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    item_code: mock_item_a().code,
                    batch: None,
                    expiry_date: None,
                    pack_size: 4.0,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_before_tax: 278.26,
                    total_after_tax: 320.0,
                    tax_percentage: Some(15.0),
                    r#type: InvoiceLineType::StockOut,
                    number_of_packs: 10.0,
                    ..Default::default()
                },
                stock_line: StockLineRow {
                    id: line1_id.clone(),
                    item_link_id: mock_item_a().id,
                    store_id: String::from("store_a"),
                    location_id: None,
                    batch: None,
                    available_number_of_packs: 20.0,
                    pack_size: 4.0,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_number_of_packs: 30.0,
                    expiry_date: None,
                    on_hold: false,
                    note: None,
                    supplier_link_id: Some(String::from("name_store_b")),
                    ..Default::default()
                },
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    stock_line_id: Some(line2_id.clone()),
                    invoice_id: invoice_id.clone(),
                    location_id: None,
                    item_link_id: mock_item_b().id,
                    item_name: mock_item_b().name,
                    item_code: mock_item_b().code,
                    batch: None,
                    expiry_date: None,
                    pack_size: 4.0,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_before_tax: 278.26,
                    total_after_tax: 320.0,
                    tax_percentage: Some(15.0),
                    r#type: InvoiceLineType::StockOut,
                    number_of_packs: 10.0,
                    ..Default::default()
                },
                stock_line: StockLineRow {
                    id: line2_id.clone(),
                    item_link_id: mock_item_b().id,
                    store_id: String::from("store_a"),
                    location_id: None,
                    batch: None,
                    available_number_of_packs: 20.0,
                    pack_size: 4.0,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_number_of_packs: 30.0,
                    expiry_date: None,
                    on_hold: false,
                    note: None,
                    supplier_link_id: Some(String::from("name_store_b")),
                    ..Default::default()
                },
            },
        ],
    }
}

pub fn mock_invoice2_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice2_linked_to_requisition".to_string();
    let line1_id = format!("{}1", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id.clone_from(&invoice_id);
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.invoice_number = 20;
            r.r#type = InvoiceType::InboundShipment;
            r.status = InvoiceStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
            r.requisition_id = Some(mock_request_draft_requisition_all_fields().requisition.id);
        }),
        lines: vec![FullMockInvoiceLine {
            line: InvoiceLineRow {
                id: line1_id.clone(),
                stock_line_id: Some(line1_id.clone()),
                invoice_id: invoice_id.clone(),
                location_id: None,
                item_link_id: mock_item_b().id,
                item_name: mock_item_b().name,
                item_code: mock_item_b().code,
                batch: None,
                expiry_date: None,
                pack_size: 4.0,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_before_tax: 278.26,
                total_after_tax: 320.0,
                tax_percentage: Some(15.0),
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 10.0,
                ..Default::default()
            },
            stock_line: StockLineRow {
                id: line1_id.clone(),
                item_link_id: mock_item_b().id,
                store_id: String::from("store_a"),
                location_id: None,
                batch: None,
                available_number_of_packs: 20.0,
                pack_size: 4.0,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_number_of_packs: 30.0,
                expiry_date: None,
                on_hold: false,
                note: None,
                supplier_link_id: Some(String::from("name_store_b")),
                ..Default::default()
            },
        }],
    }
}

pub fn mock_invoice3_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice3_linked_to_requisition".to_string();
    let line1_id = format!("{}1", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id.clone_from(&invoice_id);
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.invoice_number = 20;
            r.r#type = InvoiceType::OutboundShipment;
            r.status = InvoiceStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
            r.requisition_id = Some(mock_response_draft_requisition_all_fields().requisition.id);
        }),
        lines: vec![FullMockInvoiceLine {
            line: InvoiceLineRow {
                id: line1_id.clone(),
                stock_line_id: Some(line1_id.clone()),
                invoice_id: invoice_id.clone(),
                location_id: None,
                item_link_id: mock_item_a().id,
                item_name: mock_item_a().name,
                item_code: mock_item_a().code,
                batch: None,
                expiry_date: None,
                pack_size: 4.0,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_before_tax: 278.26,
                total_after_tax: 320.0,
                tax_percentage: Some(15.0),
                r#type: InvoiceLineType::StockOut,
                number_of_packs: 10.0,
                ..Default::default()
            },
            stock_line: StockLineRow {
                id: line1_id.clone(),
                item_link_id: mock_item_a().id,
                store_id: String::from("store_a"),
                location_id: None,
                batch: None,
                available_number_of_packs: 20.0,
                pack_size: 4.0,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_number_of_packs: 30.0,
                expiry_date: None,
                on_hold: false,
                note: None,
                supplier_link_id: Some(String::from("name_store_b")),
                ..Default::default()
            },
        }],
    }
}
