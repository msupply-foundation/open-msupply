// TODO simplify/structure, this should be very readable
use crate::number::next_number;
use chrono::Utc;
use domain::{
    invoice::{Invoice, InvoiceFilter},
    invoice_line::{InvoiceLine, InvoiceLineType},
    name::{Name, NameFilter},
    EqualFilter,
};

use repository::{
    schema::{
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, InvoiceRowType,
        NumberRowType,
    },
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowRepository, InvoiceQueryRepository,
    InvoiceRepository, NameQueryRepository, RepositoryError, RequisitionFilter,
    RequisitionRepository, StorageConnection,
};
use util::uuid::uuid;

pub enum ProcessInvoice {
    NameIdNotActiveStore,
    NotCreatingOutboundFromInboundInvoice,
    NoUpdatesRequired {
        linked_invoice: InvoiceRow,
        source_invoice: InvoiceRow,
    },
    CreatedInvoice {
        new_linked_invoice: InvoiceRow,
        source_invoice: InvoiceRow,
        new_linked_invoice_lines: Vec<InvoiceLineRow>,
    },
    UpdatedInvoice {
        updated_linked_invoice: InvoiceRow,
        source_invoice: InvoiceRow,
    },
}
pub enum ProcessInvoiceError {
    CannotFindItemStats { store_id: String, item_id: String },
    CannotFindStoreForSourceInvoice,
    CannotFindNameForSourceInvoice,
    CannotFindStoreForNameInSourceInvoice,
    DatabaseError(RepositoryError),
}

pub fn process_invoice(
    connection: &StorageConnection,
    source_invoice: InvoiceRow,
) -> Result<ProcessInvoice, ProcessInvoiceError> {
    let result = connection
        .transaction_sync(|connection| {
            if !is_name_id_active_store_on_this_site(connection, &source_invoice)? {
                return Ok(ProcessInvoice::NameIdNotActiveStore);
            }

            match get_linked_invoice(connection, &source_invoice.id)? {
                Some(invoice) => update_linked_invoice(connection, invoice, source_invoice),
                None => created_linked_invoice(connection, source_invoice),
            }
        })
        .map_err(|error| error.to_inner_error())?;

    Ok(result)
}

fn created_linked_invoice(
    connection: &StorageConnection,
    source_invoice: InvoiceRow,
) -> Result<ProcessInvoice, ProcessInvoiceError> {
    if source_invoice.r#type == InvoiceRowType::InboundShipment {
        return Ok(ProcessInvoice::NotCreatingOutboundFromInboundInvoice);
    }

    let name = get_source_name_for_invoice(connection, &source_invoice)?;
    let store_id = get_destination_store_id_for_invoice(connection, &source_invoice)?;

    let status = match &source_invoice.status {
        InvoiceRowStatus::Picked => InvoiceRowStatus::Picked,
        InvoiceRowStatus::Shipped => InvoiceRowStatus::Shipped,
        _ => InvoiceRowStatus::New,
    };
    let requisition_id =
        get_request_requisition_id_from_inbound_shipment(connection, &source_invoice)?;

    let new_linked_invoice = InvoiceRow {
        id: uuid(),
        invoice_number: next_number(connection, &NumberRowType::InboundShipment, &store_id)?,
        r#type: InvoiceRowType::InboundShipment,
        name_id: name.id,
        store_id,
        name_store_id: name.store_id,
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

    InvoiceRepository::new(connection).upsert_one(&new_linked_invoice)?;

    let source_invoice = link_source_invoice(connection, &new_linked_invoice, source_invoice)?;

    let new_linked_invoice_lines =
        generate_duplicate_lines(connection, &new_linked_invoice, &source_invoice)?;

    let invoice_line_row_repository = InvoiceLineRowRepository::new(connection);

    for line in new_linked_invoice_lines.iter() {
        invoice_line_row_repository.upsert_one(line)?;
    }

    Ok(ProcessInvoice::CreatedInvoice {
        new_linked_invoice,
        source_invoice,
        new_linked_invoice_lines,
    })
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

fn generate_duplicate_lines(
    connection: &StorageConnection,
    linked_invoice: &InvoiceRow,
    source_invoice: &InvoiceRow,
) -> Result<Vec<InvoiceLineRow>, ProcessInvoiceError> {
    let source_lines = get_lines_for_invoice(connection, &source_invoice.id)?;

    let mut new_lines = Vec::new();

    for InvoiceLine {
        id: _,
        stock_line_id: _,
        invoice_id: _,
        location_id: _,
        location_name: _,
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
            stock_line_id: None,
            location_id: None,
            batch,
            expiry_date,
            pack_size,
            total_before_tax: cost_price_per_pack * pack_size as f64 * number_of_packs as f64,
            total_after_tax: cost_price_per_pack * pack_size as f64 * number_of_packs as f64,
            tax: Some(0.0),
            cost_price_per_pack,
            sell_price_per_pack: 0.0,
            r#type: match r#type {
                InvoiceLineType::StockIn => InvoiceLineRowType::StockIn,
                InvoiceLineType::StockOut => InvoiceLineRowType::StockOut,
                InvoiceLineType::UnallocatedStock => InvoiceLineRowType::UnallocatedStock,
                InvoiceLineType::Service => InvoiceLineRowType::Service,
            },
            number_of_packs,
            note,
        };

        new_lines.push(new_row);
    }

    Ok(new_lines)
}

fn get_lines_for_invoice(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(invoice_id)))
}

fn link_source_invoice(
    connection: &StorageConnection,
    new_linked_invoice: &InvoiceRow,
    source_invoice: InvoiceRow,
) -> Result<InvoiceRow, RepositoryError> {
    let result = if is_store_id_active_store_on_this_site(connection, &source_invoice)? {
        let mut updated_source_invoice = source_invoice.clone();

        updated_source_invoice.linked_invoice_id = Some(new_linked_invoice.id.clone());

        InvoiceRepository::new(connection).upsert_one(&updated_source_invoice)?;
        source_invoice
    } else {
        source_invoice
    };

    Ok(result)
}

fn get_source_name_for_invoice(
    connection: &StorageConnection,
    source_invoice: &InvoiceRow,
) -> Result<Name, ProcessInvoiceError> {
    let name = NameQueryRepository::new(connection)
        .query_one(NameFilter::new().store_id(EqualFilter::equal_to(&source_invoice.store_id)))?
        .ok_or(ProcessInvoiceError::CannotFindNameForSourceInvoice {})?;

    Ok(name)
}

fn get_destination_store_id_for_invoice(
    connection: &StorageConnection,
    source_invoice: &InvoiceRow,
) -> Result<String, ProcessInvoiceError> {
    let name = NameQueryRepository::new(connection)
        .query_one(NameFilter::new().id(EqualFilter::equal_to(&source_invoice.name_id)))?
        .ok_or(ProcessInvoiceError::CannotFindNameForSourceInvoice {})?;

    let store_id = name
        .store_id
        .ok_or(ProcessInvoiceError::CannotFindStoreForNameInSourceInvoice {})?;

    Ok(store_id.clone())
}

fn update_linked_invoice(
    connection: &StorageConnection,
    invoice_to_update: Invoice,
    source_invoice: InvoiceRow,
) -> Result<ProcessInvoice, ProcessInvoiceError> {
    let invoice_to_update =
        InvoiceRepository::new(connection).find_one_by_id(&invoice_to_update.id)?;

    let result = match &invoice_to_update.r#type {
        InvoiceRowType::OutboundShipment => {
            update_linked_outbound_shipment(connection, invoice_to_update, source_invoice)?
        }
        InvoiceRowType::InboundShipment => {
            update_linked_inbound_shipment(connection, invoice_to_update, source_invoice)?
        }
        _ => ProcessInvoice::NoUpdatesRequired {
            linked_invoice: invoice_to_update,
            source_invoice,
        },
    };

    Ok(result)
}

fn update_linked_inbound_shipment(
    connection: &StorageConnection,
    invoice_to_update: InvoiceRow,
    source_invoice: InvoiceRow,
) -> Result<ProcessInvoice, ProcessInvoiceError> {
    use InvoiceRowStatus::*;
    let result = match (&invoice_to_update.status, &source_invoice.status) {
        (Picked, Shipped) => {
            let mut updated_linked_invoice = invoice_to_update.clone();

            updated_linked_invoice.status = Shipped;
            updated_linked_invoice.shipped_datetime = Some(Utc::now().naive_utc());

            InvoiceRepository::new(connection).upsert_one(&invoice_to_update)?;
            ProcessInvoice::UpdatedInvoice {
                updated_linked_invoice,
                source_invoice,
            }
        }
        (_, _) => ProcessInvoice::NoUpdatesRequired {
            linked_invoice: invoice_to_update,
            source_invoice,
        },
    };

    Ok(result)
}

fn update_linked_outbound_shipment(
    connection: &StorageConnection,
    invoice_to_update: InvoiceRow,
    source_invoice: InvoiceRow,
) -> Result<ProcessInvoice, ProcessInvoiceError> {
    use InvoiceRowStatus::*;

    match (&source_invoice.status, &source_invoice.status) {
        (Shipped, Shipped) => {}
        (Delivered, Delivered) => {}
        (Verified, Verified) => {}
        (_, _) => {
            let mut updated_linked_invoice = invoice_to_update.clone();

            updated_linked_invoice.status = source_invoice.status.clone();

            updated_linked_invoice.delivered_datetime = source_invoice.delivered_datetime.clone();
            updated_linked_invoice.verified_datetime = source_invoice.verified_datetime.clone();

            InvoiceRepository::new(connection).upsert_one(&invoice_to_update)?;

            return Ok(ProcessInvoice::UpdatedInvoice {
                updated_linked_invoice,
                source_invoice,
            });
        }
    };

    Ok(ProcessInvoice::NoUpdatesRequired {
        linked_invoice: invoice_to_update,
        source_invoice,
    })
}

fn get_linked_invoice(
    connection: &StorageConnection,
    invoice_id: &str,
) -> Result<Option<Invoice>, RepositoryError> {
    InvoiceQueryRepository::new(connection)
        .query_one(InvoiceFilter::new().linked_invoice_id(EqualFilter::equal_to(invoice_id)))
}

fn is_name_id_active_store_on_this_site(
    _: &StorageConnection,
    _: &InvoiceRow,
) -> Result<bool, RepositoryError> {
    // TODO
    Ok(true)
}

fn is_store_id_active_store_on_this_site(
    _: &StorageConnection,
    _: &InvoiceRow,
) -> Result<bool, RepositoryError> {
    // TODO
    Ok(true)
}

impl From<RepositoryError> for ProcessInvoiceError {
    fn from(error: RepositoryError) -> Self {
        ProcessInvoiceError::DatabaseError(error)
    }
}
