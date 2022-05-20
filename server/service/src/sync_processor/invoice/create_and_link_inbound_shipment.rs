use super::common::{can_create_inbound_invoice, generate_and_integrate_linked_invoice};
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use repository::{InvoiceRowRepository, StorageConnection};

const DESCRIPTION: &'static str =
    "Create inbound shipment from outbound shipment (linking source shipment)";

pub struct CreateAndLinkInboundShipmentProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for CreateAndLinkInboundShipmentProcessor<'a> {
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

        if !record_for_processing.is_active_record_on_site {
            return Ok(None);
        }

        // Execute
        let (new_invoice, new_invoice_lines) = generate_and_integrate_linked_invoice(
            self.connection,
            &source_invoice,
            record_for_processing,
        )?;

        let mut updated_source_invoice = source_invoice.clone();
        updated_source_invoice.linked_invoice_id = Some(new_invoice.id.clone());
        InvoiceRowRepository::new(self.connection).upsert_one(&updated_source_invoice)?;

        let result = format!(
            "{}\nnew_invoice: {:#?}\nnew_invoice_lines: {:#?}\nupdated_source_invoice: {:#?}",
            DESCRIPTION, new_invoice, new_invoice_lines, updated_source_invoice
        );

        Ok(Some(result))
    }
}
