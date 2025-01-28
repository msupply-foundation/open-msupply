use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordBelongsToAnotherStore, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::DeleteResponse;
use service::{
    asset::delete::DeleteAssetError as ServiceError,
    auth::{Resource, ResourceAccessRequest},
};

pub fn delete_asset(
    ctx: &Context<'_>,
    store_id: &str,
    asset_id: &str,
) -> Result<DeleteAssetResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAsset,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .delete_asset(&service_context, asset_id.to_string())
    {
        Ok(asset_id) => Ok(DeleteAssetResponse::Response(DeleteResponse(asset_id))),
        Err(error) => Ok(DeleteAssetResponse::Error(DeleteAssetError {
            error: map_error(error)?,
        })),
    }
}

#[derive(SimpleObject)]
pub struct DeleteAssetError {
    pub error: DeleteAssetErrorInterface,
}

#[derive(Union)]
pub enum DeleteAssetResponse {
    Error(DeleteAssetError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteAssetErrorInterface {
    AssetNotFound(RecordNotFound),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteAssetErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::AssetDoesNotExist => BadUserInput(formatted_error),
        ServiceError::AssetDoesNotBelongToCurrentStore => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
