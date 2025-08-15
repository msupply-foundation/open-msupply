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
        requisition_id,
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
        requisition_id,
        // Default
        currency_id: Some(currency.currency_row.id),
        currency_rate: 1.0,
        is_cancellation: false,
        ..Default::default()
    };

    Ok(result)
}
