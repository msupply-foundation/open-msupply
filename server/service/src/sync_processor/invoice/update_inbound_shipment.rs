use repository::{
    schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    InvoiceLineRowRepository, InvoiceRepository, StorageConnection,
};

use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};

use super::common::regenerate_linked_invoice_lines;

#[derive(Debug)]
pub struct UpdateInboundShipmentProcessorResult {
    new_invoice_lines: Vec<InvoiceLineRow>,
    deleted_invoice_lines: Vec<InvoiceLineRow>,
    updated_linked_invoice: InvoiceRow,
}

// Update inbound shipment status
pub fn update_inbound_shipment_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<UpdateInboundShipmentProcessorResult>, ProcessRecordError> {
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

    if !record_for_processing.is_other_party_active_on_site {
        return Ok(None);
    }

    if source_invoice.r#type != InvoiceRowType::OutboundShipment {
        return Ok(None);
    }

    if linked_invoice.status != InvoiceRowStatus::Picked {
        return Ok(None);
    }

    if source_invoice.status != InvoiceRowStatus::Picked
        && source_invoice.status != InvoiceRowStatus::Shipped
    {
        return Ok(None);
    }

    // Execute
    let (deleted_invoice_lines, new_invoice_lines) =
        regenerate_linked_invoice_lines(connection, &linked_invoice, &source_invoice)?;

    let invoice_line_repository = InvoiceLineRowRepository::new(connection);

    for line in deleted_invoice_lines.iter() {
        invoice_line_repository.delete(&line.id)?;
    }

    for line in new_invoice_lines.iter() {
        invoice_line_repository.upsert_one(line)?;
    }

    let mut updated_linked_invoice = linked_invoice.clone();
    updated_linked_invoice.status = source_invoice.status.clone();
    updated_linked_invoice.shipped_datetime = source_invoice.shipped_datetime.clone();

    InvoiceRepository::new(connection).upsert_one(&updated_linked_invoice)?;

    Ok(Some(UpdateInboundShipmentProcessorResult {
        new_invoice_lines,
        deleted_invoice_lines,
        updated_linked_invoice,
    }))
}
