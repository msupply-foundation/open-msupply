use chrono::Utc;

use repository::{EqualFilter, InvoiceLineFilter, InvoiceLineRepository, Name, RepositoryError};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, StockLineRow,
    StorageConnection,
};

use super::{UpdateOutboundShipment, UpdateOutboundShipmentError, UpdateOutboundShipmentStatus};

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<StockLineRow>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) unallocated_lines_to_trim: Option<Vec<InvoiceLineRow>>,
}

pub(crate) fn generate(
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
) -> Result<GenerateResult, UpdateOutboundShipmentError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.name_id = input_other_party_id.unwrap_or(update_invoice.name_id);
    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.their_reference = input_their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = input_on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.colour = input_colour.or(update_invoice.colour);
    update_invoice.transport_reference =
        input_transport_reference.or(update_invoice.transport_reference);

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status().into()
    }

    if let Some(other_party) = other_party_option {
        update_invoice.name_store_id = other_party.store_id().map(|id| id.to_string());
        update_invoice.name_id = other_party.name_row.id;
    }

    let batches_to_update = if should_update_batches_total_number_of_packs {
        Some(generate_batches_total_number_of_packs_update(
            &update_invoice.id,
            connection,
        )?)
    } else {
        None
    };

    Ok(GenerateResult {
        batches_to_update,
        unallocated_lines_to_trim: unallocated_lines_to_trim(
            connection,
            &existing_invoice,
            &input_status,
        )?,
        update_invoice,
    })
}

fn should_update_batches_total_number_of_packs(
    invoice: &InvoiceRow,
    status: &Option<UpdateOutboundShipmentStatus>,
) -> bool {
    if let Some(new_invoice_status) = UpdateOutboundShipmentStatus::full_status_option(status) {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceRowStatus::Picked.index()
            && invoice_status_index < InvoiceRowStatus::Picked.index()
    } else {
        false
    }
}

// If status changed to allocated and above, remove unallocated lines
fn unallocated_lines_to_trim(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
    status: &Option<UpdateOutboundShipmentStatus>,
) -> Result<Option<Vec<InvoiceLineRow>>, RepositoryError> {
    // Status sequence for outbound shipment: New, Allocated, Picked, Shipped
    if invoice.status != InvoiceRowStatus::New {
        return Ok(None);
    }

    let new_invoice_status = match UpdateOutboundShipmentStatus::full_status_option(status) {
        Some(new_invoice_status) => new_invoice_status,
        None => return Ok(None),
    };

    if new_invoice_status == InvoiceRowStatus::New {
        return Ok(None);
    }

    // If new invoice status is not new and previous invoice status is new
    // add all unallocated lines to be deleted

    let lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .r#type(InvoiceLineRowType::UnallocatedStock.equal_to()),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let invoice_line_rows = lines.into_iter().map(|l| l.invoice_line_row).collect();
    return Ok(Some(invoice_line_rows));
}

fn set_new_status_datetime(
    invoice: &mut InvoiceRow,
    status: &Option<UpdateOutboundShipmentStatus>,
) {
    if let Some(new_invoice_status) = UpdateOutboundShipmentStatus::full_status_option(status) {
        let current_datetime = Utc::now().naive_utc();
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        let is_status_update = |status: InvoiceRowStatus| {
            new_invoice_status_index >= status.index()
                && invoice_status_index < new_invoice_status_index
        };

        if is_status_update(InvoiceRowStatus::Allocated) {
            invoice.allocated_datetime = Some(current_datetime.clone());
        }

        if is_status_update(InvoiceRowStatus::Picked) {
            invoice.picked_datetime = Some(current_datetime);
        }

        if is_status_update(InvoiceRowStatus::Shipped) {
            invoice.shipped_datetime = Some(current_datetime);
        }
    }
}

// Returns a list of stock lines that need to be updated
fn generate_batches_total_number_of_packs_update(
    invoice_id: &str,
    connection: &StorageConnection,
) -> Result<Vec<StockLineRow>, UpdateOutboundShipmentError> {
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineRowType::StockOut.equal_to()),
    )?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let invoice_line_row = invoice_line.invoice_line_row;
        let mut stock_line = invoice_line.stock_line_option.ok_or(
            UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(invoice_line_row.id.to_owned()),
        )?;

        stock_line.total_number_of_packs =
            stock_line.total_number_of_packs - invoice_line_row.number_of_packs;
        result.push(stock_line);
    }
    Ok(result)
}
