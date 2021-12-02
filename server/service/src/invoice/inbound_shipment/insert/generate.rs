use chrono::{NaiveDateTime, Utc};

use domain::{
    inbound_shipment::InsertInboundShipment,
    invoice::{InvoiceStatus, InvoiceType},
};
use repository::schema::InvoiceRow;

use crate::current_store_id;

pub fn generate(
    InsertInboundShipment {
        id,
        other_party_id,
        status,
        on_hold,
        comment,
        their_reference,
        color,
    }: InsertInboundShipment,
) -> InvoiceRow {
    let current_datetime = Utc::now().naive_utc();

    InvoiceRow {
        id,
        name_id: other_party_id,
        r#type: InvoiceType::InboundShipment.into(),
        comment,
        their_reference,
        invoice_number: new_invoice_number(),
        store_id: current_store_id(),
        confirm_datetime: confirm_datetime(&status, &current_datetime),
        finalised_datetime: finalised_datetime(&status, &current_datetime),
        status: status.into(),
        on_hold: on_hold.unwrap_or(false),
        entry_datetime: current_datetime,
        color,
    }
}

fn new_invoice_number() -> i32 {
    // TODO Existing mSupply Mechanism for this
    1
}

fn confirm_datetime(status: &InvoiceStatus, current_time: &NaiveDateTime) -> Option<NaiveDateTime> {
    match status {
        InvoiceStatus::Draft => None,
        _ => Some(current_time.clone()),
    }
}

fn finalised_datetime(
    status: &InvoiceStatus,
    current_time: &NaiveDateTime,
) -> Option<NaiveDateTime> {
    match status {
        InvoiceStatus::Finalised => Some(current_time.clone()),
        _ => None,
    }
}
