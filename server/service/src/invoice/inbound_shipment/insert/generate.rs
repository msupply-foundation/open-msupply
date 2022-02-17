use chrono::Utc;

use domain::{inbound_shipment::InsertInboundShipment, invoice::InvoiceType, name::Name};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, NumberRowType},
    RepositoryError, StorageConnection,
};

use crate::number::next_number;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
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

    let result = InvoiceRow {
        id,
        name_id: other_party_id,
        name_store_id: other_party.store_id,
        r#type: InvoiceType::InboundShipment.into(),
        comment,
        their_reference,
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, store_id)?,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        on_hold: on_hold.unwrap_or(false),
        colour,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
    };

    Ok(result)
}
