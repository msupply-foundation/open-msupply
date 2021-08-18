use crate::database::schema::{RequisitionRow, RequisitionRowType};

pub fn mock_requisition_a() -> RequisitionRow {
    RequisitionRow {
        id: String::from("requisition_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        type_of: RequisitionRowType::Request,
    }
}

pub fn mock_requisition_b() -> RequisitionRow {
    RequisitionRow {
        id: String::from("requisition_b"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        type_of: RequisitionRowType::Response,
    }
}

pub fn mock_requisition_c() -> RequisitionRow {
    RequisitionRow {
        id: String::from("requisition_c"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        type_of: RequisitionRowType::Request,
    }
}

pub fn mock_requisition_d() -> RequisitionRow {
    RequisitionRow {
        id: String::from("requisition_d"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        type_of: RequisitionRowType::Response,
    }
}

pub fn mock_requisition_e() -> RequisitionRow {
    RequisitionRow {
        id: String::from("requisition_e"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_c"),
        type_of: RequisitionRowType::Request,
    }
}

pub fn mock_requisition_f() -> RequisitionRow {
    RequisitionRow {
        id: String::from("requisition_f"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_b"),
        type_of: RequisitionRowType::Response,
    }
}

pub fn mock_requisitions() -> Vec<RequisitionRow> {
    vec![
        mock_requisition_a(),
        mock_requisition_b(),
        mock_requisition_c(),
        mock_requisition_d(),
        mock_requisition_e(),
        mock_requisition_f(),
    ]
}
