use domain::{DatetimeFilter, EqualFilter, Pagination, Sort};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort},
    schema::{
        diesel_schema::stock_take::{self, dsl as stock_take_dsl},
        StockTakeRow, StockTakeStatus,
    },
    DBType, RepositoryError, StorageConnection,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone)]
pub struct StockTakeFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub stock_take_number: Option<EqualFilter<i64>>,
    pub status: Option<EqualFilter<StockTakeStatus>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub finalised_datetime: Option<DatetimeFilter>,
}

impl StockTakeFilter {
    pub fn new() -> StockTakeFilter {
        StockTakeFilter {
            id: None,
            store_id: None,
            stock_take_number: None,
            status: None,
            created_datetime: None,
            finalised_datetime: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn stock_take_number(mut self, filter: EqualFilter<i64>) -> Self {
        self.stock_take_number = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<StockTakeStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }

    pub fn finalised_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.finalised_datetime = Some(filter);
        self
    }
}

pub enum StockTakeSortField {
    Status,
    CreatedDatetime,
    FinalisedDatetime,
}

pub type StockTake = StockTakeRow;

pub type StockTakeSort = Sort<StockTakeSortField>;

type BoxedStockTakeQuery = IntoBoxed<'static, stock_take::table, DBType>;

pub fn create_filtered_query<'a>(filter: Option<StockTakeFilter>) -> BoxedStockTakeQuery {
    let mut query = stock_take_dsl::stock_take.into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, stock_take::id);
        apply_equal_filter!(query, f.store_id, stock_take::store_id);
        apply_equal_filter!(query, f.stock_take_number, stock_take::stock_take_number);

        if let Some(value) = f.status {
            if let Some(eq) = value.equal_to {
                query = query.filter(stock_take::status.eq(eq));
            }
        }
        apply_date_time_filter!(query, f.created_datetime, stock_take::created_datetime);
        apply_date_time_filter!(query, f.finalised_datetime, stock_take::finalised_datetime);
    }
    query
}

pub struct StockTakeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> StockTakeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        StockTakeRepository { connection }
    }

    pub fn count(&self, filter: Option<StockTakeFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: StockTakeFilter,
    ) -> Result<Vec<StockTake>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    /// Gets all invoices
    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<StockTakeFilter>,
        sort: Option<StockTakeSort>,
    ) -> Result<Vec<StockTake>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                StockTakeSortField::Status => apply_sort!(query, sort, stock_take_dsl::status),
                StockTakeSortField::CreatedDatetime => {
                    apply_sort!(query, sort, stock_take_dsl::created_datetime)
                }
                StockTakeSortField::FinalisedDatetime => {
                    apply_sort!(query, sort, stock_take_dsl::finalised_datetime)
                }
            }
        } else {
            query = query.order(stock_take_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<StockTake>(&self.connection.connection)?;

        Ok(result)
    }

    pub fn find_one_by_id(&self, row_id: &str) -> Result<Option<StockTake>, RepositoryError> {
        Ok(stock_take_dsl::stock_take
            .filter(stock_take_dsl::id.eq(row_id))
            .first::<StockTake>(&self.connection.connection)
            .optional()?)
    }
}
