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
    pub active_start_datetime: Option<DatetimeFilter>,
    pub active_end_datetime: Option<DatetimeFilter>,
    pub patient_id: Option<EqualFilter<String>>,
    pub document_type: Option<EqualFilter<String>>,
    pub document_name: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
}

impl ProgramEventFilter {
    pub fn new() -> Self {
        ProgramEventFilter {
            datetime: None,
            active_start_datetime: None,
            active_end_datetime: None,
            patient_id: None,
            document_type: None,
            document_name: None,
            r#type: None,
        }
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn active_start_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.active_start_datetime = Some(filter);
        self
    }

    pub fn active_end_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.active_end_datetime = Some(filter);
        self
    }

    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }

    pub fn document_type(mut self, filter: EqualFilter<String>) -> Self {
        self.document_type = Some(filter);
        self
    }

    pub fn document_name(mut self, filter: EqualFilter<String>) -> Self {
        self.document_name = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }
}

pub enum ProgramEventSortField {
    Datetime,
    ActiveStartDatetime,
    ActiveEndDatetime,
    Patient,
    DocumentType,
    DocumentName,
    Type,
    Name,
}

pub type ProgramEventSort = Sort<ProgramEventSortField>;

type BoxedProgramEventQuery = IntoBoxed<'static, program_event::table, DBType>;

macro_rules! apply_filters {
    ($query:ident, $filter:expr ) => {{
        if let Some(f) = $filter {
            apply_date_time_filter!($query, f.datetime, program_event_dsl::datetime);
            apply_date_time_filter!(
                $query,
                f.active_start_datetime,
                program_event_dsl::active_start_datetime
            );
            apply_date_time_filter!(
                $query,
                f.active_end_datetime,
                program_event_dsl::active_end_datetime
            );
            apply_equal_filter!($query, f.patient_id, program_event_dsl::patient_id);
            apply_equal_filter!($query, f.document_type, program_event_dsl::document_type);
            apply_equal_filter!($query, f.document_name, program_event_dsl::document_name);
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
                ProgramEventSortField::ActiveStartDatetime => {
                    apply_sort!(query, sort, program_event_dsl::active_start_datetime)
                }
                ProgramEventSortField::ActiveEndDatetime => {
                    apply_sort!(query, sort, program_event_dsl::active_end_datetime)
                }
                ProgramEventSortField::Patient => {
                    apply_sort!(query, sort, program_event_dsl::patient_id)
                }
                ProgramEventSortField::DocumentType => {
                    apply_sort!(query, sort, program_event_dsl::document_type)
                }
                ProgramEventSortField::DocumentName => {
                    apply_sort!(query, sort, program_event_dsl::document_name)
                }
                ProgramEventSortField::Type => apply_sort!(query, sort, program_event_dsl::type_),
                ProgramEventSortField::Name => {
                    apply_sort!(query, sort, program_event_dsl::name)
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
