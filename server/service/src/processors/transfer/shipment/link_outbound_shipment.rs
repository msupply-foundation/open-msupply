use repository::{InvoiceRowRepository, InvoiceRowType, RepositoryError, StorageConnection};

use super::{Operation, ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &'static str = "Link outbound shipment to inbound shipment";

pub(crate) struct LinkOutboundShipmentProcessor;

impl ShipmentTransferProcessor for LinkOutboundShipmentProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound shipment will be linked to inbound shipment when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source shipment is Inbound shipment
    /// 3. Linked shipment exists (the outbound shipment)
    /// 4. Linked shipment is not linked to source shipment
    ///
    /// Only runs once:
    /// 5. Because link is created between linked shipment and source shipment `4.` will never be true again
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
        if linked_shipment.invoice_row.linked_invoice_id.is_some() {
            return Ok(None);
        }

        // Execute
        let mut update_linked_shipment = linked_shipment.invoice_row.clone();
        // 5.
        update_linked_shipment.linked_invoice_id = Some(source_shipment.invoice_row.id.clone());
        InvoiceRowRepository::new(connection).upsert_one(&update_linked_shipment)?;

        let result = format!(
            "shipment ({}) source shipment ({})",
            update_linked_shipment.id, source_shipment.invoice_row.id
        );

        Ok(Some(result))
    }
}
