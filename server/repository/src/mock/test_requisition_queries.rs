use chrono::NaiveDate;

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
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            user_id: Some("user_id".to_string()),
            requisition_number: 3,
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: RequisitionType::Request,
            status: RequisitionStatus::Draft,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            sent_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 1, 2)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            finalised_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 1, 3)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            expected_delivery_date: Some(NaiveDate::from_ymd_opt(2021, 1, 4).unwrap()),
            colour: Some("colour".to_string()),
            comment: Some("comment".to_string()),
            their_reference: Some("their_reference".to_string()),
            max_months_of_stock: 1.0,
            min_months_of_stock: 0.9,
            ..Default::default()
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id.clone(),
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_a().id,
                requested_quantity: 10.0,
                suggested_quantity: 3.0,
                available_stock_on_hand: 1.0,
                average_monthly_consumption: 10.0,
                item_name: mock_item_a().name,
                ..Default::default()
            },
            RequisitionLineRow {
                id: line2_id.clone(),
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_b().id,
                requested_quantity: 15.0,
                suggested_quantity: 3.0,
                available_stock_on_hand: 1.0,
                average_monthly_consumption: 10.0,
                item_name: mock_item_b().name,
                ..Default::default()
            },
        ],
    }
}

pub fn mock_response_draft_requisition_all_fields() -> FullMockRequisition {
    let requisition_id = "mock_response_draft_requisition_all_fields".to_string();
    let line1_id = format!("{}1", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_id: mock_name_b().id,
            store_id: mock_store_a().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::Draft,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            sent_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 1, 2)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            finalised_datetime: Some(
                NaiveDate::from_ymd_opt(2021, 1, 3)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
            ),
            colour: Some("colour".to_string()),
            comment: Some("comment".to_string()),
            their_reference: Some("their_reference".to_string()),
            max_months_of_stock: 1.0,
            min_months_of_stock: 0.9,
            linked_requisition_id: Some("mock_request_draft_requisition_all_fields".to_string()),
            ..Default::default()
        },
        lines: vec![RequisitionLineRow {
            id: line1_id.clone(),
            requisition_id: requisition_id.clone(),
            item_link_id: mock_item_a().id,
            requested_quantity: 10.0,
            suggested_quantity: 15.0,
            available_stock_on_hand: 1.0,
            average_monthly_consumption: 10.0,
            ..Default::default()
        }],
    }
}

pub fn mock_invoice1_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice1_linked_to_requisition".to_string();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_string(),
            invoice_number: 20,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            requisition_id: Some(mock_request_draft_requisition_all_fields().requisition.id),
            ..Default::default()
        },
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
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_string(),
            invoice_number: 20,
            r#type: InvoiceType::InboundShipment,
            status: InvoiceStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            requisition_id: Some(mock_request_draft_requisition_all_fields().requisition.id),
            ..Default::default()
        },
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
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_string(),
            invoice_number: 20,
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            requisition_id: Some(mock_response_draft_requisition_all_fields().requisition.id),
            ..Default::default()
        },
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
