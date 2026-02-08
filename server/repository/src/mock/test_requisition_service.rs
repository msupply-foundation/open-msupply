use chrono::NaiveDate;

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
        .full_requisitions
        .push(mock_new_response_program_requisition());

    result
}

pub fn mock_requisition_for_number_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_requisition_for_number_test".to_string(),
        requisition_number: 111111111,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_draft_request_requisition_for_update_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_draft_request_requisition_for_update_test".to_string(),
        requisition_number: 3,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_sent_request_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_sent_request_requisition".to_string(),
        requisition_number: 3,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Sent,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_sent_request_requisition_line() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_sent_request_requisition_line".to_string(),
        requisition_id: mock_sent_request_requisition().id,
        item_link_id: mock_item_a().id,
        requested_quantity: 10.0,
        suggested_quantity: 5.0,
        available_stock_on_hand: 1.0,
        average_monthly_consumption: 1.0,
        ..Default::default()
    }
}

pub fn mock_finalised_response_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_finalised_response_requisition".to_string(),
        requisition_number: 3,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Response,
        status: RequisitionStatus::Finalised,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_finalised_request_requisition_line() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_finalised_request_requisition_line".to_string(),
        requisition_id: mock_finalised_response_requisition().id,
        item_link_id: mock_item_a().id,
        requested_quantity: 10.0,
        suggested_quantity: 5.0,
        available_stock_on_hand: 1.0,
        average_monthly_consumption: 1.0,
        ..Default::default()
    }
}

pub fn mock_new_response_requisition_for_update_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_new_response_requisition_for_update_test".to_string(),
        requisition_number: 3,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_new_response_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_new_response_requisition".to_string(),
        requisition_number: 3,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Response,
        status: RequisitionStatus::New,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        ..Default::default()
    }
}

pub fn mock_new_response_requisition_for_update_test_line() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_new_response_requisition_for_update_test_line".to_string(),
        requisition_id: mock_new_response_requisition_for_update_test().id,
        item_link_id: mock_item_a().id,
        requested_quantity: 10.0,
        suggested_quantity: 5.0,
        available_stock_on_hand: 1.0,
        average_monthly_consumption: 1.0,
        ..Default::default()
    }
}

pub fn mock_full_new_response_requisition_for_update_test() -> FullMockRequisition {
    FullMockRequisition {
        requisition: RequisitionRow {
            id: "mock_full_new_response_requisition_for_update_test".to_string(),
            requisition_number: 10,
            name_link_id: "name_a".to_string(),
            store_id: mock_store_a().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            max_months_of_stock: 1.0,
            min_months_of_stock: 0.9,
            ..Default::default()
        },
        lines: vec![RequisitionLineRow {
            id: "mock_full_new_response_requisition_for_update_test_line".to_string(),
            requisition_id: "mock_full_new_response_requisition_for_update_test".to_string(),
            item_link_id: mock_item_a().id,
            requested_quantity: 10.0,
            suggested_quantity: 5.0,
            available_stock_on_hand: 1.0,
            average_monthly_consumption: 1.0,
            ..Default::default()
        }],
    }
}

pub fn mock_request_draft_requisition_calculation_test() -> FullMockRequisition {
    let requisition_id = "mock_request_draft_requisition_calculation_test".to_string();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    let line3_id = format!("{}3", requisition_id);
    let line4_id = format!("{}4", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_link_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: RequisitionType::Request,
            status: RequisitionStatus::Draft,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            ..Default::default()
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id,
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_a().id,
                requested_quantity: 10.0,
                suggested_quantity: 5.0,
                available_stock_on_hand: 1.0,
                average_monthly_consumption: 1.0,
                ..Default::default()
            },
            RequisitionLineRow {
                id: line2_id,
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_b().id,
                requested_quantity: 10.0,
                suggested_quantity: 5.0,
                available_stock_on_hand: 1.0,
                ..Default::default()
            },
            RequisitionLineRow {
                id: line3_id,
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_c().id,
                requested_quantity: 10.0,
                suggested_quantity: 5.0,
                available_stock_on_hand: 6.0,
                average_monthly_consumption: 1.0,
                ..Default::default()
            },
            RequisitionLineRow {
                id: line4_id,
                requisition_id,
                item_link_id: mock_item_d().id,
                requested_quantity: 10.0,
                suggested_quantity: 200.0,
                available_stock_on_hand: 20.0,
                average_monthly_consumption: 1.0,
                ..Default::default()
            },
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
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_link_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            ..Default::default()
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id,
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_a().id,
                requested_quantity: 10.0,
                suggested_quantity: 5.0,
                supply_quantity: 50.0,
                available_stock_on_hand: 1.0,
                average_monthly_consumption: 1.0,
                ..Default::default()
            },
            RequisitionLineRow {
                id: line2_id,
                requisition_id: requisition_id,
                item_link_id: mock_item_b().id,
                requested_quantity: 11.0,
                suggested_quantity: 5.0,
                supply_quantity: 100.0,
                available_stock_on_hand: 1.0,
                ..Default::default()
            },
        ],
    }
}

pub fn mock_new_response_requisition_test_invoice() -> FullMockInvoice {
    let invoice_id = "mock_new_response_requisition_test_invoice".to_string();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_link_id: mock_name_a().id,
            store_id: "store_a".to_string(),
            invoice_number: 20,
            requisition_id: Some(mock_new_response_requisition_test().requisition.id),
            r#type: InvoiceType::OutboundShipment,
            status: InvoiceStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(1970, 1, 1)
                .unwrap()
                .and_hms_milli_opt(12, 30, 0, 0)
                .unwrap(),
            ..Default::default()
        },
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
    RequisitionRow {
        id: "mock_request_program_requisition".to_string(),
        requisition_number: 3,
        name_link_id: "name_a".to_string(),
        store_id: mock_store_a().id,
        r#type: RequisitionType::Request,
        status: RequisitionStatus::Draft,
        created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        program_id: Some(mock_program_a().id),
        ..Default::default()
    }
}

pub fn mock_response_program_requisition() -> FullMockRequisition {
    let requisition_id = "mock_response_program_requisition".to_string();
    let line1_id = format!("{}1", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 10,
            name_link_id: "name_a".to_string(),
            store_id: mock_store_a().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            approval_status: Some(ApprovalStatusType::Pending),
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            max_months_of_stock: 3.0,
            min_months_of_stock: 1.0,
            program_id: Some(mock_program_a().id),
            ..Default::default()
        },
        lines: vec![RequisitionLineRow {
            id: line1_id,
            requisition_id: requisition_id,
            item_link_id: mock_item_a().id,
            requested_quantity: 10.0,
            suggested_quantity: 10.0,
            supply_quantity: 100.0,
            available_stock_on_hand: 1.0,
            average_monthly_consumption: 1.0,
            ..Default::default()
        }],
    }
}

pub fn mock_new_response_program_requisition() -> FullMockRequisition {
    let requisition_id = "mock_new_response_program_requisition".to_string();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);

    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 11,
            name_link_id: "name_a".to_string(),
            store_id: mock_store_a().id,
            r#type: RequisitionType::Response,
            status: RequisitionStatus::New,
            created_datetime: NaiveDate::from_ymd_opt(2021, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            max_months_of_stock: 3.0,
            min_months_of_stock: 1.0,
            program_id: Some(mock_program_a().id),
            ..Default::default()
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id,
                requisition_id: requisition_id.clone(),
                item_link_id: mock_item_a().id,
                requested_quantity: 9.0,
                suggested_quantity: 10.0,
                supply_quantity: 100.0,
                available_stock_on_hand: 1.0,
                average_monthly_consumption: 1.0,
                option_id: None,
                ..Default::default()
            },
            RequisitionLineRow {
                id: line2_id,
                requisition_id: requisition_id,
                item_link_id: mock_item_b().id,
                requested_quantity: 10.0,
                suggested_quantity: 10.0,
                supply_quantity: 100.0,
                available_stock_on_hand: 1.0,
                average_monthly_consumption: 1.0,
                option_id: None,
                ..Default::default()
            },
        ],
    }
}
