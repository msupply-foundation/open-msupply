use crate::{
    number::next_number,
    sync_processor::{ProcessRecordError, RecordForProcessing},
};
use chrono::Utc;
use domain::{
    invoice_line::{InvoiceLine, InvoiceLineType},
    EqualFilter,
};
use repository::{
    schema::{
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        NumberRowType,
    },
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowRepository, InvoiceRepository,
    RepositoryError, RequisitionFilter, RequisitionRepository, StorageConnection,
};
use util::uuid::uuid;

pub fn can_create_inbound_invoice(
    source_invoice: &InvoiceRow,
    record_for_processing: &RecordForProcessing,
) -> bool {
    if !record_for_processing.is_other_party_active_on_site {
        return false;
    }

    if record_for_processing.linked_record.is_some() {
        return false;
    }

    if source_invoice.r#type != InvoiceRowType::OutboundShipment {
        return false;
    }

    if source_invoice.status != InvoiceRowStatus::Picked
        && source_invoice.status != InvoiceRowStatus::Shipped
    {
        return false;
    }

    true
}

pub fn generate_and_integrate_linked_invoice(
    connection: &StorageConnection,
    source_invoice: &InvoiceRow,
    record_for_processing: &RecordForProcessing,
) -> Result<(InvoiceRow, Vec<InvoiceLineRow>), ProcessRecordError> {
    let invoice_row = generate_linked_invoice(connection, &source_invoice, record_for_processing)?;
    let (lines_to_delete, invoice_line_rows) =
        re_generate_linked_invoice_lines(connection, &invoice_row, &source_invoice)?;

    InvoiceRepository::new(connection).upsert_one(&invoice_row)?;

    let invoice_line_repository = InvoiceLineRowRepository::new(connection);

    for line in lines_to_delete.iter() {
        invoice_line_repository.delete(&line.id)?;
    }

    for line in invoice_line_rows.iter() {
        invoice_line_repository.upsert_one(line)?;
    }
    Ok((invoice_row, invoice_line_rows))
}

pub fn generate_linked_invoice(
    connection: &StorageConnection,
    source_invoice: &InvoiceRow,
    record_for_processing: &RecordForProcessing,
) -> Result<InvoiceRow, ProcessRecordError> {
    let store_id = record_for_processing
        .other_party_store
        .clone()
        .ok_or(ProcessRecordError::OtherPartyStoreIsNotFound(
            record_for_processing.clone(),
        ))?
        .id;

    let name_id = record_for_processing.source_name.id.clone();

    let status = match &source_invoice.status {
        InvoiceRowStatus::Picked => InvoiceRowStatus::Picked,
        InvoiceRowStatus::Shipped => InvoiceRowStatus::Shipped,
        _ => InvoiceRowStatus::New,
    };

    let requisition_id =
        get_request_requisition_id_from_inbound_shipment(connection, &source_invoice)?;

    let result = InvoiceRow {
        id: uuid(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, &store_id)?,
        r#type: InvoiceRowType::InboundShipment,
        name_id,
        store_id,
        name_store_id: Some(source_invoice.store_id.clone()),
        status,
        created_datetime: Utc::now().naive_utc(),
        colour: None,
        comment: None,
        their_reference: source_invoice.their_reference.clone(),
        linked_invoice_id: Some(source_invoice.id.clone()),
        on_hold: false,
        allocated_datetime: None,
        picked_datetime: source_invoice.picked_datetime,
        shipped_datetime: source_invoice.shipped_datetime,
        delivered_datetime: None,
        verified_datetime: None,
        requisition_id,
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

pub fn find_delete_lines(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> Result<Vec<InvoiceLineRow>, RepositoryError> {
    let lines_to_delete = get_lines_for_invoice(connection, &invoice.id)?;

    let invoice_line_row_repository = InvoiceLineRowRepository::new(connection);

    let mut result_lines = Vec::new();

    for line in lines_to_delete.iter() {
        result_lines.push(
            invoice_line_row_repository
                .find_one_by_id(&line.id)
                .unwrap(),
        );
    }

    Ok(result_lines)
}

pub fn re_generate_linked_invoice_lines(
    connection: &StorageConnection,
    linked_invoice: &InvoiceRow,
    source_invoice: &InvoiceRow,
) -> Result<(Vec<InvoiceLineRow>, Vec<InvoiceLineRow>), ProcessRecordError> {
    let lines_to_delete = find_delete_lines(connection, linked_invoice)?;

    let source_lines = get_lines_for_invoice(connection, &source_invoice.id)?;

    let mut new_lines = Vec::new();

    for InvoiceLine {
        item_id,
        item_name,
        item_code,
        pack_size,
        number_of_packs,
        r#type,
        sell_price_per_pack,
        batch,
        expiry_date,
        note,
        id: _,
        stock_line_id: _,
        invoice_id: _,
        location_id: _,
        location_name: _,
        requisition_id: _,
        cost_price_per_pack: _,
    } in source_lines.into_iter()
    {
        let cost_price_per_pack = sell_price_per_pack;

        let new_row = InvoiceLineRow {
            id: uuid(),
            invoice_id: linked_invoice.id.clone(),
            item_id,
            item_name,
            item_code,
            batch,
            expiry_date,
            pack_size,
            total_before_tax: cost_price_per_pack * pack_size as f64 * number_of_packs as f64,
            total_after_tax: cost_price_per_pack * pack_size as f64 * number_of_packs as f64,
            cost_price_per_pack,
            r#type: match r#type {
                InvoiceLineType::StockIn => InvoiceLineRowType::StockIn,
                InvoiceLineType::StockOut => InvoiceLineRowType::StockOut,
                InvoiceLineType::UnallocatedStock => InvoiceLineRowType::UnallocatedStock,
                InvoiceLineType::Service => InvoiceLineRowType::Service,
            },
            number_of_packs,
            note,
            // Default
            stock_line_id: None,
            location_id: None,
            sell_price_per_pack: 0.0,
            tax: Some(0.0),
        };

        new_lines.push(new_row);
    }

    Ok((lines_to_delete, new_lines))
}

pub fn get_lines_for_invoice(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))
}
