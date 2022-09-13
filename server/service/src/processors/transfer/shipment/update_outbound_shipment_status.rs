use repository::{
    InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, RepositoryError, StorageConnection,
};

use crate::processors::transfer::shipment::Operation;

use super::{ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &'static str = "Update outbound shipment status from inbound shipment";

pub(crate) struct UpdateOutboundShipmentStatusProcessor;

impl ShipmentTransferProcessor for UpdateOutboundShipmentStatusProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound shipment status will be updated when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source shipment is Inbound shipment
    /// 3. Linked shipment exists (the outbound shipment)
    /// 4. Linked shipment invoice status is not Verified (this is the last status possible)
    /// 5. Linked shipment status is not source shipment status
    ///
    /// Can only run two times (one for Delivered and one for Verified status):
    /// 6. Because linked shipment status will be updated to source shipment status and `5.` will never be true again
    ///    and business rules guarantee that Inbound shipment can only change status to Delivered and Verified
    ///    and status cannot be changed backwards
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (source_shipment, linked_shipment) = match &record_for_processing.operation {
            Operation::Upsert {
                shipment,
                linked_shipment,
            } => (shipment, linked_shipment),
            _ => return Ok(None),
        };
        // 2.
        if source_shipment.invoice_row.r#type != InvoiceRowType::InboundShipment {
            return Ok(None);
        }
        // 3.
        let linked_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };
        // 4.
        if linked_shipment.invoice_row.status == InvoiceRowStatus::Verified {
            return Ok(None);
        }
        // 5.
        if linked_shipment.invoice_row.status == source_shipment.invoice_row.status {
            return Ok(None);
        }

        // Execute
        let mut updated_linked_shipment = linked_shipment.invoice_row.clone();
        // 6.
        updated_linked_shipment.status = source_shipment.invoice_row.status.clone();
        updated_linked_shipment.delivered_datetime =
            source_shipment.invoice_row.delivered_datetime.clone();
        updated_linked_shipment.verified_datetime =
            source_shipment.invoice_row.verified_datetime.clone();

        InvoiceRowRepository::new(connection).upsert_one(&updated_linked_shipment)?;

        let result = format!(
            "shipment ({}) source shipment {}) status ({:?})",
            updated_linked_shipment.id,
            source_shipment.invoice_row.id,
            updated_linked_shipment.status
        );

        Ok(Some(result))
    }
}
