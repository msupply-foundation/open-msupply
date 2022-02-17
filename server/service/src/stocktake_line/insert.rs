use chrono::NaiveDate;
use domain::{
    stock_line::{StockLine, StockLineFilter},
    EqualFilter,
};
use repository::{
    schema::StocktakeLineRow, RepositoryError, StockLineRepository, StocktakeLine,
    StocktakeLineFilter, StocktakeLineRepository, StocktakeLineRowRepository, StorageConnection,
};

use crate::{
    service_provider::ServiceContext,
    stocktake::validate::{check_stocktake_exist, check_stocktake_not_finalised},
    stocktake_line::{
        query::get_stocktake_line,
        validate::{check_item_exists, check_location_exists},
    },
    u32_to_i32,
    validate::check_store_id_matches,
};

pub struct InsertStocktakeLineInput {
    pub id: String,
    pub stocktake_id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub counted_number_of_packs: Option<u32>,

    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<u32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStocktakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StocktakeDoesNotExist,
    StocktakeLineAlreadyExists,
    StockLineDoesNotExist,
    StockLineAlreadyExistsInStocktake,
    LocationDoesNotExist,
    CannotEditFinalised,
    /// Either stock line xor item must be set (not both)
    StockLineXOrItem,
    ItemDoesNotExist,
}

fn check_stocktake_line_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeLineRepository::new(connection).count(Some(
        StocktakeLineFilter::new().id(EqualFilter::equal_to(id)),
    ))?;
    Ok(count == 0)
}

fn check_stock_line_is_unique(
    connection: &StorageConnection,
    id: &str,
    stock_line_id: &str,
) -> Result<bool, RepositoryError> {
    let stocktake_lines = StocktakeLineRepository::new(connection)
        .query_by_filter(StocktakeLineFilter::new().stocktake_id(EqualFilter::equal_to(id)))?;
    let already_has_stock_line = stocktake_lines.iter().find(|line| {
        if let Some(ref stock_line) = line.stock_line {
            if stock_line.id == stock_line_id {
                return true;
            } else {
                return false;
            }
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
    input: &InsertStocktakeLineInput,
) -> Option<String> {
    if (stock_line.is_none() && input.item_id.is_none())
        || (stock_line.is_some() && input.item_id.is_some())
    {
        return None;
    }

    // extract item_id
    if let Some(stock_line) = stock_line {
        return Some(stock_line.item_id.clone());
    }
    input.item_id.clone()
}

fn check_stock_line_exists(
    connection: &StorageConnection,
    id: &str,
) -> Result<Option<StockLine>, RepositoryError> {
    Ok(StockLineRepository::new(connection)
        .query_by_filter(StockLineFilter::new().id(EqualFilter::equal_to(id)))?
        .pop())
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertStocktakeLineInput,
) -> Result<(Option<StockLine>, String), InsertStocktakeLineError> {
    let stocktake = match check_stocktake_exist(connection, &input.stocktake_id)? {
        Some(stocktake) => stocktake,
        None => return Err(InsertStocktakeLineError::StocktakeDoesNotExist),
    };
    if !check_stocktake_not_finalised(&stocktake.status) {
        return Err(InsertStocktakeLineError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stocktake.store_id) {
        return Err(InsertStocktakeLineError::InvalidStore);
    }
    if !check_stocktake_line_does_not_exist(connection, &input.id)? {
        return Err(InsertStocktakeLineError::StocktakeLineAlreadyExists);
    }

    let stock_line = if let Some(stock_line_id) = &input.stock_line_id {
        check_stock_line_exists(connection, stock_line_id)?
    } else {
        None
    };
    if let Some(stock_line) = &stock_line {
        if !check_stock_line_is_unique(connection, &input.stocktake_id, &stock_line.id)? {
            return Err(InsertStocktakeLineError::StockLineAlreadyExistsInStocktake);
        }
    }

    let item_id = check_stock_line_xor_item(&stock_line, input)
        .ok_or(InsertStocktakeLineError::StockLineXOrItem)?;
    if let Some(item_id) = &input.item_id {
        if !check_item_exists(connection, &item_id)? {
            return Err(InsertStocktakeLineError::ItemDoesNotExist);
        }
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(InsertStocktakeLineError::LocationDoesNotExist);
        }
    }

    Ok((stock_line, item_id))
}

fn generate(
    stock_line: Option<StockLine>,
    item_id: String,
    InsertStocktakeLineInput {
        id,
        stocktake_id,
        stock_line_id,
        location_id,
        comment,
        counted_number_of_packs,
        item_id: _,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: InsertStocktakeLineInput,
) -> StocktakeLineRow {
    let snapshot_number_of_packs = if let Some(stock_line) = stock_line {
        stock_line.total_number_of_packs
    } else {
        0
    };
    StocktakeLineRow {
        id,
        stocktake_id,
        stock_line_id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs: counted_number_of_packs.map(u32_to_i32),
        item_id: item_id.to_string(),
        batch,
        expiry_date,
        pack_size: pack_size.map(u32_to_i32),
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }
}

pub fn insert_stocktake_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStocktakeLineInput,
) -> Result<StocktakeLine, InsertStocktakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            let (stock_line, item_id) = validate(connection, store_id, &input)?;
            let new_stocktake_line = generate(stock_line, item_id, input);
            StocktakeLineRowRepository::new(&connection).upsert_one(&new_stocktake_line)?;

            let line = get_stocktake_line(ctx, new_stocktake_line.id)?;
            line.ok_or(InsertStocktakeLineError::InternalError(
                "Failed to read the just inserted stocktake line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for InsertStocktakeLineError {
    fn from(error: RepositoryError) -> Self {
        InsertStocktakeLineError::DatabaseError(error)
    }
}
