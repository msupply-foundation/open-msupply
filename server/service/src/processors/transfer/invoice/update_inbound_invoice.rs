use repository::{
    InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository, InvoiceStatus, InvoiceType,
    RepositoryError, StorageConnection,
};

use crate::{
    activity_log::{log_type_from_invoice_status, system_activity_log_entry},
    invoice::common::get_lines_for_invoice,
    store_preference::get_store_preferences,
};

use super::{
    common::{convert_invoice_line_to_single_pack, generate_inbound_lines},
    create_inbound_invoice::InboundInvoiceType,
    InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation,
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
    /// 2. Source invoice is Outbound shipment or Outbound Return
    /// 3. Linked invoice exists (the inbound invoice)
    /// 4. Linked inbound invoice is Picked (Inbound invoice can only be updated before it turns to Shipped status)
    /// 5. Source outbound invoice is Shipped
    ///
    /// Only runs once:
    /// 6. Because linked inbound invoice will be changed to Shipped status and `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (outbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice,
                linked_invoice,
                ..
            } => (invoice, linked_invoice),
            _ => return Ok(None),
        };
        // 2.
        let inbound_invoice_type = match outbound_invoice.invoice_row.r#type {
            InvoiceType::OutboundShipment => InboundInvoiceType::InboundShipment,
            InvoiceType::SupplierReturn => InboundInvoiceType::CustomerReturn,
            _ => return Ok(None),
        };
        // 3.
        let inbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(None),
        };
        // 4.
        if inbound_invoice.invoice_row.status != InvoiceStatus::Picked {
            return Ok(None);
        }
        // 5.
        if outbound_invoice.invoice_row.status != InvoiceStatus::Shipped {
            return Ok(None);
        }

        // Execute
        let lines_to_delete = get_lines_for_invoice(connection, &inbound_invoice.invoice_row.id)?;
        let new_inbound_lines = generate_inbound_lines(
            connection,
            &inbound_invoice.invoice_row.id,
            outbound_invoice,
        )?;

        let store_preferences =
            get_store_preferences(connection, &inbound_invoice.invoice_row.store_id)?;
        let new_inbound_lines = match store_preferences.pack_to_one {
            true => convert_invoice_line_to_single_pack(new_inbound_lines),
            false => new_inbound_lines,
        };

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in lines_to_delete.iter() {
            invoice_line_repository.delete(&line.invoice_line_row.id)?;
        }

        for line in new_inbound_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

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
                Some(comment) => format!("Stock transfer ({})", comment),
                None => "Stock transfer".to_string(),
            },
            InboundInvoiceType::CustomerReturn => match &outbound_invoice_row.comment {
                Some(comment) => format!("Stock return ({})", comment),
                None => "Stock return".to_string(),
            },
        };

        let updated_inbound_invoice = InvoiceRow {
            // 6.
            status: InvoiceStatus::Shipped,
            shipped_datetime: outbound_invoice_row.shipped_datetime,
            their_reference: Some(formatted_ref),
            comment: Some(formatted_comment),
            transport_reference: outbound_invoice_row.transport_reference.clone(),
            tax_percentage: outbound_invoice_row.tax_percentage,
            currency_id: outbound_invoice_row.currency_id.clone(),
            currency_rate: outbound_invoice_row.currency_rate,

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
            "invoice ({}) deleted lines ({:?}) inserted lines ({:?})",
            updated_inbound_invoice.id,
            lines_to_delete
                .into_iter()
                .map(|l| l.invoice_row.id)
                .collect::<Vec<String>>(),
            new_inbound_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
        );

        Ok(Some(result))
    }
}
