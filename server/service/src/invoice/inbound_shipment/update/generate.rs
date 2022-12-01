use chrono::Utc;

use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowType, LocationMovementRow,
    Name, RepositoryError,
};
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceRowStatus, StockLineRow,
    StorageConnection,
};
use util::uuid::uuid;

use super::{UpdateInboundShipment, UpdateInboundShipmentError, UpdateInboundShipmentStatus};

pub struct LineAndStockLine {
    pub stock_line: StockLineRow,
    pub line: InvoiceLineRow,
}

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<LineAndStockLine>>,
    pub(crate) update_invoice: InvoiceRow,
    pub(crate) empty_lines_to_trim: Option<Vec<InvoiceLineRow>>,
    pub(crate) location_movements: Option<Vec<LocationMovementRow>>,
}

pub(crate) fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    existing_invoice: InvoiceRow,
    other_party_option: Option<Name>,
    patch: UpdateInboundShipment,
) -> Result<GenerateResult, UpdateInboundShipmentError> {
    let should_create_batches = should_create_batches(&existing_invoice, &patch);
    let mut update_invoice = existing_invoice.clone();

    set_new_status_datetime(&mut update_invoice, &patch);

    update_invoice.user_id = Some(user_id.to_string());
    update_invoice.comment = patch.comment.or(update_invoice.comment);
    update_invoice.their_reference = patch.their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = patch.on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.colour = patch.colour.or(update_invoice.colour);

    if let Some(status) = patch.status.clone() {
        update_invoice.status = status.full_status().into()
    }

    if let Some(other_party) = other_party_option {
        update_invoice.name_store_id = other_party.store_id().map(|id| id.to_string());
        update_invoice.name_id = other_party.name_row.id;
    }

    let batches_to_update = if should_create_batches {
        Some(generate_lines_and_stock_lines(
            connection,
            &update_invoice.store_id,
            &update_invoice.id,
        )?)
    } else {
        None
    };

    let location_movements = if let Some(batches) = &batches_to_update {
        let generate_movement = batches
            .iter()
            .filter_map(|batch| match batch.line.location_id {
                Some(_) => Some(generate_location_movements(store_id.to_owned(), batch)),
                None => None,
            })
            .collect();

        Some(generate_movement)
    } else {
        None
    };

    Ok(GenerateResult {
        batches_to_update,
        empty_lines_to_trim: empty_lines_to_trim(connection, &existing_invoice, &patch.status)?,
        update_invoice,
        location_movements,
    })
}

pub fn should_create_batches(invoice: &InvoiceRow, patch: &UpdateInboundShipment) -> bool {
    if let Some(new_invoice_status) = patch.full_status() {
        let invoice_status_index = invoice.status.index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceRowStatus::Delivered.index()
            && invoice_status_index < new_invoice_status_index
    } else {
        false
    }
}

// If status changed to Delivered and above, remove empty lines
fn empty_lines_to_trim(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
    status: &Option<UpdateInboundShipmentStatus>,
) -> Result<Option<Vec<InvoiceLineRow>>, RepositoryError> {
    // Status sequence for inbound shipment: New, Picked, Shipped, Delivered, Verified
    if invoice.status != InvoiceRowStatus::New {
        return Ok(None);
    }

    let new_invoice_status = match status {
        Some(new_status) => new_status.full_status(),
        None => return Ok(None),
    };

    if new_invoice_status == InvoiceRowStatus::New {
        return Ok(None);
    }

    // If new invoice status is not new and previous invoice status is new
    // add all empty lines to be deleted

    let lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .r#type(InvoiceLineRowType::StockIn.equal_to())
            .number_of_packs(EqualFilter::equal_to_f64(0.0)),
    )?;

    if lines.is_empty() {
        return Ok(None);
    }

    let invoice_line_rows = lines.into_iter().map(|l| l.invoice_line_row).collect();
    return Ok(Some(invoice_line_rows));
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateInboundShipment) {
    if let Some(new_invoice_status) = patch.full_status() {
        let current_datetime = Utc::now().naive_utc();
        let invoice_status_index = InvoiceRowStatus::from(invoice.status.clone()).index();
        let new_invoice_status_index = new_invoice_status.index();

        let is_status_update = |status: InvoiceRowStatus| {
            new_invoice_status_index >= status.index()
                && invoice_status_index < new_invoice_status_index
        };

        if is_status_update(InvoiceRowStatus::Delivered) {
            invoice.delivered_datetime = Some(current_datetime.clone());
        }

        if is_status_update(InvoiceRowStatus::Verified) {
            invoice.verified_datetime = Some(current_datetime);
        }
    }
}

pub fn generate_lines_and_stock_lines(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<Vec<LineAndStockLine>, UpdateInboundShipmentError> {
    let lines = InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(id)?;
    let mut result = Vec::new();

    for invoice_lines in lines.into_iter() {
        let mut line = invoice_lines.clone();
        let stock_line_id = line.stock_line_id.unwrap_or(uuid());
        line.stock_line_id = Some(stock_line_id.clone());

        let InvoiceLineRow {
            id: _,
            invoice_id: _,
            item_id,
            item_name: _,
            item_code: _,
            stock_line_id: _,
            location_id,
            batch,
            expiry_date,
            pack_size,
            cost_price_per_pack,
            sell_price_per_pack,
            total_before_tax: _,
            total_after_tax: _,
            tax: _,
            r#type: _,
            number_of_packs,
            note,
        }: InvoiceLineRow = invoice_lines;
        if number_of_packs > 0.0 {
            let stock_line = StockLineRow {
                id: stock_line_id,
                item_id,
                store_id: store_id.to_string(),
                location_id,
                batch,
                pack_size,
                cost_price_per_pack,
                sell_price_per_pack,
                available_number_of_packs: number_of_packs,
                total_number_of_packs: number_of_packs,
                expiry_date,
                on_hold: false,
                note,
            };
            result.push(LineAndStockLine { line, stock_line });
        }
    }
    Ok(result)
}

pub fn generate_location_movements(
    store_id: String,
    batch: &LineAndStockLine,
) -> LocationMovementRow {
    LocationMovementRow {
        id: uuid(),
        store_id,
        stock_line_id: batch.stock_line.id.clone(),
        location_id: batch.line.location_id.clone(),
        enter_datetime: Some(Utc::now().naive_utc()),
        exit_datetime: None,
    }
}
