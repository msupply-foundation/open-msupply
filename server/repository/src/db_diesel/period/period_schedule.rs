use super::{
    period_schedule_row::{period_schedule, period_schedule::dsl as period_schedule_dsl},
    PeriodScheduleRow,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    DBType, StorageConnection,
};

use crate::{EqualFilter, Sort};

pub type PeriodSchedule = PeriodScheduleRow;

#[derive(Clone, PartialEq, Debug, Default)]
pub struct PeriodScheduleFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum PeriodScheduleSortField {
    Id,
    Name,
}

pub type PeriodScheduleSort = Sort<PeriodScheduleSortField>;

pub struct PeriodScheduleRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> PeriodScheduleRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        PeriodScheduleRepository { connection }
    }

    pub fn count(&self, filter: Option<PeriodScheduleFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: PeriodScheduleFilter,
    ) -> Result<Vec<PeriodSchedule>, RepositoryError> {
        self.query(Some(filter), None)
    }

    pub fn query(
        &self,
        filter: Option<PeriodScheduleFilter>,
        sort: Option<PeriodScheduleSort>,
    ) -> Result<Vec<PeriodSchedule>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                PeriodScheduleSortField::Id => {
                    apply_sort_no_case!(query, sort, period_schedule_dsl::id)
                }
                PeriodScheduleSortField::Name => {
                    apply_sort_no_case!(query, sort, period_schedule_dsl::name)
                }
            }
        };

        let result = query.load::<PeriodScheduleRow>(&mut self.connection.connection)?;

        Ok(result)
    }
}

type BoxedPeriodScheduleQuery = period_schedule::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<PeriodScheduleFilter>) -> BoxedPeriodScheduleQuery {
    let mut query = period_schedule::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, period_schedule_dsl::id);
        apply_equal_filter!(query, filter.name, period_schedule_dsl::name);
    }

    query
}

impl PeriodScheduleFilter {
    pub fn new() -> PeriodScheduleFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: EqualFilter<String>) -> Self {
        self.name = Some(filter);
        self
    }
}
