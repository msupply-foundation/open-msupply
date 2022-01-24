use chrono::Utc;

use domain::{inbound_shipment::InsertInboundShipment, invoice::InvoiceType, name::Name};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, NumberRowType},
    RepositoryError, StorageConnection,
};

use crate::{current_store_id, number::next_number};

pub fn generate(
    InsertInboundShipment {
        id,
        other_party_id,
        on_hold,
        comment,
        their_reference,
        color,
    }: InsertInboundShipment,
    other_party: Name,
    connection: &StorageConnection,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();
    let current_store_id = current_store_id(connection)?;

    let result = InvoiceRow {
        id,
        name_id: other_party_id,
        name_store_id: other_party.store_id,
        r#type: InvoiceType::InboundShipment.into(),
        comment,
        their_reference,
        invoice_number: next_number(
            connection,
            &NumberRowType::InboundShipment,
            &current_store_id,
        )?,
        store_id: current_store_id,
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        on_hold: on_hold.unwrap_or(false),
        color,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    };

    Ok(result)
}
