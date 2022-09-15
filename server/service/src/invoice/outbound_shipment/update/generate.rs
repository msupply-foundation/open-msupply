use chrono::Utc;

use repository::Name;
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus,
    StockLineRow, StockLineRowRepository, StorageConnection,
};

use super::{UpdateOutboundShipment, UpdateOutboundShipmentError, UpdateOutboundShipmentStatus};

pub fn generate(
    existing_invoice: InvoiceRow,
    other_party_option: Option<Name>,
    UpdateOutboundShipment {
        id: _,
        other_party_id: input_other_party_id,
        status: input_status,
        on_hold: input_on_hold,
        comment: input_comment,
        their_reference: input_their_reference,
        colour: input_colour,
        transport_reference: input_transport_reference,
    }: UpdateOutboundShipment,
    connection: &StorageConnection,
) -> Result<(Option<Vec<StockLineRow>>, InvoiceRow), UpdateOutboundShipmentError> {
    let should_create_batches = should_update_batches(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice;

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_id = input_other_party_id.unwrap_or(update_invoice.name_id);
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.their_reference = input_their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = input_on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.colour = input_colour.or(update_invoice.colour);
    update_invoice.transport_reference =
        input_transport_reference.or(update_invoice.transport_reference);

    if let Some(status) = input_status {
        update_invoice.status = status.full_status().into()
    }

    if let Some(other_party) = other_party_option {
        update_invoice.name_store_id = other_party.store_id().map(|id| id.to_string());
        update_invoice.name_id = other_party.name_row.id;
    }

    if !should_create_batches {
        Ok((None, update_invoice))
    } else {
        Ok((
            Some(generate_batches(&update_invoice.id, connection)?),
            update_invoice,
        ))
    }
}

pub fn should_update_batches(
    invoice: &InvoiceRow,
    status: &Option<UpdateOutboundShipmentStatus>,
) -> bool {
    if let Some(new_invoice_status) = UpdateOutboundShipmentStatus::full_status_option(status) {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceRowStatus::Picked.index()
            && invoice_status_index < new_invoice_status_index
    } else {
        false
    }
}

fn set_new_status_datetime(
    invoice: &mut InvoiceRow,
    status: &Option<UpdateOutboundShipmentStatus>,
) {
    let new_status = match status {
        Some(new_status) if new_status.full_status() != invoice.status => new_status,
        _ => return,
    };

    let current_datetime = Utc::now().naive_utc();

    // Status sequence for outbound shipment: New, Allocated, Picked, Shipped
    match (&invoice.status, new_status) {
        // From Shipped to Any, ingore
        (InvoiceRowStatus::Shipped, _) => {}
        // From New to Shipped, Picked, Allocated
        (InvoiceRowStatus::New, UpdateOutboundShipmentStatus::Shipped) => {
            invoice.allocated_datetime = Some(current_datetime.clone());
            invoice.picked_datetime = Some(current_datetime.clone());
            invoice.shipped_datetime = Some(current_datetime)
        }
        (InvoiceRowStatus::New, UpdateOutboundShipmentStatus::Picked) => {
            invoice.allocated_datetime = Some(current_datetime.clone());
            invoice.picked_datetime = Some(current_datetime);
        }
        (InvoiceRowStatus::New, UpdateOutboundShipmentStatus::Allocated) => {
            invoice.allocated_datetime = Some(current_datetime);
        }
        // From Allocated to Shipped or Picked
        (InvoiceRowStatus::Allocated, UpdateOutboundShipmentStatus::Shipped) => {
            invoice.picked_datetime = Some(current_datetime.clone());
            invoice.shipped_datetime = Some(current_datetime)
        }
        (InvoiceRowStatus::Allocated, UpdateOutboundShipmentStatus::Picked) => {
            invoice.picked_datetime = Some(current_datetime)
        }
        // From Picked to Shipped
        (InvoiceRowStatus::Picked, UpdateOutboundShipmentStatus::Shipped) => {
            invoice.shipped_datetime = Some(current_datetime)
        }
        _ => {}
    }
}

// Returns a list of stock lines that need to be updated
pub fn generate_batches(
    id: &str,
    connection: &StorageConnection,
) -> Result<Vec<StockLineRow>, UpdateOutboundShipmentError> {
    // TODO use InvoiceLineRepository (when r#type is available, use equal_any vs ||)
    let invoice_lines: Vec<InvoiceLineRow> = InvoiceLineRowRepository::new(connection)
        .find_many_by_invoice_id(id)?
        .into_iter()
        .filter(|line| {
            line.r#type == InvoiceLineRowType::StockIn
                || line.r#type == InvoiceLineRowType::StockOut
        })
        .collect();

    let stock_line_ids = invoice_lines
        .iter()
        .filter_map(|line| line.stock_line_id.clone())
        .collect::<Vec<String>>();
    let stock_lines = StockLineRowRepository::new(connection).find_many_by_ids(&stock_line_ids)?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let stock_line_id = invoice_line.stock_line_id.ok_or(
            UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(invoice_line.id.to_owned()),
        )?;
        let mut stock_line = stock_lines
            .iter()
            .find(|stock_line| stock_line_id == stock_line.id)
            .ok_or(UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(
                invoice_line.id.to_owned(),
            ))?
            .clone();

        stock_line.total_number_of_packs =
            stock_line.total_number_of_packs - invoice_line.number_of_packs;
        result.push(stock_line);
    }
    Ok(result)
}
