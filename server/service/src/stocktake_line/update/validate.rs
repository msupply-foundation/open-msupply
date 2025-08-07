use crate::{
    campaign::check_campaign_exists,
    check_location_exists, check_location_type_is_valid,
    common::{check_program_exists, check_stock_line_exists, CommonStockLineError},
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::validate::{
        check_active_adjustment_reasons, check_reason_is_valid,
        check_snapshot_matches_current_count, check_stock_line_reduced_below_zero,
        check_stocktake_line_exist, stocktake_reduction_amount,
    },
    validate::check_store_id_matches,
    NullableUpdate,
};
use repository::{RepositoryError, StocktakeLine, StorageConnection};

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

    let stock_line = if let Some(stock_line_id) = &stocktake_line_row.stock_line_id {
        Some(
            check_stock_line_exists(connection, store_id, stock_line_id).map_err(
                |err| match err {
                    CommonStockLineError::DatabaseError(RepositoryError::NotFound) => {
                        StockLineDoesNotExist
                    }
                    CommonStockLineError::StockLineDoesNotBelongToStore => InvalidStore,
                    CommonStockLineError::DatabaseError(error) => DatabaseError(error),
                },
            )?,
        )
    } else {
        None
    };

    if let Some(NullableUpdate {
        value: Some(ref location),
    }) = &input.location
    {
        if !check_location_exists(connection, store_id, location)? {
            return Err(LocationDoesNotExist);
        }

        // Stocktake line might be for an item which should only live in a certain location type
        if let Some(item_restricted_type) = &stocktake_line.item.restricted_location_type_id {
            // If we are changing to a different location than the stock line was previously in
            // Allow stock to remain in incorrect location during stocktake (don't force stock move during stock count)
            // - we flag in frontend but don't prevent saving the lines
            if stock_line
                .as_ref()
                .and_then(|s| s.stock_line_row.location_id.clone())
                != Some(location.to_string())
            {
                // Check Whether the type of the new location is valid for the item
                if !check_location_type_is_valid(
                    connection,
                    store_id,
                    &location,
                    item_restricted_type,
                )? {
                    return Err(IncorrectLocationType);
                }
            }
        }
    }

    let stocktake_reduction_amount =
        stocktake_reduction_amount(&input.counted_number_of_packs, stocktake_line_row);
    if check_active_adjustment_reasons(connection, stocktake_reduction_amount)?.is_some()
        && input.reason_option_id.is_none()
        && stocktake_reduction_amount != 0.0
        && !stocktake.is_initial_stocktake
    {
        return Err(AdjustmentReasonNotProvided);
    }

    if input.reason_option_id.is_some()
        && !check_reason_is_valid(
            connection,
            input.reason_option_id.clone(),
            stocktake_reduction_amount,
        )?
    {
        return Err(AdjustmentReasonNotValid);
    }

    if let (Some(counted_number_of_packs), Some(stock_line)) =
        (input.counted_number_of_packs, stock_line.as_ref())
    {
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

    if let Some(NullableUpdate {
        value: Some(ref campaign_id),
    }) = &input.campaign_id
    {
        if !check_campaign_exists(connection, campaign_id)? {
            return Err(CampaignDoesNotExist);
        }
    }

    if let Some(NullableUpdate {
        value: Some(ref program_id),
    }) = &input.program_id
    {
        if check_program_exists(connection, program_id)?.is_none() {
            return Err(ProgramDoesNotExist);
        }
    }

    Ok(stocktake_line)
}

impl From<RepositoryError> for UpdateStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateStocktakeLineError::DatabaseError(error)
    }
}
