use chrono::Utc;
use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, RepositoryError, StorageConnection,
};

/// This function is called when a line is updated on an invoice. It will update the picked date if appropriate.
pub fn update_picked_date(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> Result<(), RepositoryError> {
    // We only want to update the picked date if the invoice is in the picked status and is a prescription
    if invoice.status != InvoiceStatus::Picked {
        return Ok(());
    }

    // Use the invoice's backdated datetime if it's set, otherwise set the status to now
    let status_datetime = invoice.backdated_datetime.unwrap_or(Utc::now().naive_utc());

    let update = InvoiceRow {
        picked_datetime: Some(status_datetime),
        ..invoice.clone()
    };
    let _result = InvoiceRowRepository::new(connection).upsert_one(&update)?;
    Ok(())
}
