use repository::{
    EqualFilter, ItemFilter, ItemRepository, RepositoryError, StockLine, StocktakeLineFilter,
    StocktakeLineRepository, StorageConnection,
};

use crate::{
    check_location_exists,
    common_stock::{check_stock_line_exists, CommonStockLineError},
    stocktake::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::validate::{
        check_active_adjustment_reasons, check_reason_is_valid, check_stock_line_reduced_below_zero,
    },
    validate::check_store_id_matches,
};

use super::{InsertStocktakeLine, InsertStocktakeLineError};

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

    let item_name = if input.item_id.is_some() {
        check_item_exists_and_get_item_name(connection, store_id, &item_id)?
    } else {
        stock_line.as_ref().unwrap().item_row.name.clone()
    };

    if !check_location_exists(connection, store_id, &input.location)? {
        return Err(LocationDoesNotExist);
    }

    let stocktake_reduction_amount =
        stocktake_reduction_amount(&input.counted_number_of_packs, &stock_line);
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

    if let (Some(counted_number_of_packs), Some(stock_line)) =
        (input.counted_number_of_packs, stock_line.clone())
    {
        if check_stock_line_reduced_below_zero(&stock_line.stock_line_row, &counted_number_of_packs)
        {
            return Err(StockLineReducedBelowZero(stock_line));
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
        Some(StocktakeLineFilter::new().id(EqualFilter::equal_to(id))),
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
        StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(id)),
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

pub fn check_item_exists_and_get_item_name(
    connection: &StorageConnection,
    store_id: &str,
    item_id: &str,
) -> Result<String, InsertStocktakeLineError> {
    let item = ItemRepository::new(connection)
        .query_by_filter(
            ItemFilter::new().id(EqualFilter::equal_to(item_id)),
            Some(store_id.to_string()),
        )?
        .pop()
        .ok_or(InsertStocktakeLineError::ItemDoesNotExist)?;

    Ok(item.item_row.name)
}
