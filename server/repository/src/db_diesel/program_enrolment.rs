use super::{
    program_enrolment_row::program_enrolment::{self, dsl as program_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort},
    DBType, DatetimeFilter, EqualFilter, Pagination, ProgramEnrolmentRow, RepositoryError, Sort,
};

use diesel::{dsl::IntoBoxed, prelude::*};

#[derive(Clone)]
pub struct ProgramEnrolmentFilter {
    pub r#type: Option<EqualFilter<String>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub enrolment_datetime: Option<DatetimeFilter>,
    pub program_patient_id: Option<EqualFilter<String>>,
}

impl ProgramEnrolmentFilter {
    pub fn new() -> ProgramEnrolmentFilter {
        ProgramEnrolmentFilter {
            patient_id: None,
            r#type: None,
            enrolment_datetime: None,
            program_patient_id: None,
        }
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
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

    pub fn program_patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_patient_id = Some(filter);
        self
    }
}

pub enum ProgramEnrolmentSortField {
    Type,
    PatientId,
    EnrolmentDatetime,
    ProgramPatientId,
}

pub type ProgramEnrolment = ProgramEnrolmentRow;

pub type ProgramEnrolmentSort = Sort<ProgramEnrolmentSortField>;

type BoxedProgramEnrolmentQuery = IntoBoxed<'static, program_enrolment::table, DBType>;

fn create_filtered_query<'a>(filter: Option<ProgramEnrolmentFilter>) -> BoxedProgramEnrolmentQuery {
    let mut query = program_dsl::program_enrolment.into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.patient_id, program_dsl::patient_id);
        apply_equal_filter!(query, f.r#type, program_dsl::type_);
        apply_date_time_filter!(query, f.enrolment_datetime, program_dsl::enrolment_datetime);
        apply_equal_filter!(query, f.program_patient_id, program_dsl::program_patient_id);
    }
    query
}

pub struct ProgramEnrolmentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ProgramEnrolmentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramEnrolmentRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramEnrolmentFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
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
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramEnrolmentSortField::PatientId => {
                    apply_sort!(query, sort, program_dsl::patient_id)
                }
                ProgramEnrolmentSortField::Type => {
                    apply_sort!(query, sort, program_dsl::type_)
                }
                ProgramEnrolmentSortField::EnrolmentDatetime => {
                    apply_sort!(query, sort, program_dsl::enrolment_datetime)
                }
                ProgramEnrolmentSortField::ProgramPatientId => {
                    apply_sort!(query, sort, program_dsl::program_patient_id)
                }
            }
        } else {
            query = query.order(program_dsl::type_.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ProgramEnrolment>(&self.connection.connection)?;

        Ok(result)
    }

    pub fn find_one_by_type_and_patient(
        &self,
        r#type: &str,
        patient_id: &str,
    ) -> Result<Option<ProgramEnrolment>, RepositoryError> {
        Ok(program_dsl::program_enrolment
            .filter(program_dsl::type_.eq(r#type))
            .filter(program_dsl::patient_id.eq(patient_id))
            .first(&self.connection.connection)
            .optional()?)
    }
}
