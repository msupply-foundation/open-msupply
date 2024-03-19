use chrono::Utc;

use repository::{
    location_movement::{LocationMovementFilter, LocationMovementRepository},
    DatetimeFilter, EqualFilter, InvoiceLineFilter, InvoiceLineRepository, LocationMovementRow,
    RepositoryError,
};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, StockLineRow,
    StorageConnection,
};

use crate::invoice::common::{
    calculate_foreign_currency_total, calculate_total_after_tax,
    generate_batches_total_number_of_packs_update, InvoiceLineHasNoStockLine,
};

use super::{UpdateOutboundShipment, UpdateOutboundShipmentError, UpdateOutboundShipmentStatus};

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<StockLineRow>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) lines_to_trim: Option<Vec<InvoiceLineRow>>,
    pub(crate) location_movements: Option<Vec<LocationMovementRow>>,
    pub(crate) update_lines: Option<Vec<InvoiceLineRow>>,
}

pub(crate) fn generate(
    store_id: &str,
    existing_invoice: InvoiceRow,
    UpdateOutboundShipment {
        id: _,
        status: input_status,
        on_hold: input_on_hold,
        comment: input_comment,
        their_reference: input_their_reference,
        colour: input_colour,
        transport_reference: input_transport_reference,
        tax: input_tax,
        currency_id: input_currency_id,
        currency_rate: input_currency_rate,
    }: UpdateOutboundShipment,
    connection: &StorageConnection,
) -> Result<GenerateResult, UpdateOutboundShipmentError> {
    let should_update_batches_total_number_of_packs =
        should_update_batches_total_number_of_packs(&existing_invoice, &input_status);
    let mut update_invoice = existing_invoice.clone();

    set_new_status_datetime(&mut update_invoice, &input_status);

    update_invoice.comment = input_comment.or(update_invoice.comment);
    update_invoice.their_reference = input_their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = input_on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.colour = input_colour.or(update_invoice.colour);
    update_invoice.transport_reference =
        input_transport_reference.or(update_invoice.transport_reference);
    update_invoice.tax = input_tax
        .map(|tax| tax.percentage)
        .unwrap_or(update_invoice.tax);
    update_invoice.currency_id = input_currency_id.unwrap_or(update_invoice.currency_id);
    update_invoice.currency_rate = input_currency_rate.unwrap_or(update_invoice.currency_rate);

    if let Some(status) = input_status.clone() {
        update_invoice.status = status.full_status().into()
    }

    let batches_to_update = if should_update_batches_total_number_of_packs {
        Some(
            generate_batches_total_number_of_packs_update(&update_invoice.id, connection).map_err(
                |e| match e {
                    InvoiceLineHasNoStockLine::InvoiceLineHasNoStockLine(line) => {
                        UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(line)
                    }
                    InvoiceLineHasNoStockLine::DatabaseError(e) => {
                        UpdateOutboundShipmentError::DatabaseError(e)
                    }
                },
            )?,
        )
    } else {
        None
    };

    let location_movements = if let Some(batches) = batches_to_update.clone() {
        Some(generate_location_movements(connection, &batches, store_id)?)
    } else {
        None
    };

    let update_lines = if update_invoice.tax.is_some() || input_currency_rate.is_some() {
        Some(generate_update_for_lines(
            connection,
            &update_invoice.id,
            update_invoice.tax,
            &update_invoice.currency_id,
            &update_invoice.currency_rate,
        )?)
    } else {
        None
    };

    let lines_to_trim = lines_to_trim(connection, &existing_invoice, &input_status)?;

    Ok(GenerateResult {
        batches_to_update,
        lines_to_trim,
        update_invoice,
        location_movements,
        update_lines,
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

// If status changed to allocated and above, remove unallocated and empty lines
fn lines_to_trim(
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

    let mut lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .r#type(InvoiceLineRowType::UnallocatedStock.equal_to()),
    )?;

    let mut empty_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .number_of_packs(EqualFilter::equal_to_f64(0.0)),
    )?;

    if lines.is_empty() && empty_lines.is_empty() {
        return Ok(None);
    }

    lines.append(&mut empty_lines);

    let invoice_line_rows = lines.into_iter().map(|l| l.invoice_line_row).collect();
    return Ok(Some(invoice_line_rows));
}

fn set_new_status_datetime(
    invoice: &mut InvoiceRow,
    status: &Option<UpdateOutboundShipmentStatus>,
) {
    let new_status = match status {
        Some(status) => status,
        None => return, // There's no status to update
    };

    if new_status.full_status() == invoice.status {
        // The invoice already has this status, there's nothing to do.
        return;
    }

    let current_datetime = Utc::now().naive_utc();

    // Status sequence for outbound shipment: New, Allocated, Picked, Shipped
    match (&invoice.status, new_status) {
        // From Shipped to Any, ignore
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

fn generate_update_for_lines(
    connection: &StorageConnection,
    invoice_id: &str,
    tax: Option<f64>,
    currency_id: &str,
    currency_rate: &f64,
) -> Result<Vec<InvoiceLineRow>, UpdateOutboundShipmentError> {
    let invoice_lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(invoice_id))
            .r#type(InvoiceLineRowType::StockOut.equal_to()),
    )?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let mut invoice_line_row = invoice_line.invoice_line_row;

        if tax.is_some() {
            invoice_line_row.tax = tax;
            invoice_line_row.total_after_tax =
                calculate_total_after_tax(invoice_line_row.total_before_tax, tax);
        }

        invoice_line_row.foreign_currency_price_before_tax = calculate_foreign_currency_total(
            connection,
            invoice_line_row.total_before_tax,
            &currency_id,
            currency_rate,
        )?;

        result.push(invoice_line_row);
    }

    Ok(result)
}

pub fn generate_location_movements(
    connection: &StorageConnection,
    batches: &Vec<StockLineRow>,
    store_id: &str,
) -> Result<Vec<LocationMovementRow>, RepositoryError> {
    let mut movements: Vec<LocationMovementRow> = Vec::new();
    let mut movements_filter: Vec<LocationMovementRow> = Vec::new();

    let location_movement_repo = LocationMovementRepository::new(connection);

    for batch in batches {
        if batch.location_id.is_some() && batch.total_number_of_packs <= 0.0 {
            let filter = location_movement_repo
                .query_by_filter(
                    LocationMovementFilter::new()
                        .enter_datetime(DatetimeFilter::is_null(false))
                        .exit_datetime(DatetimeFilter::is_null(true))
                        .location_id(EqualFilter::equal_to(
                            &batch.location_id.clone().unwrap_or_default(),
                        ))
                        .stock_line_id(EqualFilter::equal_to(&batch.id))
                        .store_id(EqualFilter::equal_to(store_id)),
                )?
                .into_iter()
                .map(|l| l.location_movement_row)
                .min_by_key(|l| l.enter_datetime);

            if filter.is_some() {
                movements_filter.push(filter.unwrap());
            }
        }
    }

    for movement in movements_filter {
        let mut movement = movement;
        movement.exit_datetime = Some(Utc::now().naive_utc());
        movements.push(movement);
    }

    Ok(movements)
}
