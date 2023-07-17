use chrono::Utc;

use repository::{InvoiceRow, InvoiceRowStatus, StockLineRow, StorageConnection};

use crate::invoice::common::{
    generate_batches_total_number_of_packs_update, InvoiceLineHasNoStockLine,
};

use super::{UpdatePrescription, UpdatePrescriptionError, UpdatePrescriptionStatus};

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<StockLineRow>>,
    pub(crate) update_invoice: InvoiceRow,
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
    }: UpdatePrescription,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_id = input_patient_id.unwrap_or(update_invoice.name_id);
    update_invoice.clinician_id = input_clinician_id.or(update_invoice.clinician_id);
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.colour = input_colour.or(update_invoice.colour);

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status().into()
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

    Ok(GenerateResult {
        batches_to_update,
        update_invoice,
    })
}

fn should_update_batches_total_number_of_packs(
    invoice: &InvoiceRow,
    status: &Option<UpdatePrescriptionStatus>,
) -> bool {
    if let Some(new_invoice_status) = UpdatePrescriptionStatus::full_status_option(status) {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceRowStatus::Picked.index()
            && invoice_status_index < InvoiceRowStatus::Picked.index()
    } else {
        false
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

    let current_datetime = Utc::now().naive_utc();

    match (&invoice.status, new_status) {
        (InvoiceRowStatus::Verified, _) => {}
        (InvoiceRowStatus::New, UpdatePrescriptionStatus::Verified) => {
            invoice.picked_datetime = Some(current_datetime.clone());
            invoice.verified_datetime = Some(current_datetime)
        }
        (InvoiceRowStatus::New, UpdatePrescriptionStatus::Picked) => {
            invoice.picked_datetime = Some(current_datetime);
        }
        (InvoiceRowStatus::Picked, UpdatePrescriptionStatus::Verified) => {
            invoice.verified_datetime = Some(current_datetime)
        }
        _ => {}
    }
}
