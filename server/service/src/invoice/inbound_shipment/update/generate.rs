use chrono::Utc;

use crate::invoice::current_store_id;
use domain::{inbound_shipment::UpdateInboundShipment, invoice::InvoiceStatus};
use repository::{
    schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, StockLineRow},
    InvoiceLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

use super::UpdateInboundShipmentError;

pub struct LineAndStockLine {
    pub stock_line: StockLineRow,
    pub line: InvoiceLineRow,
}

pub fn generate(
    existing_invoice: InvoiceRow,
    patch: UpdateInboundShipment,
    connection: &StorageConnection,
) -> Result<(Option<Vec<LineAndStockLine>>, InvoiceRow), UpdateInboundShipmentError> {
    let should_create_batches = should_create_batches(&existing_invoice, &patch);
    let mut update_invoice = existing_invoice;

    set_new_status_datetime(&mut update_invoice, &patch);

    update_invoice.name_id = patch.other_party_id.unwrap_or(update_invoice.name_id);
    update_invoice.comment = patch.comment.or(update_invoice.comment);
    update_invoice.their_reference = patch.their_reference.or(update_invoice.their_reference);
    update_invoice.on_hold = patch.on_hold.unwrap_or(update_invoice.on_hold);
    update_invoice.color = patch.color.or(update_invoice.color);

    if let Some(status) = patch.status {
        update_invoice.status = status.into()
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
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Confirmed)) => true,
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Finalised)) => true,
        _ => false,
    }
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateInboundShipment) {
    let current_datetime = Utc::now().naive_utc();

    if let Some(InvoiceStatus::Finalised) = &patch.status {
        if invoice.status == InvoiceRowStatus::Draft {
            invoice.confirm_datetime = Some(current_datetime.clone());
        }

        if invoice.status != InvoiceRowStatus::Finalised {
            invoice.finalised_datetime = Some(current_datetime.clone());
        }
    }

    if let Some(InvoiceStatus::Confirmed) = &patch.status {
        if invoice.status == InvoiceRowStatus::Draft {
            invoice.confirm_datetime = Some(current_datetime.clone());
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
            total_after_tax: _,
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
