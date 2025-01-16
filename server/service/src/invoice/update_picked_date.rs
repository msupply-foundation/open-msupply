use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, RepositoryError, StorageConnection,
};

use super::common::get_invoice_status_datetime;

const MIN_PICKED_DATE_UPDATE_INTERVAL_SECONDS: i64 = 60;

/// This function is called when a line is updated on an invoice. It will update the picked date if appropriate.
pub fn update_picked_date(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> Result<(), RepositoryError> {
    // We only want to update the picked date if the invoice is in the picked status
    if invoice.status != InvoiceStatus::Picked {
        return Ok(());
    };

    let Some(picked_datetime) = invoice.picked_datetime else {
        // No picked date set, so we won't do anything, this shouldn't really happens as we just checked we are in picked status
        return Ok(());
    };

    // Check if invoice was updated recently, if so we don't want to update the picked date again
    let now = chrono::Utc::now().naive_utc();
    if now.signed_duration_since(picked_datetime).num_seconds()
        < MIN_PICKED_DATE_UPDATE_INTERVAL_SECONDS
    {
        return Ok(());
    }

    // Use the invoice's backdated datetime if it's set, otherwise set the status to now
    let status_datetime = get_invoice_status_datetime(invoice);

    // Don't update if it hasn't changed (this could happen if invoice was backdated
    if invoice.picked_datetime == Some(status_datetime) {
        return Ok(());
    }

    let update = InvoiceRow {
        picked_datetime: Some(status_datetime),
        ..invoice.clone()
    };

    let _result = InvoiceRowRepository::new(connection).upsert_one(&update)?;
    Ok(())
}
