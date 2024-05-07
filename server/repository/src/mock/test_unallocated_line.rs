use chrono::NaiveDate;
use util::inline_init;

use crate::{InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType};

use super::MockData;

pub fn mock_test_unallocated_line() -> MockData {
    let mut result = MockData::default();
    result
        .invoices
        .push(mock_new_invoice_with_unallocated_line());
    result
        .invoices
        .push(mock_new_invoice_with_unallocated_line2());
    result.invoices.push(mock_allocated_invoice());
    result.invoice_lines.push(mock_unallocated_line());
    result.invoice_lines.push(mock_unallocated_line2());
    result
}

pub fn mock_new_invoice_with_unallocated_line() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "unallocated_line_new_invoice".to_owned();
        r.name_link_id = "name_store_a".to_owned();
        r.store_id = "store_c".to_owned();
        r.invoice_number = 1;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 5)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_unallocated_line() -> InvoiceLineRow {
    InvoiceLineRow {
        id: "unallocated_line_new_invoice_line_1".to_owned(),
        invoice_id: "unallocated_line_new_invoice".to_owned(),
        item_link_id: "item_a".to_owned(),
        item_name: "Item A".to_owned(),
        item_code: "item_a_code".to_owned(),
        stock_line_id: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        r#type: InvoiceLineType::UnallocatedStock,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    }
}

// Used to test successfull insert where another invoice has row with the item id in unallocated line
// to make sure filtering for `UnallocatedLineForItemAlreadyExistsInInvoice` is done for invoice (not globally)
pub fn mock_new_invoice_with_unallocated_line2() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "unallocated_line_new_invoice2".to_owned();
        r.name_link_id = "name_store_a".to_owned();
        r.store_id = "store_a".to_owned();
        r.invoice_number = 2;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 5)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_unallocated_line2() -> InvoiceLineRow {
    InvoiceLineRow {
        id: "unallocated_line_new_invoice2_line_1".to_owned(),
        invoice_id: "unallocated_line_new_invoice2".to_owned(),
        item_link_id: "item_b".to_owned(),
        item_name: "Item B".to_owned(),
        item_code: "item_b_code".to_owned(),
        stock_line_id: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_percentage: None,
        r#type: InvoiceLineType::UnallocatedStock,
        number_of_packs: 1.0,
        note: None,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    }
}

pub fn mock_allocated_invoice() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "unallocated_line_allocated_invoice".to_owned();
        r.name_link_id = "name_store_a".to_owned();
        r.store_id = "store_a".to_owned();
        r.invoice_number = 1;
        r.r#type = InvoiceType::OutboundShipment;
        r.status = InvoiceStatus::Allocated;
        r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 5)
            .unwrap()
            .and_hms_milli_opt(15, 30, 0, 0)
            .unwrap();
        r.allocated_datetime = Some(
            NaiveDate::from_ymd_opt(1970, 1, 5)
                .unwrap()
                .and_hms_milli_opt(15, 30, 0, 0)
                .unwrap(),
        );
    })
}
