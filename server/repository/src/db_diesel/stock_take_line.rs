use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};
use domain::{EqualFilter, Pagination, Sort};

use crate::{
    diesel_macros::apply_equal_filter,
    schema::{
        diesel_schema::{
            location::{self, dsl as location_dsl},
            stock_line::{self, dsl as stock_line_dsl},
            stock_take_line::{self, dsl as stock_take_line_dsl},
        },
        LocationRow, StockLineRow, StockTakeLineRow,
    },
    DBType, RepositoryError, StorageConnection,
};

#[derive(Clone)]
pub struct StockTakeLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub stock_take_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
}

impl StockTakeLineFilter {
    pub fn new() -> StockTakeLineFilter {
        StockTakeLineFilter {
            id: None,
            stock_take_id: None,
            location_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn stock_take_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_take_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }
}

pub type StockTakeLineSort = Sort<()>;

type StockTakeLineJoin = (StockTakeLineRow, Option<StockLineRow>, Option<LocationRow>);

#[derive(Debug, PartialEq)]
pub struct StockTakeLine {
    pub line: StockTakeLineRow,
    pub stock_line: Option<StockLineRow>,
    pub location: Option<LocationRow>,
}

pub struct StockTakeLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockTakeLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockTakeLineRepository { connection }
    }

    pub fn count(&self, filter: Option<StockTakeLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockTakeLineFilter,
    ) -> Result<Vec<StockTakeLine>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockTakeLineFilter>,
        _: Option<StockTakeLineSort>,
    ) -> Result<Vec<StockTakeLine>, RepositoryError> {
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockTakeLineJoin>(&self.connection.connection)?;

        Ok(result
            .into_iter()
            .map(|(line, stock_line, location)| StockTakeLine {
                line,
                stock_line,
                location,
            })
            .collect())
    }
}

type BoxedStockTakeLineQuery = IntoBoxed<
    'static,
    LeftJoin<LeftJoin<stock_take_line::table, stock_line::table>, location::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<StockTakeLineFilter>) -> BoxedStockTakeLineQuery {
    let mut query = stock_take_line_dsl::stock_take_line
        .left_join(stock_line_dsl::stock_line)
        .left_join(location_dsl::location)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, stock_take_line_dsl::id);
        apply_equal_filter!(query, f.stock_take_id, stock_take_line_dsl::stock_take_id);
        apply_equal_filter!(query, f.location_id, stock_take_line_dsl::location_id);
    }

    query
}
