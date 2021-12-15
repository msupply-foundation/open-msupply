use chrono::NaiveDateTime;
use repository::{
    schema::{StockTakeRow, StockTakeStatus},
    RepositoryError, StockTake, StockTakeRowRepository, StorageConnection,
};

use crate::{service_provider::ServiceContext, validate::check_store_exists};

use super::query::get_stock_take;

pub struct InsertStockTakeInput {
    pub id: String,
    pub store_id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
}

#[derive(Debug, PartialEq)]
pub enum InsertStockTakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StockTakeAlreadyExists,
    InvalidStoreId,
}

fn check_stock_take_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    Ok(StockTakeRowRepository::new(connection)
        .find_one_by_id(id)?
        .is_none())
}

fn validate(
    connection: &StorageConnection,
    stock_take: &InsertStockTakeInput,
) -> Result<(), InsertStockTakeError> {
    if !check_stock_take_does_not_exist(connection, &stock_take.id)? {
        return Err(InsertStockTakeError::StockTakeAlreadyExists);
    }
    if !check_store_exists(connection, &stock_take.store_id)? {
        return Err(InsertStockTakeError::InvalidStoreId);
    }
    Ok(())
}

fn generate(
    InsertStockTakeInput {
        id,
        store_id,
        comment,
        description,
        created_datetime,
    }: InsertStockTakeInput,
) -> StockTakeRow {
    StockTakeRow {
        id,
        store_id,
        comment,
        description,
        status: StockTakeStatus::New,
        created_datetime,
        inventory_additions_id: None,
        inventory_reductions_id: None,
        finalised_datetime: None,
    }
}

pub fn insert_stock_take(
    ctx: &ServiceContext,
    input: InsertStockTakeInput,
) -> Result<StockTake, InsertStockTakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, &input)?;
            let new_stock_take = generate(input);
            StockTakeRowRepository::new(&connection).upsert_one(&new_stock_take)?;

            let stock_take =
                get_stock_take(ctx, new_stock_take.id).map_err(InsertStockTakeError::from)?;
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
