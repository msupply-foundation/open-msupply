use async_graphql::*;

use graphql_types::types::FormSchemaNode;
use service::auth::{Resource, ResourceAccessRequest};

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};

pub fn form_schema(ctx: &Context<'_>, id: String) -> Result<Option<FormSchemaNode>> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryJsonSchema,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let schema = service_provider
        .form_schema_service
        .get_schema(&context, &id)?;
    Ok(schema.map(|schema| FormSchemaNode { schema }))
}
