use super::{
    clinician_link_row::clinician_link,
    clinician_row::clinician,
    encounter_row::encounter::{self},
    name_link_row::name_link,
    name_row::name,
    program_row::program,
    StorageConnection,
};

use crate::{
    db_diesel::program_enrolment_row::program_enrolment,
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    latest_document, ClinicianLinkRow, ClinicianRow, DBType, DatetimeFilter, EncounterRow,
    EncounterStatus, EqualFilter, NameLinkRow, NameRow, Pagination, PatientFilter,
    PatientRepository, ProgramEnrolmentFilter, ProgramEnrolmentRepository, ProgramRow,
    RepositoryError, Sort, StringFilter,
};

use diesel::{
    dsl::IntoBoxed,
    helper_types::{InnerJoin, LeftJoin},
    prelude::*,
};

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

type EncounterJoin = (
    EncounterRow,
    ProgramRow,
    (NameLinkRow, NameRow),
    Option<(ClinicianLinkRow, ClinicianRow)>,
);

#[derive(Clone)]
pub struct Encounter {
    pub row: EncounterRow,
    pub program_row: ProgramRow,
    pub patient_row: NameRow,
    pub clinician_row: Option<ClinicianRow>,
}

fn to_domain((encounter_row, program_row, (_, name_row), clinician): EncounterJoin) -> Encounter {
    Encounter {
        row: encounter_row,
        program_row,
        patient_row: name_row,
        clinician_row: clinician.map(|(_, clinician_row)| clinician_row),
    }
}

pub type EncounterSort = Sort<EncounterSortField>;

type BoxedEncounterQuery = IntoBoxed<
    'static,
    LeftJoin<
        InnerJoin<
            InnerJoin<encounter::table, program::table>,
            InnerJoin<name_link::table, name::table>,
        >,
        InnerJoin<clinician_link::table, clinician::table>,
    >,
    DBType,
>;

fn create_filtered_query(filter: Option<EncounterFilter>) -> BoxedEncounterQuery {
    let mut query = encounter::table
        .inner_join(program::table)
        .inner_join(name_link::table.inner_join(name::table))
        .left_join(clinician_link::table.inner_join(clinician::table))
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

        apply_equal_filter!(query, id, encounter::id);
        apply_equal_filter!(query, document_type, encounter::document_type);
        apply_equal_filter!(query, patient_id, name::id);
        apply_equal_filter!(query, program_context_id, program::context_id);
        apply_equal_filter!(query, program_id, encounter::program_id);
        apply_equal_filter!(query, name, encounter::document_name);
        apply_date_time_filter!(query, created_datetime, encounter::created_datetime);
        apply_date_time_filter!(query, start_datetime, encounter::start_datetime);
        apply_date_time_filter!(query, end_datetime, encounter::end_datetime);
        apply_equal_filter!(query, status, encounter::status);
        apply_equal_filter!(query, clinician_id, clinician::id);

        if document_data.is_some() {
            let mut sub_query = latest_document::table
                .select(latest_document::name)
                .into_boxed();
            apply_string_filter!(sub_query, document_data, latest_document::data);
            query = query.filter(encounter::document_name.eq_any(sub_query));
        }

        if patient.is_some() {
            let patient_ids =
                PatientRepository::create_filtered_query(patient, None).select(name::id);
            query = query.filter(name::id.eq_any(patient_ids));
        }

        if program_enrolment.is_some() {
            let program_ids = ProgramEnrolmentRepository::create_filtered_query(program_enrolment)
                .select(program_enrolment::program_id);
            query = query.filter(encounter::program_id.eq_any(program_ids));
        }
    }
    query
}

pub struct EncounterRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> EncounterRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        EncounterRepository { connection }
    }

    pub fn count(&mut self, filter: Option<EncounterFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_by_filter(
        &mut self,
        filter: EncounterFilter,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &mut self,
        pagination: Pagination,
        filter: Option<EncounterFilter>,
        sort: Option<EncounterSort>,
    ) -> Result<Vec<Encounter>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                EncounterSortField::DocumentType => {
                    apply_sort!(query, sort, encounter::document_type)
                }
                EncounterSortField::PatientId => {
                    apply_sort!(query, sort, name::id)
                }
                EncounterSortField::Context => {
                    apply_sort!(query, sort, program::context_id)
                }
                EncounterSortField::CreatedDatetime => {
                    apply_sort!(query, sort, encounter::created_datetime)
                }
                EncounterSortField::StartDatetime => {
                    apply_sort!(query, sort, encounter::start_datetime)
                }
                EncounterSortField::EndDatetime => {
                    apply_sort!(query, sort, encounter::end_datetime)
                }
                EncounterSortField::Status => apply_sort!(query, sort, encounter::status),
            }
        } else {
            query = query.order(name::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<EncounterJoin>(&mut self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}
