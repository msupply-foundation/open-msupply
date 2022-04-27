use super::common::regenerate_linked_invoice_lines;
use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use repository::{
    db_diesel::{InvoiceRowStatus, InvoiceRowType},
    InvoiceLineRowRepository, InvoiceRowRepository, StorageConnection,
};

const DESCRIPTION: &'static str =
    "Update inbound shipment from outbound shipment (status and lines)";

pub struct UpdateInboundShipmentProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for UpdateInboundShipmentProcessor<'a> {
    fn try_process_record(
        &self,
        record_for_processing: &RecordForProcessing,
    ) -> Result<Option<String>, ProcessRecordError> {
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
            regenerate_linked_invoice_lines(self.connection, &linked_invoice, &source_invoice)?;

        let invoice_line_repository = InvoiceLineRowRepository::new(self.connection);

        for line in deleted_invoice_lines.iter() {
            invoice_line_repository.delete(&line.id)?;
        }

        for line in new_invoice_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let mut updated_linked_invoice = linked_invoice.clone();
        updated_linked_invoice.status = source_invoice.status.clone();
        updated_linked_invoice.shipped_datetime = source_invoice.shipped_datetime.clone();

        InvoiceRowRepository::new(self.connection).upsert_one(&updated_linked_invoice)?;

        let result = format!(
        "{}\nnew_invoice_lines: {:#?}\ndeleted_invoice_lines: {:#?}\nupdated_linked_invoice: {:#?}",
        DESCRIPTION, new_invoice_lines, deleted_invoice_lines, updated_linked_invoice
    );

        Ok(Some(result))
    }
}
