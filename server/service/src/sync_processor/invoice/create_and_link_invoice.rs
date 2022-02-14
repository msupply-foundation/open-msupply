use repository::{
    schema::{InvoiceLineRow, InvoiceRow},
    InvoiceRepository, StorageConnection,
};

use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};

use super::common::{can_create_inbound_invoice, generate_and_integrate_linked_invoice};

#[derive(Debug)]
pub struct CreateAndLinkInvoiceProcessoResult {
    new_invoice: InvoiceRow,
    new_invoice_lines: Vec<InvoiceLineRow>,
    updated_source_invoice: InvoiceRow,
}

// Create linked invoice (linking source invoice)
pub fn create_and_line_invoice_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<CreateAndLinkInvoiceProcessoResult>, ProcessRecordError> {
    // Check can execute
    let source_invoice = match &record_for_processing.record {
        Record::InvoiceRow(source_invoice) => source_invoice,
        _ => return Ok(None),
    };

    if !can_create_inbound_invoice(&source_invoice, record_for_processing) {
        return Ok(None);
    }

    if !record_for_processing.is_active_record_on_site {
        return Ok(None);
    }

    // Execute
    let (new_invoice, new_invoice_lines) =
        generate_and_integrate_linked_invoice(connection, &source_invoice, record_for_processing)?;

    let mut updated_source_invoice = source_invoice.clone();
    updated_source_invoice.linked_invoice_id = Some(new_invoice.id.clone());
    InvoiceRepository::new(connection).upsert_one(&updated_source_invoice)?;

    Ok(Some(CreateAndLinkInvoiceProcessoResult {
        new_invoice,
        new_invoice_lines,
        updated_source_invoice,
    }))
}
