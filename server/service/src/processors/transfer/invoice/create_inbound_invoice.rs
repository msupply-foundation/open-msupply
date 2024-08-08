use chrono::{Duration, NaiveDateTime, NaiveTime, Utc};
use repository::{
    ActivityLogType, EqualFilter, Invoice, InvoiceLineRowRepository, InvoiceRow,
    InvoiceRowRepository, InvoiceStatus, InvoiceType, NumberRowType, RepositoryError, Requisition,
    StorageConnection, StoreFilter, StoreRepository, StoreRowRepository,
};
use util::uuid::uuid;

use crate::{
    activity_log::system_activity_log_entry, number::next_number,
    store_preference::get_store_preferences,
};

use super::{
    common::{convert_invoice_line_to_single_pack, generate_inbound_lines},
    InvoiceTransferProcessor, InvoiceTransferProcessorRecord, Operation,
};

const DESCRIPTION: &str = "Create inbound invoice from outbound invoice";

pub(crate) struct CreateInboundInvoiceProcessor;
pub enum InboundInvoiceType {
    CustomerReturn,
    InboundShipment,
}

impl InvoiceTransferProcessor for CreateInboundInvoiceProcessor {
    fn get_description(&self) -> String {
        DESCRIPTION.to_string()
    }

    /// Inbound invoice will be created when all below conditions are met:
    ///
    /// 1. Source invoice name_id is for a store that is active on current site (transfer processor driver guarantees this)
    /// 2. Source invoice is either Outbound shipment or Outbound Return
    /// 3. Source outbound invoice is either Shipped or Picked
    ///    (outbounds can also be New or Allocated, but we only want to generate transfer when it's Shipped or Picked, as per
    ///     ./doc/omSupply_shipment_transfer_workflow.png)
    /// 4. Linked invoice does not exist (the inbound invoice)
    /// 5. Source invoice was not created a month before receiving store was created.
    ///
    /// Only runs once:
    /// 5. Because created inbound invoice will be linked to source outbound invoice `4.` will never be true again
    fn try_process_record(
        &self,
        connection: &StorageConnection,
        record_for_processing: &InvoiceTransferProcessorRecord,
    ) -> Result<Option<String>, RepositoryError> {
        // Check can execute
        let (outbound_invoice, linked_invoice, request_requisition, original_shipment) =
            match &record_for_processing.operation {
                Operation::Upsert {
                    invoice: outbound_invoice,
                    linked_invoice,
                    linked_shipment_requisition: request_requisition,
                    linked_original_shipment: original_shipment,
                } => (
                    outbound_invoice,
                    linked_invoice,
                    request_requisition,
                    original_shipment,
                ),
                _ => return Ok(None),
            };
        // 2.
        // Also get type for new invoice
        let new_invoice_type = match outbound_invoice.invoice_row.r#type {
            InvoiceType::OutboundShipment => InboundInvoiceType::InboundShipment,
            InvoiceType::SupplierReturn => InboundInvoiceType::CustomerReturn,
            _ => return Ok(None),
        };

        // 3.
        if !matches!(
            outbound_invoice.invoice_row.status,
            InvoiceStatus::Shipped | InvoiceStatus::Picked
        ) {
            return Ok(None);
        }
        // 4.
        if linked_invoice.is_some() {
            return Ok(None);
        }
        // 5.
        let store = StoreRowRepository::new(connection)
            .find_one_by_id(&record_for_processing.other_party_store_id)?
            .ok_or(RepositoryError::NotFound)?;

        if let Some(created_date) = store.created_date {
            let store_created_datetime = NaiveDateTime::new(
                created_date - Duration::days(30),
                NaiveTime::from_hms_opt(0, 0, 0).unwrap_or_default(),
            );
            let invoice_created_datetime = outbound_invoice.invoice_row.created_datetime;
            if invoice_created_datetime < store_created_datetime {
                return Ok(None);
            }
        }

        // Execute
        let new_inbound_invoice = generate_inbound_invoice(
            connection,
            outbound_invoice,
            record_for_processing,
            request_requisition,
            original_shipment,
            new_invoice_type,
        )?;
        let new_inbound_lines =
            generate_inbound_lines(connection, &new_inbound_invoice.id, outbound_invoice)?;
        let store_preferences = get_store_preferences(connection, &new_inbound_invoice.store_id)?;

        let new_inbound_lines = match store_preferences.pack_to_one {
            true => convert_invoice_line_to_single_pack(new_inbound_lines),
            false => new_inbound_lines,
        };

        InvoiceRowRepository::new(connection).upsert_one(&new_inbound_invoice)?;

        system_activity_log_entry(
            connection,
            ActivityLogType::InvoiceCreated,
            &new_inbound_invoice.store_id,
            &new_inbound_invoice.id,
        )?;

        let invoice_line_repository = InvoiceLineRowRepository::new(connection);

        for line in new_inbound_lines.iter() {
            invoice_line_repository.upsert_one(line)?;
        }

        let result = format!(
            "invoice ({}) lines ({:?}) source invoice ({})",
            new_inbound_invoice.id,
            new_inbound_lines
                .into_iter()
                .map(|r| r.id)
                .collect::<Vec<String>>(),
            outbound_invoice.invoice_row.id
        );

        Ok(Some(result))
    }
}

fn generate_inbound_invoice(
    connection: &StorageConnection,
    outbound_invoice: &Invoice,
    record_for_processing: &InvoiceTransferProcessorRecord,
    request_requisition: &Option<Requisition>,
    original_shipment: &Option<Invoice>,
    r#type: InboundInvoiceType,
) -> Result<InvoiceRow, RepositoryError> {
    let store_id = record_for_processing.other_party_store_id.clone();
    let name_id = StoreRepository::new(connection)
        .query_by_filter(
            StoreFilter::new().id(EqualFilter::equal_to(&outbound_invoice.store_row.id)),
        )?
        .pop()
        .ok_or(RepositoryError::NotFound)?
        .name_row
        .id;

    let outbound_invoice_row = &outbound_invoice.invoice_row;

    let status = match &outbound_invoice_row.status {
        InvoiceStatus::Picked => InvoiceStatus::Picked,
        InvoiceStatus::Shipped => InvoiceStatus::Shipped,
        _ => InvoiceStatus::New,
    };

    let request_requisition_id = request_requisition
        .as_ref()
        .map(|r| r.requisition_row.id.clone());

    let original_shipment_id = original_shipment.as_ref().map(|s| s.invoice_row.id.clone());

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

    let formatted_comment = match r#type {
        InboundInvoiceType::InboundShipment => match &outbound_invoice_row.comment {
            Some(comment) => format!("Stock transfer ({})", comment),
            None => "Stock transfer".to_string(),
        },
        InboundInvoiceType::CustomerReturn => match &outbound_invoice_row.comment {
            Some(comment) => format!("Stock return ({})", comment),
            None => "Stock return".to_string(),
        },
    };

    let result = InvoiceRow {
        id: uuid(),
        invoice_number: next_number(
            connection,
            &match r#type {
                InboundInvoiceType::InboundShipment => NumberRowType::InboundShipment,
                InboundInvoiceType::CustomerReturn => NumberRowType::CustomerReturn,
            },
            &store_id,
        )?,
        r#type: match r#type {
            InboundInvoiceType::CustomerReturn => InvoiceType::CustomerReturn,
            InboundInvoiceType::InboundShipment => InvoiceType::InboundShipment,
        },
        name_link_id: name_id,
        store_id,
        status,
        requisition_id: request_requisition_id,
        name_store_id: Some(outbound_invoice_row.store_id.clone()),
        their_reference: Some(formatted_ref),
        // 5.
        linked_invoice_id: Some(outbound_invoice_row.id.clone()),
        created_datetime: Utc::now().naive_utc(),
        picked_datetime: outbound_invoice_row.picked_datetime,
        shipped_datetime: outbound_invoice_row.shipped_datetime,
        transport_reference: outbound_invoice_row.transport_reference.clone(),
        comment: Some(formatted_comment),
        tax_percentage: outbound_invoice_row.tax_percentage,
        currency_id: outbound_invoice_row.currency_id.clone(),
        currency_rate: outbound_invoice_row.currency_rate,
        original_shipment_id,
        // Default
        colour: None,
        user_id: None,
        on_hold: false,
        allocated_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        clinician_link_id: None,
    };

    Ok(result)
}
