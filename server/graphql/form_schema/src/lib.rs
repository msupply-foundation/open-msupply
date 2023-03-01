use async_graphql::*;
use graphql_types::types::{FormSchemaFilterInput, FormSchemaNode};
use insert_form_schema::{insert_form_schema, InsertFormSchemaInput, InsertFormSchemaResponse};
use query_form_schema::form_schema;

mod insert_form_schema;
mod query_form_schema;

#[derive(Default, Clone)]
pub struct FormSchemaQueries;

#[Object]
impl FormSchemaQueries {
    async fn form_schema(
        &self,
        ctx: &Context<'_>,
        filter: Option<FormSchemaFilterInput>,
    ) -> Result<Option<FormSchemaNode>> {
        form_schema(ctx, filter)
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
