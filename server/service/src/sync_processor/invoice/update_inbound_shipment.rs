use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    InvoiceLineRowRepository, InvoiceRepository,
};

use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};

use super::common::re_generate_linked_invoice_lines;

pub struct UpdateInboundShipmentProcessor {}

impl ProcessRecord for UpdateInboundShipmentProcessor {
    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        let result = if let Some((mut linked_invoice, source_invoice)) =
            should_execute(record_for_processing)
        {
            let (lines_to_delete, inserted_lines) =
                re_generate_linked_invoice_lines(connection, &linked_invoice, &source_invoice)?;

            let invoice_line_repository = InvoiceLineRowRepository::new(connection);

            for line in lines_to_delete.iter() {
                invoice_line_repository.delete(&line.id)?;
            }

            for line in inserted_lines.iter() {
                invoice_line_repository.upsert_one(line)?;
            }

            linked_invoice.status = source_invoice.status;
            linked_invoice.shipped_datetime = source_invoice.shipped_datetime;
            InvoiceRepository::new(connection).upsert_one(&linked_invoice)?;

            ProcessRecordResult::Success(format!(
                "updated invoice, delete lines{:#?}\ninserted lines {:#?}\n, update invoice {:#?}\nbased on {:#?}",
                lines_to_delete, inserted_lines, linked_invoice, record_for_processing
            ))
        } else {
            ProcessRecordResult::ConditionNotMet
        };

        Ok(result)
    }

    fn name(&self) -> String {
        "Update inbound shipment status".to_string()
    }
}

fn should_execute(record_for_processing: &RecordForProcessing) -> Option<(InvoiceRow, InvoiceRow)> {
    if let Record::InvoiceRow(source_invoice) = &record_for_processing.record {
        if !record_for_processing.is_other_party_active_on_site {
            return None;
        }

        if source_invoice.r#type != InvoiceRowType::OutboundShipment {
            return None;
        }

        if let Some(Record::InvoiceRow(linked_invoice)) = &record_for_processing.linked_record {
            if linked_invoice.status != InvoiceRowStatus::Picked {
                return None;
            }

            if source_invoice.status != InvoiceRowStatus::Picked
                && source_invoice.status != InvoiceRowStatus::Shipped
            {
                return None;
            }

            return Some((linked_invoice.clone(), source_invoice.clone()));
        }
    }

    None
}
