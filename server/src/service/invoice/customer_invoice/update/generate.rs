use chrono::Utc;

use crate::{
    database::{
        repository::{InvoiceLineRepository, StockLineRepository, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus, StockLineRow},
    },
    domain::{customer_invoice::UpdateCustomerInvoice, invoice::InvoiceStatus},
};

use super::UpdateCustomerInvoiceError;

pub fn generate(
    existing_invoice: InvoiceRow,
    patch: UpdateCustomerInvoice,
    connection: &StorageConnection,
) -> Result<(Option<Vec<StockLineRow>>, InvoiceRow), UpdateCustomerInvoiceError> {
    let should_create_batches = should_create_batches(&existing_invoice, &patch);
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

pub fn should_create_batches(invoice: &InvoiceRow, patch: &UpdateCustomerInvoice) -> bool {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Confirmed)) => true,
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Finalised)) => true,
        _ => false,
    }
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateCustomerInvoice) {
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
) -> Result<Vec<StockLineRow>, UpdateCustomerInvoiceError> {
    let invoice_lines = InvoiceLineRepository::new(connection).find_many_by_invoice_id(id)?;
    let item_ids = invoice_lines
        .iter()
        .map(|line| line.item_id.to_owned())
        .collect::<Vec<String>>();
    let stock_lines = StockLineRepository::new(connection).find_many_by_item_ids(&item_ids)?;

    let mut result = Vec::new();
    for invoice_line in invoice_lines {
        let stock_line = stock_lines
            .iter()
            .find(|stock_line| invoice_line.item_id == stock_line.item_id)
            .ok_or(UpdateCustomerInvoiceError::InternalError(format!(
                "Missing stock line for item id {}",
                invoice_line.item_id
            )))?;
        result.push(StockLineRow {
            id: stock_line.id.to_owned(),
            item_id: stock_line.item_id.to_owned(),
            store_id: stock_line.store_id.to_owned(),
            batch: stock_line.batch.clone(),
            pack_size: stock_line.pack_size,
            cost_price_per_pack: stock_line.cost_price_per_pack,
            sell_price_per_pack: stock_line.sell_price_per_pack,
            available_number_of_packs: stock_line.available_number_of_packs
                - invoice_line.number_of_packs,
            total_number_of_packs: stock_line.total_number_of_packs - invoice_line.number_of_packs,
            expiry_date: stock_line.expiry_date,
        });
    }
    Ok(result)
}
