use repository::{InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, RepositoryError};

use crate::{
    activity_log::{log_type_from_invoice_status, system_activity_log_entry},
    processors::transfer::invoice::{InvoiceTransferOutput, Operation},
    service_provider::ServiceContext,
};

use super::{InvoiceTransferProcessor, InvoiceTransferProcessorRecord};

const DESCRIPTION: &str = "Update outbound invoice status from inbound invoice";

pub(crate) struct UpdateOutboundInvoiceStatusProcessor;

impl InvoiceTransferProcessor for UpdateOutboundInvoiceStatusProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Outbound invoice status will be updated when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is Inbound shipment or Customer Return
    /// 3. Linked invoice exists (the outbound invoice)
    /// 4. Linked outbound invoice status is not Verified (this is the last status possible)
    /// 5. Linked outbound invoice status is not source inbound invoice status
    /// 6. Source invoice is from mSupply thus the status will be `New`. Shouldn't happen for OMS since
    ///     OMS will follow OMS status sequence
    ///
    /// Can only run three times (one for Delivered, Received and one for Verified status):
    /// 7. Because linked outbound invoice status will be updated to source inbound invoice status and `5.` will never be true again
    ///    and business rules guarantee that Inbound invoice can only change status to Delivered and Verified
    ///    and status cannot be changed backwards
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<InvoiceTransferOutput, RepositoryError> {
        // Check can execute
        let (inbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice,
                linked_invoice,
                ..
            } => (invoice, linked_invoice),
            operation => return Ok(InvoiceTransferOutput::WrongOperation(operation.to_owned())),
        };
        // 2.
        if !matches!(
            inbound_invoice.invoice_row.r#type,
            InvoiceType::InboundShipment | InvoiceType::CustomerReturn
        ) {
            return Ok(InvoiceTransferOutput::WrongType(
                inbound_invoice.invoice_row.r#type.to_owned(),
            ));
        }
        // 3.
        let outbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(InvoiceTransferOutput::NoLinkedInvoice),
        };
        // 4.
        if outbound_invoice.invoice_row.status == InvoiceStatus::Verified {
            return Ok(InvoiceTransferOutput::AlreadyVerified);
        }
        // 5.
        if outbound_invoice.invoice_row.status == inbound_invoice.invoice_row.status {
            return Ok(InvoiceTransferOutput::StatusesAlreadyMatch);
        }
        // 6.
        if inbound_invoice.invoice_row.status == InvoiceStatus::New {
            return Ok(InvoiceTransferOutput::WrongInboundStatus(
                inbound_invoice.invoice_row.status.to_owned(),
            ));
        }
        // 7.
        // Original unknown but we did have om system user updated outbound back to picked
        match inbound_invoice.invoice_row.status {
            InvoiceStatus::Delivered | InvoiceStatus::Received | InvoiceStatus::Verified => {}
            InvoiceStatus::New
            | InvoiceStatus::Picked
            | InvoiceStatus::Shipped
            | InvoiceStatus::Allocated
            | InvoiceStatus::Cancelled => {
                return Ok(InvoiceTransferOutput::WrongInboundStatus(
                    inbound_invoice.invoice_row.status.to_owned(),
                ))
            }
        }

        // Execute
        let updated_outbound_invoice = InvoiceRow {
            // 7.
            status: inbound_invoice.invoice_row.status.clone(),
            delivered_datetime: inbound_invoice.invoice_row.delivered_datetime,
            received_datetime: inbound_invoice.invoice_row.received_datetime,
            verified_datetime: inbound_invoice.invoice_row.verified_datetime,
            ..outbound_invoice.invoice_row.clone()
        };

        InvoiceRowRepository::new(&ctx.connection).upsert_one(&updated_outbound_invoice)?;

        system_activity_log_entry(
            &ctx.connection,
            log_type_from_invoice_status(&updated_outbound_invoice.status, false),
            &updated_outbound_invoice.store_id,
            &updated_outbound_invoice.id,
        )?;

        let result = format!(
            "invoice ({}) source invoice {}) status ({:?})",
            updated_outbound_invoice.id,
            inbound_invoice.invoice_row.id,
            updated_outbound_invoice.status
        );

        Ok(InvoiceTransferOutput::Processed(result))
    }
}
