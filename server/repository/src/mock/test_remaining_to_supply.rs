use crate::{
    requisition_row::RequisitionRowType, InvoiceLineRow, InvoiceLineRowType, InvoiceRow,
    InvoiceRowStatus, InvoiceRowType, RequisitionLineRow, RequisitionRow,
};
use util::inline_init;

use super::{
    mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_name_a, mock_store_a, MockData,
};

pub fn requisition() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "test_loader".to_string();
        r.name_link_id = mock_name_a().id;
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionRowType::Response;
    })
}
pub fn linked_invoice_1() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "lined_invoice_1".to_string();
        r.r#type = InvoiceRowType::OutboundShipment;
        r.requisition_id = Some(requisition().id);
        r.name_link_id = mock_name_a().id;
        r.store_id = mock_store_a().id;
    })
}
pub fn linked_invoice_2() -> InvoiceRow {
    inline_init(|r: &mut InvoiceRow| {
        r.id = "lined_invoice_2".to_string();
        r.r#type = InvoiceRowType::OutboundShipment;
        r.status = InvoiceRowStatus::Picked;
        r.requisition_id = Some(requisition().id);
        r.name_link_id = mock_name_a().id;
        r.store_id = mock_store_a().id;
    })
}
// No invoice lines linked
pub fn line_to_supply_q5() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.requisition_id = requisition().id;
        r.id = "line_to_supply_q5".to_string();
        r.item_link_id = mock_item_a().id;
        r.supply_quantity = 5;
    })
}
// One unallocated line linked
pub fn line_to_supply_q2() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.requisition_id = requisition().id;
        r.id = "line_to_supply_q2".to_string();
        r.item_link_id = mock_item_b().id;
        r.supply_quantity = 5;
    })
}

pub fn linked_line_1() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.invoice_id = linked_invoice_1().id;
        r.id = "linked_line_1".to_string();
        r.item_link_id = line_to_supply_q2().item_link_id;
        r.r#type = InvoiceLineRowType::UnallocatedStock;
        r.pack_size = 1;
        r.number_of_packs = 3.0;
    })
}

// One unallocated line and on picked invoice line from two linked invoices
pub fn line_to_supply_q1() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.requisition_id = requisition().id;
        r.id = "line_to_supply_q1".to_string();
        r.item_link_id = mock_item_c().id;
        r.supply_quantity = 10;
    })
}
pub fn linked_line_2() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.invoice_id = linked_invoice_1().id;
        r.id = "linked_line_2".to_string();
        r.item_link_id = line_to_supply_q1().item_link_id;
        r.r#type = InvoiceLineRowType::UnallocatedStock;
        r.pack_size = 1;
        r.number_of_packs = 3.0;
    })
}
pub fn linked_line_3() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.invoice_id = linked_invoice_2().id;
        r.id = "linked_line_3".to_string();
        r.item_link_id = line_to_supply_q1().item_link_id;
        r.r#type = InvoiceLineRowType::StockOut;
        r.pack_size = 3;
        r.number_of_packs = 2.0;
    })
}
// Fully supplied
pub fn line_to_supply_q0() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.requisition_id = requisition().id;
        r.id = "line_to_supply_q0".to_string();
        r.item_link_id = mock_item_d().id;
        r.supply_quantity = 2;
    })
}
pub fn linked_line_4() -> InvoiceLineRow {
    inline_init(|r: &mut InvoiceLineRow| {
        r.invoice_id = linked_invoice_1().id;
        r.id = "linked_line_4".to_string();
        r.item_link_id = line_to_supply_q0().item_link_id;
        r.r#type = InvoiceLineRowType::UnallocatedStock;
        r.pack_size = 2;
        r.number_of_packs = 1.0;
    })
}
pub fn test_remaining_to_supply() -> MockData {
    inline_init(|r: &mut MockData| {
        r.requisitions = vec![requisition()];
        r.requisition_lines = vec![
            line_to_supply_q5(),
            line_to_supply_q2(),
            line_to_supply_q1(),
            line_to_supply_q0(),
        ];
        r.invoices = vec![linked_invoice_1(), linked_invoice_2()];
        r.invoice_lines = vec![
            linked_line_1(),
            linked_line_2(),
            linked_line_3(),
            linked_line_4(),
        ];
    })
}
