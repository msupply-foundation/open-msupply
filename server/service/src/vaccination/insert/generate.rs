use chrono::Utc;
use repository::{ProgramEnrolmentRow, StockLine, VaccinationRow};
use util::uuid::uuid;

use crate::{
    invoice::{InsertPrescription, UpdatePrescription, UpdatePrescriptionStatus},
    invoice_line::stock_out_line::{InsertStockOutLine, StockOutType},
};

use super::InsertVaccination;

pub struct GenerateInput {
    pub store_id: String,
    pub user_id: String,
    pub program_enrolment: ProgramEnrolmentRow,
    pub insert_input: InsertVaccination,
    pub stock_line: Option<StockLine>,
}

pub struct CreatePrescription {
    pub insert_prescription_input: InsertPrescription,
    pub insert_stock_out_line_input: InsertStockOutLine,
    pub update_prescription_input: UpdatePrescription,
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
        comment,
        given,
        stock_line_id,
        not_given_reason,
    } = insert_input;

    let now = Utc::now().naive_utc();

    let create_prescription = match stock_line {
        // if stock_line is Some, the vaccination was given, create a prescription
        Some(stock_line) => {
            let prescription_id = uuid();

            let insert_prescription = InsertPrescription {
                id: prescription_id.clone(),
                patient_id: program_enrolment.patient_link_id,
            };

            let number_of_packs =
                1.0 / stock_line.item_row.doses as f64 / stock_line.stock_line_row.pack_size;

            let insert_stock_out_line = InsertStockOutLine {
                id: uuid(),
                r#type: StockOutType::Prescription,
                invoice_id: prescription_id.clone(),

                stock_line_id: stock_line.stock_line_row.id,
                number_of_packs,

                // default
                total_before_tax: None,
                tax_percentage: None,
                note: None,
                location_id: None,
                batch: None,
                pack_size: None,
                expiry_date: None,
                cost_price_per_pack: None,
                sell_price_per_pack: None,
            };

            let update_prescription = UpdatePrescription {
                id: prescription_id.clone(),
                status: Some(UpdatePrescriptionStatus::Verified),
                // Assign clinician here if one was chosen
                clinician_id: clinician_id.clone(),
                comment: Some("Created via vaccination".to_string()),
                // Default
                patient_id: None,
                colour: None,
            };

            Some(CreatePrescription {
                insert_prescription_input: insert_prescription,
                insert_stock_out_line_input: insert_stock_out_line,
                update_prescription_input: update_prescription,
            })
        }
        None => None,
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
        // If we create the prescription invoice, link it here
        invoice_id: create_prescription
            .as_ref()
            .map(|p| p.insert_prescription_input.id.clone()),
    };

    GenerateResult {
        vaccination,
        create_prescription,
    }
}
