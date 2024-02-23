use chrono::Utc;

use repository::{
    InvoiceRow, InvoiceRowStatus, InvoiceRowType, NumberRowType, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertPrescription;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertPrescription { id, patient_id }: InsertPrescription,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id,
        user_id: Some(user_id.to_string()),
        name_link_id: patient_id,
        name_store_id: None,
        r#type: InvoiceRowType::Prescription,
        invoice_number: next_number(connection, &NumberRowType::Prescription, store_id)?,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        // Default
        colour: None,
        tax: None,
        on_hold: false,
        comment: None,
        their_reference: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
        currency_id: None,
        currency_rate: None,
        clinician_link_id: None,
    };

    Ok(result)
}
