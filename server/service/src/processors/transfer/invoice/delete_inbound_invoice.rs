use repository::{
    ActivityLogType, InvoiceLineRowRepository, InvoiceRowRepository, InvoiceStatus, InvoiceType,
    RepositoryError, StorageConnection,
};

use crate::{activity_log::system_activity_log_entry, invoice::common::get_lines_for_invoice};

use super::{InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation};

const DESCRIPTION: &str = "Delete inbound invoice when source outbound invoice is deleted";

pub(crate) struct DeleteInboundInvoiceProcessor;

impl InvoiceTransferProcessor for DeleteInboundInvoiceProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound invoice is editable in Picked status, at this stage Inbound invoice may exist as a transfer.
    /// Since Outbound invoice is editable it can be deleted, in which case if Inbound invoice exists we also
    /// want to delete it (Inbound invoice wont' be editable until Outbound invoice is shipped, so it's ok to delete it,
    /// and user will not loose any work because none will be done yet for Inbound invoice)
    ///
    /// Inbound invoice will be deleted when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Operation is delete
    /// 3. Linked invoice exists
    /// 4. Linked invoice is either InboundShipment or Inbound Return
    /// 5. Linked inbound invoice is Picked (Inbound invoice can only be deleted before it turns to Shipped status)
    ///
    /// Only runs once:
    /// 6. Because linked inbound invoice is deleted. `3.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let linked_invoice = match &record_for_processing.operation {
            // 2.
            Operation::Delete { linked_invoice } => linked_invoice,
            _ => return Ok(None),
        };
        // 3.
        let inbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(None),
        };
        // 4.
        if !matches!(
            inbound_invoice.invoice_row.r#type,
            InvoiceType::InboundShipment | InvoiceType::CustomerReturn
        ) {
            return Ok(None);
        }
        // 5.
        if inbound_invoice.invoice_row.status != InvoiceStatus::Picked {
            return Ok(None);
        }

        // Execute
        let deleted_inbound_invoice = inbound_invoice.invoice_row.clone();
        let deleted_inbound_lines = get_lines_for_invoice(connection, &deleted_inbound_invoice.id)?;

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in deleted_inbound_lines.iter() {
            invoice_line_repository.delete(&line.invoice_line_row.id)?;
        }
        // 6.
        InvoiceRowRepository::new(connection).delete(&deleted_inbound_invoice.id)?;

        system_activity_log_entry(
            connection,
            ActivityLogType::InvoiceDeleted,
            &deleted_inbound_invoice.store_id,
            &deleted_inbound_invoice.id,
        )?;

        let result = format!(
            "invoice ({}) lines ({:?})",
            deleted_inbound_invoice.id,
            deleted_inbound_lines
                .into_iter()
                .map(|r| r.invoice_line_row.id),
        );

        Ok(Some(result))
    }
}
