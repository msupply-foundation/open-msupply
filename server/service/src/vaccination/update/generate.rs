use repository::{StockLine, VaccinationRow};

use crate::{
    invoice::inventory_adjustment::InsertInventoryAdjustment,
    vaccination::generate::{generate_create_prescription, CreatePrescription},
    NullableUpdate,
};

use super::UpdateVaccination;

pub struct GenerateInput {
    pub patient_id: String,
    pub existing_vaccination: VaccinationRow,
    pub update_input: UpdateVaccination,
    pub stock_line: Option<StockLine>,
}

pub struct GenerateResult {
    pub vaccination: VaccinationRow,
    pub create_inventory_adjustment: Option<InsertInventoryAdjustment>,
    pub create_prescription: Option<CreatePrescription>,
}

pub fn generate(
    GenerateInput {
        patient_id,
        existing_vaccination,
        update_input,
        stock_line,
    }: GenerateInput,
) -> GenerateResult {
    // Update from input, or keep existing
    let clinician_id = match update_input.clinician_id {
        Some(NullableUpdate { value }) => value,
        None => existing_vaccination.clinician_link_id,
    };

    let create_prescription = match stock_line {
        // if stock_line is Some, the vaccination was given, create a prescription
        Some(stock_line) => {
            let create_prescription =
                generate_create_prescription(stock_line, patient_id, clinician_id.clone());

            Some(create_prescription)
        }
        None => None,
    };

    let VaccinationRow {
        id,
        store_id,
        program_enrolment_id,
        encounter_id,
        vaccine_course_dose_id,
        user_id,
        created_datetime,

        clinician_link_id: _,
        vaccination_date,
        given,
        stock_line_id,
        not_given_reason,
        comment,
        invoice_id,
    } = existing_vaccination;

    let vaccination = VaccinationRow {
        // always copy from existing
        id,
        store_id,
        program_enrolment_id,
        user_id,
        created_datetime,
        encounter_id,
        vaccine_course_dose_id,

        // Update, or default to existing
        clinician_link_id: clinician_id,
        vaccination_date: update_input.vaccination_date.unwrap_or(vaccination_date),
        given: update_input.given.unwrap_or(given),
        comment: update_input.comment.or(comment),

        stock_line_id: match update_input.given {
            // If we updated to not given, clear the stock line
            Some(false) => None,
            // Otherwise update or default to existing
            _ => update_input.stock_line_id.or(stock_line_id),
        },

        not_given_reason: match update_input.given {
            // If we updated to given, clear the reason
            Some(true) => None,
            // Otherwise update or default to existing
            _ => update_input.not_given_reason.or(not_given_reason),
        },

        invoice_id: match update_input.given {
            // If we updated to not given, clear the invoice
            Some(false) => None,
            // Otherwise update or default to existing
            _ => create_prescription
                .as_ref()
                .map(|p| p.update_prescription_input.id.clone())
                .or(invoice_id),
        },
    };

    GenerateResult {
        vaccination,
        create_prescription,
        // TODO
        create_inventory_adjustment: None,
    }
}
