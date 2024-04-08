use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordBelongsToAnotherStore, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::DeleteResponse;
use service::{
    auth::{Resource, ResourceAccessRequest},
    catalogue::delete::DeleteAssetError as ServiceError,
};

pub fn delete_asset_catalogue_item(
    ctx: &Context<'_>,
    asset_catalogue_item_id: &str,
) -> Result<DeleteAssetCatalogueItemResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAssetCatalogueItem,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .delete_asset(&service_context, asset_catalogue_item_id.to_string())
    {
        Ok(asset_catalogue_item_id) => Ok(DeleteAssetCatalogueItemResponse::Response(
            DeleteResponse(asset_catalogue_item_id),
        )),
        Err(error) => Ok(DeleteAssetCatalogueItemResponse::Error(DeleteAssetError {
            error: map_error(error)?,
        })),
    }
}

#[derive(SimpleObject)]
pub struct DeleteAssetError {
    pub error: DeleteAssetErrorInterface,
}

#[derive(Union)]
pub enum DeleteAssetCatalogueItemResponse {
    Error(DeleteAssetError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum DeleteAssetErrorInterface {
    AssetCatalogueItemNotFound(RecordNotFound),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteAssetErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::AssetCatalogueItemNotFound => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
