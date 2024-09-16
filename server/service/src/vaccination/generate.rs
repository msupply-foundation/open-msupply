use repository::StockLine;
use util::uuid::uuid;

use crate::{
    invoice::{InsertPrescription, UpdatePrescription, UpdatePrescriptionStatus},
    invoice_line::stock_out_line::{InsertStockOutLine, StockOutType},
};

pub struct CreatePrescription {
    pub insert_prescription_input: InsertPrescription,
    pub insert_stock_out_line_input: InsertStockOutLine,
    pub update_prescription_input: UpdatePrescription,
}

pub fn generate_create_prescription(
    stock_line: StockLine,
    patient_id: String,
    clinician_id: Option<String>,
) -> CreatePrescription {
    let prescription_id = uuid();

    let insert_prescription = InsertPrescription {
        id: prescription_id.clone(),
        patient_id,
    };

    let number_of_packs =
        1.0 / stock_line.item_row.vaccine_doses as f64 / stock_line.stock_line_row.pack_size;

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

    CreatePrescription {
        insert_prescription_input: insert_prescription,
        insert_stock_out_line_input: insert_stock_out_line,
        update_prescription_input: update_prescription,
    }
}
