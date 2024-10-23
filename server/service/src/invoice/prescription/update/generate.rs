use chrono::{NaiveDateTime, Utc};

use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow, InvoiceRow,
    InvoiceStatus, RepositoryError, StockLineRow, StorageConnection,
};

use crate::invoice::common::{
    generate_batches_total_number_of_packs_update, InvoiceLineHasNoStockLine,
};

use super::{UpdatePrescription, UpdatePrescriptionError, UpdatePrescriptionStatus};

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<StockLineRow>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) lines_to_trim: Option<Vec<InvoiceLineRow>>,
}

pub(crate) fn generate(
    existing_invoice: InvoiceRow,
    UpdatePrescription {
        id: _,
        status: input_status,
        patient_id: input_patient_id,
        clinician_id: input_clinician_id,
        comment: input_comment,
        colour: input_colour,
        backdated_datetime: backdated_datetime_input,
    }: UpdatePrescription,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();


    if let Some(backdated_datetime) = backdated_datetime_input {
        // This will update the backdated_datetime in the mut update_invoice
        // So status code can assume it's already been set on the update_invoice
        handle_new_backdated_datetime(&mut update_invoice, backdated_datetime);
    }
   
    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_link_id = input_patient_id.unwrap_or(update_invoice.name_link_id);
    update_invoice.clinician_link_id = input_clinician_id.or(update_invoice.clinician_link_id);
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.colour = input_colour.or(update_invoice.colour);

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status()
    }

    let batches_to_update = if should_update_batches_total_number_of_packs {
        Some(
            generate_batches_total_number_of_packs_update(&update_invoice.id, connection).map_err(
                |e| match e {
                    InvoiceLineHasNoStockLine::InvoiceLineHasNoStockLine(line) => {
                        UpdatePrescriptionError::InvoiceLineHasNoStockLine(line)
                    }
                    InvoiceLineHasNoStockLine::DatabaseError(e) => {
                        UpdatePrescriptionError::DatabaseError(e)
                    }
                },
            )?,
        )
    } else {
        None
    };

    let lines_to_trim = lines_to_trim(connection, &existing_invoice, &input_status)?;

    Ok(GenerateResult {
        batches_to_update,
        update_invoice,
        lines_to_trim,
    })
}

fn should_update_batches_total_number_of_packs(
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> bool {
    if let Some(new_invoice_status) = UpdatePrescriptionStatus::full_status_option(status) {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceStatus::Picked.index()
            && invoice_status_index < InvoiceStatus::Picked.index()
    } else {
        false
    }
}
// Replace datetimes that are not null with the new status_datetime
fn replace_status_datetimes(invoice: &mut InvoiceRow, new_status_datetime: NaiveDateTime) {
    invoice.allocated_datetime = invoice.allocated_datetime.map(|_| new_status_datetime);
    invoice.picked_datetime = invoice.picked_datetime.map(|_| new_status_datetime);
    invoice.verified_datetime = invoice.verified_datetime.map(|_| new_status_datetime);
}

// Handle a change to backdated_time
fn handle_new_backdated_datetime(invoice: &mut InvoiceRow, backdated_datetime: NaiveDateTime){
    
    // We need to check if we are actually needing to back_date here, if the backdated_datetime is in the future, we unset the backdated_datetime as it isn't possible to future date.
    if invoice.created_datetime < backdated_datetime {
        // Not actually backdated!
        let now = Utc::now().naive_utc();
        invoice.backdated_datetime = None;
        replace_status_datetimes(invoice, now);
     } else{
        // Otherwise, we need to update the backdated_datetime to the new one, and replace existing status times
        invoice.backdated_datetime = Some(backdated_datetime);
        replace_status_datetimes(invoice, backdated_datetime);
    }

}

fn set_new_status_datetime(invoice: &mut InvoiceRow, status: &Option<UpdatePrescriptionStatus>) {
    let new_status = match status {
        Some(status) => status,
        None => return,
    };

    if new_status.full_status() == invoice.status {
        return;
    }

    // Use the invoice's backdated datetime if it's set, otherwise set the status to now
    let status_datetime = invoice.backdated_datetime.unwrap_or(Utc::now().naive_utc());

    match (&invoice.status, new_status) {
        (InvoiceStatus::Verified, _) => {}
        (InvoiceStatus::New, UpdatePrescriptionStatus::Verified) => {
            invoice.picked_datetime = Some(status_datetime);
            invoice.verified_datetime = Some(status_datetime)
        }
        (InvoiceStatus::New, UpdatePrescriptionStatus::Picked) => {
            invoice.picked_datetime = Some(status_datetime);
        }
        (InvoiceStatus::Picked, UpdatePrescriptionStatus::Verified) => {
            invoice.verified_datetime = Some(status_datetime)
        }
        _ => {}
    }
}

// If status changed to verified, remove empty lines
fn lines_to_trim(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> Result<Option<Vec<InvoiceLineRow>>, RepositoryError> {
    // Status sequence for outbound shipment: New, Picked, Verified
    if invoice.status == InvoiceStatus::Verified {
        return Ok(None);
    }

    let new_prescription_status = match UpdatePrescriptionStatus::full_status_option(status) {
        Some(new_prescription_status) => new_prescription_status,
        None => return Ok(None),
    };

    if new_prescription_status != InvoiceStatus::Verified {
        return Ok(None);
    }

    // If new status is Verified and previous invoice status is Picked
    // add all lines to be deleted
    let empty_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .number_of_packs(EqualFilter::equal_to_f64(0.0)),
    )?;

    if empty_lines.is_empty() {
        return Ok(None);
    }

    let invoice_line_rows = empty_lines
        .into_iter()
        .map(|l| l.invoice_line_row)
        .collect();
    Ok(Some(invoice_line_rows))
}
