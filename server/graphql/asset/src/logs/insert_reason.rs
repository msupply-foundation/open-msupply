use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    asset::insert_log_reason::{InsertAssetLogReason, InsertAssetLogReasonError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
};

use crate::types::{AssetLogReasonNode, AssetLogStatusInput};

pub fn insert_asset_log_reason(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertAssetLogReasonInput,
) -> Result<InsertAssetLogReasonResponse> {
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
        .insert_asset_log_reason(&service_context, input.into())
    {
        Ok(asset_log_reason) => Ok(InsertAssetLogReasonResponse::Response(
            AssetLogReasonNode::from_domain(asset_log_reason),
        )),
        Err(error) => Ok(InsertAssetLogReasonResponse::Error(
            InsertAssetLogReasonError {
                error: map_error(error)?,
            },
        )),
    }
}

#[derive(InputObject)]

pub struct InsertAssetLogReasonInput {
    pub id: String,
    pub asset_log_status: AssetLogStatusInput,
    pub reason: String,
}
impl From<InsertAssetLogReasonInput> for InsertAssetLogReason {
    fn from(
        InsertAssetLogReasonInput {
            id,
            asset_log_status,
            reason,
        }: InsertAssetLogReasonInput,
    ) -> Self {
        InsertAssetLogReason {
            id,
            asset_log_status: asset_log_status.to_domain(),
            reason,
        }
    }
}

#[derive(SimpleObject)]
pub struct InsertAssetLogReasonError {
    pub error: InsertAssetLogReasonErrorInterface,
}

#[derive(Union)]
pub enum InsertAssetLogReasonResponse {
    Error(InsertAssetLogReasonError),
    Response(AssetLogReasonNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertAssetLogReasonErrorInterface {
    AssetLogReasonAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertAssetLogReasonErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:?}", error);

    let graphql_error = match error {
        ServiceError::AssetLogReasonAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InsufficientPermission => BadUserInput(formatted_error),
        ServiceError::AssetLogStatusNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
