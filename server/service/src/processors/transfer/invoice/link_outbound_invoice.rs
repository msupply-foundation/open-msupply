use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceType, RepositoryError, StorageConnection,
};

use super::{InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation};

const DESCRIPTION: &str = "Link outbound invoice to inbound invoice";

pub(crate) struct LinkOutboundInvoiceProcessor;

impl InvoiceTransferProcessor for LinkOutboundInvoiceProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound invoice will be linked to inbound invoice when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is either Inbound shipment or Inbound Return
    /// 3. Linked invoice exists (the outbound invoice)
    /// 4. Linked outbound invoice is not linked to source inbound invoice
    ///
    /// Only runs once:
    /// 5. Because link is created between linked outbound invoice and source inbound invoice `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (inbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice,
                linked_invoice,
                ..
            } => (invoice, linked_invoice),
            _ => return Ok(None),
        };
        // 2.
        if !matches!(
            inbound_invoice.invoice_row.r#type,
            InvoiceType::InboundShipment | InvoiceType::CustomerReturn
        ) {
            return Ok(None);
        }
        // 3.
        let outbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(None),
        };
        // 4.
        if outbound_invoice.invoice_row.linked_invoice_id.is_some() {
            return Ok(None);
        }

        // Execute
        let updated_outbound_invoice = InvoiceRow {
            // 5.
            linked_invoice_id: Some(inbound_invoice.invoice_row.id.clone()),
            ..outbound_invoice.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_outbound_invoice)?;

        let result = format!(
            "invoice ({}) source invoice ({})",
            updated_outbound_invoice.id, inbound_invoice.invoice_row.id
        );

        Ok(Some(result))
    }
}
