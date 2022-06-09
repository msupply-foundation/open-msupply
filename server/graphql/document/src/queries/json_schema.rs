use async_graphql::*;

use service::auth::{Resource, ResourceAccessRequest};

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};

use crate::types::json_schema::JSONSchemaNode;

#[derive(Union)]
pub enum JSONSchemaResponse {
    Response(JSONSchemaNode),
}

pub fn json_schema(ctx: &Context<'_>, id: String) -> Result<JSONSchemaResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryJsonSchema,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.context()?;

    let schema = service_provider.schema_service.get_schema(&context, &id)?;
    Ok(JSONSchemaResponse::Response(JSONSchemaNode { schema }))
}
