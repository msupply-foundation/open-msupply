use chrono::NaiveDateTime;
use domain::EqualFilter;
use repository::{
    schema::{StockTakeRow, StockTakeStatus},
    RepositoryError, StockTake, StockTakeFilter, StockTakeRepository, StockTakeRowRepository,
    StorageConnection,
};

use crate::{service_provider::ServiceContext, validate::check_store_exists};

use super::query::get_stock_take;

pub struct InsertStockTakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
}

#[derive(Debug, PartialEq)]
pub enum InsertStockTakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StockTakeAlreadyExists,
    InvalidStore,
}

fn check_stock_take_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StockTakeRepository::new(connection)
        .count(Some(StockTakeFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 0)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stock_take: &InsertStockTakeInput,
) -> Result<(), InsertStockTakeError> {
    if !check_stock_take_does_not_exist(connection, &stock_take.id)? {
        return Err(InsertStockTakeError::StockTakeAlreadyExists);
    }
    if !check_store_exists(connection, store_id)? {
        return Err(InsertStockTakeError::InvalidStore);
    }
    Ok(())
}

fn generate(
    store_id: &str,
    InsertStockTakeInput {
        id,
        comment,
        description,
        created_datetime,
    }: InsertStockTakeInput,
) -> StockTakeRow {
    StockTakeRow {
        id,
        store_id: store_id.to_string(),
        comment,
        description,
        status: StockTakeStatus::New,
        created_datetime,
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn insert_stock_take(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStockTakeInput,
) -> Result<StockTake, InsertStockTakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &input)?;
            let new_stock_take = generate(store_id, input);
            StockTakeRowRepository::new(&connection).upsert_one(&new_stock_take)?;

            let stock_take = get_stock_take(ctx, new_stock_take.id)?;
            stock_take.ok_or(InsertStockTakeError::InternalError(
                "Failed to read the just inserted stock take!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for InsertStockTakeError {
    fn from(error: RepositoryError) -> Self {
        InsertStockTakeError::DatabaseError(error)
    }
}
