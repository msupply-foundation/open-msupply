use repository::{StockLine, VaccinationRow};
use util::constants::REVERSE_PRESCRIPTION_REASON_ID;

use crate::{
    invoice::inventory_adjustment::{AdjustmentType, InsertInventoryAdjustment},
    vaccination::generate::{
        generate_create_prescription, get_dose_as_number_of_packs, CreatePrescription,
    },
    NullableUpdate,
};

use super::UpdateVaccination;

pub struct GenerateInput {
    pub patient_id: String,
    pub existing_vaccination: VaccinationRow,
    pub update_input: UpdateVaccination,
    pub existing_stock_line: Option<StockLine>,
    pub new_stock_line: Option<StockLine>,
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
        existing_stock_line,
        new_stock_line,
    }: GenerateInput,
) -> GenerateResult {
    // Update from input, or keep existing
    let clinician_id = match update_input.clinician_id {
        Some(NullableUpdate { value }) => value,
        None => existing_vaccination.clinician_link_id.clone(),
    };

    let new_stock_line_id = new_stock_line
        .as_ref()
        .map(|sl| sl.stock_line_row.id.clone());

    let stock_line_has_changed = match (&existing_stock_line, &new_stock_line) {
        (Some(existing), Some(new)) => existing.stock_line_row.id != new.stock_line_row.id,
        (Some(_), None) => true,
        (None, Some(_)) => true,
        (None, None) => false,
    };

    // Reverse prescription if it existed, and the stock line is changing
    let create_inventory_adjustment = if stock_line_has_changed {
        existing_stock_line.map(|stock_line| InsertInventoryAdjustment {
            stock_line_id: stock_line.stock_line_row.id.clone(),
            adjustment: get_dose_as_number_of_packs(&stock_line),
            adjustment_type: AdjustmentType::Addition,
            inventory_adjustment_reason_id: Some(REVERSE_PRESCRIPTION_REASON_ID.to_string()),
        })
    } else {
        None
    };

    // Create new prescription if stock line is changing to a new Some value
    let create_prescription = if stock_line_has_changed {
        new_stock_line.map(|stock_line| {
            generate_create_prescription(stock_line, patient_id, clinician_id.clone())
        })
    } else {
        None
    };

    let VaccinationRow {
        id,
        store_id,
        program_enrolment_id,
        encounter_id,
        vaccine_course_dose_id,
        user_id,
        created_datetime,

        vaccination_date,
        given,
        not_given_reason,
        comment,
        invoice_id,

        clinician_link_id: _,
        stock_line_id: _,
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

        // new_stock_line already defaults to existing, or will be None if changed to not given
        stock_line_id: new_stock_line_id,

        not_given_reason: match update_input.given {
            // If we updated to given, clear the reason
            Some(true) => None,
            _ => update_input.not_given_reason.or(not_given_reason),
        },

        invoice_id: match update_input.given {
            // If we updated to not given, clear the invoice
            Some(false) => None,
            _ => create_prescription
                .as_ref()
                .map(|p| p.insert_prescription_input.id.clone())
                .or(invoice_id),
        },
    };

    GenerateResult {
        vaccination,
        create_prescription,
        create_inventory_adjustment,
    }
}
