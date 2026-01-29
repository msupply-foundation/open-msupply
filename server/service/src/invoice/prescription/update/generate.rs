use chrono::Utc;

use repository::{InvoiceRow, InvoiceStatus, StockLineRow, StorageConnection};

use crate::invoice::{
    common::{
        generate_batches_total_number_of_packs_update, get_invoice_status_datetime,
        InvoiceLineHasNoStockLine,
    },
    invoice_date_utils::handle_new_backdated_datetime,
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
        backdated_datetime: backdated_datetime_input,
        diagnosis_id,
        program_id,
        their_reference,
        name_insurance_join_id: input_name_insurance_join_id,
        insurance_discount_amount: input_insurance_discount_amount,
        insurance_discount_percentage: input_insurance_discount_percentage,
    }: UpdatePrescription,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    if let Some(backdated_datetime) = backdated_datetime_input {
        // This will update the backdated_datetime in the mut update_invoice
        // So status code can assume it's already been set on the update_invoice
        handle_new_backdated_datetime(
            &mut update_invoice,
            backdated_datetime,
            Utc::now().naive_utc(),
        );
    }

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_id = input_patient_id.unwrap_or(update_invoice.name_id);
    if let Some(clinician_link_id) = input_clinician_id {
        update_invoice.clinician_link_id = clinician_link_id.value;
    }
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.colour = input_colour.or(update_invoice.colour);
    if let Some(diagnosis_id) = diagnosis_id {
        update_invoice.diagnosis_id = diagnosis_id.value;
    }

    if let Some(program_id) = program_id {
        update_invoice.program_id = program_id.value;
    }

    if let Some(their_reference) = their_reference {
        update_invoice.their_reference = their_reference.value;
    }

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status()
    }

    if let Some(name_insurance_join_id) = input_name_insurance_join_id {
        update_invoice.name_insurance_join_id = name_insurance_join_id.value;
    }

    update_invoice.insurance_discount_amount =
        input_insurance_discount_amount.or(update_invoice.insurance_discount_amount);

    update_invoice.insurance_discount_percentage =
        input_insurance_discount_percentage.or(update_invoice.insurance_discount_percentage);

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

        new_invoice_status_index >= InvoiceStatus::Picked.index()
            && invoice_status_index < InvoiceStatus::Picked.index()
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

    // Use the invoice's backdated datetime if it's set, otherwise set the status to now
    let status_datetime = get_invoice_status_datetime(invoice);

    match (&invoice.status, new_status) {
        (InvoiceStatus::Verified, UpdatePrescriptionStatus::Cancelled) => {
            invoice.cancelled_datetime = Some(status_datetime)
        }
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
