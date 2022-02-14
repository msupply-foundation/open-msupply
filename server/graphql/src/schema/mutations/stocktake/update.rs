use crate::{
    schema::types::StocktakeLineConnector,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};

use async_graphql::*;
use repository::StocktakeLine;
use service::{
    permission_validation::{Resource, ResourceAccessRequest},
    service_provider::{ServiceContext, ServiceProvider},
    stocktake::update::{
        UpdateStocktakeError as ServiceError, UpdateStocktakeInput as UpdateStocktake,
    },
};

use super::{StocktakeNode, StocktakeNodeStatus};

#[derive(InputObject)]
pub struct UpdateStocktakeInput {
    pub id: String,
    pub comment: Option<String>,
    pub description: Option<String>,
    pub status: Option<StocktakeNodeStatus>,
}

pub struct SnapshotCountCurrentCountMismatch(Vec<StocktakeLine>);
#[Object]
impl SnapshotCountCurrentCountMismatch {
    pub async fn description(&self) -> &'static str {
        "Snapshot count doesn't match the current stock count"
    }

    pub async fn lines(&self) -> StocktakeLineConnector {
        StocktakeLineConnector::from_domain_vec(self.0.clone())
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateStocktakeErrorInterface {
    SnapshotCountCurrentCountMismatch(SnapshotCountCurrentCountMismatch),
}

#[derive(SimpleObject)]
pub struct UpdateStocktakeError {
    pub error: UpdateStocktakeErrorInterface,
}

#[derive(Union)]
pub enum UpdateStocktakeResponse {
    Response(StocktakeNode),
    Error(UpdateStocktakeError),
}

pub fn update_stocktake(
    ctx: &Context<'_>,
    store_id: &str,
    input: UpdateStocktakeInput,
) -> Result<UpdateStocktakeResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateStocktake,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_ctx = service_provider.context()?;
    do_update_stocktake(&service_ctx, service_provider, store_id, input)
}

pub fn do_update_stocktake(
    service_ctx: &ServiceContext,
    service_provider: &ServiceProvider,
    store_id: &str,
    input: UpdateStocktakeInput,
) -> Result<UpdateStocktakeResponse> {
    let service = &service_provider.stocktake_service;
    let id = input.id.clone();
    match service.update_stocktake(&service_ctx, store_id, to_domain(input)) {
        Ok(stocktake) => Ok(UpdateStocktakeResponse::Response(StocktakeNode {
            stocktake,
        })),
        Err(err) => Ok(UpdateStocktakeResponse::Error(UpdateStocktakeError {
            error: map_error(err, &id)?,
        })),
    }
}

fn map_error(err: ServiceError, id: &str) -> Result<UpdateStocktakeErrorInterface> {
    let formatted_error = format!("Update stocktake {}: {:#?}", id, err);
    let graphql_error = match err {
        ServiceError::SnapshotCountCurrentCountMismatch(lines) => {
            return Ok(
                UpdateStocktakeErrorInterface::SnapshotCountCurrentCountMismatch(
                    SnapshotCountCurrentCountMismatch(lines),
                ),
            )
        }

        // standard gql errors:
        ServiceError::DatabaseError(err) => err.into(),
        ServiceError::InternalError(err) => StandardGraphqlError::InternalError(err),
        ServiceError::InvalidStore => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::StocktakeDoesNotExist => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::CannotEditFinalised => StandardGraphqlError::BadUserInput(formatted_error),
        ServiceError::NoLines => StandardGraphqlError::BadUserInput(formatted_error),
    };

    Err(graphql_error.extend())
}

fn to_domain(
    UpdateStocktakeInput {
        id,
        comment,
        description,
        status,
    }: UpdateStocktakeInput,
) -> UpdateStocktake {
    UpdateStocktake {
        id,
        comment,
        description,
        status: status.map(|s| s.to_domain()),
    }
}
