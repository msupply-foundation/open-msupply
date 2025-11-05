use super::{InsertStocktakeLine, InsertStocktakeLineError};
use crate::{
    campaign::check_campaign_exists,
    check_location_exists, check_location_type_is_valid, check_vvm_status_exists,
    common::{check_program_exists, check_stock_line_exists, CommonStockLineError},
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::validate::{
        check_active_adjustment_reasons, check_reason_is_valid, check_stock_line_reduced_below_zero,
    },
    validate::check_store_id_matches,
    NullableUpdate,
};
use repository::{
    EqualFilter, ItemFilter, ItemRepository, RepositoryError, StockLine, StocktakeLineFilter,
    StocktakeLineRepository, StorageConnection,
};

pub(crate) struct GenerateResult {
    pub(crate) stock_line: Option<StockLine>,
    pub(crate) item_id: String,
    pub(crate) item_name: String,
}

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertStocktakeLine,
) -> Result<GenerateResult, InsertStocktakeLineError> {
    use InsertStocktakeLineError::*;

    let stocktake = match check_stocktake_exist(connection, &input.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => return Err(StocktakeDoesNotExist),
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(InvalidStore);
    }
    if !check_stocktake_line_does_not_exist(connection, &input.id)? {
        return Err(StocktakeLineAlreadyExists);
    }

    if stocktake.is_locked {
        return Err(StocktakeIsLocked);
    }

    if let Some(vvm_status_id) = &input.vvm_status_id {
        if check_vvm_status_exists(connection, vvm_status_id)?.is_none() {
            return Err(VvmStatusDoesNotExist);
        }
    }

    let stock_line = if let Some(stock_line_id) = &input.stock_line_id {
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
    if let Some(stock_line) = &stock_line {
        if !check_stock_line_is_unique(
            connection,
            &input.stocktake_id,
            &stock_line.stock_line_row.id,
        )? {
            return Err(StockLineAlreadyExistsInStocktake);
        }
    }

    let item_id = check_stock_line_xor_item(&stock_line, input)
        .ok_or(InsertStocktakeLineError::StockLineXOrItem)?;

    let (item_name, item_restricted_location_type) = if input.item_id.is_some() {
        check_item_exists_and_get_item_details(connection, store_id, &item_id)?
    } else {
        let sl = stock_line.as_ref().unwrap();
        (
            sl.item_row.name.clone(),
            sl.item_row.restricted_location_type_id.clone(),
        )
    };

    if let Some(NullableUpdate {
        value: Some(ref location),
    }) = &input.location
    {
        if !check_location_exists(connection, store_id, location)? {
            return Err(LocationDoesNotExist);
        }

        // Stocktake line might be for an item which should only live in a certain location type
        if let Some(item_restricted_type) = &item_restricted_location_type {
            let current_location_type = stock_line
                .as_ref()
                .and_then(|sl| sl.item_row.restricted_location_type_id.clone());

            // Only check location type if changing to a different location than the stock line was previously in
            if current_location_type != Some(location.to_string()) {
                // Allow stock to remain in incorrect location during stocktake (don't force stock move during stock count)
                // - we flag in frontend but don't prevent saving the lines
                if !check_location_type_is_valid(
                    connection,
                    store_id,
                    location,
                    item_restricted_type,
                )? {
                    return Err(IncorrectLocationType);
                }
            }
        }
    }

    let stocktake_reduction_amount =
        stocktake_reduction_amount(&input.counted_number_of_packs, &stock_line);
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
        (input.counted_number_of_packs, stock_line.clone())
    {
        if check_stock_line_reduced_below_zero(&stock_line.stock_line_row, &counted_number_of_packs)
        {
            return Err(StockLineReducedBelowZero(stock_line));
        }
    }

    if let Some(campaign_id) = &input.campaign_id {
        if !check_campaign_exists(connection, campaign_id)? {
            return Err(InsertStocktakeLineError::CampaignDoesNotExist);
        }
    }

    if let Some(program_id) = &input.program_id {
        if check_program_exists(connection, program_id)?.is_none() {
            return Err(InsertStocktakeLineError::ProgramDoesNotExist);
        }
    }

    Ok(GenerateResult {
        stock_line,
        item_id,
        item_name,
    })
}

fn check_stocktake_line_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeLineRepository::new(connection).count(
        Some(StocktakeLineFilter::new().id(EqualFilter::equal_to(id.to_string()))),
        None,
    )?;
    Ok(count == 0)
}

fn check_stock_line_is_unique(
    connection: &StorageConnection,
    id: &str,
    stock_line_id: &str,
) -> Result<bool, RepositoryError> {
    let stocktake_lines = StocktakeLineRepository::new(connection).query_by_filter(
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(id.to_string())),
        None,
    )?;
    let already_has_stock_line = stocktake_lines.iter().find(|line| {
        if let Some(ref stock_line) = line.stock_line {
            return stock_line.id == stock_line_id;
        }
        false
    });
    match already_has_stock_line {
        Some(_) => Ok(false),
        None => Ok(true),
    }
}

/// If valid it returns the item_id it either from the stock_line or from input.item_id
fn check_stock_line_xor_item(
    stock_line: &Option<StockLine>,
    input: &InsertStocktakeLine,
) -> Option<String> {
    if (stock_line.is_none() && input.item_id.is_none())
        || (stock_line.is_some() && input.item_id.is_some())
    {
        return None;
    }

    // extract item_id
    if let Some(stock_line) = stock_line {
        return Some(stock_line.item_row.id.clone());
    }
    input.item_id.clone()
}

pub fn stocktake_reduction_amount(
    counted_number_of_packs: &Option<f64>,
    stock_line: &Option<StockLine>,
) -> f64 {
    if let (Some(stock_line), Some(counted_number_of_packs)) = (stock_line, counted_number_of_packs)
    {
        stock_line.stock_line_row.total_number_of_packs - counted_number_of_packs
    } else if stock_line.is_none() && counted_number_of_packs.is_some() {
        -counted_number_of_packs.unwrap_or(0.0)
    } else {
        0.0
    }
}

pub fn check_item_exists_and_get_item_details(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
) -> Result<(String, Option<String>), InsertStocktakeLineError> {
    let item = ItemRepository::new(connection)
        .query_by_filter(
            ItemFilter::new().id(EqualFilter::equal_to(item_id.to_string())),
            Some(store_id.to_string()),
        )?
        .pop()
        .ok_or(InsertStocktakeLineError::ItemDoesNotExist)?;

    Ok((
        item.item_row.name,
        item.item_row.restricted_location_type_id,
    ))
}
