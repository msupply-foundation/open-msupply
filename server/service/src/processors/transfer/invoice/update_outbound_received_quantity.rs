use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowRepository, InvoiceStatus,
    InvoiceType, RepositoryError, StorageConnection,
};

use crate::{
    processors::transfer::invoice::{InvoiceTransferOutput, Operation},
    service_provider::ServiceContext,
};

use super::{InvoiceTransferProcessor, InvoiceTransferProcessorRecord};

const DESCRIPTION: &str = "Copy received qty + variance reason from inbound to outbound";

pub(crate) struct UpdateOutboundReceivedQuantityProcessor;

impl InvoiceTransferProcessor for UpdateOutboundReceivedQuantityProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Received number of packs & variance reason will be updated on outbound invoice lines when
    /// all below conditions are met:
    ///
    /// Conditions:
    /// 1. Source invoice name_id is for a store active on this site (driver enforces this)
    /// 2. Source invoice is an Inbound Shipment (Customer Returns use a separate flow)
    /// 3. Source invoice is at Received, or Verified
    /// 4. A linked outbound invoice exists
    fn try_process_record(
        &self,
        ctx: &ServiceContext,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<InvoiceTransferOutput, RepositoryError> {
        let (inbound_invoice, linked_invoice) = match &record_for_processing.operation {
            Operation::Upsert {
                invoice,
                linked_invoice,
                ..
            } => (invoice, linked_invoice),
            operation => return Ok(InvoiceTransferOutput::WrongOperation(operation.to_owned())),
        };

        if inbound_invoice.invoice_row.r#type != InvoiceType::InboundShipment {
            return Ok(InvoiceTransferOutput::WrongType(
                inbound_invoice.invoice_row.r#type.to_owned(),
            ));
        }

        match inbound_invoice.invoice_row.status {
            InvoiceStatus::Received | InvoiceStatus::Verified => {}
            _ => {
                return Ok(InvoiceTransferOutput::WrongInboundStatus(
                    inbound_invoice.invoice_row.status.to_owned(),
                ))
            }
        }

        let outbound_invoice = match &linked_invoice {
            Some(linked_invoice) => linked_invoice,
            None => return Ok(InvoiceTransferOutput::NoLinkedInvoice),
        };

        let updated = set_received_qty_on_outbound_lines(
            &ctx.connection,
            &inbound_invoice.invoice_row.id,
            &outbound_invoice.invoice_row.id,
        )?;

        let result = format!(
            "({}) outbound lines updated ({}) from inbound ({})",
            outbound_invoice.invoice_row.id, updated, inbound_invoice.invoice_row.id,
        );

        Ok(InvoiceTransferOutput::Processed(result))
    }
}

fn set_received_qty_on_outbound_lines(
    connection: &StorageConnection,
    inbound_invoice_id: &str,
    _outbound_invoice_id: &str,
) -> Result<(usize), RepositoryError> {
    let line_repo = InvoiceLineRepository::new(connection);
    let line_row_repo = InvoiceLineRowRepository::new(connection);

    let inbound_lines = line_repo.query_by_filter(
        InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(inbound_invoice_id.to_string())),
    )?;

    let mut updated = 0;
    for inbound_line in inbound_lines {
        let Some(outbound_line_id) = inbound_line
            .invoice_line_row
            .linked_invoice_line_id
            .as_deref()
        else {
            continue;
        };
        let Some(mut row) = line_row_repo.find_one_by_id(outbound_line_id)? else {
            continue;
        };

        row.received_number_of_packs = Some(inbound_line.invoice_line_row.number_of_packs);
        row.reason_option_id = inbound_line.invoice_line_row.reason_option_id.clone();
        line_row_repo.upsert_one(&row)?;
        updated += 1;
    }

    Ok(updated)
}
