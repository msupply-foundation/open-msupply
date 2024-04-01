use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, RepositoryError,
    StorageConnection,
};

use crate::{
    activity_log::{log_type_from_invoice_status, system_activity_log_entry},
    processors::transfer::shipment::Operation,
};

use super::{ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &str = "Update outbound shipment status from inbound shipment";

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
    /// 4. Linked outbound shipment status is not Verified (this is the last status possible)
    /// 5. Linked outbound shipment status is not source inbound shipment status
    ///
    /// Can only run two times (one for Delivered and one for Verified status):
    /// 6. Because linked outbound shipment status will be updated to source inbound shipment status and `5.` will never be true again
    ///    and business rules guarantee that Inbound shipment can only change status to Delivered and Verified
    ///    and status cannot be changed backwards
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (inbound_shipment, linked_shipment) = match &record_for_processing.operation {
            Operation::Upsert {
                shipment,
                linked_shipment,
                ..
            } => (shipment, linked_shipment),
            _ => return Ok(None),
        };
        // 2.
        if inbound_shipment.invoice_row.r#type != InvoiceRowType::InboundShipment {
            return Ok(None);
        }
        // 3.
        let outbound_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };
        // 4.
        if outbound_shipment.invoice_row.status == InvoiceRowStatus::Verified {
            return Ok(None);
        }
        // 5.
        if outbound_shipment.invoice_row.status == inbound_shipment.invoice_row.status {
            return Ok(None);
        }

        // Execute
        let updated_outbound_shipment = InvoiceRow {
            // 6.
            status: inbound_shipment.invoice_row.status.clone(),
            delivered_datetime: inbound_shipment.invoice_row.delivered_datetime,
            verified_datetime: inbound_shipment.invoice_row.verified_datetime,
            ..outbound_shipment.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_outbound_shipment)?;

        system_activity_log_entry(
            connection,
            log_type_from_invoice_status(&updated_outbound_shipment.status, false),
            &updated_outbound_shipment.store_id,
            &updated_outbound_shipment.id,
        )?;

        let result = format!(
            "shipment ({}) source shipment {}) status ({:?})",
            updated_outbound_shipment.id,
            inbound_shipment.invoice_row.id,
            updated_outbound_shipment.status
        );

        Ok(Some(result))
    }
}
