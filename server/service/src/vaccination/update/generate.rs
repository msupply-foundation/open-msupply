use repository::{InvoiceLine, StockLineRow, VaccinationRow};
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

use super::{
    validate::{ChangeStockLine, ChangeToGiven, ChangeToNotGiven, ValidateResult},
    UpdateVaccination,
};

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
    store_id: &str,
    validate_result: ValidateResult,
    update_input: UpdateVaccination,
) -> GenerateResult {
    match validate_result {
        ValidateResult::ChangeToGiven(change) => generate_given(store_id, change, update_input),
        ValidateResult::ChangeToNotGiven(change) => generate_not_given(change, update_input),
        ValidateResult::ChangeStockLine(change) => generate_change_stock_line(change, update_input),
        ValidateResult::NoStatusChangeEdit(existing_vaccination) => {
            generate_no_status_change(existing_vaccination, update_input)
        }
    }
}

fn generate_given(
    store_id: &str,
    ChangeToGiven {
        existing_vaccination,
        patient_id,
        new_stock_line,
    }: ChangeToGiven,
    update_input: UpdateVaccination,
) -> GenerateResult {
    let stock_line_id = new_stock_line
        .as_ref()
        .map(|sl| sl.stock_line_row.id.clone());

    let item_link_id = new_stock_line
        .as_ref()
        .map(|sl| sl.stock_line_row.item_link_id.clone());

    let update_transactions = update_input.update_transactions.unwrap_or(false);

    let vaccination = get_vaccination_with_updated_base_fields(existing_vaccination, update_input);

    let create_prescription = if update_transactions {
        new_stock_line.map(|stock_line| {
            generate_create_prescription(
                stock_line,
                patient_id,
                vaccination.clinician_link_id.clone(),
            )
        })
    } else {
        None
    };

    // apply given status, stock and invoice ids
    let vaccination = VaccinationRow {
        not_given_reason: None,
        given: true,
        given_store_id: Some(store_id.to_string()),
        stock_line_id,
        item_link_id,
        invoice_id: create_prescription
            .as_ref()
            .map(|p| p.create_prescription.id.clone()),

        ..vaccination
    };

    GenerateResult {
        vaccination,
        create_prescription,
        create_customer_return: None,
    }
}

fn generate_not_given(
    ChangeToNotGiven {
        existing_vaccination,
        patient_id,
        existing_prescription,
    }: ChangeToNotGiven,
    update_input: UpdateVaccination,
) -> GenerateResult {
    let not_given_reason = update_input
        .not_given_reason
        .clone()
        .or(existing_vaccination.not_given_reason.clone());

    let update_transactions = update_input.update_transactions.clone().unwrap_or(false);

    let vaccination = get_vaccination_with_updated_base_fields(existing_vaccination, update_input);

    let create_customer_return = if update_transactions {
        existing_prescription
            .map(|p| generate_customer_return(p.prescription_line, p.stock_line_row, patient_id))
    } else {
        None
    };

    // clear given status, item/transaction ids, apply reason

    let vaccination = VaccinationRow {
        given: false,
        given_store_id: None,
        not_given_reason,

        item_link_id: None,
        stock_line_id: None,
        invoice_id: None,

        ..vaccination
    };

    GenerateResult {
        vaccination,
        create_customer_return,
        create_prescription: None,
    }
}

fn generate_change_stock_line(
    ChangeStockLine {
        existing_vaccination,
        patient_id,
        existing_prescription,
        new_stock_line,
    }: ChangeStockLine,
    update_input: UpdateVaccination,
) -> GenerateResult {
    let stock_line_id = new_stock_line
        .as_ref()
        .map(|sl| sl.stock_line_row.id.clone());

    let item_link_id = new_stock_line
        .as_ref()
        .map(|sl| sl.stock_line_row.item_link_id.clone());

    let update_transactions = update_input.update_transactions.clone().unwrap_or(false);

    let vaccination = get_vaccination_with_updated_base_fields(existing_vaccination, update_input);

    let create_customer_return = if update_transactions {
        existing_prescription.map(|p| {
            generate_customer_return(p.prescription_line, p.stock_line_row, patient_id.clone())
        })
    } else {
        None
    };

    let create_prescription = if update_transactions {
        new_stock_line.map(|stock_line| {
            generate_create_prescription(
                stock_line,
                patient_id,
                vaccination.clinician_link_id.clone(),
            )
        })
    } else {
        None
    };

    // apply new stock and invoice ids
    let vaccination = VaccinationRow {
        stock_line_id,
        item_link_id,
        invoice_id: create_prescription
            .as_ref()
            .map(|p| p.create_prescription.id.clone()),

        ..vaccination
    };

    GenerateResult {
        vaccination,
        create_prescription,
        create_customer_return,
    }
}

fn generate_no_status_change(
    existing_vaccination: VaccinationRow,
    update_input: UpdateVaccination,
) -> GenerateResult {
    let vaccination = get_vaccination_with_updated_base_fields(existing_vaccination, update_input);

    GenerateResult {
        vaccination,
        create_customer_return: None,
        create_prescription: None,
    }
}

fn get_vaccination_with_updated_base_fields(
    existing_vaccination: VaccinationRow,
    update_input: UpdateVaccination,
) -> VaccinationRow {
    let VaccinationRow {
        id,
        store_id,
        program_enrolment_id,
        encounter_id,
        vaccine_course_dose_id,
        user_id,
        patient_link_id,
        created_datetime,

        vaccination_date,
        given,
        given_store_id,
        not_given_reason,
        invoice_id,
        stock_line_id,
        item_link_id,

        comment,
        facility_name_link_id,
        facility_free_text,
        clinician_link_id,
    } = existing_vaccination;

    VaccinationRow {
        // always copy from existing
        id,
        store_id,
        program_enrolment_id,
        encounter_id,
        vaccine_course_dose_id,
        user_id,
        patient_link_id,
        created_datetime,

        // Copy from existing, could be overwritten by further generate logic
        given,
        given_store_id,
        invoice_id,
        stock_line_id,

        // Update metadata/base fields
        comment: update_input.comment.or(comment),
        vaccination_date: update_input.vaccination_date.unwrap_or(vaccination_date),
        clinician_link_id: match update_input.clinician_id {
            Some(NullableUpdate { value }) => value,
            None => clinician_link_id,
        },
        facility_name_link_id: match update_input.facility_name_id {
            Some(NullableUpdate { value }) => value,
            None => facility_name_link_id,
        },
        facility_free_text: match update_input.facility_free_text {
            Some(NullableUpdate { value }) => value,
            None => facility_free_text,
        },

        // Not really "base" fields - but can be updated without changing status
        not_given_reason: update_input.not_given_reason.or(not_given_reason),
        item_link_id: match update_input.item_id {
            Some(NullableUpdate { value }) => value,
            None => item_link_id,
        },
    }
}

fn generate_customer_return(
    prescription_line: InvoiceLine,
    stock_line_row: StockLineRow,
    patient_id: String,
) -> CreateCustomerReturn {
    let amount = get_dose_as_number_of_packs(&prescription_line.item_row, &stock_line_row);

    let create_return = InsertCustomerReturn {
        id: uuid(),
        other_party_id: patient_id.clone(),
        is_patient_return: true,
        outbound_shipment_id: None,
        customer_return_lines: vec![CustomerReturnLineInput {
            id: uuid(),
            stock_line_id: Some(stock_line_row.id),
            item_id: stock_line_row.item_link_id,
            item_variant_id: stock_line_row.item_variant_id,
            expiry_date: stock_line_row.expiry_date,
            batch: stock_line_row.batch,
            pack_size: stock_line_row.pack_size,
            number_of_packs: amount,
            vvm_status_id: stock_line_row.vvm_status_id,
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
}
