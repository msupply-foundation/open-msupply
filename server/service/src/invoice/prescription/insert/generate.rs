use chrono::Utc;

use repository::{
    CurrencyFilter, CurrencyRepository, InvoiceRow, InvoiceStatus, InvoiceType, NumberRowType,
    RepositoryError, StorageConnection,
};

use crate::{invoice::invoice_date_utils::handle_new_backdated_datetime, number::next_number};

use super::InsertPrescription;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertPrescription {
        id,
        patient_id,
        diagnosis_id,
        program_id,
        their_reference,
        clinician_id,
        prescription_date,
    }: InsertPrescription,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let mut invoice = InvoiceRow {
        id,
        user_id: Some(user_id.to_string()),
        name_link_id: patient_id,
        name_store_id: None,
        r#type: InvoiceType::Prescription,
        invoice_number: next_number(connection, &NumberRowType::Prescription, store_id)?,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        colour: None,
        tax_percentage: None,
        on_hold: false,
        comment: None,
        their_reference,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        cancelled_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
        clinician_link_id: clinician_id,
        original_shipment_id: None,
        backdated_datetime: None,
        diagnosis_id,
        program_id,
        name_insurance_join_id: None,
        insurance_discount_amount: None,
        insurance_discount_percentage: None,
        is_cancellation: false,
        expected_delivery_date: None,
        default_donor_id: None,
    };

    if let Some(date) = prescription_date {
        handle_new_backdated_datetime(&mut invoice, date, current_datetime);
    }

    Ok(invoice)
}
