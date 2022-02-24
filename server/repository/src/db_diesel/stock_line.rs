use super::{DBType, StorageConnection};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    repository_error::RepositoryError,
    schema::{
        diesel_schema::{
            location, location::dsl as location_dsl, stock_line, stock_line::dsl as stock_line_dsl,
        },
        LocationRow, StockLineRow,
    },
};
use domain::{DateFilter, EqualFilter, Pagination, Sort};

use diesel::{
    dsl::{IntoBoxed, LeftJoin},
    prelude::*,
};

#[derive(Debug, PartialEq, Clone)]
pub struct StockLine {
    pub stock_line_row: StockLineRow,
    pub location_row: Option<LocationRow>,
}

#[derive(Debug)]
pub struct StockLineFilter {
    pub id: Option<EqualFilter<String>>,
    pub item_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
    pub expiry_date: Option<DateFilter>,
    pub store_id: Option<EqualFilter<String>>,
}

pub type StockLineSort = Sort<()>;

type StockLineJoin = (StockLineRow, Option<LocationRow>);
pub struct StockLineRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockLineRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockLineRepository { connection }
    }

    pub fn count(&self, filter: Option<StockLineFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockLineFilter,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockLineFilter>,
        _: Option<StockLineSort>,
    ) -> Result<Vec<StockLine>, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockLineJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedStockLineQuery = IntoBoxed<'static, LeftJoin<stock_line::table, location::table>, DBType>;

fn create_filtered_query(filter: Option<StockLineFilter>) -> BoxedStockLineQuery {
    let mut query = stock_line_dsl::stock_line
        .left_join(location_dsl::location)
        .into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, stock_line_dsl::id);
        apply_equal_filter!(query, f.item_id, stock_line_dsl::item_id);
        apply_equal_filter!(query, f.location_id, stock_line_dsl::location_id);
        apply_date_time_filter!(query, f.expiry_date, stock_line_dsl::expiry_date);
        apply_equal_filter!(query, f.store_id, stock_line_dsl::store_id);
    }

    query
}

pub fn to_domain((stock_line_row, location_row): StockLineJoin) -> StockLine {
    StockLine {
        stock_line_row,
        location_row,
    }
}

impl StockLineFilter {
    pub fn new() -> StockLineFilter {
        StockLineFilter {
            id: None,
            item_id: None,
            location_id: None,
            expiry_date: None,
            store_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn item_id(mut self, filter: EqualFilter<String>) -> Self {
        self.item_id = Some(filter);
        self
    }

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }

    pub fn expiry_date(mut self, filter: DateFilter) -> Self {
        self.expiry_date = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}

impl StockLine {
    pub fn location_name(&self) -> Option<&str> {
        self.location_row
            .as_ref()
            .map(|location_row| location_row.name.as_str())
    }
}
