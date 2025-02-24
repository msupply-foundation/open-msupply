use repository::{ItemRow, StockLine, StockLineRow};
use util::uuid::uuid;

use crate::{
    invoice::{InsertPrescription, UpdatePrescription, UpdatePrescriptionStatus},
    invoice_line::stock_out_line::{InsertStockOutLine, StockOutType},
    NullableUpdate,
};

#[derive(Debug)]
pub struct CreatePrescription {
    pub create_prescription: InsertPrescription,
    pub insert_stock_out_line_input: InsertStockOutLine,
    pub finalise_prescription: UpdatePrescription,
}

pub fn generate_create_prescription(
    stock_line: StockLine,
    patient_id: String,
    clinician_id: Option<String>,
) -> CreatePrescription {
    let prescription_id = uuid();

    let create_prescription = InsertPrescription {
        id: prescription_id.clone(),
        patient_id,
        diagnosis_id: None,
        program_id: None,
        their_reference: None,
        clinician_id: None,
        prescription_date: None,
    };

    let number_of_packs =
        get_dose_as_number_of_packs(&stock_line.item_row, &stock_line.stock_line_row);

    let insert_stock_out_line = InsertStockOutLine {
        id: uuid(),
        r#type: StockOutType::Prescription,
        invoice_id: prescription_id.clone(),

        stock_line_id: stock_line.stock_line_row.id,
        number_of_packs,

        // default
        prescribed_quantity: None,
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

    let finalise_prescription = UpdatePrescription {
        id: prescription_id.clone(),
        status: Some(UpdatePrescriptionStatus::Verified),
        // Assign clinician here if one was chosen
        clinician_id: Some(NullableUpdate {
            value: clinician_id.clone(),
        }),
        comment: Some("Created via vaccination".to_string()),
        // Default
        patient_id: None,
        colour: None,
        backdated_datetime: None,
        diagnosis_id: None,
        program_id: None,
        their_reference: None,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
    };

    CreatePrescription {
        create_prescription,
        insert_stock_out_line_input: insert_stock_out_line,
        finalise_prescription,
    }
}

pub fn get_dose_as_number_of_packs(item_row: &ItemRow, stock_line_row: &StockLineRow) -> f64 {
    1.0 / item_row.vaccine_doses as f64 / stock_line_row.pack_size
}
