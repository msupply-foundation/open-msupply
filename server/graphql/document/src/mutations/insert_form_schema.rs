use async_graphql::*;
use repository::FormSchema;
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::form_schema_service::InsertFormSchemaError,
};

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use crate::types::json_schema::FormSchemaNode;

#[derive(InputObject)]
pub struct InsertFormSchemaInput {
    pub id: String,
    pub r#type: String,
    pub json_schema: serde_json::Value,
    pub ui_schema: serde_json::Value,
}

#[derive(Union)]
pub enum InsertFormSchemaResponse {
    Response(FormSchemaNode),
}

pub fn insert_form_schema(
    ctx: &Context<'_>,
    input: InsertFormSchemaInput,
) -> Result<InsertFormSchemaResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateJsonSchema,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    match service_provider.form_schema_service.insert(
        &context,
        FormSchema {
            id: input.id,
            r#type: input.r#type,
            json_schema: input.json_schema,
            ui_schema: input.ui_schema,
        },
    ) {
        Ok(schema) => Ok(InsertFormSchemaResponse::Response(FormSchemaNode {
            schema,
        })),
        Err(error) => {
            let std_error = match error {
                InsertFormSchemaError::DatabaseError(err) => err.into(),
                InsertFormSchemaError::SerializationError(err) => {
                    StandardGraphqlError::BadUserInput(err)
                }
            };
            Err(std_error.extend())
        }
    }
}
