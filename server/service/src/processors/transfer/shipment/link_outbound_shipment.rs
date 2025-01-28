use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceRowType, RepositoryError, StorageConnection,
};

use super::{Operation, ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &str = "Link outbound shipment to inbound shipment";

pub(crate) struct LinkOutboundShipmentProcessor;

impl ShipmentTransferProcessor for LinkOutboundShipmentProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound shipment will be linked to inbound shipment when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source shipment is either Inbound shipment or Inbound Return
    /// 3. Linked shipment exists (the outbound shipment)
    /// 4. Linked outbound shipment is not linked to source inbound shipment
    ///
    /// Only runs once:
    /// 5. Because link is created between linked outbound shipment and source inbound shipment `4.` will never be true again
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
        if !matches!(
            inbound_shipment.invoice_row.r#type,
            InvoiceRowType::InboundShipment | InvoiceRowType::InboundReturn
        ) {
            return Ok(None);
        }
        // 3.
        let outbound_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };
        // 4.
        if outbound_shipment.invoice_row.linked_invoice_id.is_some() {
            return Ok(None);
        }

        // Execute
        let updated_outbound_shipment = InvoiceRow {
            // 5.
            linked_invoice_id: Some(inbound_shipment.invoice_row.id.clone()),
            ..outbound_shipment.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_outbound_shipment)?;

        let result = format!(
            "shipment ({}) source shipment ({})",
            updated_outbound_shipment.id, inbound_shipment.invoice_row.id
        );

        Ok(Some(result))
    }
}
