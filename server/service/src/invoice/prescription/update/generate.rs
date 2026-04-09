use chrono::Utc;

use repository::{InvoiceRow, InvoiceStatus, InvoiceType, StorageConnection};

use crate::invoice::{
    common::get_invoice_status_datetime,
    invoice_date_utils::handle_new_backdated_datetime,
    stock_effect::{stock_effects, StockEffect},
};

use super::{UpdatePrescription, UpdatePrescriptionError, UpdatePrescriptionStatus};

pub(crate) struct GenerateResult {
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) stock_effect: Option<StockEffect>,
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
    _connection: &StorageConnection,
) -> Result<GenerateResult, UpdatePrescriptionError> {
    let new_status = UpdatePrescriptionStatus::full_status_option(&input_status);
    let stock_effect = new_status
        .as_ref()
        .map(|to| stock_effects(&InvoiceType::Prescription, &existing_invoice.status, to));
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

    Ok(GenerateResult {
        update_invoice,
        stock_effect,
    })
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
