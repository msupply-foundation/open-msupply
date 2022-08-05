use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use mutations::allocate_number::allocate_number;
use mutations::allocate_number::AllocateNumberInput;
use mutations::allocate_number::AllocateNumberResponse;
use mutations::encounter::insert::insert_encounter;
use mutations::encounter::insert::InsertEncounterInput;
use mutations::encounter::insert::InsertEncounterResponse;
use mutations::encounter::update::update_encounter;
use mutations::encounter::update::UpdateEncounterInput;
use mutations::encounter::update::UpdateEncounterResponse;
use mutations::insert_document_registry::*;
use mutations::insert_form_schema::*;
use mutations::patient::insert::*;
use mutations::patient::update::update_patient;
use mutations::patient::update::UpdatePatientInput;
use mutations::patient::update::UpdatePatientResponse;
use mutations::program::insert::insert_program;
use mutations::program::insert::InsertProgramInput;
use mutations::program::insert::InsertProgramResponse;
use mutations::program::update::update_program;
use mutations::program::update::UpdateProgramInput;
use mutations::program::update::UpdateProgramResponse;
use mutations::update_document::*;
use types::document::DocumentNode;
use types::json_schema::FormSchemaNode;

mod mutations;

mod queries;
use self::queries::*;

mod types;

#[derive(Default, Clone)]
pub struct DocumentQueries;

#[Object]
impl DocumentQueries {
    pub async fn documents(
        &self,
        ctx: &Context<'_>,
        #[graphql(desc = "Store id")] store_id: String,
        #[graphql(desc = "The document filter")] filter: Option<DocumentFilterInput>,
    ) -> Result<DocumentResponse> {
        documents(ctx, store_id, filter)
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
    ) -> Result<DocumentRegistryResponse> {
        document_registries(ctx, filter, sort)
    }

    pub async fn form_schema(
        &self,
        ctx: &Context<'_>,
        id: String,
    ) -> Result<Option<FormSchemaNode>> {
        form_schema(ctx, id)
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

    pub async fn programs(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        sort: Option<ProgramSortInput>,
        filter: Option<ProgramFilterInput>,
    ) -> Result<ProgramResponse> {
        programs(ctx, store_id, sort, filter)
    }

    pub async fn encounters(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        filter: Option<EncounterFilterInput>,
    ) -> Result<EncounterResponse> {
        encounters(ctx, store_id, filter)
    }
}

#[derive(Default, Clone)]
pub struct DocumentMutations;

#[Object]
impl DocumentMutations {
    async fn update_document(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateDocumentInput,
    ) -> Result<UpdateDocumentResponse> {
        update_document(ctx, &store_id, input)
    }

    async fn insert_document_registry(
        &self,
        ctx: &Context<'_>,
        input: InsertDocumentRegistryInput,
    ) -> Result<InsertDocumentResponse> {
        insert_document_registry(ctx, input)
    }

    async fn insert_form_schema(
        &self,
        ctx: &Context<'_>,

        input: InsertFormSchemaInput,
    ) -> Result<InsertFormSchemaResponse> {
        insert_form_schema(ctx, input)
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

    /// Enrols a patient into a program by adding a program document to the patient's documents.
    /// Every patient can only have one program document of each program type.
    pub async fn insert_program(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertProgramInput,
    ) -> Result<InsertProgramResponse> {
        insert_program(ctx, store_id, input)
    }

    /// Updates an existing program document belonging to a patient.
    pub async fn update_program(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateProgramInput,
    ) -> Result<UpdateProgramResponse> {
        update_program(ctx, store_id, input)
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

    pub async fn allocate_number(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: AllocateNumberInput,
    ) -> Result<AllocateNumberResponse> {
        allocate_number(ctx, store_id, input)
    }
}
