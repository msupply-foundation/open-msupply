use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};
use repository::{
    schema::{InvoiceRow, InvoiceRowStatus, InvoiceRowType},
    InvoiceRepository,
};

pub struct UpdateOutboundShipmentStatusProcessor {}

impl ProcessRecord for UpdateOutboundShipmentStatusProcessor {
    fn process_record(
        &self,
        connection: &repository::StorageConnection,
        record_for_processing: &RecordForProcessing,
    ) -> Result<ProcessRecordResult, ProcessRecordError> {
        let result = if let Some((mut linked_invoice, source_invoice)) =
            should_execute(record_for_processing)
        {
            linked_invoice.status = source_invoice.status;
            linked_invoice.delivered_datetime = source_invoice.delivered_datetime;
            linked_invoice.verified_datetime = source_invoice.verified_datetime;
            InvoiceRepository::new(connection).upsert_one(&linked_invoice)?;

            ProcessRecordResult::Success(format!(
                "updated invoice status {:#?}\nbased on {:#?}",
                linked_invoice, record_for_processing
            ))
        } else {
            ProcessRecordResult::ConditionNotMet
        };

        Ok(result)
    }

    fn name(&self) -> String {
        "Update outbound shipment status".to_string()
    }
}

fn should_execute(record_for_processing: &RecordForProcessing) -> Option<(InvoiceRow, InvoiceRow)> {
    if let Record::InvoiceRow(source_invoice) = &record_for_processing.record {
        pub use InvoiceRowStatus::*;
        if !record_for_processing.is_other_party_active_on_site {
            return None;
        }

        if source_invoice.r#type != InvoiceRowType::InboundShipment {
            return None;
        }

        if let Some(Record::InvoiceRow(linked_invoice)) = &record_for_processing.linked_record {
            if linked_invoice.status == Verified {
                return None;
            }

            if source_invoice.status != Delivered && source_invoice.status != Verified {
                return None;
            }

            if linked_invoice.status == source_invoice.status {
                return None;
            }

            return Some((linked_invoice.clone(), source_invoice.clone()));
        }
    }

    None
}
