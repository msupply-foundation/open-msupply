use chrono::Utc;

use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceRow, InvoiceStatus, Name, StockLineRow,
    StockLineRowRepository, StorageConnection,
};

use crate::invoice_line::stock_in_line::{generate_batch, StockLineInput};

use super::{UpdateCustomerReturn, UpdateCustomerReturnError, UpdateCustomerReturnStatus};

pub struct LineAndStockLine {
    pub stock_line: StockLineRow,
    pub line: InvoiceLineRow,
}

pub(crate) struct GenerateResult {
    pub(crate) batches_to_update: Option<Vec<LineAndStockLine>>,
    pub(crate) updated_return: InvoiceRow,
}

pub(crate) fn generate(
    connection: &StorageConnection,
    user_id: &str,
    existing_return: InvoiceRow,
    other_party_option: Option<Name>,
    patch: UpdateCustomerReturn,
) -> Result<GenerateResult, UpdateCustomerReturnError> {
    let mut updated_return = existing_return.clone();

    updated_return.user_id = Some(user_id.to_string());
    updated_return.comment = patch.comment.clone().or(updated_return.comment);
    updated_return.on_hold = patch.on_hold.unwrap_or(updated_return.on_hold);
    updated_return.colour = patch.colour.clone().or(updated_return.colour);
    updated_return.their_reference = patch
        .their_reference
        .clone()
        .or(updated_return.their_reference);

    set_new_status_datetime(&mut updated_return, &patch);

    if let Some(other_party) = other_party_option {
        updated_return.name_store_id = other_party.store_id().map(|id| id.to_string());
        updated_return.name_link_id = other_party.name_row.id;
    }

    if let Some(status) = patch.status.clone() {
        updated_return.status = status.as_invoice_row_status()
    }

    let should_create_batches = should_create_batches(&existing_return.status, &patch);

    let batches_to_update = if should_create_batches {
        Some(generate_lines_and_stock_lines(
            connection,
            &updated_return.store_id,
            &updated_return.id,
            &updated_return.name_link_id,
        )?)
    } else {
        None
    };

    Ok(GenerateResult {
        batches_to_update,
        updated_return,
    })
}

fn changed_status(
    status: Option<UpdateCustomerReturnStatus>,
    existing_status: &InvoiceStatus,
) -> Option<UpdateCustomerReturnStatus> {
    let new_status = match status {
        Some(status) => status,
        None => return None, // Status is not changing
    };

    if &new_status.as_invoice_row_status() == existing_status {
        // The invoice already has this status, there's nothing to do.
        return None;
    }

    Some(new_status)
}

pub fn should_create_batches(
    existing_status: &InvoiceStatus,
    patch: &UpdateCustomerReturn,
) -> bool {
    let new_status = match changed_status(patch.status.to_owned(), existing_status) {
        Some(status) => status,
        None => return false, // There's no status to update
    };

    match (existing_status, new_status) {
        (
            // From New/Picked/Shipped to Delivered/Verified
            InvoiceStatus::New | InvoiceStatus::Picked | InvoiceStatus::Shipped,
            UpdateCustomerReturnStatus::Delivered | UpdateCustomerReturnStatus::Verified,
        ) => true,
        _ => false,
    }
}

fn set_new_status_datetime(customer_return: &mut InvoiceRow, patch: &UpdateCustomerReturn) {
    let new_status = match changed_status(patch.status.to_owned(), &customer_return.status) {
        Some(status) => status,
        None => return, // There's no status to update
    };

    let current_datetime = Utc::now().naive_utc();

    match (&customer_return.status, new_status) {
        // From New/Picked/Shipped to Delivered
        (
            InvoiceStatus::New | InvoiceStatus::Picked | InvoiceStatus::Shipped,
            UpdateCustomerReturnStatus::Delivered,
        ) => {
            customer_return.delivered_datetime = Some(current_datetime);
        }

        // From New/Picked/Shipped to Verified
        (
            InvoiceStatus::New | InvoiceStatus::Picked | InvoiceStatus::Shipped,
            UpdateCustomerReturnStatus::Verified,
        ) => {
            customer_return.delivered_datetime = Some(current_datetime);
            customer_return.verified_datetime = Some(current_datetime);
        }
        // From Delivered to Verified
        (InvoiceStatus::Delivered, UpdateCustomerReturnStatus::Verified) => {
            customer_return.verified_datetime = Some(current_datetime);
        }
        _ => {}
    }
}

pub fn generate_lines_and_stock_lines(
    connection: &StorageConnection,
    store_id: &str,
    customer_return_id: &str,
    supplier_id: &str,
) -> Result<Vec<LineAndStockLine>, UpdateCustomerReturnError> {
    let return_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(customer_return_id)?;
    let mut result = Vec::new();

    for line in return_lines.into_iter() {
        let mut return_line = line.clone();

        if line.number_of_packs > 0.0 {
            let existing_stock_line = if let Some(id) = &return_line.stock_line_id {
                StockLineRowRepository::new(connection).find_one_by_id(id)?
            } else {
                None
            };

            let stock_line = generate_batch(
                connection,
                line,
                StockLineInput {
                    stock_line_id: return_line.stock_line_id,
                    store_id: store_id.to_string(),
                    on_hold: existing_stock_line.map_or(false, |stock_line| stock_line.on_hold),
                    barcode_id: None,
                    supplier_link_id: supplier_id.to_string(),
                    // Update existing stock levels if the stock line already exists
                    overwrite_stock_levels: false,
                },
            )?;

            return_line.stock_line_id = Some(stock_line.id.clone());

            result.push(LineAndStockLine {
                line: return_line,
                stock_line,
            });
        }
    }
    Ok(result)
}
