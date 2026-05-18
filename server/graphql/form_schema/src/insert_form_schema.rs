use async_graphql::*;
use graphql_types::types::FormSchemaNode;
use repository::FormSchema;
use service::{
    auth::{Resource, ResourceAccessRequest},
    document::form_schema_service::InsertFormSchemaError,
};

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
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

pub async fn insert_form_schema(
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

    let service_provider = ctx.service_provider_data();
    let schema = FormSchema {
        id: input.id,
        r#type: input.r#type,
        json_schema: input.json_schema,
        ui_schema: input.ui_schema,
    };

    let result = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let context = service_provider.basic_context()?;
        Ok(service_provider.form_schema_service.insert(&context, schema))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    match result {
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
