use repository::{StockLine, VaccinationRow};
use util::uuid::uuid;

use crate::{
    invoice::customer_return::{
        insert::InsertCustomerReturn, CustomerReturnLineInput, UpdateCustomerReturn,
        UpdateCustomerReturnStatus,
    },
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

#[derive(Debug)]
pub struct CreateCustomerReturn {
    pub create_return: InsertCustomerReturn,
    pub finalise_return: UpdateCustomerReturn,
}

pub struct GenerateResult {
    pub vaccination: VaccinationRow,
    pub create_customer_return: Option<CreateCustomerReturn>,
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

    let update_transactions = update_input.update_transactions.unwrap_or(false);

    // Reverse prescription if it existed, and the stock line is changing
    let create_customer_return = if stock_line_has_changed && update_transactions {
        existing_stock_line.map(|stock_line| {
            let amount = get_dose_as_number_of_packs(&stock_line);
            let stock_line_row = stock_line.stock_line_row;

            let create_return = InsertCustomerReturn {
                id: uuid(),
                other_party_id: patient_id.clone(),
                is_patient_return: true,
                outbound_shipment_id: None,
                customer_return_lines: vec![CustomerReturnLineInput {
                    id: uuid(),
                    stock_line_id: Some(stock_line_row.id),
                    item_id: stock_line_row.item_link_id,
                    expiry_date: stock_line_row.expiry_date,
                    batch: stock_line_row.batch,
                    pack_size: stock_line_row.pack_size,
                    number_of_packs: amount,
                    reason_id: None,
                    note: None,
                }],
            };
            let finalise_return = UpdateCustomerReturn {
                id: create_return.id.clone(),
                status: Some(UpdateCustomerReturnStatus::Verified),
                comment: Some("Reversed vaccination prescription".to_string()),
                on_hold: None,
                colour: None,
                their_reference: None,
                other_party_id: None,
            };

            CreateCustomerReturn {
                create_return,
                finalise_return,
            }
        })
    } else {
        None
    };

    // Create new prescription if stock line is changing to a new Some value
    let create_prescription = if stock_line_has_changed && update_transactions {
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
        facility_name_link_id,
        facility_free_text,

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

        facility_name_link_id: match update_input.facility_name_id {
            Some(NullableUpdate { value }) => value,
            None => facility_name_link_id,
        },
        facility_free_text: match update_input.facility_free_text {
            Some(NullableUpdate { value }) => value,
            None => facility_free_text,
        },

        // new_stock_line already defaults to existing, or will be None if changed to not given
        stock_line_id: new_stock_line_id,

        not_given_reason: match update_input.given {
            // If we updated to given, clear the reason
            Some(true) => None,
            _ => update_input.not_given_reason.or(not_given_reason),
        },

        invoice_id: match update_input.given {
            // If we updated to not given, and are reversing prescription with a return, clear the invoice
            Some(false) if create_customer_return.is_some() => None,
            _ => create_prescription
                .as_ref()
                .map(|p| p.create_prescription.id.clone())
                .or(invoice_id),
        },
    };

    GenerateResult {
        vaccination,
        create_prescription,
        create_customer_return,
    }
}
