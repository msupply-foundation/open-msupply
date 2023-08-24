use async_graphql::*;
use graphql_core::pagination::PaginationInput;
use graphql_types::types::FormSchemaFilterInput;
use insert_form_schema::{insert_form_schema, InsertFormSchemaInput, InsertFormSchemaResponse};
use query::{form_schemas, FormSchemaResponse, FormSchemaSortInput};

mod insert_form_schema;
mod query;

#[derive(Default, Clone)]
pub struct FormSchemaQueries;

#[Object]
impl FormSchemaQueries {
    async fn form_schema(
        &self,
        ctx: &Context<'_>,
        page: Option<PaginationInput>,
        filter: Option<FormSchemaFilterInput>,
        sort: Option<Vec<FormSchemaSortInput>>,
    ) -> Result<FormSchemaResponse> {
        form_schemas(ctx, page, filter, sort)
    }
}

#[derive(Default, Clone)]
pub struct FormSchemaMutations;

#[Object]
impl FormSchemaMutations {
    async fn insert_form_schema(
        &self,
        ctx: &Context<'_>,
        input: InsertFormSchemaInput,
    ) -> Result<InsertFormSchemaResponse> {
        insert_form_schema(ctx, input)
    }
}
