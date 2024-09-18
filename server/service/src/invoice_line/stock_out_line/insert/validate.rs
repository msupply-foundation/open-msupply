use repository::{InvoiceRow, InvoiceStatus, ItemRow, StockLine};

use crate::{
    invoice::{check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store},
    invoice_line::{
        check_batch_exists, check_batch_on_hold, check_existing_stock_line, check_location_on_hold,
        validate::{check_line_exists, check_number_of_packs},
        LocationIsOnHoldError,
    },
    service_provider::ServiceContext,
    stock_line::historical_stock::get_historical_stock_lines,
};

use super::{InsertStockOutLine, InsertStockOutLineError};

pub fn validate(
    ctx: &ServiceContext,
    input: &InsertStockOutLine,
    store_id: &str,
) -> Result<(ItemRow, InvoiceRow, StockLine), InsertStockOutLineError> {
    use InsertStockOutLineError::*;

    if (check_line_exists(&ctx.connection, &input.id)?).is_some() {
        return Err(LineAlreadyExists);
    }
    let batch = check_batch_exists(store_id, &input.stock_line_id, &ctx.connection)?
        .ok_or(StockLineNotFound)?;

    let item = batch.item_row.clone();

    let invoice =
        check_invoice_exists(&input.invoice_id, &ctx.connection)?.ok_or(InvoiceDoesNotExist)?;

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
        &ctx.connection,
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
    if !check_batch_on_hold(&batch) {
        return Err(BatchIsOnHold);
    }
    check_location_on_hold(&batch).map_err(|e| match e {
        LocationIsOnHoldError::LocationIsOnHold => LocationIsOnHold,
    })?;

    // If we have an allocated_date older than 24hours, we need to calculate the historical stock line to see if we would have enough stock at that time
    let batch = if let Some(allocated_date) = invoice.allocated_datetime.clone() {
        if allocated_date < chrono::Utc::now().naive_utc() - chrono::Duration::hours(24) {
            let historical_stock_lines =
                get_historical_stock_lines(ctx, &store_id, &item.id, &allocated_date).map_err(
                    |e| {
                        InsertStockOutLineError::DatabaseError(
                            repository::RepositoryError::DBError {
                                msg: "Unable to calculate stock levels for this line".to_string(),
                                extra: format!("{:?}", e),
                            },
                        )
                    },
                )?;
            let stockline = historical_stock_lines
                .rows
                .iter()
                .find(|line| line.stock_line_row.id == batch.stock_line_row.id);

            match stockline {
                Some(stockline) => stockline.to_owned(),
                None => {
                    return Err(InsertStockOutLineError::ReductionBelowZero {
                        stock_line_id: batch.stock_line_row.id.clone(), // No stock line exists at this date
                    });
                }
            }
        } else {
            batch
        }
    } else {
        batch
    };

    check_reduction_below_zero(input, &batch)?;

    Ok((item, invoice, batch))
}

fn check_reduction_below_zero(
    input: &InsertStockOutLine,
    batch: &StockLine,
) -> Result<(), InsertStockOutLineError> {
    if batch.stock_line_row.available_number_of_packs < input.number_of_packs {
        Err(InsertStockOutLineError::ReductionBelowZero {
            stock_line_id: batch.stock_line_row.id.clone(),
        })
    } else {
        Ok(())
    }
}
