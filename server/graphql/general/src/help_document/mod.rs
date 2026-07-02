use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::{HelpDocumentFilterInput, HelpDocumentsResponse};

mod mutations;
mod query;
use self::mutations::*;
use self::query::*;

#[derive(Default, Clone)]
pub struct HelpDocumentQueries;

#[Object]
impl HelpDocumentQueries {
    pub async fn help_documents(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        filter: Option<HelpDocumentFilterInput>,
    ) -> Result<HelpDocumentsResponse> {
        get_help_documents(ctx, page, filter).await
    }
}

#[derive(Default, Clone)]
pub struct HelpDocumentMutations;

#[Object]
impl HelpDocumentMutations {
    async fn insert_help_document(
        &self,
        ctx: &Context<'_>,
        input: InsertHelpDocumentInput,
    ) -> Result<InsertHelpDocumentResponse> {
        insert_help_document(ctx, input)
    }

    async fn delete_help_document(
        &self,
        ctx: &Context<'_>,
        input: DeleteHelpDocumentInput,
    ) -> Result<DeleteHelpDocumentResponse> {
        delete_help_document(ctx, input)
    }
}
