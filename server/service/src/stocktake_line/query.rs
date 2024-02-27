use repository::{EqualFilter, PaginationOption};
use repository::{
    RepositoryError, StocktakeLine, StocktakeLineFilter, StocktakeLineRepository,
    StocktakeLineSort, StocktakeRepository,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

#[derive(Debug, PartialEq)]
pub enum GetStocktakeLinesError {
    DatabaseError(RepositoryError),
    /// Stocktake doesn't belong to the specified store
    InvalidStore,
    InvalidStocktake,
    ListError(ListError),
}

pub fn get_stocktake_lines(
    ctx: &ServiceContext,
    store_id: &str,
    stocktake_id: &str,
    pagination: Option<PaginationOption>,
    filter: Option<StocktakeLineFilter>,
    sort: Option<StocktakeLineSort>,
) -> Result<ListResult<StocktakeLine>, GetStocktakeLinesError> {
    let stocktake = match StocktakeRepository::new(&ctx.connection).find_one_by_id(stocktake_id)? {
        Some(stocktake) => stocktake,
        None => return Err(GetStocktakeLinesError::InvalidStocktake),
    };
    if stocktake.store_id != store_id {
        return Err(GetStocktakeLinesError::InvalidStore);
    }
    let filter = filter
        .unwrap_or(StocktakeLineFilter::new())
        .stocktake_id(EqualFilter::equal_to(stocktake_id));
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)
        .map_err(|err| GetStocktakeLinesError::ListError(err))?;
    let repository = StocktakeLineRepository::new(&ctx.connection);

    Ok(ListResult {
        rows: repository.query(
            pagination,
            Some(filter.clone()),
            sort,
            Some(store_id.to_string()),
        )?,
        count: i64_to_u32(repository.count(Some(filter), Some(store_id.to_string()))?),
    })
}

pub fn get_stocktake_line(
    ctx: &ServiceContext,
    id: String,
    store_id: &str,
) -> Result<Option<StocktakeLine>, RepositoryError> {
    let repository = StocktakeLineRepository::new(&ctx.connection);
    Ok(repository
        .query_by_filter(
            StocktakeLineFilter::new().id(EqualFilter::equal_to(&id)),
            Some(store_id.to_string()),
        )?
        .pop())
}

impl From<RepositoryError> for GetStocktakeLinesError {
    fn from(error: RepositoryError) -> Self {
        GetStocktakeLinesError::DatabaseError(error)
    }
}

#[cfg(test)]
mod stocktake_line_test {
    use repository::{
        mock::{mock_stocktake_a, mock_store_a, MockDataInserts},
        test_db::setup_all,
    };

    use crate::{service_provider::ServiceProvider, stocktake_line::query::GetStocktakeLinesError};

    #[actix_rt::test]
    async fn query_stocktake_line() {
        let (_, _, connection_manager, _) =
            setup_all("query_stocktake_line", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "app_data");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.stocktake_line_service;

        // error: InvalidStore,
        let error = service
            .get_stocktake_lines(
                &context,
                "invalid store",
                &mock_stocktake_a().id,
                None,
                None,
                None,
            )
            .unwrap_err();
        assert_eq!(error, GetStocktakeLinesError::InvalidStore);

        // error: InvalidStocktake,
        let error = service
            .get_stocktake_lines(&context, &mock_store_a().id, "invalid", None, None, None)
            .unwrap_err();
        assert_eq!(error, GetStocktakeLinesError::InvalidStocktake);

        // success
        let result = service
            .get_stocktake_lines(
                &context,
                &mock_store_a().id,
                &mock_stocktake_a().id,
                None,
                None,
                None,
            )
            .unwrap();
        assert!(result.count > 0);
    }
}
