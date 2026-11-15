use super::{
    StorageConnection,
    clinician_link_row::clinician_link,
    clinician_row::clinician,
    encounter_row::encounter::{self},
    name_row::name,
    program_row::program,
};

use crate::{
    ClinicianLinkRow, ClinicianRow, DBType, DatetimeFilter, EncounterRow, EncounterStatus,
    EqualFilter, NameRow, Pagination, PatientFilter, PatientRepository, ProgramEnrolmentFilter,
    ProgramEnrolmentRepository, ProgramRow, RepositoryError, Sort, StringFilter,
    db_diesel::program_enrolment_row::program_enrolment,
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_string_filter},
    latest_document,
};

use diesel::{dsl::IntoBoxed, prelude::*};

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
    NameRow,
    Option<(ClinicianLinkRow, ClinicianRow)>,
);

#[derive(Clone)]
pub struct Encounter {
    pub row: EncounterRow,
    pub program_row: ProgramRow,
    pub patient_row: NameRow,
    pub clinician_row: Option<ClinicianRow>,
}

fn to_domain((encounter_row, program_row, name_row, clinician): EncounterJoin) -> Encounter {
    Encounter {
        row: encounter_row,
        program_row,
        patient_row: name_row,
        clinician_row: clinician.map(|(_, clinician_row)| clinician_row),
    }
}

pub type EncounterSort = Sort<EncounterSortField>;

#[diesel::dsl::auto_type]
fn query() -> _ {
    encounter::table
        .inner_join(program::table)
        .inner_join(name::table.on(encounter::patient_id.eq(name::id)))
        .left_join(clinician_link::table.inner_join(clinician::table))
}

type BoxedEncounterQuery = IntoBoxed<'static, query, DBType>;

fn create_filtered_query(
    connection: &StorageConnection,
    filter: Option<EncounterFilter>,
) -> Result<BoxedEncounterQuery, RepositoryError> {
    let mut query = query().into_boxed();

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
            // Read the matching program ids first and filter on that list, rather
            // than nesting the enrolment query as a subquery. With the subquery,
            // Postgres pairs the list's ORDER BY ... LIMIT with a nested-loop plan
            // that re-reads every enrolment of the program for each encounter, and
            // when the filter matches nothing that loop visits every encounter
            // before giving up (#1672).
            let program_ids: Vec<String> =
                ProgramEnrolmentRepository::create_filtered_query(program_enrolment)
                    .select(program_enrolment::program_id)
                    .distinct()
                    .load(connection.lock().connection())?;
            query = query.filter(encounter::program_id.eq_any(program_ids));
        }
    }
    Ok(query)
}

pub struct EncounterRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> EncounterRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        EncounterRepository { connection }
    }

    pub fn count(&self, filter: Option<EncounterFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(self.connection, filter)?;

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
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
        let mut query = create_filtered_query(self.connection, filter)?;

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
            // Stable tiebreaker so paginated results don't shuffle or drop rows
            // when the primary sort column has ties.
            .then_order_by(encounter::id.asc())
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<EncounterJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

#[cfg(test)]
mod test {
    use crate::{
        DocumentRegistryCategory, DocumentRegistryRow, DocumentRegistryRowRepository,
        EncounterFilter, EncounterRepository, ProgramEnrolmentFilter, ProgramEnrolmentRow,
        ProgramEnrolmentRowRepository, StringFilter,
        mock::{
            MockDataInserts, context_program_a, mock_encounter_a,
            mock_form_schema_simplified_enrolment, mock_patient, mock_program_a,
        },
        test_db,
    };

    #[actix_rt::test]
    async fn encounter_program_enrolment_filter() {
        let (_, connection, _, _) = test_db::setup_all(
            "encounter_program_enrolment_filter",
            MockDataInserts::none()
                .units()
                .items()
                .names()
                .stores()
                .name_store_joins()
                .full_master_lists()
                .programs()
                .form_schemas()
                .encounters(),
        )
        .await;

        // program_a's enrolment document type has a named registry entry; the
        // immunisation program's encounter has no enrolment that matches any name.
        DocumentRegistryRowRepository::new(&connection)
            .upsert_one(&DocumentRegistryRow {
                id: "family_planning_enrolment".to_string(),
                category: DocumentRegistryCategory::ProgramEnrolment,
                document_type: "FamilyPlanningEnrolment".to_string(),
                context_id: context_program_a().id,
                name: Some("Family planning".to_string()),
                form_schema_id: Some(mock_form_schema_simplified_enrolment().id),
                config: None,
                plugin_code: None,
                program_key: None,
            })
            .unwrap();
        ProgramEnrolmentRowRepository::new(&connection)
            .upsert_one(&ProgramEnrolmentRow {
                id: "family_planning_enrolment_a".to_string(),
                document_type: "FamilyPlanningEnrolment".to_string(),
                program_id: mock_program_a().id,
                patient_id: mock_patient().id,
                ..Default::default()
            })
            .unwrap();

        let repo = EncounterRepository::new(&connection);
        let by_program_name = |name: &str| {
            EncounterFilter::new().program_enrolment(
                ProgramEnrolmentFilter::new().program_name(StringFilter::like(name)),
            )
        };

        // A name that matches: only program_a's encounter
        let result = repo.query_by_filter(by_program_name("planning")).unwrap();
        assert_eq!(
            result.iter().map(|e| e.row.id.clone()).collect::<Vec<_>>(),
            vec![mock_encounter_a().id]
        );
        assert_eq!(repo.count(Some(by_program_name("planning"))).unwrap(), 1);

        // A name no program has: an empty page and a zero count, promptly
        let result = repo.query_by_filter(by_program_name("bn")).unwrap();
        assert!(result.is_empty());
        assert_eq!(repo.count(Some(by_program_name("bn"))).unwrap(), 0);
    }
}
