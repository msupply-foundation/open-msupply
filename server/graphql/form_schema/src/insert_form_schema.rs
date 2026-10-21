use async_graphql::*;
use graphql_types::types::FormSchemaNode;
use repository::FormSchema;
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::form_schema_service::InsertFormSchemaError,
    sync::CentralServerConfig,
};

use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};

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
            require_central_standalone: false,
        },
    )?;
    // Form schemas reach other sites from the central server, so they are
    // written there only.
    if !CentralServerConfig::is_central_server() {
        return Err(StandardGraphqlError::Forbidden(
            "Form schemas can only be written on a central server".to_string(),
        )
        .extend());
    }

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

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
