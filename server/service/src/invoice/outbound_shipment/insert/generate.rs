use chrono::Utc;

use repository::Name;
use repository::{
    InvoiceRow, InvoiceRowStatus, InvoiceRowType, RepositoryError, StorageConnection,
};

use crate::number::invoice_next_number;

use super::InsertOutboundShipment;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertOutboundShipment,
    other_party: Name,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id: input.id,
        user_id: Some(user_id.to_string()),
        name_id: input.other_party_id,
        r#type: InvoiceRowType::OutboundShipment,
        comment: input.comment,
        their_reference: input.their_reference,
        invoice_number: invoice_next_number(
            connection,
            &InvoiceRowType::OutboundShipment,
            store_id,
        )?,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        on_hold: input.on_hold.unwrap_or(false),
        colour: input.colour,
        // Default
        transport_reference: None,
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
