use crate::{EqualFilter, Pagination, Sort};
use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::{
    diesel_macros::apply_equal_filter,
    location_row::{location, location::dsl as location_dsl},
    stock_line_row::{stock_line, stock_line::dsl as stock_line_dsl},
    stocktake_line_row::stocktake_line::{self, dsl as stocktake_line_dsl},
    DBType, LocationRow, RepositoryError, StockLineRow, StocktakeLineRow, StorageConnection,
};

#[derive(Clone)]
pub struct StocktakeLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub stocktake_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
}

impl StocktakeLineFilter {
    pub fn new() -> StocktakeLineFilter {
        StocktakeLineFilter {
            id: None,
            stocktake_id: None,
            location_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn stocktake_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stocktake_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }
}

pub type StocktakeLineSort = Sort<()>;

type StocktakeLineJoin = (StocktakeLineRow, Option<StockLineRow>, Option<LocationRow>);

#[derive(Debug, Clone, PartialEq, Default)]
pub struct StocktakeLine {
    pub line: StocktakeLineRow,
    pub stock_line: Option<StockLineRow>,
    pub location: Option<LocationRow>,
}

pub struct StocktakeLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StocktakeLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StocktakeLineRepository { connection }
    }

    pub fn count(&self, filter: Option<StocktakeLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: StocktakeLineFilter,
    ) -> Result<Vec<StocktakeLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StocktakeLineFilter>,
        _: Option<StocktakeLineSort>,
    ) -> Result<Vec<StocktakeLine>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StocktakeLineJoin>(&self.connection.connection)?;

        Ok(result
            .into_iter()
            .map(|(line, stock_line, location)| StocktakeLine {
                line,
                stock_line,
                location,
            })
            .collect())
    }
}

type BoxedStocktakeLineQuery = IntoBoxed<
    'static,
    LeftJoin<LeftJoin<stocktake_line::table, stock_line::table>, location::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<StocktakeLineFilter>) -> BoxedStocktakeLineQuery {
    let mut query = stocktake_line_dsl::stocktake_line
        .left_join(stock_line_dsl::stock_line)
        .left_join(location_dsl::location)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, stocktake_line_dsl::id);
        apply_equal_filter!(query, f.stocktake_id, stocktake_line_dsl::stocktake_id);
        apply_equal_filter!(query, f.location_id, stocktake_line_dsl::location_id);
    }

    query
}
