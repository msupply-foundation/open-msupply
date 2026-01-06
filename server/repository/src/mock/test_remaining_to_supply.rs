use crate::{
    requisition_row::RequisitionType, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus,
    InvoiceType, RequisitionLineRow, RequisitionRow,
};

use super::{
    mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_name_a, mock_store_a, MockData,
};

pub fn requisition() -> RequisitionRow {
    RequisitionRow {
        id: "test_loader".to_string(),
        name_link_id: mock_name_a().id,
        store_id: mock_store_a().id,
        r#type: RequisitionType::Response,
        ..Default::default()
    }
}
pub fn linked_invoice_1() -> InvoiceRow {
    InvoiceRow {
        id: "lined_invoice_1".to_string(),
        r#type: InvoiceType::OutboundShipment,
        requisition_id: Some(requisition().id),
        name_id: mock_name_a().id,
        store_id: mock_store_a().id,
        ..Default::default()
    }
}
pub fn linked_invoice_2() -> InvoiceRow {
    InvoiceRow {
        id: "lined_invoice_2".to_string(),
        r#type: InvoiceType::OutboundShipment,
        status: InvoiceStatus::Picked,
        requisition_id: Some(requisition().id),
        name_id: mock_name_a().id,
        store_id: mock_store_a().id,
        ..Default::default()
    }
}
// No invoice lines linked
pub fn line_to_supply_q5() -> RequisitionLineRow {
    RequisitionLineRow {
        requisition_id: requisition().id,
        id: "line_to_supply_q5".to_string(),
        item_link_id: mock_item_a().id,
        supply_quantity: 5.0,
        ..Default::default()
    }
}
// One unallocated line linked
pub fn line_to_supply_q2() -> RequisitionLineRow {
    RequisitionLineRow {
        requisition_id: requisition().id,
        id: "line_to_supply_q2".to_string(),
        item_link_id: mock_item_b().id,
        supply_quantity: 5.0,
        ..Default::default()
    }
}

pub fn linked_line_1() -> InvoiceLineRow {
    InvoiceLineRow {
        invoice_id: linked_invoice_1().id,
        id: "linked_line_1".to_string(),
        item_link_id: line_to_supply_q2().item_link_id,
        r#type: InvoiceLineType::UnallocatedStock,
        pack_size: 1.0,
        number_of_packs: 3.0,
        ..Default::default()
    }
}

// One unallocated line and on picked invoice line from two linked invoices
pub fn line_to_supply_q1() -> RequisitionLineRow {
    RequisitionLineRow {
        requisition_id: requisition().id,
        id: "line_to_supply_q1".to_string(),
        item_link_id: mock_item_c().id,
        supply_quantity: 10.0,
        ..Default::default()
    }
}
pub fn linked_line_2() -> InvoiceLineRow {
    InvoiceLineRow {
        invoice_id: linked_invoice_1().id,
        id: "linked_line_2".to_string(),
        item_link_id: line_to_supply_q1().item_link_id,
        r#type: InvoiceLineType::UnallocatedStock,
        pack_size: 1.0,
        number_of_packs: 3.0,
        ..Default::default()
    }
}
pub fn linked_line_3() -> InvoiceLineRow {
    InvoiceLineRow {
        invoice_id: linked_invoice_2().id,
        id: "linked_line_3".to_string(),
        item_link_id: line_to_supply_q1().item_link_id,
        r#type: InvoiceLineType::StockOut,
        pack_size: 3.0,
        number_of_packs: 2.0,
        ..Default::default()
    }
}
// Fully supplied
pub fn line_to_supply_q0() -> RequisitionLineRow {
    RequisitionLineRow {
        requisition_id: requisition().id,
        id: "line_to_supply_q0".to_string(),
        item_link_id: mock_item_d().id,
        supply_quantity: 2.0,
        ..Default::default()
    }
}
pub fn linked_line_4() -> InvoiceLineRow {
    InvoiceLineRow {
        invoice_id: linked_invoice_1().id,
        id: "linked_line_4".to_string(),
        item_link_id: line_to_supply_q0().item_link_id,
        r#type: InvoiceLineType::UnallocatedStock,
        pack_size: 2.0,
        number_of_packs: 1.0,
        ..Default::default()
    }
}
pub fn test_remaining_to_supply() -> MockData {
    MockData {
        requisitions: vec![requisition()],
        requisition_lines: vec![
            line_to_supply_q5(),
            line_to_supply_q2(),
            line_to_supply_q1(),
            line_to_supply_q0(),
        ],
        invoices: vec![linked_invoice_1(), linked_invoice_2()],
        invoice_lines: vec![
            linked_line_1(),
            linked_line_2(),
            linked_line_3(),
            linked_line_4(),
        ],
        ..Default::default()
    }
}
