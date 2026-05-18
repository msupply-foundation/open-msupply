use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{DatabaseError, RecordBelongsToAnotherStore, RecordNotFound},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use graphql_types::types::DeleteResponse;
use service::{
    asset::delete_log_reason::DeleteAssetLogReasonError as ServiceError,
    auth::{Resource, ResourceAccessRequest},
};

pub async fn delete_log_reason(
    ctx: &Context<'_>,
    reason_id: &str,
) -> Result<DeleteAssetLogReasonResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::EditAsset,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let reason_id = reason_id.to_string();

    let result = tokio::task::spawn_blocking(move || -> Result<_, ServiceError> {
        let service_context = service_provider.context("".to_string(), user.user_id)?;
        service_provider
            .asset_service
            .delete_log_reason(&service_context, reason_id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?;

    match result {
        Ok(reason_id) => Ok(DeleteAssetLogReasonResponse::Response(DeleteResponse(
            reason_id,
        ))),
        Err(error) => Ok(DeleteAssetLogReasonResponse::Error(
            DeleteAssetLogReasonError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(SimpleObject)]
pub struct DeleteAssetLogReasonError {
    pub error: DeleteAssetLogReasonErrorInterface,
}

#[derive(Union)]
pub enum DeleteAssetLogReasonResponse {
    Error(DeleteAssetLogReasonError),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", ty = "String"))]
pub enum DeleteAssetLogReasonErrorInterface {
    AssetNotFound(RecordNotFound),
    RecordBelongsToAnotherStore(RecordBelongsToAnotherStore),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<DeleteAssetLogReasonErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{error:#?}");

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::ReasonDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
