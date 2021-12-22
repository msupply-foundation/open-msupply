use crate::{invoice_line::generate_batch, u32_to_i32};
use domain::inbound_shipment::InsertInboundShipmentLine;
use repository::{
    schema::{
        InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow,
    },
    StorageConnection,
};

use super::InsertInboundShipmentLineError;

pub fn generate(
    input: InsertInboundShipmentLine,
    item_row: ItemRow,
    InvoiceRow { status, .. }: InvoiceRow,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, Option<StockLineRow>), InsertInboundShipmentLineError> {
    let mut new_line = generate_line(input, item_row);

    let new_batch_option = if status != InvoiceRowStatus::New {
        let new_batch = generate_batch(new_line.clone(), false, connection)?;
        new_line.stock_line_id = Some(new_batch.id.clone());
        Some(new_batch)
    } else {
        None
    };

    Ok((new_line, new_batch_option))
}

fn generate_line(
    InsertInboundShipmentLine {
        id,
        invoice_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        location_id,
        total_before_tax,
        total_after_tax,
        tax,
    }: InsertInboundShipmentLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
) -> InvoiceLineRow {
    InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        location_id,
        pack_size: u32_to_i32(pack_size),
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: u32_to_i32(number_of_packs),
        item_name,
        item_code,
        stock_line_id: None,
        total_before_tax,
        total_after_tax,
        tax,
        note: None,
    }
}
