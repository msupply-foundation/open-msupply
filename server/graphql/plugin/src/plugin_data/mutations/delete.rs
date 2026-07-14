use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::DeleteResponse as GenericDeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    plugin_data::DeletePluginDataError as ServiceError,
};

#[derive(Union)]
#[graphql(name = "DeletePluginDataResponse")]
pub enum DeleteResponse {
    Response(GenericDeleteResponse),
}

pub fn delete_plugin_data(
    ctx: &Context<'_>,
    store_id: &str,
    id: String,
) -> Result<DeleteResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            store_id: Some(store_id.to_string()),
            resource: Resource::MutatePluginData,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), "".to_string())?;
    map_response(
        service_provider
            .plugin_data_service
            .delete(&service_context, &id),
    )
}

fn map_response(from: Result<String, ServiceError>) -> Result<DeleteResponse> {
    match from {
        Ok(id) => Ok(DeleteResponse::Response(GenericDeleteResponse(id))),
        Err(error) => map_error(error),
    }
}

fn map_error(error: ServiceError) -> Result<DeleteResponse> {
    use ServiceError::*;
    let formatted_error = format!("{error:#?}");
    let graphql_error = match error {
        PluginDataDoesNotExist => StandardGraphqlError::BadUserInput(formatted_error),
        DatabaseError(_) | InternalError(_) => StandardGraphqlError::InternalError(formatted_error),
    };
    Err(graphql_error.extend())
}
