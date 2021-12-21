use chrono::NaiveDate;
use domain::EqualFilter;
use repository::{
    schema::StockTakeLineRow, RepositoryError, StockTakeLine, StockTakeLineFilter,
    StockTakeLineRepository, StockTakeLineRowRepository, StorageConnection,
};

use crate::{
    service_provider::ServiceContext,
    stock_take::validate::{check_stock_take_exist, check_stock_take_not_finalized},
    validate::check_store_id_matches,
};

use super::{
    query::get_stock_take_line,
    validate::{check_item_exists, check_location_exists, check_stock_line_exists},
};

pub struct InsertStockTakeLineInput {
    pub id: String,
    pub stock_take_id: String,
    pub stock_line_id: Option<String>,
    pub location_id: Option<String>,
    pub comment: Option<String>,
    pub snapshot_number_of_packs: i32,
    pub counted_number_of_packs: Option<i32>,

    pub item_id: Option<String>,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
    pub pack_size: Option<i32>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub note: Option<String>,
}

#[derive(Debug, PartialEq)]
pub enum InsertStockTakeLineError {
    DatabaseError(RepositoryError),
    InternalError(String),
    InvalidStore,
    StockTakeDoesNotExist,
    StockTakeLineAlreadyExists,
    StockLineDoesNotExist,
    LocationDoesNotExist,
    CannotEditFinalised,
    /// Either stock take line xor item must be set
    StockTakeLineXOrItem,
    ItemDoesNotExist,
}

fn check_stock_take_line_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StockTakeLineRepository::new(connection).count(Some(
        StockTakeLineFilter::new().id(EqualFilter::equal_to(id)),
    ))?;
    Ok(count == 0)
}

fn check_stock_line_xor_item(input: &InsertStockTakeLineInput) -> bool {
    if (input.stock_line_id.is_none() && input.item_id.is_none())
        || (input.stock_line_id.is_some() && input.item_id.is_some())
    {
        return false;
    }
    true
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &InsertStockTakeLineInput,
) -> Result<(), InsertStockTakeLineError> {
    let stock_take = match check_stock_take_exist(connection, &input.stock_take_id)? {
        Some(stock_take) => stock_take,
        None => return Err(InsertStockTakeLineError::StockTakeDoesNotExist),
    };
    if !check_stock_take_not_finalized(&stock_take.status) {
        return Err(InsertStockTakeLineError::CannotEditFinalised);
    }
    if !check_store_id_matches(store_id, &stock_take.store_id) {
        return Err(InsertStockTakeLineError::InvalidStore);
    }
    if !check_stock_take_line_does_not_exist(connection, &input.id)? {
        return Err(InsertStockTakeLineError::StockTakeLineAlreadyExists);
    }
    if !check_stock_line_xor_item(input) {
        return Err(InsertStockTakeLineError::StockTakeLineXOrItem);
    }

    if let Some(stock_line_id) = &input.stock_line_id {
        if !check_stock_line_exists(connection, stock_line_id)? {
            return Err(InsertStockTakeLineError::StockLineDoesNotExist);
        }
    }

    if let Some(item_id) = &input.item_id {
        if !check_item_exists(connection, &item_id)? {
            return Err(InsertStockTakeLineError::ItemDoesNotExist);
        }
    }

    if let Some(location_id) = &input.location_id {
        if !check_location_exists(connection, location_id)? {
            return Err(InsertStockTakeLineError::LocationDoesNotExist);
        }
    }

    Ok(())
}

fn generate(
    InsertStockTakeLineInput {
        id,
        stock_take_id,
        stock_line_id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        item_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }: InsertStockTakeLineInput,
) -> StockTakeLineRow {
    StockTakeLineRow {
        id,
        stock_take_id,
        stock_line_id,
        location_id,
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        item_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
    }
}

pub fn insert_stock_take_line(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStockTakeLineInput,
) -> Result<StockTakeLine, InsertStockTakeLineError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &input)?;
            let new_stock_take_line = generate(input);
            StockTakeLineRowRepository::new(&connection).upsert_one(&new_stock_take_line)?;

            let line = get_stock_take_line(ctx, new_stock_take_line.id)?;
            line.ok_or(InsertStockTakeLineError::InternalError(
                "Failed to read the just inserted stock take line!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for InsertStockTakeLineError {
    fn from(error: RepositoryError) -> Self {
        InsertStockTakeLineError::DatabaseError(error)
    }
}
