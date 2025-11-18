use super::{InsertStockOutLine, InsertStockOutLineError};
use crate::{
    check_vvm_status_exists,
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_existing_stock_line, check_location_on_hold,
        invoice_backdated_date,
        stock_out_line::adjust_for_residual_packs,
        validate::{check_item_approved_quantity, check_line_exists, check_number_of_packs},
        LocationIsOnHoldError,
    },
    stock_line::historical_stock::get_historical_stock_line_available_quantity,
    store_preference::get_store_preferences,
};
use repository::{
    InvoiceRow, InvoiceStatus, ItemRow, LocationRowRepository, StockLine, StorageConnection,
};

pub fn validate(
    connection: &StorageConnection,
    input: InsertStockOutLine,
    store_id: &str,
) -> Result<(ItemRow, InvoiceRow, StockLine, InsertStockOutLine), InsertStockOutLineError> {
    use InsertStockOutLineError::*;

    let store_preferences = get_store_preferences(connection, store_id)?;

    if (check_line_exists(connection, &input.id)?).is_some() {
        return Err(LineAlreadyExists);
    }
    let batch =
        check_batch_exists(store_id, &input.stock_line_id, connection)?.ok_or(StockLineNotFound)?;

    let item = batch.item_row.clone();

    let invoice =
        check_invoice_exists(&input.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if invoice.status != InvoiceStatus::New && !check_number_of_packs(Some(input.number_of_packs)) {
        return Err(NumberOfPacksBelowZero);
    }

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    let existing_stock = check_existing_stock_line(
        &input.id,
        &invoice.id,
        Some(input.stock_line_id.to_string()),
        connection,
    )?;
    if let Some(existing_stock) = existing_stock {
        return Err(StockLineAlreadyExistsInInvoice(existing_stock.id));
    }
    if let Some(existing_stock) = existing_stock {
        return Err(StockLineAlreadyExistsInInvoice(existing_stock.id));
    }

    if !check_invoice_type(&invoice, input.r#type.to_domain()) {
        return Err(InvoiceTypeDoesNotMatch);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_batch_on_hold(&batch, &input.r#type) {
        return Err(BatchIsOnHold);
    }

    let location_id = input
        .location_id
        .clone()
        .map(|l| l.value)
        .unwrap_or(batch.location_row.clone().map(|l| l.id));

    if let Some(location_id) = location_id {
        let location = LocationRowRepository::new(connection)
            .find_one_by_id(&location_id)?
            .ok_or(LocationNotFound)?;

        check_location_on_hold(&Some(location), &input.r#type).map_err(|e| match e {
            LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
        })?;
    }

    let mut available_packs = batch.stock_line_row.available_number_of_packs;
    if let Some(backdated_date) = invoice_backdated_date(&invoice) {
        available_packs = get_historical_stock_line_available_quantity(
            connection,
            &batch.stock_line_row,
            None,
            &backdated_date,
        )?
    }

    if let Some(vvm_status_id) = &input.vvm_status_id {
        if check_vvm_status_exists(connection, vvm_status_id)?.is_none() {
            return Err(VVMStatusDoesNotExist);
        }
    }

    if store_preferences.response_requisition_requires_authorisation {
        check_item_approved_quantity(connection, &item.id, invoice.requisition_id.clone())
            .map_err(|e| match e {
                crate::invoice_line::validate::CannotIssueMoreThanApprovedQuantity::CannotIssueMoreThanApprovedQuantity => {
                    InsertStockOutLineError::CannotIssueMoreThanApprovedQuantity
                }
                crate::invoice_line::validate::CannotIssueMoreThanApprovedQuantity::RepositoryError(repository_error) => {
                    InsertStockOutLineError::DatabaseError(repository_error)
                }
            })?;
    }

    // If there's only a tiny bit left in stock after this, we'll adjust the invoice to take the last of the stock
    // Likewise, if there's almost enough for what the request asks for, we'll allocate the last of the stock and let the transaction continue
    let adjusted_requested_number_of_packs =
        adjust_for_residual_packs(available_packs, input.number_of_packs);
    let adjusted_input = InsertStockOutLine {
        number_of_packs: adjusted_requested_number_of_packs,
        ..input
    };

    if available_packs < adjusted_input.number_of_packs {
        return Err(InsertStockOutLineError::ReductionBelowZero {
            stock_line_id: batch.stock_line_row.id.clone(),
        });
    }

    Ok((item, invoice, batch, adjusted_input))
}
