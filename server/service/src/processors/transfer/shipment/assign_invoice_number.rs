use repository::{
    ActivityLogType, InvoiceRow, InvoiceRowRepository, InvoiceRowStatus, InvoiceRowType,
    NumberRowType, RepositoryError, StorageConnection,
};

use crate::{activity_log::system_activity_log_entry, number::next_number};

use super::{Operation, ShipmentTransferProcessor, ShipmentTransferProcessorRecord};

const DESCRIPTION: &str =
    "Allocate an invoice_number to an inbound shipments if they have an invoice_number of -1";

pub(crate) struct AssignInvoiceNumberProcessor;

impl ShipmentTransferProcessor for AssignInvoiceNumberProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound shipment will be created when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is either Outbound Shipment or Outbound Return
    /// 3. Source outbound shipment is either Shipped or Picked
    ///    (outbound shipment can also be Draft or Allocated, but we only want to generate transfer when it's Shipped or picked, as per
    ///     ./doc/omSupply_shipment_transfer_workflow.png)
    /// 4. Linked shipment exists (the inbound shipment)
    /// 5. Linked shipment has invoice number -1
    ///
    /// Only runs once:
    /// 5. Because the inbound shipment will have an invoice_number allocated to it
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (outbound_shipment, linked_shipment, _request_requisition) =
            match &record_for_processing.operation {
                Operation::Upsert {
                    shipment: outbound_shipment,
                    linked_shipment,
                    linked_shipment_requisition: request_requisition,
                } => (outbound_shipment, linked_shipment, request_requisition),
                _ => return Ok(None),
            };
        // 2.
        if !matches!(
            outbound_shipment.invoice_row.r#type,
            InvoiceRowType::OutboundShipment | InvoiceRowType::OutboundReturn
        ) {
            return Ok(None);
        }
        // 3.
        if !matches!(
            outbound_shipment.invoice_row.status,
            InvoiceRowStatus::Shipped | InvoiceRowStatus::Picked
        ) {
            return Ok(None);
        }
        // 4.
        let inbound_shipment = match linked_shipment {
            Some(linked_shipment) => linked_shipment,
            None => return Ok(None),
        };
        // 5.
        if inbound_shipment.invoice_row.invoice_number != -1 {
            return Ok(None);
        }

        // Execute
        let updated_invoice_row = InvoiceRow {
            invoice_number: next_number(
                connection,
                &NumberRowType::InboundShipment,
                &inbound_shipment.store_row.id,
            )?,
            ..inbound_shipment.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_invoice_row)?;
        system_activity_log_entry(
            connection,
            ActivityLogType::InvoiceNumberAllocated,
            &inbound_shipment.store_row.id,
            &inbound_shipment.invoice_row.id,
        )?;

        let result = format!(
            "shipment ({}) allocated invoice_number {}",
            updated_invoice_row.id, updated_invoice_row.invoice_number
        );

        Ok(Some(result))
    }
}
