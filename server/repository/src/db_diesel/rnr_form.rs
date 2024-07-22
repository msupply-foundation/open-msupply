use super::{
    name_link_row::{name_link, name_link::dsl as name_link_dsl},
    name_row::{name, name::dsl as name_dsl},
    period_row::{period, period::dsl as period_dsl},
    program_row::{program, program::dsl as program_dsl},
    rnr_form_row::rnr_form::dsl as rnr_form_dsl,
    store_row::{store, store::dsl as store_dsl},
    DBType, NameRow, RepositoryError, RnRFormRow, RnRFormStatus, StorageConnection, StoreRow,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    rnr_form_row::rnr_form,
    DatetimeFilter, EqualFilter, NameLinkRow, Pagination, PeriodRow, ProgramRow, Sort,
};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};
use util::inline_init;

#[derive(PartialEq, Debug, Clone, Default)]
pub struct RnRForm {
    pub rnr_form_row: RnRFormRow,
    pub name_row: NameRow,
    pub store_row: StoreRow,
    pub period_row: PeriodRow,
    pub program_row: ProgramRow,
}
#[derive(Clone, Default)]
pub struct RnRFormFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
}

pub enum RnRFormSortField {
    Program,
    Period,
    Status,
    CreatedDatetime,
    SupplierName,
}

pub type RnRFormSort = Sort<RnRFormSortField>;

pub struct RnRFormRepository<'a> {
    connection: &'a StorageConnection,
}

type RnRFormJoin = (
    RnRFormRow,
    (NameLinkRow, NameRow),
    StoreRow,
    PeriodRow,
    ProgramRow,
);

impl<'a> RnRFormRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        RnRFormRepository { connection }
    }

    pub fn count(&self, filter: Option<RnRFormFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(&self, filter: RnRFormFilter) -> Result<Vec<RnRForm>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query_one(&self, filter: RnRFormFilter) -> Result<Option<RnRForm>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<RnRFormFilter>,
        sort: Option<RnRFormSort>,
    ) -> Result<Vec<RnRForm>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                RnRFormSortField::Period => {
                    apply_sort!(query, sort, period_dsl::end_date);
                }
                RnRFormSortField::Status => {
                    apply_sort!(query, sort, rnr_form_dsl::status);
                }
                RnRFormSortField::CreatedDatetime => {
                    apply_sort!(query, sort, rnr_form_dsl::created_datetime);
                }
                RnRFormSortField::SupplierName => {
                    apply_sort_no_case!(query, sort, name_dsl::name_);
                }
                RnRFormSortField::Program => {
                    apply_sort_no_case!(query, sort, program_dsl::name);
                }
            }
        } else {
            query = query.order(rnr_form_dsl::created_datetime.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<RnRFormJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain(
    (rnr_form_row, (_, name_row), store_row, period_row, program_row): RnRFormJoin,
) -> RnRForm {
    RnRForm {
        rnr_form_row,
        name_row,
        store_row,
        period_row,
        program_row,
    }
}

type BoxedRnRFormQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<
            InnerJoin<
                InnerJoin<rnr_form::table, InnerJoin<name_link::table, name::table>>,
                store::table,
            >,
            period::table,
        >,
        program::table,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<RnRFormFilter>) -> BoxedRnRFormQuery {
    let mut query = rnr_form_dsl::rnr_form
        .inner_join(name_link_dsl::name_link.inner_join(name_dsl::name))
        .inner_join(store_dsl::store)
        .inner_join(period_dsl::period)
        .inner_join(program_dsl::program)
        .into_boxed();

    if let Some(f) = filter {
        let RnRFormFilter {
            id,
            created_datetime,
            store_id,
        } = f;

        apply_equal_filter!(query, id, rnr_form_dsl::id);
        apply_equal_filter!(query, store_id, rnr_form_dsl::store_id);

        apply_date_time_filter!(query, created_datetime, rnr_form_dsl::created_datetime);
    }
    query
}

impl RnRFormStatus {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }

    pub fn equal_any(value: Vec<Self>) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_any = Some(value))
    }
}

impl RnRFormFilter {
    pub fn new() -> RnRFormFilter {
        RnRFormFilter::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }
}

impl RnRForm {
    pub fn other_party_name(&self) -> &str {
        &self.name_row.name
    }
    pub fn other_party_id(&self) -> &str {
        &self.name_row.id
    }
}
