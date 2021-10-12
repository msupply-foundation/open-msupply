use chrono::Utc;

use crate::{
    database::{
        repository::{InvoiceLineRepository, StorageConnection},
        schema::{InvoiceRow, InvoiceRowStatus, StockLineRow},
    },
    domain::{invoice::InvoiceStatus, supplier_invoice::UpdateSupplierInvoice},
    service::invoice_line::generate_batch,
};

use super::UpdateSupplierInvoiceError;

pub fn generate(
    existing_invoice: InvoiceRow,
    patch: UpdateSupplierInvoice,
    connection: &StorageConnection,
) -> Result<(Option<Vec<StockLineRow>>, InvoiceRow), UpdateSupplierInvoiceError> {
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

pub fn should_create_batches(invoice: &InvoiceRow, patch: &UpdateSupplierInvoice) -> bool {
    match (&invoice.status, &patch.status) {
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Confirmed)) => true,
        (InvoiceRowStatus::Draft, Some(InvoiceStatus::Finalised)) => true,
        _ => false,
    }
}

fn set_new_status_datetime(invoice: &mut InvoiceRow, patch: &UpdateSupplierInvoice) {
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

pub fn generate_batches(
    id: &str,
    connection: &StorageConnection,
) -> Result<Vec<StockLineRow>, UpdateSupplierInvoiceError> {
    let invoice_lines = InvoiceLineRepository::new(connection).find_many_by_invoice_id(id)?;
    let mut result = Vec::new();

    for row in invoice_lines.into_iter() {
        result.push(generate_batch(row, false, connection)?);
    }
    Ok(result)
}
