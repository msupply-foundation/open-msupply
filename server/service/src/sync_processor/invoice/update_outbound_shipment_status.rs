use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    InvoiceRepository, StorageConnection,
};

#[derive(Debug)]
pub struct UpdateOutboundShipmentStatusProcessorResult {
    updated_linked_invoice: InvoiceRow,
}

// Update outbound shipment status
pub fn update_outbound_shipment_status_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<UpdateOutboundShipmentStatusProcessorResult>, ProcessRecordError> {
    // Check can execute
    let (source_invoice, linked_invoice) = match (
        &record_for_processing.record,
        &record_for_processing.linked_record,
    ) {
        (Record::InvoiceRow(source_invoice), Some(Record::InvoiceRow(linked_invoice))) => {
            (source_invoice, linked_invoice)
        }
        (_, _) => return Ok(None),
    };

    pub use InvoiceRowStatus::*;
    if !record_for_processing.is_other_party_active_on_site {
        return Ok(None);
    }

    if source_invoice.r#type != InvoiceRowType::InboundShipment {
        return Ok(None);
    }

    if linked_invoice.status == Verified {
        return Ok(None);
    }

    if source_invoice.status != Delivered && source_invoice.status != Verified {
        return Ok(None);
    }

    if linked_invoice.status == source_invoice.status {
        return Ok(None);
    }

    // Execute
    let mut updated_linked_invoice = linked_invoice.clone();
    updated_linked_invoice.status = source_invoice.status.clone();
    updated_linked_invoice.delivered_datetime = source_invoice.delivered_datetime.clone();
    updated_linked_invoice.verified_datetime = source_invoice.verified_datetime.clone();

    InvoiceRepository::new(connection).upsert_one(&updated_linked_invoice)?;

    Ok(Some(UpdateOutboundShipmentStatusProcessorResult {
        updated_linked_invoice,
    }))
}
