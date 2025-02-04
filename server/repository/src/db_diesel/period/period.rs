use super::{period_row::period, period_schedule_row::period_schedule, PeriodScheduleRow};
use diesel::{
    dsl::{And, Eq, InnerJoin, IntoBoxed, LeftJoin, On},
    prelude::*,
};

use crate::{
    diesel_macros::{apply_date_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    repository_error::RepositoryError,
    rnr_form_row::rnr_form,
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

    pub fn count(
        &self,
        store_id: String,
        filter: Option<PeriodFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(store_id, None, filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        store_id: String,
        // Passed into R&R
        program_id: Option<String>,
        filter: PeriodFilter,
    ) -> Result<Vec<Period>, RepositoryError> {
        self.query(store_id, program_id, Some(filter), None)
    }

    pub fn query(
        &self,
        store_id: String,
        program_id: Option<String>,
        filter: Option<PeriodFilter>,
        sort: Option<PeriodSort>,
    ) -> Result<Vec<Period>, RepositoryError> {
        let mut query = create_filtered_query(store_id, program_id, filter);
        if let Some(sort) = sort {
            match sort.key {
                PeriodSortField::Id => {
                    apply_sort_no_case!(query, sort, period::id)
                }
                PeriodSortField::EndDate => {
                    apply_sort!(query, sort, period::end_date)
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

// rnr_form::period_id.eq(period::id)
type PeriodIdEqualToId = Eq<rnr_form::period_id, period::id>;
// rnr_form::store_id.eq(store_id)
type StoreIdEqualToStr = Eq<rnr_form::store_id, String>;
// rnr_form::program_id.eq(program_id)
type ProgramIdEqualToStr = Eq<rnr_form::program_id, String>;

type OnRnrFormToPeriodJoin =
    On<rnr_form::table, And<And<PeriodIdEqualToId, StoreIdEqualToStr>, ProgramIdEqualToStr>>;

type BoxedPeriodQuery = IntoBoxed<
    'static,
    LeftJoin<InnerJoin<period::table, period_schedule::table>, OnRnrFormToPeriodJoin>,
    DBType,
>;

fn create_filtered_query(
    store_id: String,
    program_id: Option<String>,
    filter: Option<PeriodFilter>,
) -> BoxedPeriodQuery {
    let mut query = period::table
        .inner_join(period_schedule::table)
        .left_join(
            rnr_form::table.on(rnr_form::period_id
                .eq(period::id)
                .and(rnr_form::store_id.eq(store_id))
                .and(rnr_form::program_id.eq(program_id.unwrap_or_default()))),
        )
        .into_boxed();

    if let Some(filter) = filter {
        let PeriodFilter {
            id,
            period_schedule_id,
            end_date,
            rnr_form_program_id,
        } = filter;

        apply_equal_filter!(query, id, period::id);
        apply_equal_filter!(query, period_schedule_id, period::period_schedule_id);
        apply_date_filter!(query, end_date, period::end_date);

        apply_equal_filter!(query, rnr_form_program_id, rnr_form::program_id);
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

    pub fn rnr_form_program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.rnr_form_program_id = Some(filter);
        self
    }

    pub fn end_date(mut self, filter: DateFilter) -> Self {
        self.end_date = Some(filter);
        self
    }
}
