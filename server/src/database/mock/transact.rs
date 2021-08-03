use crate::database::schema::{TransactRow, TransactRowType};

pub fn mock_customer_invoice_a() -> TransactRow {
    TransactRow {
        id: String::from("customer_invoice_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 1,
        type_of: TransactRowType::CustomerInvoice,
    }
}

pub fn mock_customer_invoice_b() -> TransactRow {
    TransactRow {
        id: String::from("customer_invoice_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        type_of: TransactRowType::CustomerInvoice,
    }
}

pub fn mock_supplier_invoice_a() -> TransactRow {
    TransactRow {
        id: String::from("supplier_invoice_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 2,
        type_of: TransactRowType::SupplierInvoice,
    }
}

pub fn mock_supplier_invoice_b() -> TransactRow {
    TransactRow {
        id: String::from("supplier_invoice_b"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        type_of: TransactRowType::SupplierInvoice,
    }
}

pub fn mock_customer_invoices() -> Vec<TransactRow> {
    vec![mock_customer_invoice_a(), mock_customer_invoice_b()]
}

pub fn mock_supplier_invoices() -> Vec<TransactRow> {
    vec![mock_supplier_invoice_a(), mock_supplier_invoice_b()]
}

pub fn mock_transacts() -> Vec<TransactRow> {
    let mut mock_transacts: Vec<TransactRow> = Vec::new();

    mock_transacts.extend(mock_customer_invoices());
    mock_transacts.extend(mock_supplier_invoices());

    mock_transacts
}
