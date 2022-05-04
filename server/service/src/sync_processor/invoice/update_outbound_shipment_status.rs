use crate::sync_processor::{ProcessRecordError, Record, RecordForProcessing, SyncProcessor};
use repository::{InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, StorageConnection};

const DESCRIPTION: &'static str = "Update outbound shipment status from inbound shipment";

pub struct UpdateOutboundShipmentStatusProcessor<'a> {
    pub connection: &'a StorageConnection,
}

impl<'a> SyncProcessor for UpdateOutboundShipmentStatusProcessor<'a> {
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

        pub use InvoiceRowStatus::*;
        if !record_for_processing.is_other_party_active_on_site {
            return Ok(None);
        }

        if source_invoice.r#type != InvoiceRowType::InboundShipment {
            return Ok(None);
        }

        if linked_invoice.status == Verified {
            return Ok(None);
        }

        if source_invoice.status != Delivered && source_invoice.status != Verified {
            return Ok(None);
        }

        if linked_invoice.status == source_invoice.status {
            return Ok(None);
        }

        // Execute
        let mut updated_linked_invoice = linked_invoice.clone();
        updated_linked_invoice.status = source_invoice.status.clone();
        updated_linked_invoice.delivered_datetime = source_invoice.delivered_datetime.clone();
        updated_linked_invoice.verified_datetime = source_invoice.verified_datetime.clone();

        InvoiceRowRepository::new(self.connection).upsert_one(&updated_linked_invoice)?;

        let result = format!(
            "{}\nupdated_linked_invoice: {:#?}",
            DESCRIPTION, updated_linked_invoice,
        );

        Ok(Some(result))
    }
}
