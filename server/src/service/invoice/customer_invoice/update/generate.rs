use chrono::Utc;

use crate::{
    database::{
        repository::{InvoiceLineRepository, StockLineRepository, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus, StockLineRow},
    },
    domain::{invoice::InvoiceStatus, outbound_shipment::UpdateOutboundShipment},
};

use super::UpdateOutboundShipmentError;

pub fn generate(
    existing_invoice: InvoiceRow,
    patch: UpdateOutboundShipment,
    connection: &StorageConnection,
) -> Result<(Option<Vec<StockLineRow>>, InvoiceRow), UpdateOutboundShipmentError> {
    let should_create_batches = should_update_batches(&existing_invoice, &patch);
    let mut update_invoice = existing_invoice;

    set_new_status_datetime(&mut update_invoice, &patch);

    update_invoice.name_id = patch.other_party_id.unwrap_or(update_invoice.name_id);
    update_invoice.comment = patch.comment.or(update_invoice.comment);
    update_invoice.their_reference = patch.their_reference.or(update_invoice.their_reference);

    if let Some(status) = patch.status {
        update_invoice.status = status.into()
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

pub fn should_update_batches(invoice: &InvoiceRow, patch: &UpdateOutboundShipment) -> bool {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Confirmed)) => true,
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Finalised)) => true,
        _ => false,
    }
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateOutboundShipment) {
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

// Returns a list of stock lines that need to be updated
pub fn generate_batches(
    id: &str,
    connection: &StorageConnection,
) -> Result<Vec<StockLineRow>, UpdateOutboundShipmentError> {
    let invoice_lines = InvoiceLineRepository::new(connection).find_many_by_invoice_id(id)?;
    let stock_line_ids = invoice_lines
        .iter()
        .filter_map(|line| line.stock_line_id.clone())
        .collect::<Vec<String>>();
    let stock_lines = StockLineRepository::new(connection).find_many_by_ids(&stock_line_ids)?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let stock_line_id = invoice_line.stock_line_id.ok_or(
            UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(invoice_line.item_id.to_owned()),
        )?;
        let stock_line = stock_lines
            .iter()
            .find(|stock_line| stock_line_id == stock_line.id)
            .ok_or(UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(
                invoice_line.item_id.to_owned(),
            ))?;
        result.push(StockLineRow {
            id: stock_line.id.to_owned(),
            item_id: stock_line.item_id.to_owned(),
            store_id: stock_line.store_id.to_owned(),
            batch: stock_line.batch.clone(),
            pack_size: stock_line.pack_size,
            cost_price_per_pack: stock_line.cost_price_per_pack,
            sell_price_per_pack: stock_line.sell_price_per_pack,
            available_number_of_packs: stock_line.available_number_of_packs,
            total_number_of_packs: stock_line.total_number_of_packs - invoice_line.number_of_packs,
            expiry_date: stock_line.expiry_date,
        });
    }
    Ok(result)
}
