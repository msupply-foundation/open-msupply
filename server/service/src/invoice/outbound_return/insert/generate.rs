use chrono::Utc;

use repository::Name;
use repository::{
    InvoiceRow, InvoiceRowStatus, InvoiceRowType, NumberRowType, RepositoryError, StorageConnection,
};

use crate::number::next_number;

use super::InsertOutboundReturn;

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    input: InsertOutboundReturn,
    other_party: Name,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id: input.id,
        user_id: Some(user_id.to_string()),
        name_link_id: input.other_party_id,
        r#type: InvoiceRowType::OutboundReturn,
        invoice_number: next_number(connection, &NumberRowType::OutboundReturn, store_id)?,
        name_store_id: other_party.store_id().map(|id| id.to_string()),
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        // Default
        on_hold: false,
        colour: None,
        comment: None,
        their_reference: None,
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
    };

    Ok(result)
}
