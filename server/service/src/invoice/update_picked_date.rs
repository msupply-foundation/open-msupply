use repository::{InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, RepositoryError};

use crate::service_provider::ServiceContext;

use super::{
    common::get_invoice_status_datetime, update_prescription, UpdatePrescription,
    UpdatePrescriptionStatus,
};

const MIN_PICKED_DATE_UPDATE_INTERVAL_SECONDS: i64 = 60;

pub enum UpdatePickedDateError {
    AutoPickFailed(String),
    RepositoryError(RepositoryError),
}

impl From<RepositoryError> for UpdatePickedDateError {
    fn from(error: RepositoryError) -> Self {
        UpdatePickedDateError::RepositoryError(error)
    }
}

fn auto_pick_invoice(
    ctx: &ServiceContext,
    invoice: InvoiceRow,
) -> Result<InvoiceRow, UpdatePickedDateError> {
    // If the invoice is a prescription and it's in the new status, we should automatically pick it
    if invoice.r#type == InvoiceType::Prescription && invoice.status == InvoiceStatus::New {
        let updated = update_prescription(
            ctx,
            UpdatePrescription {
                id: invoice.id.clone(),
                status: Some(UpdatePrescriptionStatus::Picked),
                ..Default::default()
            },
        )
        .map_err(|e| {
            UpdatePickedDateError::AutoPickFailed(format!(
                "Failed to auto-pick invoice {}: {:?}",
                invoice.id, e
            ))
        })?;
        return Ok(updated.invoice_row);
    }
    Ok(invoice)
}

/// This function is called when a line is updated on an invoice. It will update the picked date if appropriate.
pub fn update_picked_date(
    ctx: &ServiceContext,
    invoice: &InvoiceRow,
) -> Result<(), UpdatePickedDateError> {
    // Some invoices such as prescriptions should be automatically picked when lines are added
    let invoice = auto_pick_invoice(ctx, invoice.clone())?;

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

    let _result = InvoiceRowRepository::new(&ctx.connection).upsert_one(&update)?;
    Ok(())
}
