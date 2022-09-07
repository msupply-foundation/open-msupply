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

        if source_shipment.invoice_row.r#type != InvoiceRowType::InboundShipment {
            return Ok(None);
        }

        let linked_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };

        use InvoiceRowStatus::*;
        if linked_shipment.invoice_row.status == Verified {
            return Ok(None);
        }

        if linked_shipment.invoice_row.status == source_shipment.invoice_row.status {
            return Ok(None);
        }

        // Execute
        let mut updated_linked_shipment = linked_shipment.invoice_row.clone();
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
