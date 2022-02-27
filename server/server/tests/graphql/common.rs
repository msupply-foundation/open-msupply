macro_rules! get_invoice_lines_inline {
    ($invoice_id:expr, $connection:expr) => {{
        repository::InvoiceLineRowRepository::new($connection)
            .find_many_by_invoice_id($invoice_id)
            .unwrap()
    }};
}

pub(crate) use get_invoice_lines_inline;
