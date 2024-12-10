use repository::{RepositoryError, StocktakeLine, StorageConnection};

use crate::{
    check_location_exists,
    common_stock::{check_stock_line_exists, CommonStockLineError},
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::validate::{
        check_active_adjustment_reasons, check_reason_is_valid,
        check_snapshot_matches_current_count, check_stock_line_reduced_below_zero,
        check_stocktake_line_exist, stocktake_reduction_amount,
    },
    validate::check_store_id_matches,
};

use super::{UpdateStocktakeLine, UpdateStocktakeLineError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateStocktakeLine,
) -> Result<StocktakeLine, UpdateStocktakeLineError> {
    use UpdateStocktakeLineError::*;

    let stocktake_line = match check_stocktake_line_exist(connection, &input.id)? {
        Some(stocktake_line) => stocktake_line,
        None => return Err(StocktakeLineDoesNotExist),
    };
    let stocktake_line_row = &stocktake_line.line;
    let stocktake = match check_stocktake_exist(connection, &stocktake_line_row.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => return Err(InternalError("Orphan stocktake line!".to_string())),
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(CannotEditFinalised);
    }

    if stocktake.is_locked {
        return Err(StocktakeIsLocked);
    }

    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(InvalidStore);
    }

    if !check_location_exists(connection, store_id, &input.location)? {
        return Err(LocationDoesNotExist);
    }

    let stocktake_reduction_amount =
        stocktake_reduction_amount(&input.counted_number_of_packs, stocktake_line_row);
    if check_active_adjustment_reasons(connection, stocktake_reduction_amount)?.is_some()
        && input.inventory_adjustment_reason_id.is_none()
        && stocktake_reduction_amount != 0.0
    {
        return Err(AdjustmentReasonNotProvided);
    }

    if input.inventory_adjustment_reason_id.is_some()
        && !check_reason_is_valid(
            connection,
            input.inventory_adjustment_reason_id.clone(),
            stocktake_reduction_amount,
        )?
    {
        return Err(AdjustmentReasonNotValid);
    }

    if let (Some(counted_number_of_packs), Some(stock_line_id)) = (
        input.counted_number_of_packs,
        &stocktake_line_row.stock_line_id,
    ) {
        let stock_line = check_stock_line_exists(connection, store_id, stock_line_id).map_err(
            |err| match err {
                CommonStockLineError::DatabaseError(RepositoryError::NotFound) => {
                    StockLineDoesNotExist
                }
                CommonStockLineError::StockLineDoesNotBelongToStore => InvalidStore,
                CommonStockLineError::DatabaseError(error) => DatabaseError(error),
            },
        )?;

        if check_stock_line_reduced_below_zero(&stock_line.stock_line_row, &counted_number_of_packs)
        {
            return Err(StockLineReducedBelowZero(stock_line.clone()));
        }

        if !check_snapshot_matches_current_count(
            &stock_line.stock_line_row,
            stocktake_line_row.snapshot_number_of_packs,
        ) {
            return Err(SnapshotCountCurrentCountMismatchLine(stocktake_line));
        }
    }

    Ok(stocktake_line)
}

impl From<RepositoryError> for UpdateStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStocktakeLineError::DatabaseError(error)
    }
}
