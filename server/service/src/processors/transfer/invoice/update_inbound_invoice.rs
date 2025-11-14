use repository::{
    InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType, RepositoryError,
    StorageConnection,
};

use crate::{
    activity_log::{log_type_from_invoice_status, system_activity_log_entry},
    processors::transfer::invoice::InvoiceTransferOutput,
};

use super::{
    create_inbound_invoice::InboundInvoiceType, InvoiceTransferProcessor,
    InvoiceTransferProcessorRecord, Operation,
};

const DESCRIPTION: &str = "Update inbound invoice from outbound invoice";

pub(crate) struct UpdateInboundInvoiceProcessor;

impl InvoiceTransferProcessor for UpdateInboundInvoiceProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound invoice will be updated when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is Outbound shipment or Supplier Return
    /// 3. Linked invoice exists (the inbound invoice)
    /// 4. Linked inbound invoice is Picked (Inbound invoice can only be updated before it turns to Shipped status)
    /// 5. Source outbound invoice is Shipped
    ///
    /// NOTE: Invoice LINES are already synced by UpdateInboundInvoiceLineProcessor while both invoices are PICKED.
    /// This processor only updates the invoice HEADER (status, timestamps, references, etc.)
    ///
    /// Only runs once:
    /// 6. Because linked inbound invoice will be changed to Shipped status and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<InvoiceTransferOutput, RepositoryError> {
        // Check can execute
        let (outbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice,
                linked_invoice,
                ..
            } => (invoice, linked_invoice),
            operation => return Ok(InvoiceTransferOutput::WrongOperation(operation.to_owned())),
        };
        // 2.
        let inbound_invoice_type = match &outbound_invoice.invoice_row.r#type {
            InvoiceType::OutboundShipment => InboundInvoiceType::InboundShipment,
            InvoiceType::SupplierReturn => InboundInvoiceType::CustomerReturn,
            invoice_type => return Ok(InvoiceTransferOutput::WrongType(invoice_type.to_owned())),
        };
        // 3.
        let inbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(InvoiceTransferOutput::NoLinkedInvoice),
        };
        // 4.
        if inbound_invoice.invoice_row.status != InvoiceStatus::Picked {
            return Ok(InvoiceTransferOutput::WrongInboundStatus(
                inbound_invoice.invoice_row.status.to_owned(),
            ));
        }
        // 5.
        if outbound_invoice.invoice_row.status != InvoiceStatus::Shipped {
            return Ok(InvoiceTransferOutput::WrongOutboundStatus(
                outbound_invoice.invoice_row.status.to_owned(),
            ));
        }

        // Execute - update invoice
        let outbound_invoice_row = &outbound_invoice.invoice_row;

        let formatted_ref = match &outbound_invoice_row.their_reference {
            Some(reference) => format!(
                "From invoice number: {} ({})",
                outbound_invoice_row.invoice_number, reference
            ),
            None => format!(
                "From invoice number: {}",
                outbound_invoice_row.invoice_number
            ),
        };

        let formatted_comment = match inbound_invoice_type {
            InboundInvoiceType::InboundShipment => match &outbound_invoice_row.comment {
                Some(comment) => format!("Stock transfer ({comment})"),
                None => "Stock transfer".to_string(),
            },
            InboundInvoiceType::CustomerReturn => match &outbound_invoice_row.comment {
                Some(comment) => format!("Stock return ({comment})"),
                None => "Stock return".to_string(),
            },
        };

        let updated_inbound_invoice = InvoiceRow {
            // 6.
            status: outbound_invoice_row.status.clone(),
            picked_datetime: outbound_invoice_row.picked_datetime,
            shipped_datetime: outbound_invoice_row.shipped_datetime,
            their_reference: Some(formatted_ref),
            comment: Some(formatted_comment),
            transport_reference: outbound_invoice_row.transport_reference.clone(),
            tax_percentage: outbound_invoice_row.tax_percentage,
            currency_id: outbound_invoice_row.currency_id.clone(),
            currency_rate: outbound_invoice_row.currency_rate,
            expected_delivery_date: outbound_invoice_row.expected_delivery_date,

            ..inbound_invoice.invoice_row.clone()
        };

        InvoiceRowRepository::new(connection).upsert_one(&updated_inbound_invoice)?;

        system_activity_log_entry(
            connection,
            log_type_from_invoice_status(&updated_inbound_invoice.status, false),
            &updated_inbound_invoice.store_id,
            &updated_inbound_invoice.id,
        )?;

        let result = format!(
            "Inbound invoice {} updated to status {:?}",
            updated_inbound_invoice.id, updated_inbound_invoice.status
        );

        Ok(InvoiceTransferOutput::Processed(result))
    }
}
