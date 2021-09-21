use crate::database::schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType};

pub fn mock_customer_invoice_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("customer_invoice_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_b"),
        invoice_number: 1,
        r#type: InvoiceRowType::CustomerInvoice,
        status: InvoiceRowStatus::Draft,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: String::from(""),
        confirm_datetime: Some(String::from("")),
        finalised_datetime: Some(String::from("")),
    }
}

pub fn mock_customer_invoice_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("customer_invoice_b"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_c"),
        invoice_number: 3,
        r#type: InvoiceRowType::CustomerInvoice,
        status: InvoiceRowStatus::Draft,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: String::from(""),
        confirm_datetime: Some(String::from("")),
        finalised_datetime: Some(String::from("")),
    }
}

pub fn mock_supplier_invoice_a() -> InvoiceRow {
    InvoiceRow {
        id: String::from("supplier_invoice_a"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        invoice_number: 2,
        r#type: InvoiceRowType::SupplierInvoice,
        status: InvoiceRowStatus::Draft,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: String::from(""),
        confirm_datetime: Some(String::from("")),
        finalised_datetime: Some(String::from("")),
    }
}

pub fn mock_supplier_invoice_b() -> InvoiceRow {
    InvoiceRow {
        id: String::from("supplier_invoice_b"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        invoice_number: 4,
        r#type: InvoiceRowType::SupplierInvoice,
        status: InvoiceRowStatus::Draft,
        comment: Some(String::from("")),
        their_reference: Some(String::from("")),
        entry_datetime: String::from(""),
        confirm_datetime: Some(String::from("")),
        finalised_datetime: Some(String::from("")),
    }
}

pub fn mock_customer_invoices() -> Vec<InvoiceRow> {
    vec![mock_customer_invoice_a(), mock_customer_invoice_b()]
}

pub fn mock_supplier_invoices() -> Vec<InvoiceRow> {
    vec![mock_supplier_invoice_a(), mock_supplier_invoice_b()]
}

pub fn mock_invoices() -> Vec<InvoiceRow> {
    let mut mock_invoices: Vec<InvoiceRow> = Vec::new();

    mock_invoices.extend(mock_customer_invoices());
    mock_invoices.extend(mock_supplier_invoices());

    mock_invoices
}
