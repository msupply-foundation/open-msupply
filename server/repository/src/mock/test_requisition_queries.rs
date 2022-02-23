use chrono::NaiveDate;

use crate::schema::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    RequisitionLineRow, RequisitionRow, RequisitionRowStatus, RequisitionRowType, StockLineRow,
};

use super::{
    common::{FullMockInvoice, FullMockInvoiceLine, FullMockRequisition},
    mock_item_a, mock_item_b, mock_name_a, mock_name_store_a, MockData,
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
    let requisition_id = "mock_request_draft_requisition_all_fields".to_owned();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_id: mock_name_a().id,
            store_id: "store_a".to_owned(),
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
            created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
            sent_datetime: Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0)),
            finalised_datetime: Some(NaiveDate::from_ymd(2021, 01, 03).and_hms(0, 0, 0)),
            colour: Some("colour".to_owned()),
            comment: Some("comment".to_owned()),
            their_reference: Some("their_reference".to_owned()),
            max_months_of_stock: 1.0,
            min_months_of_stock: 0.9,
            linked_requisition_id: None,
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_a().id,
                requested_quantity: 10,
                suggested_quantity: 3,
                supply_quantity: 0,
                available_stock_on_hand: 1,
                average_monthly_consumption: 10,
            },
            RequisitionLineRow {
                id: line2_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_b().id,
                requested_quantity: 15,
                suggested_quantity: 3,
                supply_quantity: 0,
                available_stock_on_hand: 1,
                average_monthly_consumption: 10,
            },
        ],
    }
}

pub fn mock_response_draft_requisition_all_fields() -> FullMockRequisition {
    let requisition_id = "mock_response_draft_requisition_all_fields".to_owned();
    let line1_id = format!("{}1", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_id: mock_name_store_a().id,
            store_id: "store_a".to_owned(),
            r#type: RequisitionRowType::Response,
            status: RequisitionRowStatus::Draft,
            created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
            sent_datetime: Some(NaiveDate::from_ymd(2021, 01, 02).and_hms(0, 0, 0)),
            finalised_datetime: Some(NaiveDate::from_ymd(2021, 01, 03).and_hms(0, 0, 0)),
            colour: Some("colour".to_owned()),
            comment: Some("comment".to_owned()),
            their_reference: Some("their_reference".to_owned()),
            max_months_of_stock: 1.0,
            min_months_of_stock: 0.9,
            linked_requisition_id: Some("mock_request_draft_requisition_all_fields".to_owned()),
        },
        lines: vec![RequisitionLineRow {
            id: line1_id,
            requisition_id: requisition_id.clone(),
            item_id: mock_item_a().id,
            requested_quantity: 10,
            suggested_quantity: 15,
            supply_quantity: 0,
            available_stock_on_hand: 1,
            average_monthly_consumption: 10,
        }],
    }
}

pub fn mock_invoice1_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice1_linked_to_requisition".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_owned(),
            invoice_number: 20,
            name_store_id: None,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            shipped_datetime: None,
            colour: None,
            requisition_id: Some(mock_request_draft_requisition_all_fields().requisition.id),
            linked_invoice_id: None,
            picked_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    stock_line_id: Some(line1_id.clone()),
                    invoice_id: invoice_id.clone(),
                    location_id: None,
                    item_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    item_code: mock_item_a().code,
                    batch: None,
                    expiry_date: None,
                    pack_size: 4,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_before_tax: 278.26,
                    total_after_tax: 320.0,
                    tax: Some(15.0),
                    r#type: InvoiceLineRowType::StockOut,
                    number_of_packs: 10,
                    note: None,
                },
                stock_line: StockLineRow {
                    id: line1_id.clone(),
                    item_id: mock_item_a().id,
                    store_id: String::from("store_a"),
                    location_id: None,
                    batch: None,
                    available_number_of_packs: 20,
                    pack_size: 4,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_number_of_packs: 30,
                    expiry_date: None,
                    on_hold: false,
                    note: None,
                },
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    stock_line_id: Some(line2_id.clone()),
                    invoice_id: invoice_id.clone(),
                    location_id: None,
                    item_id: mock_item_b().id,
                    item_name: mock_item_b().name,
                    item_code: mock_item_b().code,
                    batch: None,
                    expiry_date: None,
                    pack_size: 4,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_before_tax: 278.26,
                    total_after_tax: 320.0,
                    tax: Some(15.0),
                    r#type: InvoiceLineRowType::StockOut,
                    number_of_packs: 10,
                    note: None,
                },
                stock_line: StockLineRow {
                    id: line2_id.clone(),
                    item_id: mock_item_b().id,
                    store_id: String::from("store_a"),
                    location_id: None,
                    batch: None,
                    available_number_of_packs: 20,
                    pack_size: 4,
                    cost_price_per_pack: 43.0,
                    sell_price_per_pack: 32.0,
                    total_number_of_packs: 30,
                    expiry_date: None,
                    on_hold: false,
                    note: None,
                },
            },
        ],
    }
}

pub fn mock_invoice2_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice2_linked_to_requisition".to_owned();
    let line1_id = format!("{}1", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_owned(),
            invoice_number: 20,
            name_store_id: None,
            r#type: InvoiceRowType::InboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            shipped_datetime: None,
            colour: None,
            requisition_id: Some(mock_request_draft_requisition_all_fields().requisition.id),
            linked_invoice_id: None,
            picked_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: vec![FullMockInvoiceLine {
            line: InvoiceLineRow {
                id: line1_id.clone(),
                stock_line_id: Some(line1_id.clone()),
                invoice_id: invoice_id.clone(),
                location_id: None,
                item_id: mock_item_b().id,
                item_name: mock_item_b().name,
                item_code: mock_item_b().code,
                batch: None,
                expiry_date: None,
                pack_size: 4,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_before_tax: 278.26,
                total_after_tax: 320.0,
                tax: Some(15.0),
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 10,
                note: None,
            },
            stock_line: StockLineRow {
                id: line1_id.clone(),
                item_id: mock_item_b().id,
                store_id: String::from("store_a"),
                location_id: None,
                batch: None,
                available_number_of_packs: 20,
                pack_size: 4,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_number_of_packs: 30,
                expiry_date: None,
                on_hold: false,
                note: None,
            },
        }],
    }
}

pub fn mock_invoice3_linked_to_requisition() -> FullMockInvoice {
    let invoice_id = "mock_invoice3_linked_to_requisition".to_owned();
    let line1_id = format!("{}1", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_owned(),
            invoice_number: 20,
            name_store_id: None,
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            comment: None,
            their_reference: None,
            created_datetime: NaiveDate::from_ymd(1970, 1, 1).and_hms_milli(12, 30, 0, 0),
            allocated_datetime: None,
            shipped_datetime: None,
            colour: None,
            requisition_id: Some(mock_response_draft_requisition_all_fields().requisition.id),
            linked_invoice_id: None,
            picked_datetime: None,
            delivered_datetime: None,
            verified_datetime: None,
        },
        lines: vec![FullMockInvoiceLine {
            line: InvoiceLineRow {
                id: line1_id.clone(),
                stock_line_id: Some(line1_id.clone()),
                invoice_id: invoice_id.clone(),
                location_id: None,
                item_id: mock_item_a().id,
                item_name: mock_item_a().name,
                item_code: mock_item_a().code,
                batch: None,
                expiry_date: None,
                pack_size: 4,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_before_tax: 278.26,
                total_after_tax: 320.0,
                tax: Some(15.0),
                r#type: InvoiceLineRowType::StockOut,
                number_of_packs: 10,
                note: None,
            },
            stock_line: StockLineRow {
                id: line1_id.clone(),
                item_id: mock_item_a().id,
                store_id: String::from("store_a"),
                location_id: None,
                batch: None,
                available_number_of_packs: 20,
                pack_size: 4,
                cost_price_per_pack: 43.0,
                sell_price_per_pack: 32.0,
                total_number_of_packs: 30,
                expiry_date: None,
                on_hold: false,
                note: None,
            },
        }],
    }
}
