use async_graphql::*;
use chrono::DateTime;
use chrono::Utc;
use graphql_core::pagination::PaginationInput;
use graphql_core::standard_graphql_error::validate_auth;
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::document::DocumentNode;
use graphql_types::types::encounter::EncounterFilterInput;
use graphql_types::types::encounter::EncounterSortInput;
use graphql_types::types::patient::PatientNode;
use graphql_types::types::program_enrolment::ProgramEnrolmentFilterInput;
use graphql_types::types::program_enrolment::ProgramEnrolmentSortInput;
use graphql_types::types::program_enrolment::ProgramEventFilterInput;
use graphql_types::types::program_event::ProgramEventSortInput;
use mutations::allocate_number::allocate_program_number;
use mutations::allocate_number::AllocateProgramNumberInput;
use mutations::allocate_number::AllocateProgramNumberResponse;
use mutations::delete_document::delete_document;
use mutations::delete_document::DeleteDocumentInput;
use mutations::delete_document::DeleteDocumentResponse;
use mutations::encounter::insert::insert_encounter;
use mutations::encounter::insert::InsertEncounterInput;
use mutations::encounter::insert::InsertEncounterResponse;
use mutations::encounter::update::update_encounter;
use mutations::encounter::update::UpdateEncounterInput;
use mutations::encounter::update::UpdateEncounterResponse;
use mutations::insert_document_registry::*;
use mutations::patient::insert::*;
use mutations::patient::update::update_patient;
use mutations::patient::update::UpdatePatientInput;
use mutations::patient::update::UpdatePatientResponse;
use mutations::program_enrolment::insert::insert_program_enrolment;
use mutations::program_enrolment::insert::InsertProgramEnrolmentInput;
use mutations::program_enrolment::insert::InsertProgramEnrolmentResponse;
use mutations::program_enrolment::update::update_program_enrolment;
use mutations::program_enrolment::update::UpdateProgramEnrolmentInput;
use mutations::program_enrolment::update::UpdateProgramEnrolmentResponse;
use mutations::undelete_document::undelete_document;
use mutations::undelete_document::UndeleteDocumentInput;
use mutations::undelete_document::UndeleteDocumentResponse;
use mutations::update_document::*;
use service::auth::Resource;
use service::auth::ResourceAccessRequest;
use service::programs::patient::patient_search_central;

mod mutations;

mod queries;
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
}

#[derive(Default, Clone)]
pub struct ProgramsMutations;

#[Object]
impl ProgramsMutations {
    async fn update_document(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateDocumentInput,
    ) -> Result<UpdateDocumentResponse> {
        update_document(ctx, store_id, input)
    }

    async fn delete_document(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: DeleteDocumentInput,
    ) -> Result<DeleteDocumentResponse> {
        delete_document(ctx, store_id, input)
    }

    async fn undelete_document(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UndeleteDocumentInput,
    ) -> Result<UndeleteDocumentResponse> {
        undelete_document(ctx, store_id, input)
    }

    async fn insert_document_registry(
        &self,
        ctx: &Context<'_>,
        input: InsertDocumentRegistryInput,
    ) -> Result<InsertDocumentResponse> {
        insert_document_registry(ctx, input)
    }

    pub async fn insert_patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertPatientInput,
    ) -> Result<InsertPatientResponse> {
        insert_patient(ctx, store_id, input)
    }

    pub async fn update_patient(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdatePatientInput,
    ) -> Result<UpdatePatientResponse> {
        update_patient(ctx, store_id, input)
    }

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
}
