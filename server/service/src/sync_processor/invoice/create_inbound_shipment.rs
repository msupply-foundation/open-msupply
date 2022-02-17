use super::common::{can_create_inbound_invoice, generate_and_integrate_linked_invoice};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use repository::StorageConnection;

const DESCRIPTION: &'static str =
    "Create inbound shipment from outbound shipment (not linking source shipment)";

pub struct CreateInboundShipmentProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for CreateInboundShipmentProcessor<'a> {
    fn try_process_record(
        &self,
        record_for_processing: &RecordForProcessing,
    ) -> Result<Option<String>, ProcessRecordError> {
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
        let (new_invoice, new_invoice_lines) = generate_and_integrate_linked_invoice(
            self.connection,
            &source_invoice,
            record_for_processing,
        )?;

        let result = format!(
            "{}\nnew_invoice: {:#?}\nnew_invoice_lines: {:#?}",
            DESCRIPTION, new_invoice, new_invoice_lines,
        );

        Ok(Some(result))
    }
}
