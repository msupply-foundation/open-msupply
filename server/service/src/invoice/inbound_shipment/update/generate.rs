use chrono::Utc;

use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRowType, Name,
    RepositoryError,
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
    pub(crate) unallocated_lines_to_trim: Option<Vec<InvoiceLineRow>>,
}

pub(crate) fn generate(
    connection: &StorageConnection,
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

    Ok(GenerateResult {
        batches_to_update,
        unallocated_lines_to_trim: unallocated_lines_to_trim(
            connection,
            &existing_invoice,
            &patch.status,
        )?,
        update_invoice,
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

// If status changed to Picked and above, remove unallocated lines
fn unallocated_lines_to_trim(
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
    // add all unallocated lines to be deleted

    let lines = InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .invoice_id(EqualFilter::equal_to(&invoice.id))
            .r#type(InvoiceLineRowType::StockIn.equal_to())
            .number_of_packs(EqualFilter::equal_to_i32(0)),
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
    Ok(result)
}
