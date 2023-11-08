use super::{
    document::latest_document::dsl as latest_document_dsl,
    encounter_row::encounter::{self, dsl as encounter_dsl},
    name_row::name::dsl as name_dsl,
    program_enrolment_row::program_enrolment::dsl as program_enrolment_dsl,
    program_row::{program, program::dsl as program_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    latest_document, DBType, DatetimeFilter, EncounterRow, EncounterStatus, EqualFilter,
    Pagination, PatientFilter, PatientRepository, ProgramEnrolmentFilter,
    ProgramEnrolmentRepository, ProgramRow, RepositoryError, Sort, StringFilter,
};

use diesel::{dsl::IntoBoxed, helper_types::InnerJoin, prelude::*};

#[derive(Clone, Default)]
pub struct EncounterFilter {
    pub id: Option<EqualFilter<String>>,
    pub document_type: Option<EqualFilter<String>>,
    pub patient_id: Option<EqualFilter<String>>,
    pub program_context_id: Option<EqualFilter<String>>,
    pub program_id: Option<EqualFilter<String>>,
    pub document_name: Option<EqualFilter<String>>,
    pub created_datetime: Option<DatetimeFilter>,
    pub start_datetime: Option<DatetimeFilter>,
    pub end_datetime: Option<DatetimeFilter>,
    pub status: Option<EqualFilter<EncounterStatus>>,
    pub clinician_id: Option<EqualFilter<String>>,
    /// Filter by encounter data
    pub document_data: Option<StringFilter>,
    pub patient: Option<PatientFilter>,
    pub program_enrolment: Option<ProgramEnrolmentFilter>,
}

impl EncounterFilter {
    pub fn new() -> EncounterFilter {
        Default::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn document_type(mut self, filter: EqualFilter<String>) -> Self {
        self.document_type = Some(filter);
        self
    }

    pub fn context_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_context_id = Some(filter);
        self
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }

    pub fn patient_id(mut self, filter: EqualFilter<String>) -> Self {
        self.patient_id = Some(filter);
        self
    }

    pub fn document_name(mut self, filter: EqualFilter<String>) -> Self {
        self.document_name = Some(filter);
        self
    }

    pub fn created_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.created_datetime = Some(filter);
        self
    }

    pub fn start_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.start_datetime = Some(filter);
        self
    }

    pub fn end_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.end_datetime = Some(filter);
        self
    }

    pub fn status(mut self, filter: EqualFilter<EncounterStatus>) -> Self {
        self.status = Some(filter);
        self
    }

    pub fn clinician_id(mut self, filter: EqualFilter<String>) -> Self {
        self.clinician_id = Some(filter);
        self
    }

    pub fn document_data(mut self, filter: StringFilter) -> Self {
        self.document_data = Some(filter);
        self
    }

    pub fn patient(mut self, filter: PatientFilter) -> Self {
        self.patient = Some(filter);
        self
    }

    pub fn program_enrolment(mut self, filter: ProgramEnrolmentFilter) -> Self {
        self.program_enrolment = Some(filter);
        self
    }
}

pub enum EncounterSortField {
    DocumentType,
    PatientId,
    Context,
    CreatedDatetime,
    StartDatetime,
    EndDatetime,
    Status,
}

pub type Encounter = (EncounterRow, ProgramRow);

pub type EncounterSort = Sort<EncounterSortField>;

type BoxedProgramQuery = IntoBoxed<'static, InnerJoin<encounter::table, program::table>, DBType>;

fn create_filtered_query<'a>(filter: Option<EncounterFilter>) -> BoxedProgramQuery {
    let mut query = encounter_dsl::encounter
        .inner_join(program_dsl::program)
        .into_boxed();

    if let Some(f) = filter {
        let EncounterFilter {
            id,
            document_type,
            patient_id,
            program_context_id,
            program_id,
            document_name: name,
            created_datetime,
            start_datetime,
            end_datetime,
            status,
            clinician_id,
            document_data,
            patient,
            program_enrolment,
        } = f;

        apply_equal_filter!(query, id, encounter_dsl::id);
        apply_equal_filter!(query, document_type, encounter_dsl::document_type);
        apply_equal_filter!(query, patient_id, encounter_dsl::patient_id);
        apply_equal_filter!(query, program_context_id, program_dsl::context_id);
        apply_equal_filter!(query, program_id, encounter_dsl::program_id);
        apply_equal_filter!(query, name, encounter_dsl::document_name);
        apply_date_time_filter!(query, created_datetime, encounter_dsl::created_datetime);
        apply_date_time_filter!(query, start_datetime, encounter_dsl::start_datetime);
        apply_date_time_filter!(query, end_datetime, encounter_dsl::end_datetime);
        apply_equal_filter!(query, status, encounter_dsl::status);
        apply_equal_filter!(query, clinician_id, encounter_dsl::clinician_id);

        if document_data.is_some() {
            let mut sub_query = latest_document_dsl::latest_document
                .select(latest_document_dsl::name)
                .into_boxed();
            apply_string_filter!(sub_query, document_data, latest_document::data);
            query = query.filter(encounter_dsl::document_name.eq_any(sub_query));
        }

        if patient.is_some() {
            let patient_ids =
                PatientRepository::create_filtered_query(patient, None).select(name_dsl::id);
            query = query.filter(encounter_dsl::patient_id.eq_any(patient_ids));
        }

        if program_enrolment.is_some() {
            let program_ids = ProgramEnrolmentRepository::create_filtered_query(program_enrolment)
                .select(program_enrolment_dsl::program_id);
            query = query.filter(encounter_dsl::program_id.eq_any(program_ids));
        }
    }
    query
}

pub struct EncounterRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> EncounterRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        EncounterRepository { connection }
    }

    pub fn count(&self, filter: Option<EncounterFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: EncounterFilter,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                EncounterSortField::DocumentType => {
                    apply_sort!(query, sort, encounter_dsl::document_type)
                }
                EncounterSortField::PatientId => {
                    apply_sort!(query, sort, encounter_dsl::patient_id)
                }
                EncounterSortField::Context => {
                    apply_sort!(query, sort, program_dsl::context_id)
                }
                EncounterSortField::CreatedDatetime => {
                    apply_sort!(query, sort, encounter_dsl::created_datetime)
                }
                EncounterSortField::StartDatetime => {
                    apply_sort!(query, sort, encounter_dsl::start_datetime)
                }
                EncounterSortField::EndDatetime => {
                    apply_sort!(query, sort, encounter_dsl::end_datetime)
                }
                EncounterSortField::Status => apply_sort!(query, sort, encounter_dsl::status),
            }
        } else {
            query = query.order(encounter_dsl::patient_id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<Encounter>(&self.connection.connection)?;

        Ok(result)
    }
}
