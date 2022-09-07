use repository::{InvoiceRowRepository, InvoiceRowType, RepositoryError, StorageConnection};

use super::{Operation, ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &'static str = "Link outbound shipment to inbound shipment";

pub(crate) struct LinkOutboundShipmentProcessor;

impl ShipmentTransferProcessor for LinkOutboundShipmentProcessor {
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

        if linked_shipment.invoice_row.linked_invoice_id.is_some() {
            return Ok(None);
        }

        // Execute
        let mut update_linked_shipment = linked_shipment.invoice_row.clone();
        update_linked_shipment.linked_invoice_id = Some(source_shipment.invoice_row.id.clone());
        InvoiceRowRepository::new(connection).upsert_one(&update_linked_shipment)?;

        let result = format!(
            "shipment ({}) source shipment ({})",
            update_linked_shipment.id, source_shipment.invoice_row.id
        );

        Ok(Some(result))
    }
}
