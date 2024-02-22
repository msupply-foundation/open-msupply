use super::{
    contact_trace_row::{
        contact_trace_name_link_view, contact_trace_name_link_view::dsl as contact_trace_dsl,
    },
    document::{document, document::dsl as document_dsl},
    program_row::{program, program::dsl as program_dsl},
    StorageConnection,
};

use crate::{
    contact_trace_row::ContactTraceRow,
    diesel_macros::{
        apply_date_filter, apply_date_time_filter, apply_equal_filter, apply_sort,
        apply_sort_no_case, apply_string_filter,
    },
    DBType, DateFilter, DatetimeFilter, DocumentRow, EqualFilter, Gender, Pagination, ProgramRow,
    RepositoryError, Sort, StringFilter,
};

use diesel::{dsl::IntoBoxed, helper_types::InnerJoin, prelude::*};

#[derive(Clone, Default)]
pub struct ContactTraceFilter {
    pub id: Option<EqualFilter<String>>,
    pub program_id: Option<EqualFilter<String>>,
    pub r#type: Option<StringFilter>,
    pub document_name: Option<StringFilter>,
    pub program_context_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub patient_id: Option<EqualFilter<String>>,
    pub contact_patient_id: Option<EqualFilter<String>>,
    pub contact_trace_id: Option<StringFilter>,
    pub first_name: Option<StringFilter>,
    pub last_name: Option<StringFilter>,
    pub gender: Option<EqualFilter<Gender>>,
    pub date_of_birth: Option<DateFilter>,
}

pub enum ContactTraceSortField {
    Datetime,
    PatientId,
    ProgramId,
    ContactTraceId,
    FirstName,
    LastName,
    Gender,
    DateOfBirth,
}

pub type ContactTraceJoin = (ContactTraceRow, DocumentRow, ProgramRow);

pub struct ContactTrace {
    pub contact_trace: ContactTraceRow,
    pub document: DocumentRow,
    pub program: ProgramRow,
}

pub type ContactTraceSort = Sort<ContactTraceSortField>;

type BoxedProgramQuery = IntoBoxed<
    'static,
    InnerJoin<InnerJoin<contact_trace_name_link_view::table, document::table>, program::table>,
    DBType,
>;

fn create_filtered_query<'a>(filter: Option<ContactTraceFilter>) -> BoxedProgramQuery {
    let mut query = contact_trace_dsl::contact_trace_name_link_view
        .inner_join(document_dsl::document)
        .inner_join(program_dsl::program)
        .into_boxed();

    if let Some(f) = filter {
        let ContactTraceFilter {
            id,
            program_id,
            r#type,
            document_name,
            program_context_id,
            datetime,
            patient_id,
            contact_patient_id,
            contact_trace_id,
            first_name,
            last_name,
            gender,
            date_of_birth,
        } = f;

        apply_equal_filter!(query, id, contact_trace_dsl::id);
        apply_date_time_filter!(query, datetime, contact_trace_dsl::datetime);
        apply_equal_filter!(query, patient_id, contact_trace_dsl::patient_id);
        apply_equal_filter!(
            query,
            contact_patient_id,
            contact_trace_dsl::contact_patient_id
        );
        apply_equal_filter!(query, program_context_id, program_dsl::context_id);
        apply_equal_filter!(query, program_id, contact_trace_dsl::program_id);
        apply_string_filter!(query, r#type, document_dsl::type_);
        apply_string_filter!(query, document_name, document_dsl::name);
        apply_string_filter!(query, contact_trace_id, contact_trace_dsl::contact_trace_id);
        apply_string_filter!(query, first_name, contact_trace_dsl::first_name);
        apply_string_filter!(query, last_name, contact_trace_dsl::last_name);
        apply_equal_filter!(query, gender, contact_trace_dsl::gender);
        apply_date_filter!(query, date_of_birth, contact_trace_dsl::date_of_birth);
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
                ContactTraceSortField::ContactTraceId => {
                    apply_sort!(query, sort, contact_trace_dsl::contact_trace_id)
                }
                ContactTraceSortField::FirstName => {
                    apply_sort!(query, sort, contact_trace_dsl::first_name)
                }
                ContactTraceSortField::LastName => {
                    apply_sort!(query, sort, contact_trace_dsl::last_name)
                }
                ContactTraceSortField::Gender => {
                    apply_sort_no_case!(query, sort, contact_trace_dsl::gender)
                }
                ContactTraceSortField::DateOfBirth => {
                    apply_sort_no_case!(query, sort, contact_trace_dsl::date_of_birth)
                }
            }
        } else {
            query = query.order(contact_trace_dsl::patient_id.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        //println!(
        //    "{}",
        //    diesel::debug_query::<DBType, _>(&final_query).to_string()
        //);
        let result = final_query
            .load::<ContactTraceJoin>(&self.connection.connection)?
            .into_iter()
            .map(|row| ContactTrace {
                contact_trace: row.0,
                document: row.1,
                program: row.2,
            })
            .collect();

        Ok(result)
    }
}
