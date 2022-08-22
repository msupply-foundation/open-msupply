use super::{
    program_event_row::program_event::{self, dsl as program_event_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort},
    DBType, DatetimeFilter, EqualFilter, Pagination, ProgramEventRow, RepositoryError, Sort,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone)]
pub struct ProgramEventFilter {
    pub datetime: Option<DatetimeFilter>,
    pub name_id: Option<EqualFilter<String>>,
    pub context: Option<EqualFilter<String>>,
    pub group: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
}

impl ProgramEventFilter {
    pub fn new() -> Self {
        ProgramEventFilter {
            datetime: None,
            name_id: None,
            context: None,
            group: None,
            r#type: None,
        }
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.name_id = Some(filter);
        self
    }

    pub fn context(mut self, filter: EqualFilter<String>) -> Self {
        self.context = Some(filter);
        self
    }

    pub fn group(mut self, filter: EqualFilter<String>) -> Self {
        self.group = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }
}

pub enum ProgramEventSortField {
    Datetime,
    Context,
    Group,
    Type,
}

pub type ProgramEventSort = Sort<ProgramEventSortField>;

type BoxedProgramEventQuery = IntoBoxed<'static, program_event::table, DBType>;

macro_rules! apply_filters {
    ($query:ident, $filter:expr ) => {{
        if let Some(f) = $filter {
            apply_date_time_filter!($query, f.datetime, program_event_dsl::datetime);
            apply_equal_filter!($query, f.name_id, program_event_dsl::name_id);
            apply_equal_filter!($query, f.context, program_event_dsl::context);
            apply_equal_filter!($query, f.group, program_event_dsl::group);
            apply_equal_filter!($query, f.r#type, program_event_dsl::type_);
        }
        $query
    }};
}

fn create_filtered_query<'a>(filter: Option<ProgramEventFilter>) -> BoxedProgramEventQuery {
    let mut query = program_event_dsl::program_event.into_boxed();
    apply_filters!(query, filter)
}

pub struct ProgramEventRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEventRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEventRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramEventFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: ProgramEventFilter,
    ) -> Result<Vec<ProgramEventRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ProgramEventFilter>,
        sort: Option<ProgramEventSort>,
    ) -> Result<Vec<ProgramEventRow>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramEventSortField::Datetime => {
                    apply_sort!(query, sort, program_event_dsl::datetime)
                }
                ProgramEventSortField::Context => {
                    apply_sort!(query, sort, program_event_dsl::context)
                }
                ProgramEventSortField::Group => {
                    apply_sort!(query, sort, program_event_dsl::group)
                }
                ProgramEventSortField::Type => {
                    apply_sort!(query, sort, program_event_dsl::type_)
                }
            }
        } else {
            query = query.order(program_event_dsl::datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ProgramEventRow>(&self.connection.connection)?;

        Ok(result)
    }

    pub fn delete(&self, filter: ProgramEventFilter) -> Result<(), RepositoryError> {
        let mut query = diesel::delete(program_event_dsl::program_event).into_boxed();
        query = apply_filters!(query, Some(filter));
        query.execute(&self.connection.connection)?;
        Ok(())
    }
}
