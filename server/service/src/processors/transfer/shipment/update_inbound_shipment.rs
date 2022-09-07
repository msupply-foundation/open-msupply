use repository::{
    InvoiceLineRowRepository, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType,
    RepositoryError, StorageConnection,
};

use super::{
    common::regenerate_linked_invoice_lines, Operation, ShipmentTransferProcessor,
    ShipmentTransferProcessorRecord,
};

const DESCRIPTION: &'static str = "Update inbound shipment from outbound shipment";

pub(crate) struct UpdateInboundShipmentProcessor;

impl ShipmentTransferProcessor for UpdateInboundShipmentProcessor {
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

        if source_shipment.invoice_row.r#type != InvoiceRowType::OutboundShipment {
            return Ok(None);
        }

        let linked_shipment = match &linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };

        if linked_shipment.invoice_row.status != InvoiceRowStatus::Picked {
            return Ok(None);
        }

        // Execute
        let (deleted_invoice_lines, new_invoice_lines) = regenerate_linked_invoice_lines(
            connection,
            &linked_shipment.invoice_row,
            &source_shipment,
        )?;

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in deleted_invoice_lines.iter() {
            invoice_line_repository.delete(&line.id)?;
        }

        for line in new_invoice_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let mut updated_linked_shipment = linked_shipment.invoice_row.clone();
        updated_linked_shipment.status = source_shipment.invoice_row.status.clone();
        updated_linked_shipment.shipped_datetime =
            source_shipment.invoice_row.shipped_datetime.clone();

        InvoiceRowRepository::new(connection).upsert_one(&updated_linked_shipment)?;

        let result = format!(
            "shipment ({}) deleted lines ({:?}) inserted lines ({:?})",
            updated_linked_shipment.id,
            deleted_invoice_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
            new_invoice_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
        );

        Ok(Some(result))
    }
}
