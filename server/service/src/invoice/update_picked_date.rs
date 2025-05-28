use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, RepositoryError,
    StorageConnection,
};

use super::common::get_invoice_status_datetime;

const MIN_PICKED_DATE_UPDATE_INTERVAL_SECONDS: i64 = 60;

fn auto_pick_invoice(
    connection: &StorageConnection,
    invoice: InvoiceRow,
) -> Result<InvoiceRow, RepositoryError> {
    // If the invoice is a prescription and it's in the new status, we should automatically pick it
    if invoice.r#type == InvoiceType::Prescription && invoice.status == InvoiceStatus::New {
        let update = InvoiceRow {
            status: InvoiceStatus::Picked,
            picked_datetime: Some(get_invoice_status_datetime(&invoice)),
            ..invoice
        };

        // Update the invoice status to picked
        let _result = InvoiceRowRepository::new(connection).upsert_one(&update)?;
        return Ok(update);
    }
    Ok(invoice)
}

/// This function is called when a line is updated on an invoice. It will update the picked date if appropriate.
pub fn update_picked_date(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> Result<(), RepositoryError> {
    // Some invoices such as prescriptions should be automatically picked when lines are added
    let invoice = auto_pick_invoice(connection, invoice.clone())?;

    // We only want to update the picked date if the invoice is in the picked status
    if invoice.status != InvoiceStatus::Picked {
        return Ok(());
    };

    if let Some(picked_datetime) = invoice.picked_datetime {
        // Check if picked date was updated recently, if so we don't want to update the picked date again
        let now = chrono::Utc::now().naive_utc();
        if now.signed_duration_since(picked_datetime).num_seconds()
            < MIN_PICKED_DATE_UPDATE_INTERVAL_SECONDS
        {
            return Ok(());
        }
    }

    // Use the invoice's backdated datetime if it's set, otherwise set the status to now
    let status_datetime = get_invoice_status_datetime(&invoice);

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
