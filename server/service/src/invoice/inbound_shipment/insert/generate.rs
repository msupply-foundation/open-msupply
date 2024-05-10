use chrono::Utc;

use repository::{
    CurrencyFilter, CurrencyRepository, InvoiceRow, InvoiceStatus, InvoiceType, Name,
    NumberRowType, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertInboundShipment;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertInboundShipment {
        id,
        other_party_id,
        on_hold,
        comment,
        their_reference,
        colour,
    }: InsertInboundShipment,
    other_party: Name,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let result = InvoiceRow {
        id,
        user_id: Some(user_id.to_string()),
        name_link_id: other_party_id,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        r#type: InvoiceType::InboundShipment,
        comment,
        their_reference,
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, store_id)?,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        on_hold: on_hold.unwrap_or(false),
        colour,
        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        tax_percentage: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
        clinician_link_id: None,
        original_shipment_id: None,
    };

    Ok(result)
}
