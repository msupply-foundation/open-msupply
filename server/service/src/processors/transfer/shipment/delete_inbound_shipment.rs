use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType,
    RepositoryError, StorageConnection,
};

use super::{
    common::get_lines_for_invoice, Operation, ShipmentTransferProcessor,
    ShipmentTransferProcessorRecord,
};

const DESCRIPTION: &'static str =
    "Delete inbound shipment when source outbound shipment is deleted";

pub(crate) struct DeleteInboundShipmentProcessor;

impl ShipmentTransferProcessor for DeleteInboundShipmentProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let linked_shipment = match &record_for_processing.operation {
            Operation::Delete { linked_shipment } => linked_shipment,
            _ => return Ok(None),
        };

        let linked_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };

        if linked_shipment.invoice_row.r#type != InvoiceRowType::InboundShipment {
            return Ok(None);
        }

        if linked_shipment.invoice_row.status != InvoiceRowStatus::Picked {
            return Ok(None);
        }

        // Execute
        let deleted_invoice_id = &linked_shipment.invoice_row.id;
        let deleted_invoice_lines = get_lines_for_invoice(connection, deleted_invoice_id)?;

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in deleted_invoice_lines.iter() {
            invoice_line_repository.delete(&line.id)?;
        }

        InvoiceRowRepository::new(connection).delete(deleted_invoice_id)?;

        let result = format!(
            "shipment ({}) lines ({:?})",
            deleted_invoice_id,
            deleted_invoice_lines.into_iter().map(|r| r.id),
        );

        Ok(Some(result))
    }
}
