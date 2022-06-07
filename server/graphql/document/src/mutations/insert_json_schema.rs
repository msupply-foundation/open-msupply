use async_graphql::*;
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::form_schema_service::InsertSchemaError,
};

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

#[derive(InputObject)]
pub struct InsertJsonSchemaInput {
    pub r#type: String,
    pub json_schema: String,
    pub ui_schema: String,
}

#[derive(SimpleObject)]
pub struct InsertJsonSchemaNode {
    pub id: String,
}

#[derive(Union)]
pub enum InsertJsonSchemaResponse {
    Response(InsertJsonSchemaNode),
}

pub fn insert_json_schema(
    ctx: &Context<'_>,
    input: InsertJsonSchemaInput,
) -> Result<InsertJsonSchemaResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateJsonSchema,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    match service_provider.schema_service.insert_schema(
        &context,
        input.r#type,
        input.json_schema,
        input.ui_schema,
    ) {
        Ok(id) => Ok(InsertJsonSchemaResponse::Response(InsertJsonSchemaNode {
            id,
        })),
        Err(error) => {
            let std_error = match error {
                InsertSchemaError::DatabaseError(err) => err.into(),
                InsertSchemaError::SerializationError(err) => {
                    StandardGraphqlError::BadUserInput(err)
                }
            };
            Err(std_error.extend())
        }
    }
}
