use chrono::Utc;

use domain::{inbound_shipment::InsertInboundShipment, invoice::InvoiceType};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus},
    RepositoryError, StorageConnection,
};

use crate::current_store_id;

pub fn generate(
    InsertInboundShipment {
        id,
        other_party_id,
        on_hold,
        comment,
        their_reference,
        color,
    }: InsertInboundShipment,
    connection: &StorageConnection,
) -> Result<InvoiceRow, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let result = InvoiceRow {
        id,
        name_id: other_party_id,
        r#type: InvoiceType::InboundShipment.into(),
        comment,
        their_reference,
        invoice_number: new_invoice_number(),
        store_id: current_store_id(connection)?,
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

fn new_invoice_number() -> i32 {
    // TODO Existing mSupply Mechanism for this
    1
}
