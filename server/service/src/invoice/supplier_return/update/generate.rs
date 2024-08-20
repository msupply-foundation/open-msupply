use chrono::Utc;
use repository::{InvoiceRow, InvoiceStatus, StockLineRow, StorageConnection};

use crate::invoice::common::{
    generate_batches_total_number_of_packs_update, InvoiceLineHasNoStockLine,
};

use super::{UpdateSupplierReturn, UpdateSupplierReturnError, UpdateSupplierReturnStatus};

pub struct GenerateResult {
    pub updated_return: InvoiceRow,
    pub stock_lines_to_update: Option<Vec<StockLineRow>>,
}

pub fn generate(
    connection: &StorageConnection,
    UpdateSupplierReturn {
        supplier_return_id,
        comment,
        status,
        on_hold,
        their_reference,
        colour,
        transport_reference,
    }: UpdateSupplierReturn,
    existing_return: InvoiceRow,
) -> Result<GenerateResult, UpdateSupplierReturnError> {
    let mut updated_return = existing_return.clone();

    updated_return.comment = comment.or(existing_return.comment);
    updated_return.their_reference = their_reference.or(existing_return.their_reference);
    updated_return.on_hold = on_hold.unwrap_or(existing_return.on_hold);
    updated_return.colour = colour.or(existing_return.colour);
    updated_return.transport_reference =
        transport_reference.or(existing_return.transport_reference);

    set_new_status_datetime(&mut updated_return, &status);
    if let Some(status) = status.clone() {
        updated_return.status = status.as_invoice_row_status()
    }

    let should_update_total_number_of_packs =
        should_update_stock_lines_total_number_of_packs(&existing_return.status, &status);

    let stock_lines_to_update = if should_update_total_number_of_packs {
        Some(
            generate_batches_total_number_of_packs_update(&supplier_return_id, connection)
                .map_err(|e| match e {
                    InvoiceLineHasNoStockLine::InvoiceLineHasNoStockLine(line) => {
                        UpdateSupplierReturnError::InvoiceLineHasNoStockLine(line)
                    }
                    InvoiceLineHasNoStockLine::DatabaseError(e) => {
                        UpdateSupplierReturnError::DatabaseError(e)
                    }
                })?,
        )
    } else {
        None
    };

    Ok(GenerateResult {
        updated_return,
        stock_lines_to_update,
    })
}

fn changed_status(
    status: &Option<UpdateSupplierReturnStatus>,
    existing_status: &InvoiceStatus,
) -> Option<UpdateSupplierReturnStatus> {
    let new_status = match status {
        Some(status) => status,
        None => return None, // Status is not changing
    };

    if &new_status.as_invoice_row_status() == existing_status {
        // The invoice already has this status, there's nothing to do.
        return None;
    }

    Some(new_status.clone())
}

fn set_new_status_datetime(
    supplier_return: &mut InvoiceRow,
    status: &Option<UpdateSupplierReturnStatus>,
) {
    let new_status = match changed_status(status, &supplier_return.status) {
        Some(status) => status,
        None => return, // There's no status to update
    };

    let current_datetime = Utc::now().naive_utc();

    // Status sequence for supplier return: New, Picked, Shipped
    match (&supplier_return.status, new_status) {
        // From Shipped to Any, ignore
        (InvoiceStatus::Shipped, _) => {}

        // From New to Picked
        (InvoiceStatus::New, UpdateSupplierReturnStatus::Picked) => {
            supplier_return.picked_datetime = Some(current_datetime);
        }

        // From New to Shipped
        (InvoiceStatus::New, UpdateSupplierReturnStatus::Shipped) => {
            supplier_return.picked_datetime = Some(current_datetime);
            supplier_return.shipped_datetime = Some(current_datetime)
        }

        // From Picked to Shipped
        (InvoiceStatus::Picked, UpdateSupplierReturnStatus::Shipped) => {
            supplier_return.shipped_datetime = Some(current_datetime)
        }
        _ => {}
    }
}

fn should_update_stock_lines_total_number_of_packs(
    existing_status: &InvoiceStatus,
    status: &Option<UpdateSupplierReturnStatus>,
) -> bool {
    let new_status = match changed_status(status, existing_status) {
        Some(status) => status,
        None => return false, // Status is not changing
    };

    match (existing_status, new_status) {
        (
            // From New to Picked, or New to Shipped
            InvoiceStatus::New,
            UpdateSupplierReturnStatus::Picked | UpdateSupplierReturnStatus::Shipped,
        ) => true,
        _ => false,
    }
}
