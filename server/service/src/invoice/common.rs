use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceRow,
    RepositoryError, StorageConnection,
};
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

pub(crate) fn get_lines_for_invoice(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    let result = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))?;

    Ok(result)
}
