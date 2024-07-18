use async_graphql::*;
use chrono::DateTime;
use chrono::Utc;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::contact_trace::ContactTraceFilterInput;
use graphql_types::types::contact_trace::ContactTraceResponse;
use graphql_types::types::contact_trace::ContactTraceSortInput;
use graphql_types::types::document::DocumentNode;
use graphql_types::types::encounter::EncounterFilterInput;
use graphql_types::types::encounter::EncounterSortInput;
use graphql_types::types::patient::PatientFilterInput;
use graphql_types::types::patient::PatientNode;
use graphql_types::types::program_enrolment::ProgramEnrolmentFilterInput;
use graphql_types::types::program_enrolment::ProgramEnrolmentResponse;
use graphql_types::types::program_enrolment::ProgramEnrolmentSortInput;
use graphql_types::types::program_enrolment::ProgramEventFilterInput;
use graphql_types::types::program_event::ProgramEventResponse;
use graphql_types::types::program_event::ProgramEventSortInput;
use mutations::allocate_number::allocate_program_number;
use mutations::allocate_number::AllocateProgramNumberInput;
use mutations::allocate_number::AllocateProgramNumberResponse;
use mutations::contact_trace::insert::insert_contact_trace;
use mutations::contact_trace::insert::InsertContactTraceInput;
use mutations::contact_trace::insert::InsertContactTraceResponse;
use mutations::contact_trace::update::update_contact_trace;
use mutations::contact_trace::update::UpdateContactTraceInput;
use mutations::contact_trace::update::UpdateContactTraceResponse;
use mutations::encounter::insert::insert_encounter;
use mutations::encounter::insert::InsertEncounterInput;
use mutations::encounter::insert::InsertEncounterResponse;
use mutations::encounter::update::update_encounter;
use mutations::encounter::update::UpdateEncounterInput;
use mutations::encounter::update::UpdateEncounterResponse;
use mutations::immunisation::delete::delete_immunisation_program;
use mutations::immunisation::delete::DeleteImmunisationProgramResponse;
use mutations::immunisation::insert::insert_immunisation_program;
use mutations::immunisation::insert::InsertImmunisationProgramInput;
use mutations::immunisation::insert::InsertImmunisationProgramResponse;
use mutations::immunisation::update::update_immunisation_program;
use mutations::immunisation::update::UpdateImmunisationProgramInput;
use mutations::immunisation::update::UpdateImmunisationProgramResponse;
use mutations::insert_document_registry::*;
use mutations::patient::insert::insert_patient;
use mutations::patient::insert::InsertPatientInput;
use mutations::patient::insert::InsertPatientResponse;
use mutations::patient::update::update_patient;
use mutations::patient::update::UpdatePatientInput;
use mutations::patient::update::UpdatePatientResponse;
use mutations::program_enrolment::insert::insert_program_enrolment;
use mutations::program_enrolment::insert::InsertProgramEnrolmentInput;
use mutations::program_enrolment::insert::InsertProgramEnrolmentResponse;
use mutations::program_enrolment::update::update_program_enrolment;
use mutations::program_enrolment::update::UpdateProgramEnrolmentInput;
use mutations::program_enrolment::update::UpdateProgramEnrolmentResponse;
use mutations::program_patient::insert::*;
use mutations::program_patient::update::update_program_patient;
use mutations::program_patient::update::UpdateProgramPatientInput;
use mutations::program_patient::update::UpdateProgramPatientResponse;
use queries::contact_trace::contact_traces;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::programs::patient::patient_search_central;
use types::program::ProgramFilterInput;
use types::program::ProgramSortInput;
use types::program::ProgramsResponse;
use types::r_and_r_form::PeriodSchedulesResponse;
use types::r_and_r_form::{RnRFormFilterInput, RnRFormSortInput, RnRFormsResponse};

mod mutations;

mod queries;
pub mod types;
use self::queries::*;

#[derive(Default, Clone)]
pub struct ProgramsQueries;

#[Object]
impl ProgramsQueries {
    pub async fn documents(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Store id")] store_id: String,
        page: Option<PaginationInput>,
        #[graphql(desc = "The document filter")] filter: Option<DocumentFilterInput>,
        sort: Option<DocumentSortInput>,
    ) -> Result<DocumentResponse> {
        documents(ctx, store_id, page, filter, sort)
    }

    pub async fn document(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Store id")] store_id: String,
        #[graphql(desc = "The document name")] name: String,
    ) -> Result<Option<DocumentNode>> {
        document(ctx, store_id, name)
    }

    pub async fn document_history(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Store id")] store_id: String,
        #[graphql(desc = "The document name")] name: String,
    ) -> Result<DocumentHistoryResponse> {
        document_history(ctx, store_id, name)
    }

    pub async fn document_registries(
        &self,
        ctx: &Context<'_>,
        filter: Option<DocumentRegistryFilterInput>,
        sort: Option<Vec<DocumentRegistrySortInput>>,
        store_id: String,
    ) -> Result<DocumentRegistryResponse> {
        document_registries(ctx, filter, sort, store_id)
    }

    pub async fn patients(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<PatientFilterInput>,
        sort: Option<Vec<PatientSortInput>>,
    ) -> Result<PatientResponse> {
        patients(ctx, store_id, page, filter, sort)
    }
    pub async fn patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        patient_id: String,
    ) -> Result<Option<PatientNode>> {
        patient(ctx, store_id, patient_id)
    }
    pub async fn patient_search(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: PatientSearchInput,
    ) -> Result<PatientSearchResponse> {
        patient_search(ctx, store_id, input)
    }

    pub async fn central_patient_search(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: CentralPatientSearchInput,
    ) -> Result<CentralPatientSearchResponse> {
        // Note, we can't move the ctx to another async method because then it would need to be
        // Sync. For this reason split the method as done below.
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::QueryPatient,
                store_id: Some(store_id.clone()),
            },
        )?;

        let service_provider = ctx.service_provider();
        let context = service_provider.basic_context()?;

        let sync_settings = service_provider.settings.sync_settings(&context)?.ok_or(
            StandardGraphqlError::InternalError("Missing sync settings".to_string()).extend(),
        )?;

        let result = patient_search_central(&sync_settings, input.to_domain()).await;
        map_central_patient_search_result(result)
    }

    pub async fn program_enrolments(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        sort: Option<ProgramEnrolmentSortInput>,
        filter: Option<ProgramEnrolmentFilterInput>,
    ) -> Result<ProgramEnrolmentResponse> {
        program_enrolments(ctx, store_id, sort, filter)
    }

    /// Returns active program events at a given date time.
    /// This can also be achieved by using the program_events endpoint with the filter:
    /// `active_start_datetime <= at && active_end_datetime + 1 >= at`
    pub async fn active_program_events(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        at: Option<DateTime<Utc>>,
        page: Option<PaginationInput>,
        sort: Option<ProgramEventSortInput>,
        filter: Option<ProgramEventFilterInput>,
    ) -> Result<ProgramEventResponse> {
        active_program_events(ctx, store_id, at, page, sort, filter)
    }

    pub async fn program_events(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        sort: Option<ProgramEventSortInput>,
        filter: Option<ProgramEventFilterInput>,
    ) -> Result<ProgramEventResponse> {
        program_events(ctx, store_id, page, sort, filter)
    }

    pub async fn encounters(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<EncounterFilterInput>,
        sort: Option<EncounterSortInput>,
    ) -> Result<EncounterResponse> {
        encounters(ctx, store_id, page, filter, sort)
    }

    pub async fn encounter_fields(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: EncounterFieldsInput,
        page: Option<PaginationInput>,
        filter: Option<EncounterFilterInput>,
        sort: Option<EncounterSortInput>,
    ) -> Result<EncounterFieldsResponse> {
        encounter_fields(ctx, store_id, input, page, filter, sort)
    }

    pub async fn contact_traces(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<ContactTraceFilterInput>,
        sort: Option<ContactTraceSortInput>,
    ) -> Result<ContactTraceResponse> {
        contact_traces(ctx, store_id, page, filter, sort)
    }

    pub async fn programs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<ProgramFilterInput>,
        sort: Option<ProgramSortInput>,
    ) -> Result<ProgramsResponse> {
        programs(ctx, store_id, page, filter, sort)
    }

    pub async fn r_and_r_forms(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        page: Option<PaginationInput>,
        filter: Option<RnRFormFilterInput>,
        sort: Option<RnRFormSortInput>,
    ) -> Result<RnRFormsResponse> {
        r_and_r_forms(ctx, store_id, page, filter, sort)
    }

    pub async fn schedules_with_periods_by_program(
        &self,
        ctx: &Context<'_>,
        program_id: String,
    ) -> Result<PeriodSchedulesResponse> {
        get_schedules_with_periods_by_program(ctx, program_id)
    }
}

#[derive(Default, Clone)]
pub struct ProgramsMutations;

#[Object]
impl ProgramsMutations {
    async fn insert_document_registry(
        &self,
        ctx: &Context<'_>,
        input: InsertDocumentRegistryInput,
    ) -> Result<InsertDocumentResponse> {
        insert_document_registry(ctx, input)
    }

    /// Inserts a new patient (without document data)
    pub async fn insert_patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertPatientInput,
    ) -> Result<InsertPatientResponse> {
        insert_patient(ctx, store_id, input)
    }

    /// Updates a new patient (without document data)
    pub async fn update_patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdatePatientInput,
    ) -> Result<UpdatePatientResponse> {
        update_patient(ctx, store_id, input)
    }

    /// Inserts a new program patient, i.e. a patient that can contain additional information stored
    /// in a document.
    pub async fn insert_program_patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertProgramPatientInput,
    ) -> Result<InsertProgramPatientResponse> {
        insert_program_patient(ctx, store_id, input)
    }

    /// Updates a new program patient, i.e. a patient the can contain additional information stored
    /// in a document.
    pub async fn update_program_patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateProgramPatientInput,
    ) -> Result<UpdateProgramPatientResponse> {
        update_program_patient(ctx, store_id, input)
    }

    /// Links a patient to a store and thus effectively to a site
    pub async fn link_patient_to_store(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        name_id: String,
    ) -> Result<LinkPatientToStoreResponse> {
        link_patient_to_store(ctx, &store_id, &name_id).await
    }

    /// Enrols a patient into a program by adding a program document to the patient's documents.
    /// Every patient can only have one program document of each program type.
    pub async fn insert_program_enrolment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertProgramEnrolmentInput,
    ) -> Result<InsertProgramEnrolmentResponse> {
        insert_program_enrolment(ctx, store_id, input)
    }

    /// Updates an existing program document belonging to a patient.
    pub async fn update_program_enrolment(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateProgramEnrolmentInput,
    ) -> Result<UpdateProgramEnrolmentResponse> {
        update_program_enrolment(ctx, store_id, input)
    }

    pub async fn insert_encounter(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertEncounterInput,
    ) -> Result<InsertEncounterResponse> {
        insert_encounter(ctx, store_id, input)
    }

    pub async fn update_encounter(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateEncounterInput,
    ) -> Result<UpdateEncounterResponse> {
        update_encounter(ctx, store_id, input)
    }

    pub async fn allocate_program_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: AllocateProgramNumberInput,
    ) -> Result<AllocateProgramNumberResponse> {
        allocate_program_number(ctx, store_id, input)
    }

    pub async fn insert_contact_trace(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertContactTraceInput,
    ) -> Result<InsertContactTraceResponse> {
        insert_contact_trace(ctx, store_id, input)
    }

    pub async fn update_contact_trace(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateContactTraceInput,
    ) -> Result<UpdateContactTraceResponse> {
        update_contact_trace(ctx, store_id, input)
    }
}

#[derive(Default, Clone)]
pub struct CentralProgramsMutations;

#[Object]
impl CentralProgramsMutations {
    pub async fn insert_immunisation_program(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertImmunisationProgramInput,
    ) -> Result<InsertImmunisationProgramResponse> {
        insert_immunisation_program(ctx, store_id, input)
    }

    pub async fn update_immunisation_program(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateImmunisationProgramInput,
    ) -> Result<UpdateImmunisationProgramResponse> {
        update_immunisation_program(ctx, store_id, input)
    }

    async fn delete_immunisation_program(
        &self,
        ctx: &Context<'_>,
        immunisation_program_id: String,
    ) -> Result<DeleteImmunisationProgramResponse> {
        delete_immunisation_program(ctx, &immunisation_program_id)
    }
}
