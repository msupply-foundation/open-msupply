use super::{
    contact_trace_row::{contact_trace, contact_trace::dsl as contact_trace_dsl},
    program_row::{program, program::dsl as program_dsl},
    StorageConnection,
};

use crate::{
    contact_trace_row::{ContactTraceRow, ContactTraceStatus},
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    DBType, DatetimeFilter, EqualFilter, Pagination, ProgramRow, RepositoryError, Sort,
    StringFilter,
};

use diesel::{dsl::IntoBoxed, helper_types::InnerJoin, prelude::*};

#[derive(Clone, Default)]
pub struct ContactTraceFilter {
    pub id: Option<EqualFilter<String>>,
    pub program_id: Option<EqualFilter<String>>,
    pub program_context_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub root_patient_id: Option<EqualFilter<String>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub status: Option<EqualFilter<ContactTraceStatus>>,
    pub contact_trace_id: Option<StringFilter>,
    pub first_name: Option<StringFilter>,
    pub last_name: Option<StringFilter>,
}

pub enum ContactTraceSortField {
    Datetime,
    PatientId,
    ProgramId,
    Status,
    ContactTraceId,
    FirstName,
    LastName,
}

pub type ContactTrace = (ContactTraceRow, ProgramRow);

pub type ContactTraceSort = Sort<ContactTraceSortField>;

type BoxedProgramQuery =
    IntoBoxed<'static, InnerJoin<contact_trace::table, program::table>, DBType>;

fn create_filtered_query<'a>(filter: Option<ContactTraceFilter>) -> BoxedProgramQuery {
    let mut query = contact_trace_dsl::contact_trace
        .inner_join(program_dsl::program)
        .into_boxed();

    if let Some(f) = filter {
        let ContactTraceFilter {
            id,
            program_id,
            program_context_id,
            datetime,
            root_patient_id,
            patient_id,
            status,
            contact_trace_id,
            first_name,
            last_name,
        } = f;

        apply_equal_filter!(query, id, contact_trace_dsl::id);
        apply_date_time_filter!(query, datetime, contact_trace_dsl::datetime);
        apply_equal_filter!(query, root_patient_id, contact_trace_dsl::root_patient_id);
        apply_equal_filter!(query, patient_id, contact_trace_dsl::patient_id);
        apply_equal_filter!(query, program_context_id, program_dsl::context_id);
        apply_equal_filter!(query, program_id, contact_trace_dsl::program_id);
        apply_equal_filter!(query, status, contact_trace_dsl::status);
        apply_string_filter!(query, contact_trace_id, contact_trace_dsl::contact_trace_id);
        apply_string_filter!(query, first_name, contact_trace_dsl::first_name);
        apply_string_filter!(query, last_name, contact_trace_dsl::last_name);
    }
    query
}

pub struct ContactTraceRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ContactTraceRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ContactTraceRepository { connection }
    }

    pub fn count(&self, filter: Option<ContactTraceFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: ContactTraceFilter,
    ) -> Result<Vec<ContactTrace>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ContactTraceFilter>,
        sort: Option<ContactTraceSort>,
    ) -> Result<Vec<ContactTrace>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ContactTraceSortField::Datetime => {
                    apply_sort!(query, sort, contact_trace_dsl::datetime)
                }
                ContactTraceSortField::ProgramId => {
                    apply_sort!(query, sort, contact_trace_dsl::program_id)
                }
                ContactTraceSortField::PatientId => {
                    apply_sort!(query, sort, contact_trace_dsl::patient_id)
                }
                ContactTraceSortField::Status => {
                    apply_sort!(query, sort, contact_trace_dsl::status)
                }
                ContactTraceSortField::ContactTraceId => {
                    apply_sort!(query, sort, contact_trace_dsl::contact_trace_id)
                }
                ContactTraceSortField::FirstName => {
                    apply_sort!(query, sort, contact_trace_dsl::first_name)
                }
                ContactTraceSortField::LastName => {
                    apply_sort!(query, sort, contact_trace_dsl::last_name)
                }
            }
        } else {
            query = query.order(contact_trace_dsl::patient_id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ContactTrace>(&self.connection.connection)?;

        Ok(result)
    }
}
