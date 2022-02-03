use repository::{
    schema::{InvoiceRowStatus, InvoiceRowType},
    InvoiceLineRowRepository, InvoiceRepository,
};

use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};

use super::common::re_generate_linked_invoice_lines;

pub struct UpdateInboundShipmentProcessor {}

impl ProcessRecord for UpdateInboundShipmentProcessor {
    fn name(&self) -> String {
        "Update inbound shipment status".to_string()
    }

    fn can_execute(&self, record_for_processing: &RecordForProcessing) -> bool {
        if let Record::InvoiceRow(source_invoice) = &record_for_processing.record {
            if !record_for_processing.is_other_party_active_on_site {
                return false;
            }

            if source_invoice.r#type != InvoiceRowType::OutboundShipment {
                return false;
            }

            if let Some(Record::InvoiceRow(linked_invoice)) = &record_for_processing.linked_record {
                if linked_invoice.status != InvoiceRowStatus::Picked {
                    return false;
                }

                if source_invoice.status != InvoiceRowStatus::Picked
                    && source_invoice.status != InvoiceRowStatus::Shipped
                {
                    return false;
                }

                return true;
            }
        }

        false
    }

    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        if let (Record::InvoiceRow(source_invoice), Some(Record::InvoiceRow(linked_invoice))) = (
            &record_for_processing.record,
            &record_for_processing.linked_record,
        ) {
            let mut update_linked_invoice = linked_invoice.clone();
            let (lines_to_delete, inserted_lines) = re_generate_linked_invoice_lines(
                connection,
                &update_linked_invoice,
                &source_invoice,
            )?;

            let invoice_line_repository = InvoiceLineRowRepository::new(connection);

            for line in lines_to_delete.iter() {
                invoice_line_repository.delete(&line.id)?;
            }

            for line in inserted_lines.iter() {
                invoice_line_repository.upsert_one(line)?;
            }

            update_linked_invoice.status = source_invoice.status.clone();
            update_linked_invoice.shipped_datetime = source_invoice.shipped_datetime.clone();
            InvoiceRepository::new(connection).upsert_one(&update_linked_invoice)?;

            let result = ProcessRecordResult::Success(format!(
                "updated invoice, delete lines{:#?}\ninserted lines {:#?}\n, update invoice {:#?}",
                lines_to_delete, inserted_lines, update_linked_invoice
            ));
            return Ok(result);
        }
        Ok(ProcessRecordResult::ConditionNotMetInProcessor)
    }
}
