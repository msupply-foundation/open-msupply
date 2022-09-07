use chrono::Utc;
use repository::{
    EqualFilter, Invoice, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository,
    InvoiceRowStatus, InvoiceRowType, NumberRowType, RepositoryError, RequisitionFilter,
    RequisitionRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::number::next_number;

use super::{
    common::regenerate_linked_invoice_lines, Operation, ShipmentTransferProcessor,
    ShipmentTransferProcessorRecord,
};

const DESCRIPTION: &'static str = "Create inbound shipment from outbound shipment";

pub(crate) struct CreateInboundShipmentProcessor;

impl ShipmentTransferProcessor for CreateInboundShipmentProcessor {
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

        if !matches!(
            source_shipment.invoice_row.status,
            InvoiceRowStatus::Shipped | InvoiceRowStatus::Picked
        ) {
            return Ok(None);
        }

        if linked_shipment.is_some() {
            return Ok(None);
        }

        // Execute
        let new_shipment =
            generate_linked_invoice(connection, &source_shipment, record_for_processing)?;
        let (lines_to_delete, new_shipment_lines) =
            regenerate_linked_invoice_lines(connection, &new_shipment, &source_shipment)?;

        InvoiceRowRepository::new(connection).upsert_one(&new_shipment)?;

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in lines_to_delete.iter() {
            invoice_line_repository.delete(&line.id)?;
        }

        for line in new_shipment_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let result = format!(
            "shipment ({}) lines ({:?}) source shipment ({})",
            new_shipment.id,
            new_shipment_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
            source_shipment.invoice_row.id
        );

        Ok(Some(result))
    }
}

fn generate_linked_invoice(
    connection: &StorageConnection,
    source_invoice: &Invoice,
    record_for_processing: &ShipmentTransferProcessorRecord,
) -> Result<InvoiceRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let name_id = source_invoice.store_row.name_id.clone();

    let source_invoice_row = &source_invoice.invoice_row;

    let status = match &source_invoice_row.status {
        InvoiceRowStatus::Picked => InvoiceRowStatus::Picked,
        InvoiceRowStatus::Shipped => InvoiceRowStatus::Shipped,
        _ => InvoiceRowStatus::New,
    };

    let requisition_id =
        get_request_requisition_id_from_inbound_shipment(connection, &source_invoice_row)?;

    let result = InvoiceRow {
        id: uuid(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, &store_id)?,
        r#type: InvoiceRowType::InboundShipment,
        name_id,
        store_id,
        status,
        requisition_id,
        name_store_id: Some(source_invoice_row.store_id.clone()),
        their_reference: source_invoice_row.their_reference.clone(),
        linked_invoice_id: Some(source_invoice_row.id.clone()),
        created_datetime: Utc::now().naive_utc(),
        picked_datetime: source_invoice_row.picked_datetime,
        shipped_datetime: source_invoice_row.shipped_datetime,
        transport_reference: source_invoice_row.transport_reference.clone(),
        // Default
        colour: None,
        user_id: None,
        comment: None,
        on_hold: false,
        allocated_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    };

    Ok(result)
}

fn get_request_requisition_id_from_inbound_shipment(
    connection: &StorageConnection,
    source_invoice: &InvoiceRow,
) -> Result<Option<String>, RepositoryError> {
    let result = if let Some(response_requisition_id) = &source_invoice.requisition_id {
        RequisitionRepository::new(connection)
            .query_one(
                RequisitionFilter::new()
                    .linked_requisition_id(EqualFilter::equal_to(response_requisition_id)),
            )?
            .map(|request_requisition| request_requisition.requisition_row.id)
    } else {
        None
    };

    Ok(result)
}
