use chrono::Utc;

use domain::{invoice::InvoiceType, name::Name, outbound_shipment::InsertOutboundShipment};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, NumberRowType},
    RepositoryError, StorageConnection,
};

use crate::{current_store_id, number::next_number};

pub fn generate(
    input: InsertOutboundShipment,
    other_party: Name,
    connection: &StorageConnection,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();
    let current_store_id = current_store_id(connection)?;

    let result = InvoiceRow {
        id: input.id,
        name_id: input.other_party_id,
        r#type: InvoiceType::OutboundShipment.into(),
        comment: input.comment,
        their_reference: input.their_reference,
        invoice_number: next_number(
            connection,
            &NumberRowType::OutboundShipment,
            &current_store_id,
        )?,
        name_store_id: other_party.store_id,
        store_id: current_store_id,
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        on_hold: input.on_hold.unwrap_or(false),
        color: input.color,
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
