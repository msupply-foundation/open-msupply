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
        prescription_datetime: prescription_date,
    }: UpdatePrescription,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    let prescription_date = match prescription_date {
        Some(prescription_date) => Some(prescription_date),
        None => existing_invoice.allocated_datetime, // prescription date is stored in allocated_datetime, if not provided in this request
    };

    set_new_status_datetime(&mut update_invoice, &input_status, prescription_date);

    update_invoice.name_link_id = input_patient_id.unwrap_or(update_invoice.name_link_id);
    update_invoice.clinician_link_id = input_clinician_id.or(update_invoice.clinician_link_id);
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.colour = input_colour.or(update_invoice.colour);
    update_invoice.allocated_datetime = prescription_date.or(update_invoice.allocated_datetime);

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

fn set_new_status_datetime(
    invoice: &mut InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
    prescription_datetime: Option<NaiveDateTime>,
) {
    let new_status = match status {
        Some(status) => status,
        None => return,
    };

    if new_status.full_status() == invoice.status {
        return;
    }

    let status_datetime = prescription_datetime.unwrap_or_else(|| Utc::now().naive_utc());

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
