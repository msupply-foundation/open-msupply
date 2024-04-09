use repository::{RepositoryError, StockLine, StorageConnection};

use crate::common_stock::{check_stock_line_exists, CommonStockLineError};
use crate::invoice::inventory_adjustment::insert::AdjustmentType;

use crate::stocktake_line::validate::{check_active_adjustment_reasons, check_reason_is_valid};

use super::insert::{InsertInventoryAdjustment, InsertInventoryAdjustmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertInventoryAdjustment,
) -> Result<StockLine, InsertInventoryAdjustmentError> {
    use InsertInventoryAdjustmentError::*;
    let stock_line = check_stock_line_exists(connection, store_id, &input.stock_line_id).map_err(
        |err| match err {
            CommonStockLineError::DatabaseError(RepositoryError::NotFound) => StockLineDoesNotExist,
            CommonStockLineError::StockLineDoesNotBelongToStore => InvalidStore,
            CommonStockLineError::DatabaseError(error) => DatabaseError(error),
        },
    )?;

    if input.adjustment == 0.0 {
        return Err(InvalidAdjustment);
    };

    let reduction_amount = match input.adjustment_type {
        AdjustmentType::Reduction => input.adjustment,
        AdjustmentType::Addition => -input.adjustment,
    };

    if check_active_adjustment_reasons(connection, reduction_amount)?.is_some()
        && input.inventory_adjustment_reason_id.is_none()
    {
        return Err(AdjustmentReasonNotProvided);
    }

    if input.inventory_adjustment_reason_id.is_some()
        && !check_reason_is_valid(
            connection,
            input.inventory_adjustment_reason_id.clone(),
            reduction_amount,
        )?
    {
        return Err(AdjustmentReasonNotValid);
    }

    if stock_line.stock_line_row.available_number_of_packs - reduction_amount < 0.0 {
        return Err(StockLineReducedBelowZero(stock_line.stock_line_row));
    }

    Ok(stock_line)
}
