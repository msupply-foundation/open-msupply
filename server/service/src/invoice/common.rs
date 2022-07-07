use repository::InvoiceRow;
use util::inline_edit;

pub fn generate_invoice_user_id_update(
    user_id: &str,
    existing_invoice_row: InvoiceRow,
) -> Option<InvoiceRow> {
    let user_id_option = Some(user_id.to_string());
    let user_id_has_changed = existing_invoice_row.user_id != user_id_option;
    user_id_has_changed.then(|| {
        inline_edit(&existing_invoice_row, |mut u| {
            u.user_id = user_id_option;
            u
        })
    })
}

pub fn total_after_tax(total_before_tax: f64, tax: Option<f64>) -> f64 {
    match tax {
        Some(tax) => total_before_tax * (1.0 + tax / 100.0),
        None => total_before_tax,
    }
}
