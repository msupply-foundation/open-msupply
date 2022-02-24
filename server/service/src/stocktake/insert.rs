use chrono::NaiveDateTime;
use repository::EqualFilter;
use repository::{
    schema::{NumberRowType, StocktakeRow, StocktakeStatus},
    RepositoryError, Stocktake, StocktakeFilter, StocktakeRepository, StocktakeRowRepository,
    StorageConnection,
};

use crate::{number::next_number, service_provider::ServiceContext, validate::check_store_exists};

use super::query::get_stocktake;

pub struct InsertStocktakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
}

#[derive(Debug, PartialEq)]
pub enum InsertStocktakeError {
    DatabaseError(RepositoryError),
    InternalError(String),
    StocktakeAlreadyExists,
    InvalidStore,
}

fn check_stocktake_does_not_exist(
    connection: &StorageConnection,
    id: &str,
) -> Result<bool, RepositoryError> {
    let count = StocktakeRepository::new(connection)
        .count(Some(StocktakeFilter::new().id(EqualFilter::equal_to(id))))?;
    Ok(count == 0)
}

fn validate(
    connection: &StorageConnection,
    store_id: &str,
    stocktake: &InsertStocktakeInput,
) -> Result<(), InsertStocktakeError> {
    if !check_stocktake_does_not_exist(connection, &stocktake.id)? {
        return Err(InsertStocktakeError::StocktakeAlreadyExists);
    }
    if !check_store_exists(connection, store_id)? {
        return Err(InsertStocktakeError::InvalidStore);
    }
    Ok(())
}

fn generate(
    connection: &StorageConnection,
    store_id: &str,
    InsertStocktakeInput {
        id,
        comment,
        description,
        created_datetime,
    }: InsertStocktakeInput,
) -> Result<StocktakeRow, RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;

    Ok(StocktakeRow {
        id,
        store_id: store_id.to_string(),
        stocktake_number,
        comment,
        description,
        status: StocktakeStatus::New,
        created_datetime,
        finalised_datetime: None,
        inventory_adjustment_id: None,
    })
}

pub fn insert_stocktake(
    ctx: &ServiceContext,
    store_id: &str,
    input: InsertStocktakeInput,
) -> Result<Stocktake, InsertStocktakeError> {
    let result = ctx
        .connection
        .transaction_sync(|connection| {
            validate(connection, store_id, &input)?;
            let new_stocktake = generate(connection, store_id, input)?;
            StocktakeRowRepository::new(&connection).upsert_one(&new_stocktake)?;

            let stocktake = get_stocktake(ctx, new_stocktake.id)?;
            stocktake.ok_or(InsertStocktakeError::InternalError(
                "Failed to read the just inserted stocktake!".to_string(),
            ))
        })
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

impl From<RepositoryError> for InsertStocktakeError {
    fn from(error: RepositoryError) -> Self {
        InsertStocktakeError::DatabaseError(error)
    }
}
