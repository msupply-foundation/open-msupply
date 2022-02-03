use crate::sync_processor::{
    ProcessRecord, ProcessRecordError, ProcessRecordResult, Record, RecordForProcessing,
};
use repository::{
    schema::{InvoiceRowStatus, InvoiceRowType},
    InvoiceRepository,
};

pub struct UpdateOutboundShipmentStatusProcessor {}

impl ProcessRecord for UpdateOutboundShipmentStatusProcessor {
    fn name(&self) -> String {
        "Update outbound shipment status".to_string()
    }

    fn can_execute(&self, record_for_processing: &RecordForProcessing) -> bool {
        if let Record::InvoiceRow(source_invoice) = &record_for_processing.record {
            pub use InvoiceRowStatus::*;
            if !record_for_processing.is_other_party_active_on_site {
                return false;
            }

            if source_invoice.r#type != InvoiceRowType::InboundShipment {
                return false;
            }

            if let Some(Record::InvoiceRow(linked_invoice)) = &record_for_processing.linked_record {
                if linked_invoice.status == Verified {
                    return false;
                }

                if source_invoice.status != Delivered && source_invoice.status != Verified {
                    return false;
                }

                if linked_invoice.status == source_invoice.status {
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
            update_linked_invoice.status = source_invoice.status.clone();
            update_linked_invoice.delivered_datetime = source_invoice.delivered_datetime.clone();
            update_linked_invoice.verified_datetime = source_invoice.verified_datetime.clone();

            InvoiceRepository::new(connection).upsert_one(&update_linked_invoice)?;

            let result = ProcessRecordResult::Success(format!(
                "updated invoice status {:#?}",
                update_linked_invoice
            ));
            return Ok(result);
        }

        Ok(ProcessRecordResult::ConditionNotMetInProcessor)
    }
}
