use chrono::Utc;

use repository::{CurrencyFilter, CurrencyRepository, Name};
use repository::{
    InvoiceRow, InvoiceStatus, InvoiceType, NumberRowType, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertOutboundShipment;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertOutboundShipment,
    other_party: Name,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();
    let currency = CurrencyRepository::new(connection)
        .query_by_filter(CurrencyFilter::new().is_home_currency(true))?
        .pop()
        .ok_or(RepositoryError::NotFound)?;

    let result = InvoiceRow {
        id: input.id,
        user_id: Some(user_id.to_string()),
        name_link_id: input.other_party_id,
        r#type: InvoiceType::OutboundShipment,
        comment: input.comment,
        their_reference: input.their_reference,
        invoice_number: next_number(connection, &NumberRowType::OutboundShipment, store_id)?,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        on_hold: input.on_hold.unwrap_or(false),
        colour: input.colour,
        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        tax: None,
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
