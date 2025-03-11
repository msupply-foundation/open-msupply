use super::{
    name_link_row::name_link, name_row::name, program_enrolment_row::program_enrolment,
    program_row::program, StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    DBType, DatetimeFilter, EqualFilter, NameLinkRow, NameRow, Pagination, ProgramEnrolmentRow,
    ProgramRow, RepositoryError, Sort, StringFilter,
};

use diesel::{dsl::IntoBoxed, helper_types::InnerJoin, prelude::*};

#[derive(Clone, Default)]
pub struct ProgramEnrolmentFilter {
    pub id: Option<EqualFilter<String>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub program_id: Option<EqualFilter<String>>,
    pub enrolment_datetime: Option<DatetimeFilter>,
    pub program_enrolment_id: Option<StringFilter>,
    pub status: Option<StringFilter>,
    pub document_type: Option<EqualFilter<String>>,
    pub document_name: Option<EqualFilter<String>>,
    pub program_context_id: Option<EqualFilter<String>>,
    pub program_name: Option<StringFilter>,
    pub is_immunisation_program: Option<bool>,
}

impl ProgramEnrolmentFilter {
    pub fn new() -> ProgramEnrolmentFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }

    pub fn context_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_context_id = Some(filter);
        self
    }

    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }

    pub fn enrolment_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.enrolment_datetime = Some(filter);
        self
    }

    pub fn program_enrolment_id(mut self, filter: StringFilter) -> Self {
        self.program_enrolment_id = Some(filter);
        self
    }

    pub fn status(mut self, filter: StringFilter) -> Self {
        self.status = Some(filter);
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

    pub fn program_name(mut self, filter: StringFilter) -> Self {
        self.program_name = Some(filter);
        self
    }

    pub fn is_immunisation_program(mut self, filter: bool) -> Self {
        self.is_immunisation_program = Some(filter);
        self
    }
}

pub enum ProgramEnrolmentSortField {
    Type,
    PatientId,
    EnrolmentDatetime,
    ProgramEnrolmentId,
    Status,
}

type ProgramEnrolmentJoin = (ProgramEnrolmentRow, ProgramRow, (NameLinkRow, NameRow));

#[derive(Clone, Debug)]
pub struct ProgramEnrolment {
    pub row: ProgramEnrolmentRow,
    pub program_row: ProgramRow,
    pub patient_row: NameRow,
}

pub type ProgramEnrolmentSort = Sort<ProgramEnrolmentSortField>;

type BoxedProgramEnrolmentQuery = IntoBoxed<
    'static,
    InnerJoin<
        InnerJoin<program_enrolment::table, program::table>,
        InnerJoin<name_link::table, name::table>,
    >,
    DBType,
>;

pub struct ProgramEnrolmentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEnrolmentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEnrolmentRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramEnrolmentFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ProgramEnrolmentFilter,
    ) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ProgramEnrolmentFilter>,
        sort: Option<ProgramEnrolmentSort>,
    ) -> Result<Vec<ProgramEnrolment>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramEnrolmentSortField::PatientId => {
                    apply_sort!(query, sort, name::id)
                }
                ProgramEnrolmentSortField::Type => {
                    apply_sort!(query, sort, program_enrolment::document_type)
                }
                ProgramEnrolmentSortField::EnrolmentDatetime => {
                    apply_sort!(query, sort, program_enrolment::enrolment_datetime)
                }
                ProgramEnrolmentSortField::ProgramEnrolmentId => {
                    apply_sort!(query, sort, program_enrolment::program_enrolment_id)
                }
                ProgramEnrolmentSortField::Status => {
                    apply_sort!(query, sort, program_enrolment::status)
                }
            }
        } else {
            query = query.order(program_enrolment::document_type.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ProgramEnrolmentJoin>(self.connection.lock().connection())?;
        let result = result
            .into_iter()
            .map(|(row, program_row, (_, patient_row))| ProgramEnrolment {
                row,
                program_row,
                patient_row,
            })
            .collect();

        Ok(result)
    }

    pub fn create_filtered_query(
        filter: Option<ProgramEnrolmentFilter>,
    ) -> BoxedProgramEnrolmentQuery {
        let mut query = program_enrolment::table
            .inner_join(program::table)
            .inner_join(name_link::table.inner_join(name::table))
            .into_boxed();

        if let Some(ProgramEnrolmentFilter {
            id,
            patient_id,
            program_id,
            enrolment_datetime,
            program_enrolment_id,
            status,
            document_type,
            document_name,
            program_context_id: context,
            program_name,
            is_immunisation_program,
        }) = filter
        {
            apply_equal_filter!(query, id, program_enrolment::id);
            apply_equal_filter!(query, patient_id, name::id);
            apply_equal_filter!(query, program_id, program_enrolment::program_id);
            apply_equal_filter!(query, context, program::context_id);
            apply_date_time_filter!(
                query,
                enrolment_datetime,
                program_enrolment::enrolment_datetime
            );
            apply_string_filter!(
                query,
                program_enrolment_id,
                program_enrolment::program_enrolment_id
            );
            apply_string_filter!(query, status, program_enrolment::status);
            apply_equal_filter!(query, document_type, program_enrolment::document_type);
            apply_equal_filter!(query, document_name, program_enrolment::document_name);
            apply_string_filter!(query, program_name, program::name);

            if let Some(is_immunisation_program) = is_immunisation_program {
                query = query.filter(program::is_immunisation.eq(is_immunisation_program))
            }
        }
        query
    }

    pub fn find_one_by_program_id_and_patient(
        &self,
        program_id: &str,
        patient_id: &str,
    ) -> Result<Option<ProgramEnrolment>, RepositoryError> {
        Ok(self
            .query_by_filter(
                ProgramEnrolmentFilter::new()
                    .program_id(EqualFilter::equal_to(program_id))
                    .patient_id(EqualFilter::equal_to(patient_id)),
            )?
            .pop())
    }
}
