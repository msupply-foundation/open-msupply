use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, InternalError, RecordAlreadyExist, UniqueValueViolation,
    },
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    asset::insert_log::{InsertAssetLog, InsertAssetLogError as ServiceError},
    auth::{Resource, ResourceAccessRequest},
};

use crate::types::AssetLogNode;

pub fn insert_asset_log(
    ctx: &Context<'_>,
    store_id: &str,
    input: InsertAssetLogInput,
) -> Result<InsertAssetLogResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateAssetLog,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    match service_provider
        .asset_service
        .insert_asset_log(&service_context, input.into())
    {
        Ok(asset_log) => Ok(InsertAssetLogResponse::Response(AssetLogNode::from_domain(
            asset_log,
        ))),
        Err(error) => Ok(InsertAssetLogResponse::Error(InsertAssetLogError {
            error: map_error(error)?,
        })),
    }
}

#[derive(InputObject)]

pub struct InsertAssetLogInput {
    pub id: String,
    pub asset_id: String,
    pub status: Option<String>,
}

impl From<InsertAssetLogInput> for InsertAssetLog {
    fn from(
        InsertAssetLogInput {
            id,
            asset_id,
            status,
        }: InsertAssetLogInput,
    ) -> Self {
        InsertAssetLog {
            id,
            asset_id,
            status,
        }
    }
}

#[derive(SimpleObject)]

pub struct InsertAssetLogError {
    pub error: InsertAssetLogErrorInterface,
}

#[derive(Union)]
pub enum InsertAssetLogResponse {
    Error(InsertAssetLogError),
    Response(AssetLogNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]

pub enum InsertAssetLogErrorInterface {
    AssetLogAlreadyExists(RecordAlreadyExist),
    UniqueValueViolation(UniqueValueViolation),
    InternalError(InternalError),
    DatabaseError(DatabaseError),
}

fn map_error(error: ServiceError) -> Result<InsertAssetLogErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:?}", error);

    let graphql_error = match error {
        // Standard Graphql Errors
        ServiceError::AssetLogAlreadyExists => BadUserInput(formatted_error),
        ServiceError::CreatedRecordNotFound => InternalError(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::AssetDoesNotExist => BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}
