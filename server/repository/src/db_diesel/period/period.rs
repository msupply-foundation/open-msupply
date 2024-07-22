use super::{
    period_row::{period, period::dsl as period_dsl},
    period_schedule_row::{period_schedule, period_schedule::dsl as period_schedule_dsl},
    PeriodScheduleRow,
};
use diesel::{
    dsl::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    repository_error::RepositoryError,
    rnr_form_row::{rnr_form, rnr_form::dsl as rnr_form_dsl},
    DBType, DateFilter, PeriodRow, RnRFormRow, StorageConnection,
};

use crate::{EqualFilter, Sort};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct Period {
    pub period_row: PeriodRow,
    pub period_schedule_row: PeriodScheduleRow,
    pub rnr_form_row: Option<RnRFormRow>,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct PeriodFilter {
    pub id: Option<EqualFilter<String>>,
    pub period_schedule_id: Option<EqualFilter<String>>,
    pub end_date: Option<DateFilter>,
    pub rnr_form_program_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum PeriodSortField {
    Id,
    EndDate,
}

pub type PeriodSort = Sort<PeriodSortField>;

type PeriodJoin = (PeriodRow, PeriodScheduleRow, Option<RnRFormRow>);

pub struct PeriodRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> PeriodRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        PeriodRepository { connection }
    }

    pub fn count(&self, filter: Option<PeriodFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: PeriodFilter) -> Result<Vec<Period>, RepositoryError> {
        self.query(Some(filter), None)
    }

    pub fn query(
        &self,
        filter: Option<PeriodFilter>,
        sort: Option<PeriodSort>,
    ) -> Result<Vec<Period>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                PeriodSortField::Id => {
                    apply_sort_no_case!(query, sort, period_dsl::id)
                }
                PeriodSortField::EndDate => {
                    apply_sort!(query, sort, period_dsl::end_date)
                }
            }
        };

        let result = query.load::<PeriodJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((period_row, period_schedule_row, rnr_form_row): PeriodJoin) -> Period {
    Period {
        period_row,
        period_schedule_row,
        rnr_form_row,
    }
}

type BoxedPeriodQuery = IntoBoxed<
    'static,
    LeftJoin<InnerJoin<period::table, period_schedule::table>, rnr_form::table>,
    DBType,
>;

fn create_filtered_query(filter: Option<PeriodFilter>) -> BoxedPeriodQuery {
    let mut query = period_dsl::period
        .inner_join(period_schedule_dsl::period_schedule)
        .left_join(rnr_form_dsl::rnr_form)
        .into_boxed();

    if let Some(filter) = filter {
        let PeriodFilter {
            id,
            period_schedule_id,
            end_date,
            rnr_form_program_id,
        } = filter;

        apply_equal_filter!(query, id, period_dsl::id);
        apply_equal_filter!(query, period_schedule_id, period_dsl::period_schedule_id);
        apply_date_filter!(query, end_date, period_dsl::end_date);

        apply_equal_filter!(query, rnr_form_program_id, rnr_form_dsl::program_id);
    }

    query
}

impl PeriodFilter {
    pub fn new() -> PeriodFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn period_schedule_id(mut self, filter: EqualFilter<String>) -> Self {
        self.period_schedule_id = Some(filter);
        self
    }

    pub fn end_date(mut self, filter: DateFilter) -> Self {
        self.end_date = Some(filter);
        self
    }

    pub fn rnr_form_program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.rnr_form_program_id = Some(filter);
        self
    }
}
