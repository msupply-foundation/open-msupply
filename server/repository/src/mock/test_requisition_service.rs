use chrono::NaiveDate;
use util::inline_init;

use crate::{
    requisition_row::{RequisitionStatus, RequisitionType},
    ApprovalStatusType, InvoiceLineRow, InvoiceLineType, InvoiceRow, InvoiceStatus, InvoiceType,
    MasterListRow, RequisitionLineRow, RequisitionRow,
};

use super::{
    common::{FullMockInvoice, FullMockInvoiceLine, FullMockMasterList, FullMockRequisition},
    mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_name_a, mock_program_a,
    mock_stock_line_a, mock_store_a, MockData,
};

pub fn mock_test_requisition_service() -> MockData {
    let mut result = MockData::default();
    result.requisitions.push(mock_requisition_for_number_test());
    result
        .requisition_lines
        .push(mock_sent_request_requisition_line());
    result
        .requisition_lines
        .push(mock_new_response_requisition_for_update_test_line());
    result
        .requisition_lines
        .push(mock_finalised_request_requisition_line());
    result
        .requisitions
        .push(mock_draft_request_requisition_for_update_test());
    result
        .requisitions
        .push(mock_new_response_requisition_for_update_test());
    result
        .requisitions
        .push(mock_finalised_response_requisition());
    result.requisitions.push(mock_new_response_requisition());
    result.requisitions.push(mock_sent_request_requisition());
    result
        .full_requisitions
        .push(mock_request_draft_requisition_calculation_test());
    result
        .full_requisitions
        .push(mock_full_new_response_requisition_for_update_test());
    result
        .full_requisitions
        .push(mock_new_response_requisition_test());
    result
        .full_master_lists
        .push(mock_test_not_store_a_master_list());
    result.requisitions.push(mock_request_program_requisition());
    result
        .full_requisitions
        .push(mock_response_program_requisition());

    result.full_invoices = vec![(
        "mock_new_response_requisition_test_invoice".to_string(),
        mock_new_response_requisition_test_invoice(),
    )]
    .into_iter()
    .collect();

    result
}

pub fn mock_requisition_for_number_test() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_requisition_for_number_test".to_string();
        r.requisition_number = 111111111;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Request;
        r.status = RequisitionStatus::Draft;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_draft_request_requisition_for_update_test() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_draft_request_requisition_for_update_test".to_string();
        r.requisition_number = 3;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Request;
        r.status = RequisitionStatus::Draft;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_sent_request_requisition() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_sent_request_requisition".to_string();
        r.requisition_number = 3;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Request;
        r.status = RequisitionStatus::Sent;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_sent_request_requisition_line() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.id = "mock_sent_request_requisition_line".to_string();
        r.requisition_id = mock_sent_request_requisition().id;
        r.item_link_id = mock_item_a().id;
        r.requested_quantity = 10.0;
        r.suggested_quantity = 5.0;
        r.available_stock_on_hand = 1.0;
        r.average_monthly_consumption = 1.0;
    })
}

pub fn mock_finalised_response_requisition() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_finalised_response_requisition".to_string();
        r.requisition_number = 3;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Response;
        r.status = RequisitionStatus::Finalised;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_finalised_request_requisition_line() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.id = "mock_finalised_request_requisition_line".to_string();
        r.requisition_id = mock_finalised_response_requisition().id;
        r.item_link_id = mock_item_a().id;
        r.requested_quantity = 10.0;
        r.suggested_quantity = 5.0;
        r.available_stock_on_hand = 1.0;
        r.average_monthly_consumption = 1.0;
    })
}

pub fn mock_new_response_requisition_for_update_test() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_new_response_requisition_for_update_test".to_string();
        r.requisition_number = 3;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Response;
        r.status = RequisitionStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_new_response_requisition() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_new_response_requisition".to_string();
        r.requisition_number = 3;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Response;
        r.status = RequisitionStatus::New;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
    })
}

pub fn mock_new_response_requisition_for_update_test_line() -> RequisitionLineRow {
    inline_init(|r: &mut RequisitionLineRow| {
        r.id = "mock_new_response_requisition_for_update_test_line".to_string();
        r.requisition_id = mock_new_response_requisition_for_update_test().id;
        r.item_link_id = mock_item_a().id;
        r.requested_quantity = 10.0;
        r.suggested_quantity = 5.0;
        r.available_stock_on_hand = 1.0;
        r.average_monthly_consumption = 1.0;
    })
}

pub fn mock_full_new_response_requisition_for_update_test() -> FullMockRequisition {
    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id = "mock_full_new_response_requisition_for_update_test".to_string();
            r.requisition_number = 10;
            r.name_link_id = "name_a".to_string();
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.max_months_of_stock = 1.0;
            r.min_months_of_stock = 0.9;
        }),
        lines: vec![inline_init(|r: &mut RequisitionLineRow| {
            r.id = "mock_full_new_response_requisition_for_update_test_line".to_string();
            r.requisition_id = "mock_full_new_response_requisition_for_update_test".to_string();
            r.item_link_id = mock_item_a().id;
            r.requested_quantity = 10.0;
            r.suggested_quantity = 5.0;
            r.available_stock_on_hand = 1.0;
            r.average_monthly_consumption = 1.0;
        })],
    }
}

pub fn mock_request_draft_requisition_calculation_test() -> FullMockRequisition {
    let requisition_id = "mock_request_draft_requisition_calculation_test".to_string();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    let line3_id = format!("{}3", requisition_id);
    let line4_id = format!("{}4", requisition_id);
    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id.clone_from(&requisition_id);
            r.requisition_number = 3;
            r.name_link_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Request;
            r.status = RequisitionStatus::Draft;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.max_months_of_stock = 10.0;
            r.min_months_of_stock = 5.0;
        }),
        lines: vec![
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line1_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_a().id;
                r.requested_quantity = 10.0;
                r.suggested_quantity = 5.0;
                r.available_stock_on_hand = 1.0;
                r.average_monthly_consumption = 1.0;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line2_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_b().id;
                r.requested_quantity = 10.0;
                r.suggested_quantity = 5.0;
                r.available_stock_on_hand = 1.0;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line3_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_c().id;
                r.requested_quantity = 10.0;
                r.suggested_quantity = 5.0;
                r.available_stock_on_hand = 6.0;
                r.average_monthly_consumption = 1.0;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line4_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_d().id;
                r.requested_quantity = 10.0;
                r.suggested_quantity = 200.0;
                r.available_stock_on_hand = 20.0;
                r.average_monthly_consumption = 1.0;
            }),
        ],
    }
}

pub fn mock_test_not_store_a_master_list() -> FullMockMasterList {
    let id = "mock_test_not_store_a_master_list".to_string();

    FullMockMasterList {
        master_list: MasterListRow {
            id: id.clone(),
            name: id.clone(),
            code: id.clone(),
            description: id.clone(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![],
        lines: vec![],
    }
}

pub fn mock_new_response_requisition_test() -> FullMockRequisition {
    let requisition_id = "mock_new_response_requisition_test".to_string();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id.clone_from(&requisition_id);
            r.requisition_number = 3;
            r.name_link_id = mock_name_a().id;
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.max_months_of_stock = 10.0;
            r.min_months_of_stock = 5.0;
        }),
        lines: vec![
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line1_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_a().id;
                r.requested_quantity = 10.0;
                r.suggested_quantity = 5.0;
                r.supply_quantity = 50.0;
                r.available_stock_on_hand = 1.0;
                r.average_monthly_consumption = 1.0;
            }),
            inline_init(|r: &mut RequisitionLineRow| {
                r.id = line2_id;
                r.requisition_id.clone_from(&requisition_id);
                r.item_link_id = mock_item_b().id;
                r.requested_quantity = 11.0;
                r.suggested_quantity = 5.0;
                r.supply_quantity = 100.0;
                r.available_stock_on_hand = 1.0;
            }),
        ],
    }
}

pub fn mock_new_response_requisition_test_invoice() -> FullMockInvoice {
    let invoice_id = "mock_new_response_requisition_test_invoice".to_string();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: inline_init(|r: &mut InvoiceRow| {
            r.id.clone_from(&invoice_id);
            r.name_link_id = mock_name_a().id;
            r.store_id = "store_a".to_string();
            r.invoice_number = 20;
            r.requisition_id = Some(mock_new_response_requisition_test().requisition.id);
            r.r#type = InvoiceType::OutboundShipment;
            r.status = InvoiceStatus::New;
            r.created_datetime = NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap();
        }),
        lines: vec![
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line1_id.clone(),
                    invoice_id: invoice_id.clone(),
                    r#type: InvoiceLineType::StockOut,
                    pack_size: 2.0,
                    number_of_packs: 2.0,
                    item_link_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    item_code: mock_item_a().code,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax_percentage: Some(0.0),
                    ..Default::default()
                },
                stock_line: mock_stock_line_a(),
            },
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    invoice_id: invoice_id.clone(),
                    r#type: InvoiceLineType::UnallocatedStock,
                    pack_size: 1.0,
                    number_of_packs: 2.0,
                    item_link_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    item_code: mock_item_a().code,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
                    total_before_tax: 0.0,
                    total_after_tax: 0.0,
                    tax_percentage: Some(0.0),
                    ..Default::default()
                },
                stock_line: mock_stock_line_a(),
            },
        ],
    }
}

pub fn mock_request_program_requisition() -> RequisitionRow {
    inline_init(|r: &mut RequisitionRow| {
        r.id = "mock_request_program_requisition".to_string();
        r.requisition_number = 3;
        r.name_link_id = "name_a".to_string();
        r.store_id = mock_store_a().id;
        r.r#type = RequisitionType::Request;
        r.status = RequisitionStatus::Draft;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap();
        r.max_months_of_stock = 1.0;
        r.min_months_of_stock = 0.9;
        r.program_id = Some(mock_program_a().id);
    })
}

pub fn mock_response_program_requisition() -> FullMockRequisition {
    let requisition_id = "mock_response_program_requisition".to_string();
    let line1_id = format!("{}1", requisition_id);
    FullMockRequisition {
        requisition: inline_init(|r: &mut RequisitionRow| {
            r.id.clone_from(&requisition_id);
            r.requisition_number = 10;
            r.name_link_id = "name_a".to_string();
            r.store_id = mock_store_a().id;
            r.r#type = RequisitionType::Response;
            r.status = RequisitionStatus::New;
            r.approval_status = Some(ApprovalStatusType::Pending);
            r.created_datetime = NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap();
            r.max_months_of_stock = 3.0;
            r.min_months_of_stock = 1.0;
            r.program_id = Some(mock_program_a().id);
        }),
        lines: vec![inline_init(|r: &mut RequisitionLineRow| {
            r.id = line1_id;
            r.requisition_id = requisition_id;
            r.item_link_id = mock_item_a().id;
            r.requested_quantity = 10.0;
            r.suggested_quantity = 10.0;
            r.supply_quantity = 100.0;
            r.available_stock_on_hand = 1.0;
            r.average_monthly_consumption = 1.0;
        })],
    }
}
