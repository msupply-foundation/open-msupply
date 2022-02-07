use chrono::Utc;

use domain::{inbound_shipment::UpdateInboundShipment, invoice::InvoiceStatus, name::Name};
use repository::{
    schema::{InvoiceLineRow, InvoiceRow, StockLineRow},
    InvoiceLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

use crate::current_store_id;

use super::UpdateInboundShipmentError;

pub struct LineAndStockLine {
    pub stock_line: StockLineRow,
    pub line: InvoiceLineRow,
}

pub fn generate(
    existing_invoice: InvoiceRow,
    other_party_option: Option<Name>,
    patch: UpdateInboundShipment,
    connection: &StorageConnection,
) -> Result<(Option<Vec<LineAndStockLine>>, InvoiceRow), UpdateInboundShipmentError> {
    let should_create_batches = should_create_batches(&existing_invoice, &patch);
    let mut update_invoice = existing_invoice;

    set_new_status_datetime(&mut update_invoice, &patch);

    update_invoice.comment = patch.comment.or(update_invoice.comment);
    update_invoice.their_reference = patch.their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = patch.on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.colour = patch.colour.or(update_invoice.colour);

    if let Some(status) = patch.status {
        update_invoice.status = status.full_status().into()
    }

    if let Some(other_party) = other_party_option {
        update_invoice.name_id = other_party.id;
        update_invoice.name_store_id = other_party.store_id;
    }

    if !should_create_batches {
        Ok((None, update_invoice))
    } else {
        Ok((
            Some(generate_lines_and_stock_lines(
                &update_invoice.id,
                connection,
            )?),
            update_invoice,
        ))
    }
}

pub fn should_create_batches(invoice: &InvoiceRow, patch: &UpdateInboundShipment) -> bool {
    if let Some(new_invoice_status) = patch.full_status() {
        let invoice_status_index = InvoiceStatus::from(invoice.status.clone()).index();
        let new_invoice_status_index = new_invoice_status.index();

        new_invoice_status_index >= InvoiceStatus::Delivered.index()
            && invoice_status_index < new_invoice_status_index
    } else {
        false
    }
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateInboundShipment) {
    if let Some(new_invoice_status) = patch.full_status() {
        let current_datetime = Utc::now().naive_utc();
        let invoice_status_index = InvoiceStatus::from(invoice.status.clone()).index();
        let new_invoice_status_index = new_invoice_status.index();

        let is_status_update = |status: InvoiceStatus| {
            new_invoice_status_index >= status.index()
                && invoice_status_index < new_invoice_status_index
        };

        if is_status_update(InvoiceStatus::Delivered) {
            invoice.delivered_datetime = Some(current_datetime.clone());
        }

        if is_status_update(InvoiceStatus::Verified) {
            invoice.verified_datetime = Some(current_datetime);
        }
    }
}

pub fn generate_lines_and_stock_lines(
    id: &str,
    connection: &StorageConnection,
) -> Result<Vec<LineAndStockLine>, UpdateInboundShipmentError> {
    let lines = InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(id)?;
    let mut result = Vec::new();

    for invoice_lines in lines.into_iter() {
        let stock_line_id = uuid();
        let mut line = invoice_lines.clone();
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
            store_id: current_store_id(connection)?,
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
