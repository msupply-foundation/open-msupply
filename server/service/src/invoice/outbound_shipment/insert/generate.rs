use chrono::Utc;

use domain::{invoice::InvoiceType, outbound_shipment::InsertOutboundShipment};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus},
    RepositoryError, StorageConnection,
};

use crate::current_store_id;

pub fn generate(
    input: InsertOutboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id: input.id,
        name_id: input.other_party_id,
        r#type: InvoiceType::OutboundShipment.into(),
        comment: input.comment,
        their_reference: input.their_reference,
        invoice_number: new_invoice_number(),
        store_id: current_store_id(connection)?,
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        on_hold: input.on_hold.unwrap_or(false),
        color: input.color,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    };

    Ok(result)
}

fn new_invoice_number() -> i32 {
    // TODO Existing mSupply Mechanism for this
    1
}
