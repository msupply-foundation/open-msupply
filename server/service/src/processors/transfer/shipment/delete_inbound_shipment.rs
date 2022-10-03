use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType, LogType,
    RepositoryError, StorageConnection,
};

use crate::{invoice::common::get_lines_for_invoice, log::system_log_entry};

use super::{Operation, ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &'static str =
    "Delete inbound shipment when source outbound shipment is deleted";

pub(crate) struct DeleteInboundShipmentProcessor;

impl ShipmentTransferProcessor for DeleteInboundShipmentProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound shipment is editable in Picked status, at this stage Inbound shipment may exist as a transfer.
    /// Since Outbound shipment is editable it can be deleted, in which case if Inbound shipment exists we also
    /// want to delete it (Inbound shipment wont' be editable until Outbound shipment is picked, so it's ok to delete it,
    /// and user will not loose any work because none will be done yet for Inbound shipment)
    ///
    /// Inbound shipment will be deleted when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Operation is delete
    /// 3. Linked shipment exists
    /// 4. Linked shipment is InboundShipment
    /// 5. Linked inbound shipment is Picked (Inbound shipment can only be deleted before it turns to Shipped status)
    ///
    /// Only runs once:
    /// 6. Because linked inbound shipment is deleted `3.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let linked_shipment = match &record_for_processing.operation {
            // 2.
            Operation::Delete { linked_shipment } => linked_shipment,
            _ => return Ok(None),
        };
        // 3.
        let inbound_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };
        // 4.
        if inbound_shipment.invoice_row.r#type != InvoiceRowType::InboundShipment {
            return Ok(None);
        }
        // 5.
        if inbound_shipment.invoice_row.status != InvoiceRowStatus::Picked {
            return Ok(None);
        }

        // Execute
        let deleted_inbound_shipment_id = &inbound_shipment.invoice_row.id;
        let deleted_inbound_lines = get_lines_for_invoice(connection, deleted_inbound_shipment_id)?;

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in deleted_inbound_lines.iter() {
            invoice_line_repository.delete(&line.invoice_line_row.id)?;
        }
        // 6.
        InvoiceRowRepository::new(connection).delete(deleted_inbound_shipment_id)?;

        system_log_entry(
            connection,
            LogType::InvoiceDeleted,
            inbound_shipment.invoice_row.store_id.clone(),
            deleted_inbound_shipment_id.clone(),
        )?;

        let result = format!(
            "shipment ({}) lines ({:?})",
            deleted_inbound_shipment_id,
            deleted_inbound_lines
                .into_iter()
                .map(|r| r.invoice_line_row.id),
        );

        Ok(Some(result))
    }
}
