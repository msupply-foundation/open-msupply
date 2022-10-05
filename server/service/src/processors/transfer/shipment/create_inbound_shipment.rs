use chrono::Utc;
use repository::{
    ActivityLogType, Invoice, InvoiceLineRowRepository, InvoiceRow, InvoiceRowRepository,
    InvoiceRowStatus, InvoiceRowType, NumberRowType, RepositoryError, Requisition,
    StorageConnection,
};
use util::uuid::uuid;

use crate::{activity_log::system_activity_log_entry, number::next_number};

use super::{
    common::generate_inbound_shipment_lines, Operation, ShipmentTransferProcessor,
    ShipmentTransferProcessorRecord,
};

const DESCRIPTION: &'static str = "Create inbound shipment from outbound shipment";

pub(crate) struct CreateInboundShipmentProcessor;

impl ShipmentTransferProcessor for CreateInboundShipmentProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound shipment will be created when all below conditions are met:
    ///
    /// 1. Source shipment name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source shipment is Outbound shipment
    /// 3. Source outbound shipment is either Shipped or Picked
    ///    (outbound shipment can also be Draft or Allocated, but we only want to generate transfer when it's Shipped or picked, as per
    ///     ./doc/omSupply_shipment_transfer_workflow.png)
    /// 4. Linked shipment does not exist (the inbound shipment)
    ///
    /// Only runs once:
    /// 5. Because created inbound shipment will be linked to source outbound shipment `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &ShipmentTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (outbound_shipment, linked_shipment, request_requistion) =
            match &record_for_processing.operation {
                Operation::Upsert {
                    shipment: outbound_shipment,
                    linked_shipment,
                    linked_shipment_requisition: request_requistion,
                } => (outbound_shipment, linked_shipment, request_requistion),
                _ => return Ok(None),
            };
        // 2.
        if outbound_shipment.invoice_row.r#type != InvoiceRowType::OutboundShipment {
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
        if linked_shipment.is_some() {
            return Ok(None);
        }

        // Execute
        let new_inbound_shipment = generate_inbound_shipment(
            connection,
            &outbound_shipment,
            record_for_processing,
            request_requistion,
        )?;
        let new_inbound_lines = generate_inbound_shipment_lines(
            connection,
            &new_inbound_shipment.id,
            &outbound_shipment,
        )?;

        InvoiceRowRepository::new(connection).upsert_one(&new_inbound_shipment)?;

        system_activity_log_entry(
            connection,
            ActivityLogType::InvoiceCreated,
            &new_inbound_shipment.store_id,
            &new_inbound_shipment.id,
        )?;

        println!("{:?}", outbound_shipment.invoice_row.status.clone());

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in new_inbound_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let result = format!(
            "shipment ({}) lines ({:?}) source shipment ({})",
            new_inbound_shipment.id,
            new_inbound_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
            outbound_shipment.invoice_row.id
        );

        Ok(Some(result))
    }
}

fn generate_inbound_shipment(
    connection: &StorageConnection,
    outbound_shipment: &Invoice,
    record_for_processing: &ShipmentTransferProcessorRecord,
    request_requistion: &Option<Requisition>,
) -> Result<InvoiceRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let name_id = outbound_shipment.store_row.name_id.clone();

    let outbound_shipment_row = &outbound_shipment.invoice_row;

    let status = match &outbound_shipment_row.status {
        InvoiceRowStatus::Picked => InvoiceRowStatus::Picked,
        InvoiceRowStatus::Shipped => InvoiceRowStatus::Shipped,
        _ => InvoiceRowStatus::New,
    };

    let request_requisition_id = request_requistion
        .as_ref()
        .map(|r| r.requisition_row.id.clone());

    let formatted_ref = format!(
        "From invoice number: {} ({})",
        outbound_shipment_row.invoice_number,
        outbound_shipment_row
            .their_reference
            .clone()
            .unwrap_or_default()
    );

    let formatted_comment = format!(
        "Stock transfer ({})",
        outbound_shipment_row.comment.clone().unwrap_or_default()
    );

    let result = InvoiceRow {
        id: uuid(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, &store_id)?,
        r#type: InvoiceRowType::InboundShipment,
        name_id,
        store_id,
        status,
        requisition_id: request_requisition_id,
        name_store_id: Some(outbound_shipment_row.store_id.clone()),
        their_reference: Some(formatted_ref),
        // 5.
        linked_invoice_id: Some(outbound_shipment_row.id.clone()),
        created_datetime: Utc::now().naive_utc(),
        picked_datetime: outbound_shipment_row.picked_datetime,
        shipped_datetime: outbound_shipment_row.shipped_datetime,
        transport_reference: outbound_shipment_row.transport_reference.clone(),
        comment: Some(formatted_comment),
        // Default
        colour: None,
        user_id: None,
        on_hold: false,
        allocated_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
    };

    Ok(result)
}
