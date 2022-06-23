use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use mutations::insert_document_registry::*;
use mutations::insert_form_schema::*;
use mutations::patient::insert::*;
use mutations::patient::update::update_patient;
use mutations::patient::update::UpdatePatientInput;
use mutations::patient::update::UpdatePatientResponse;
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

    pub async fn document_registry(&self, ctx: &Context<'_>) -> Result<DocumentRegistryResponse> {
        document_registry(ctx)
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
}
