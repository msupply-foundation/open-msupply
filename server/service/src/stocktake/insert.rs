use chrono::NaiveDateTime;
use repository::EqualFilter;
use repository::{
    schema::{NumberRowType, StocktakeRow},
    RepositoryError, Stocktake, StocktakeFilter, StocktakeRepository, StocktakeRowRepository,
    StorageConnection,
};
use util::{inline_init, Defaults};

use crate::{number::next_number, service_provider::ServiceContext, validate::check_store_exists};

use super::query::get_stocktake;

pub struct InsertStocktakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub created_datetime: NaiveDateTime,
    pub is_locked: Option<bool>,
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
        is_locked,
    }: InsertStocktakeInput,
) -> Result<StocktakeRow, RepositoryError> {
    let stocktake_number = next_number(connection, &NumberRowType::Stocktake, store_id)?;

    Ok(inline_init(|r: &mut StocktakeRow| {
        r.id = id;
        r.stocktake_number = stocktake_number;
        r.comment = comment;
        r.description = description;
        r.created_datetime = created_datetime;
        r.store_id = store_id.to_string();
        r.is_locked = is_locked.unwrap_or(false);
    }))
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

impl Default for InsertStocktakeInput {
    fn default() -> Self {
        Self {
            created_datetime: Defaults::naive_date_time(),
            id: Default::default(),
            comment: Default::default(),
            description: Default::default(),
            is_locked: Default::default(),
        }
    }
}

#[cfg(test)]
mod test {
    use chrono::Utc;
    use repository::{
        mock::{mock_stocktake_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
    };
    use util::inline_init;

    use crate::{
        service_provider::ServiceProvider,
        stocktake::insert::{InsertStocktakeError, InsertStocktakeInput},
    };

    #[actix_rt::test]
    async fn insert_stocktake() {
        let (_, _, connection_manager, _) =
            setup_all("insert_stocktake", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();
        let service = service_provider.stocktake_service;

        // error: stocktake already exists
        let store_a = mock_store_a();
        let existing_stocktake = mock_stocktake_a();
        let error = service
            .insert_stocktake(
                &context,
                &store_a.id,
                inline_init(|i: &mut InsertStocktakeInput| {
                    i.id = existing_stocktake.id;
                    i.created_datetime = Utc::now().naive_utc();
                }),
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::StocktakeAlreadyExists);

        // error: store does not exist
        let error = service
            .insert_stocktake(
                &context,
                "invalid",
                InsertStocktakeInput {
                    id: "new_stocktake".to_string(),
                    comment: None,
                    description: None,
                    created_datetime: Utc::now().naive_utc(),
                    is_locked: None,
                },
            )
            .unwrap_err();
        assert_eq!(error, InsertStocktakeError::InvalidStore);

        // success
        let store_a = mock_store_a();
        service
            .insert_stocktake(
                &context,
                &store_a.id,
                inline_init(|i: &mut InsertStocktakeInput| {
                    i.id = "new_stocktake".to_string();
                    i.created_datetime = Utc::now().naive_utc();
                }),
            )
            .unwrap();
    }
}
