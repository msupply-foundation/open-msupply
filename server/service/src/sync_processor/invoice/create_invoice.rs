use repository::{
    schema::{InvoiceLineRow, InvoiceRow},
    StorageConnection,
};

use super::common::{can_create_inbound_invoice, generate_and_integrate_linked_invoice};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing};

#[derive(Debug)]
pub struct CreateInvoiceProcessoResult {
    new_invoice: InvoiceRow,
    new_invoice_lines: Vec<InvoiceLineRow>,
}

// Create linked invoice (not linking source invoice)
pub fn create_invoice_processor(
    connection: &StorageConnection,
    record_for_processing: &RecordForProcessing,
) -> Result<Option<CreateInvoiceProcessoResult>, ProcessRecordError> {
    // Check can execute
    let source_invoice = match &record_for_processing.record {
        Record::InvoiceRow(source_invoice) => source_invoice,
        _ => return Ok(None),
    };

    if !can_create_inbound_invoice(&source_invoice, record_for_processing) {
        return Ok(None);
    }

    if record_for_processing.is_active_record_on_site {
        return Ok(None);
    }

    // Execute
    let (new_invoice, new_invoice_lines) =
        generate_and_integrate_linked_invoice(connection, &source_invoice, record_for_processing)?;

    Ok(Some(CreateInvoiceProcessoResult {
        new_invoice,
        new_invoice_lines,
    }))
}
