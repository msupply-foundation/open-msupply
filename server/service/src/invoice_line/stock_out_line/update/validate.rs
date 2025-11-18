use super::{UpdateStockOutLine, UpdateStockOutLineError};
use crate::{
    check_vvm_status_exists,
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_existing_stock_line, check_location_on_hold,
        invoice_backdated_date,
        stock_out_line::{adjust_for_residual_packs, BatchPair},
        validate::{check_line_belongs_to_invoice, check_line_exists, check_number_of_packs},
        LocationIsOnHoldError,
    },
    service_provider::ServiceContext,
    stock_line::historical_stock::get_historical_stock_line_available_quantity,
    store_preference::get_store_preferences,
};
use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineRow, InvoiceRow,
    InvoiceStatus, ItemRow, RequisitionLineFilter, RequisitionLineRepository, StorageConnection,
};

pub struct UpdateStockOutLineValidationResult {
    pub line: InvoiceLineRow,
    pub item: ItemRow,
    pub batch_pair: BatchPair,
    pub invoice: InvoiceRow,
    pub adjusted_input: UpdateStockOutLine,
}

pub fn validate(
    ctx: &ServiceContext,
    input: UpdateStockOutLine,
    store_id: &str,
) -> Result<UpdateStockOutLineValidationResult, UpdateStockOutLineError> {
    use UpdateStockOutLineError::*;
    let ServiceContext { connection, .. } = ctx;
    let store_preferences = get_store_preferences(connection, store_id)?;

    let line = check_line_exists(connection, &input.id)?.ok_or(LineDoesNotExist)?;
    let line_row = &line.invoice_line_row;
    let invoice =
        check_invoice_exists(&line_row.invoice_id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    let existing_stock = check_existing_stock_line(
        &line_row.id.clone(),
        &invoice.id,
        input.stock_line_id.clone(),
        connection,
    )?;
    if let Some(existing_stock) = existing_stock {
        return Err(StockLineAlreadyExistsInInvoice(existing_stock.id));
    }

    let stock_out_type = if let Some(r#type) = &input.r#type {
        if !check_invoice_type(&invoice, r#type.to_domain()) {
            return Err(InvoiceTypeDoesNotMatch);
        }
        r#type
    } else {
        return Err(NoInvoiceType);
    };

    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_line_belongs_to_invoice(line_row, &invoice) {
        return Err(NotThisInvoiceLine(line.invoice_line_row.invoice_id));
    }
    if invoice.status != InvoiceStatus::New && !check_number_of_packs(input.number_of_packs) {
        return Err(NumberOfPacksBelowZero);
    }

    let batch_pair = check_batch_exists_option(store_id, &input, line_row, connection)?;

    let item = line.item_row.clone();

    if !check_batch_on_hold(&batch_pair.main_batch, stock_out_type) {
        return Err(BatchIsOnHold);
    }
    check_location_on_hold(&batch_pair.main_batch.location_row, stock_out_type).map_err(
        |e| match e {
            LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
        },
    )?;

    if let Some(vvm_status_id) = &input.vvm_status_id {
        if check_vvm_status_exists(connection, vvm_status_id)?.is_none() {
            return Err(VVMStatusDoesNotExist);
        }
    }

    if invoice.requisition_id.is_some()
        && store_preferences.response_requisition_requires_authorisation
    {
        let requisition_line = RequisitionLineRepository::new(connection)
            .query_by_filter(
                RequisitionLineFilter::new()
                    .requisition_id(EqualFilter::equal_to(
                        &invoice.requisition_id.clone().unwrap(),
                    ))
                    .item_id(EqualFilter::equal_to(&line.item_row.id)),
            )?
            .pop();

        if let Some(requisition_line) = requisition_line {
            let approved_quantity = requisition_line.requisition_line_row.approved_quantity;

            let all_lines_for_item = InvoiceLineRepository::new(connection).query_by_filter(
                InvoiceLineFilter::new()
                    .invoice_id(EqualFilter::equal_to(&invoice.id))
                    .item_id(EqualFilter::equal_to(&line.item_row.id)),
            )?;

            let total_issued_quantity: f64 = all_lines_for_item
                .iter()
                .filter(|l| l.invoice_line_row.id != line_row.id)
                .map(|l| l.invoice_line_row.number_of_packs * l.invoice_line_row.pack_size)
                .sum();
            let issue_quantity = input
                .number_of_packs
                .map_or(0.0, |packs| packs * line.invoice_line_row.pack_size);

            let total_quantity_after_update = total_issued_quantity + issue_quantity;

            if total_quantity_after_update > approved_quantity {
                return Err(CannotIssueMoreThanApprovedQuantity(line_row.id.clone()));
            }
        }
    }

    let mut adjusted_input = UpdateStockOutLine { ..input };

    if let Some(new_number_of_packs) = input.number_of_packs {
        let mut available_packs = batch_pair
            .main_batch
            .stock_line_row
            .available_number_of_packs;

        if let Some(backdated_date) = invoice_backdated_date(&invoice) {
            available_packs = get_historical_stock_line_available_quantity(
                connection,
                &batch_pair.main_batch.stock_line_row,
                Some(line.invoice_line_row.number_of_packs),
                &backdated_date,
            )?;
        }

        available_packs += line.invoice_line_row.number_of_packs;

        // If there's only a tiny bit left in stock after this, we'll adjust the invoice to take the last of the stock
        // Likewise, if there's almost enough for what the request asks for, we'll allocate the last of the stock and let the transaction continue
        let adjusted_requested_number_of_packs =
            adjust_for_residual_packs(available_packs, new_number_of_packs);
        adjusted_input.number_of_packs = Some(adjusted_requested_number_of_packs);

        if available_packs < adjusted_requested_number_of_packs {
            return Err(UpdateStockOutLineError::ReductionBelowZero {
                stock_line_id: batch_pair.main_batch.stock_line_row.id,
                line_id: line_row.id.clone(),
            });
        }
    }

    Ok(UpdateStockOutLineValidationResult {
        line: line.invoice_line_row,
        item,
        batch_pair,
        invoice,
        adjusted_input,
    })
}

fn check_batch_exists_option(
    store_id: &str,
    input: &UpdateStockOutLine,
    existing_line: &InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<BatchPair, UpdateStockOutLineError> {
    use UpdateStockOutLineError::*;

    let previous_batch = if let Some(batch_id) = &existing_line.stock_line_id {
        // Should always be found due to constraints on database
        check_batch_exists(store_id, batch_id, connection)?.ok_or(StockLineNotFound)?
    } else {
        // This should never happen, but still need to cover
        return Err(LineDoesNotReferenceStockLine);
    };

    let result = match &input.stock_line_id {
        Some(batch_id) if batch_id != &previous_batch.stock_line_row.id => BatchPair {
            // stock_line changed
            main_batch: check_batch_exists(store_id, batch_id, connection)?
                .ok_or(StockLineNotFound)?,
            previous_batch_option: Some(previous_batch),
        },
        _ => {
            // stock_line_id not changed
            BatchPair {
                main_batch: previous_batch,
                previous_batch_option: None,
            }
        }
    };

    Ok(result)
}
