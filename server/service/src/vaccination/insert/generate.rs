use chrono::Utc;
use repository::{ProgramEnrolmentRow, StockLine, VaccinationRow};

use crate::vaccination::generate::{generate_create_prescription, CreatePrescription};

use super::InsertVaccination;

pub struct GenerateInput {
    pub store_id: String,
    pub user_id: String,
    pub program_enrolment: ProgramEnrolmentRow,
    pub insert_input: InsertVaccination,
    pub stock_line: Option<StockLine>,
}

pub struct GenerateResult {
    pub vaccination: VaccinationRow,
    pub create_prescription: Option<CreatePrescription>,
}

pub fn generate(
    GenerateInput {
        store_id,
        user_id,
        program_enrolment,
        insert_input,
        stock_line,
    }: GenerateInput,
) -> GenerateResult {
    let InsertVaccination {
        id,
        encounter_id,
        vaccine_course_dose_id,
        vaccination_date,
        clinician_id,
        facility_name_id,
        facility_free_text,
        comment,
        given,
        stock_line_id,
        not_given_reason,
    } = insert_input;

    let now = Utc::now().naive_utc();

    let create_prescription = match stock_line {
        // if stock_line is Some, the vaccination was given, create a prescription
        Some(stock_line) => Some(generate_create_prescription(
            stock_line,
            program_enrolment.patient_link_id,
            clinician_id.clone(),
        )),
        None => None,
    };

    // If name id is provided, use it. Otherwise, use free text
    let (facility_name_link_id, facility_free_text) = match (facility_name_id, facility_free_text) {
        (Some(facility_name_id), _) => (Some(facility_name_id), None),
        (None, Some(facility_free_text)) => (None, Some(facility_free_text)),
        _ => (None, None),
    };

    let vaccination = VaccinationRow {
        id,
        store_id,
        program_enrolment_id: program_enrolment.id,
        user_id,
        created_datetime: now,

        encounter_id,
        vaccine_course_dose_id,
        clinician_link_id: clinician_id,
        vaccination_date: vaccination_date.unwrap_or(now.date()),
        given,
        stock_line_id,
        not_given_reason,
        comment,
        facility_name_link_id,
        facility_free_text,
        // If we create the prescription invoice, link it here
        invoice_id: create_prescription
            .as_ref()
            .map(|p| p.create_prescription.id.clone()),
    };

    GenerateResult {
        vaccination,
        create_prescription,
    }
}
