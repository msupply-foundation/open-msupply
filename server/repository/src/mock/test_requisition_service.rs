use chrono::NaiveDate;

use crate::schema::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
    MasterListLineRow, MasterListNameJoinRow, MasterListRow, RequisitionLineRow, RequisitionRow,
    RequisitionRowStatus, RequisitionRowType,
};

use super::{
    common::{FullMockInvoice, FullMockInvoiceLine, FullMockMasterList, FullMockRequisition},
    mock_item_a, mock_item_b, mock_item_c, mock_item_d, mock_item_stats_item1,
    mock_item_stats_item2, mock_name_a, mock_name_store_a, mock_stock_line_a, mock_store_a,
    MockData,
};

pub fn mock_test_requisition_service() -> MockData {
    let mut result = MockData::default();
    result.requisitions.push(mock_requisition_for_number_test());
    result
        .requisition_lines
        .push(mock_sent_request_requisition_line());
    result
        .requisition_lines
        .push(mock_draft_response_requisition_for_update_test_line());
    result
        .requisition_lines
        .push(mock_finalised_request_requisition_line());
    result
        .requisitions
        .push(mock_draft_request_requisition_for_update_test());
    result
        .requisitions
        .push(mock_draft_response_requisition_for_update_test());
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
        .push(mock_new_response_requisition_test());
    result
        .full_master_lists
        .push(mock_test_add_from_master_list());
    result
        .full_master_lists
        .push(mock_test_not_store_a_master_list());

    result.full_invoices = vec![(
        "mock_new_response_requisition_test_invoice".to_owned(),
        mock_new_response_requisition_test_invoice(),
    )]
    .into_iter()
    .collect();

    result
}

pub fn mock_requisition_for_number_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_requisition_for_number_test".to_owned(),
        requisition_number: 111111111,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_draft_request_requisition_for_update_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_draft_request_requisition_for_update_test".to_owned(),
        requisition_number: 3,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_sent_request_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_sent_request_requisition".to_owned(),
        requisition_number: 3,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Request,
        status: RequisitionRowStatus::Sent,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_sent_request_requisition_line() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_sent_request_requisition_line".to_owned(),
        requisition_id: mock_sent_request_requisition().id,
        item_id: mock_item_a().id,
        requested_quantity: 10,
        suggested_quantity: 5,
        supply_quantity: 0,
        available_stock_on_hand: 1,
        average_monthly_consumption: 1,
    }
}

pub fn mock_finalised_response_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_finalised_response_requisition".to_owned(),
        requisition_number: 3,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Response,
        status: RequisitionRowStatus::Finalised,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_finalised_request_requisition_line() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_finalised_request_requisition_line".to_owned(),
        requisition_id: mock_finalised_response_requisition().id,
        item_id: mock_item_a().id,
        requested_quantity: 10,
        suggested_quantity: 5,
        supply_quantity: 0,
        available_stock_on_hand: 1,
        average_monthly_consumption: 1,
    }
}

pub fn mock_draft_response_requisition_for_update_test() -> RequisitionRow {
    RequisitionRow {
        id: "mock_draft_response_requisition_for_update_test".to_owned(),
        requisition_number: 3,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Response,
        status: RequisitionRowStatus::Draft,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_new_response_requisition() -> RequisitionRow {
    RequisitionRow {
        id: "mock_new_response_requisition".to_owned(),
        requisition_number: 3,
        name_id: "name_a".to_owned(),
        store_id: mock_store_a().id,
        r#type: RequisitionRowType::Response,
        status: RequisitionRowStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
        sent_datetime: None,
        finalised_datetime: None,
        colour: None,
        comment: None,
        their_reference: None,
        max_months_of_stock: 1.0,
        min_months_of_stock: 0.9,
        linked_requisition_id: None,
    }
}

pub fn mock_draft_response_requisition_for_update_test_line() -> RequisitionLineRow {
    RequisitionLineRow {
        id: "mock_draft_response_requisition_for_update_test_line".to_owned(),
        requisition_id: mock_draft_response_requisition_for_update_test().id,
        item_id: mock_item_a().id,
        requested_quantity: 10,
        suggested_quantity: 5,
        supply_quantity: 0,
        available_stock_on_hand: 1,
        average_monthly_consumption: 1,
    }
}

pub fn mock_request_draft_requisition_calculation_test() -> FullMockRequisition {
    let requisition_id = "mock_request_draft_requisition_calculation_test".to_owned();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    let line3_id = format!("{}3", requisition_id);
    let line4_id = format!("{}4", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: RequisitionRowType::Request,
            status: RequisitionRowStatus::Draft,
            created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
            sent_datetime: None,
            finalised_datetime: None,
            colour: None,
            comment: None,
            their_reference: None,
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            linked_requisition_id: None,
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_a().id,
                requested_quantity: 10,
                suggested_quantity: 5,
                supply_quantity: 0,
                available_stock_on_hand: 1,
                average_monthly_consumption: 1,
            },
            RequisitionLineRow {
                id: line2_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_b().id,
                requested_quantity: 10,
                suggested_quantity: 5,
                supply_quantity: 0,
                available_stock_on_hand: 1,
                average_monthly_consumption: 0,
            },
            RequisitionLineRow {
                id: line3_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_c().id,
                requested_quantity: 10,
                suggested_quantity: 5,
                supply_quantity: 0,
                available_stock_on_hand: 6,
                average_monthly_consumption: 1,
            },
            RequisitionLineRow {
                id: line4_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_d().id,
                requested_quantity: 10,
                suggested_quantity: 200,
                supply_quantity: 0,
                available_stock_on_hand: 20,
                average_monthly_consumption: 1,
            },
        ],
    }
}

pub fn mock_test_not_store_a_master_list() -> FullMockMasterList {
    let id = "mock_test_not_store_a_master_list".to_owned();

    FullMockMasterList {
        master_list: MasterListRow {
            id: id.clone(),
            name: id.clone(),
            code: id.clone(),
            description: id.clone(),
        },
        joins: vec![],
        lines: vec![],
    }
}

pub fn mock_test_add_from_master_list() -> FullMockMasterList {
    let id = "mock_test_add_from_master_list".to_owned();
    let join1 = format!("{}1", id);
    let line1 = format!("{}1", id);
    let line2 = format!("{}2", id);
    let line3 = format!("{}3", id);

    FullMockMasterList {
        master_list: MasterListRow {
            id: id.clone(),
            name: id.clone(),
            code: id.clone(),
            description: id.clone(),
        },
        joins: vec![MasterListNameJoinRow {
            id: join1,
            master_list_id: id.clone(),
            name_id: mock_name_store_a().id,
        }],
        lines: vec![
            MasterListLineRow {
                id: line1.clone(),
                item_id: mock_item_a().id,
                master_list_id: id.clone(),
            },
            MasterListLineRow {
                id: line2.clone(),
                item_id: mock_item_stats_item1().id,
                master_list_id: id.clone(),
            },
            MasterListLineRow {
                id: line3.clone(),
                item_id: mock_item_stats_item2().id,
                master_list_id: id.clone(),
            },
        ],
    }
}

pub fn mock_new_response_requisition_test() -> FullMockRequisition {
    let requisition_id = "mock_new_response_requisition_test".to_owned();
    let line1_id = format!("{}1", requisition_id);
    let line2_id = format!("{}2", requisition_id);
    FullMockRequisition {
        requisition: RequisitionRow {
            id: requisition_id.clone(),
            requisition_number: 3,
            name_id: mock_name_a().id,
            store_id: mock_store_a().id,
            r#type: RequisitionRowType::Response,
            status: RequisitionRowStatus::New,
            created_datetime: NaiveDate::from_ymd(2021, 01, 01).and_hms(0, 0, 0),
            sent_datetime: None,
            finalised_datetime: None,
            colour: None,
            comment: None,
            their_reference: None,
            max_months_of_stock: 10.0,
            min_months_of_stock: 5.0,
            linked_requisition_id: None,
        },
        lines: vec![
            RequisitionLineRow {
                id: line1_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_a().id,
                requested_quantity: 10,
                suggested_quantity: 5,
                supply_quantity: 50,
                available_stock_on_hand: 1,
                average_monthly_consumption: 1,
            },
            RequisitionLineRow {
                id: line2_id,
                requisition_id: requisition_id.clone(),
                item_id: mock_item_b().id,
                requested_quantity: 11,
                suggested_quantity: 5,
                supply_quantity: 100,
                available_stock_on_hand: 1,
                average_monthly_consumption: 0,
            },
        ],
    }
}

pub fn mock_new_response_requisition_test_invoice() -> FullMockInvoice {
    let invoice_id = "mock_new_response_requisition_test_invoice".to_owned();
    let line1_id = format!("{}1", invoice_id);
    let line2_id = format!("{}2", invoice_id);

    FullMockInvoice {
        invoice: InvoiceRow {
            id: invoice_id.clone(),
            name_id: mock_name_a().id,
            store_id: "store_a".to_owned(),
            invoice_number: 20,
            requisition_id: Some(mock_new_response_requisition_test().requisition.id),
            r#type: InvoiceRowType::OutboundShipment,
            status: InvoiceRowStatus::New,
            on_hold: false,
            name_store_id: None,
            comment: None,
            their_reference: None,
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
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
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
            FullMockInvoiceLine {
                line: InvoiceLineRow {
                    id: line2_id.clone(),
                    invoice_id: invoice_id.clone(),
                    r#type: InvoiceLineRowType::UnallocatedStock,
                    pack_size: 1,
                    number_of_packs: 2,
                    item_id: mock_item_a().id,
                    item_name: mock_item_a().name,
                    item_code: mock_item_a().code,
                    cost_price_per_pack: 0.0,
                    sell_price_per_pack: 0.0,
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
