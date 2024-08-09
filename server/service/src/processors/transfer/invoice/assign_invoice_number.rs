use repository::{
    ActivityLogType, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, NumberRowType,
    RepositoryError, StorageConnection,
};

use crate::{activity_log::system_activity_log_entry, number::next_number};

use super::{InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation};

const DESCRIPTION: &str =
    "Allocate an invoice_number to an inbound invoices if they have an invoice_number of -1";

pub(crate) struct AssignInvoiceNumberProcessor;

impl InvoiceTransferProcessor for AssignInvoiceNumberProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound invoice will be created when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is either Outbound Shipment or Supplier Return
    /// 3. Source outbound invoice is either Shipped or Picked
    ///    (outbound invoice can also be Draft or Allocated, but we only want to generate transfer when it's Shipped or picked, as per
    ///     ./doc/omSupply_shipment_transfer_workflow.png)
    /// 4. Linked invoice exists (the inbound invoice)
    /// 5. Linked invoice has invoice number -1
    ///
    /// Only runs once:
    /// 5. Because the inbound invoice will have an invoice_number allocated to it
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (outbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice: outbound_invoice,
                linked_invoice,
                ..
            } => (outbound_invoice, linked_invoice),
            _ => return Ok(None),
        };
        // 2.
        if !matches!(
            outbound_invoice.invoice_row.r#type,
            InvoiceType::OutboundShipment | InvoiceType::SupplierReturn
        ) {
            return Ok(None);
        }
        // 3.
        if !matches!(
            outbound_invoice.invoice_row.status,
            InvoiceStatus::Shipped | InvoiceStatus::Picked
        ) {
            return Ok(None);
        }
        // 4.
        let inbound_invoice = match linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(None),
        };
        // 5.
        if inbound_invoice.invoice_row.invoice_number != -1 {
            return Ok(None);
        }

        // Execute
        let updated_invoice_row = InvoiceRow {
            invoice_number: next_number(
                connection,
                &NumberRowType::InboundShipment,
                &inbound_invoice.store_row.id,
            )?,
            ..inbound_invoice.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_invoice_row)?;
        system_activity_log_entry(
            connection,
            ActivityLogType::InvoiceNumberAllocated,
            &inbound_invoice.store_row.id,
            &inbound_invoice.invoice_row.id,
        )?;

        let result = format!(
            "invoice ({}) allocated invoice_number {}",
            updated_invoice_row.id, updated_invoice_row.invoice_number
        );

        Ok(Some(result))
    }
}
